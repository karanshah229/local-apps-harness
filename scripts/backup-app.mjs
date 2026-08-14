#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const [appId, mode] = process.argv.slice(2).filter((arg) => arg !== "--");
const app = JSON.parse(readFileSync(resolve(root, "platform/apps.json"), "utf8")).apps.find((item) => item.id === appId);
if (!app) throw new Error(`Unknown app '${appId}'`);
if (!app.backup) throw new Error(`${app.displayName} has no mutable registered data to back up.`);
if ((app.backup.strategy ?? "filesystem") !== "filesystem") throw new Error(`Backup strategy '${app.backup.strategy}' is not implemented.`);

const plan = {
  appId,
  strategy: app.backup.strategy ?? "filesystem",
  container: app.backup.container,
  containerPath: app.backup.containerPath,
  legacyContainerPaths: app.backup.legacyContainerPaths ?? [],
  localFallbacks: app.backup.localPaths,
  destinationRoot: `.local/backups/${app.id}`,
  excludes: [".env", "secret values"],
};
if (mode === "--plan") {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  process.exit(0);
}
if (mode !== "--confirm") {
  process.stderr.write(`Usage: node scripts/backup-app.mjs ${appId} --plan|--confirm\n`);
  process.exit(1);
}

const stamp = new Date().toISOString().replaceAll(":", "-");
const destination = resolve(root, ".local/backups", app.id, stamp);
const payload = resolve(destination, "data");
mkdirSync(payload, { recursive: true });

let source = "local";
const inspected = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", app.backup.container], { encoding: "utf8" });
if (inspected.status === 0 && inspected.stdout.trim() === "true") {
  const copied = spawnSync("docker", ["cp", `${app.backup.container}:${app.backup.containerPath}/.`, payload], { encoding: "utf8" });
  if (copied.status === 0) {
    source = `container:${app.backup.container}`;
  } else {
    let legacyCopied = 0;
    for (const legacyPath of app.backup.legacyContainerPaths ?? []) {
      const result = spawnSync("docker", ["cp", `${app.backup.container}:${legacyPath}`, resolve(payload, basename(legacyPath))], { encoding: "utf8" });
      if (result.status === 0) legacyCopied += 1;
    }
    if (!legacyCopied) throw new Error(`Container backup failed: ${copied.stderr.trim()}`);
    source = `legacy-container:${app.backup.container}`;
  }
} else {
  let copied = 0;
  for (const localPath of app.backup.localPaths) {
    const absolute = resolve(root, localPath);
    if (!existsSync(absolute)) continue;
    cpSync(absolute, resolve(payload, basename(absolute)), { recursive: true });
    copied += 1;
  }
  if (!copied) throw new Error("No running container or local data source was available; no backup was created.");
}

const files = [];
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.isFile()) files.push({
      path: relative(destination, path),
      bytes: statSync(path).size,
      sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    });
  }
}
collect(payload);
if (!files.length) throw new Error("Backup payload is empty.");
writeFileSync(resolve(destination, "manifest.json"), `${JSON.stringify({ appId, createdAt: new Date().toISOString(), source, targetPath: app.backup.containerPath, files }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ destination: relative(root, destination), source, files: files.length }, null, 2)}\n`);
