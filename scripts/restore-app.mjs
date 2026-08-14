#!/usr/bin/env node

import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const [appId, backupArgument, mode] = process.argv.slice(2).filter((arg) => arg !== "--");
const registry = JSON.parse(readFileSync(resolve(root, "platform/apps.json"), "utf8"));
const app = registry.apps.find((item) => item.id === appId);
if (!app) throw new Error(`Unknown app '${appId}'`);
if (!app.backup) throw new Error(`${app.displayName} has no registered data to restore.`);
if ((app.backup.strategy ?? "filesystem") !== "filesystem") throw new Error(`Restore strategy '${app.backup.strategy}' is not implemented. No data was changed.`);

const backupRoot = resolve(root, ".local/backups", app.id);
function within(parent, child) {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}
function selectBackup(value) {
  if (!value) throw new Error(`Usage: node scripts/restore-app.mjs ${appId} <backup-directory|latest> --plan|--verify|--confirm-overwrite`);
  if (value === "latest") {
    if (!existsSync(backupRoot)) throw new Error(`No backups exist for ${app.displayName}.`);
    const candidates = readdirSync(backupRoot, { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => resolve(backupRoot, item.name)).sort();
    if (!candidates.length) throw new Error(`No backups exist for ${app.displayName}.`);
    return candidates.at(-1);
  }
  const selected = resolve(root, value);
  if (!within(backupRoot, selected)) throw new Error(`Backup must be inside .local/backups/${app.id}.`);
  return selected;
}

const backupDirectory = selectBackup(backupArgument);
const manifestPath = resolve(backupDirectory, "manifest.json");
const payload = resolve(backupDirectory, "data");
if (!existsSync(manifestPath) || !existsSync(payload)) throw new Error("Backup is incomplete: manifest.json and data/ are required.");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.appId !== app.id) throw new Error(`Backup belongs to '${manifest.appId}', not '${app.id}'.`);

function verify(directory = backupDirectory) {
  const checkedPayload = resolve(directory, "data");
  for (const file of manifest.files) {
    const path = resolve(directory, file.path);
    if (!within(checkedPayload, path) || !existsSync(path)) throw new Error(`Backup file is missing or unsafe: ${file.path}`);
    const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
    if (actual !== file.sha256) throw new Error(`Backup checksum failed: ${file.path}`);
    if (path.endsWith(".db")) {
      const result = spawnSync("sqlite3", [path, "PRAGMA integrity_check;"], { encoding: "utf8" });
      if (result.status !== 0 || result.stdout.trim() !== "ok") throw new Error(`SQLite verification failed: ${file.path}`);
    }
  }
  return { files: manifest.files.length, sqliteDatabases: manifest.files.filter((file) => file.path.endsWith(".db")).length };
}

const plan = {
  appId,
  backup: relative(root, backupDirectory),
  createdAt: manifest.createdAt,
  overwrites: { container: `${app.backup.container}:${app.backup.containerPath}`, localFallbacks: app.backup.localPaths },
  safety: ["verify checksums and SQLite integrity", "back up current data", "stop only this app", "restore registered paths", "restart and verify health", "put safety backup back on failure"],
  approval: "Restoring overwrites the app's current database and uploads and requires explicit approval.",
};
if (mode === "--plan") {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  process.exit(0);
}
if (mode === "--verify") {
  const disposable = mkdtempSync(resolve(tmpdir(), `${app.id}-restore-check-`));
  try {
    cpSync(payload, resolve(disposable, "data"), { recursive: true });
    process.stdout.write(`${JSON.stringify({ appId, status: "verified", ...verify(disposable) }, null, 2)}\n`);
  } finally {
    rmSync(disposable, { recursive: true, force: true });
  }
  process.exit(0);
}
if (mode !== "--confirm-overwrite") {
  process.stderr.write(`Usage: node scripts/restore-app.mjs ${appId} <backup-directory|latest> --plan|--verify|--confirm-overwrite\n`);
  process.exit(1);
}

verify();
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}
const safety = JSON.parse(run(process.execPath, ["scripts/backup-app.mjs", app.id, "--confirm"]));
const safetyPayload = resolve(root, safety.destination, "data");
const compose = ["compose", "-f", "infra/docker-compose.yml"];
const inspected = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", app.backup.container], { encoding: "utf8" });
const containerRunning = inspected.status === 0 && inspected.stdout.trim() === "true";

function replaceContainerData(source) {
  run("docker", [...compose, "stop", app.docker.service]);
  const clearScript = `const fs=require('fs');fs.rmSync(${JSON.stringify(app.backup.containerPath)},{recursive:true,force:true});fs.mkdirSync(${JSON.stringify(app.backup.containerPath)},{recursive:true});`;
  run("docker", [...compose, "run", "--rm", "--no-deps", "--entrypoint", "node", app.docker.service, "-e", clearScript]);
  run("docker", ["cp", `${source}/.`, `${app.backup.container}:${app.backup.containerPath}`]);
  run("docker", [...compose, "start", app.docker.service]);
}
function replaceLocalData(source) {
  for (const registered of app.backup.localPaths) {
    const target = resolve(root, registered);
    const item = resolve(source, basename(target));
    if (!existsSync(item)) continue;
    if (!within(root, target)) throw new Error(`Unsafe restore target: ${registered}`);
    mkdirSync(dirname(target), { recursive: true });
    rmSync(target, { recursive: true, force: true });
    cpSync(item, target, { recursive: true });
  }
}
try {
  if (containerRunning) {
    replaceContainerData(payload);
    let health = "";
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const result = spawnSync("docker", ["inspect", "-f", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}", app.backup.container], { encoding: "utf8" });
      health = result.stdout.trim();
      if (health === "healthy") break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
    if (health !== "healthy") throw new Error(`${app.displayName} did not become healthy after restore.`);
  } else {
    replaceLocalData(payload);
  }
  process.stdout.write(`${JSON.stringify({ appId, status: "restored", backup: relative(root, backupDirectory), safetyBackup: safety.destination }, null, 2)}\n`);
} catch (error) {
  try {
    if (containerRunning) replaceContainerData(safetyPayload);
    else replaceLocalData(safetyPayload);
  } catch (rollbackError) {
    throw new Error(`${error.message} Automatic rollback also failed: ${rollbackError.message}`);
  }
  throw new Error(`${error.message} Current data was restored from ${safety.destination}.`);
}
