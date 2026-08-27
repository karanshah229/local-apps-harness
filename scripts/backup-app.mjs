#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");

export function pruneBackups(rootDir, targetAppId, keepCount = 3) {
  const backupsDir = resolve(rootDir, ".local/backups", targetAppId);
  if (!existsSync(backupsDir)) return [];
  const entries = readdirSync(backupsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(); // ISO format stamps sort chronologically
  const pruned = [];
  if (entries.length > keepCount) {
    const toRemove = entries.slice(0, entries.length - keepCount);
    for (const folder of toRemove) {
      rmSync(resolve(backupsDir, folder), { recursive: true, force: true });
      pruned.push(folder);
    }
  }
  return pruned;
}

export function runBackupCli(argv = process.argv) {
  const [appId, mode, extraArg] = argv.slice(2).filter((arg) => arg !== "--");

  if (!appId) {
    process.stderr.write("Usage: node scripts/backup-app.mjs APP_ID --plan|--confirm|--prune [keepCount]\n");
    process.exit(1);
  }

  if (mode === "--prune") {
    const count = parseInt(extraArg, 10) || 3;
    const pruned = pruneBackups(root, appId, count);
    process.stdout.write(`${JSON.stringify({ appId, action: "prune", pruned, keptCount: count }, null, 2)}\n`);
    process.exit(0);
  }

  const app = JSON.parse(readFileSync(resolve(root, "platform/apps.json"), "utf8")).apps.find((item) => item.id === appId);
  if (!app) throw new Error(`Unknown app '${appId}'`);
  if (!app.backup) throw new Error(`${app.displayName} has no mutable registered data to back up.`);

  const strategy = app.backup.strategy ?? "filesystem";
  if (!["filesystem", "postgresql"].includes(strategy)) {
    throw new Error(`Backup strategy '${strategy}' is not implemented.`);
  }

  function getDatabaseConfig(targetApp) {
    let dbUrl = process.env.DATABASE_URL;
    if (!dbUrl && targetApp.paths?.api) {
      const envPath = resolve(root, targetApp.paths.api, ".env");
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, "utf8");
        const match = content.match(/^DATABASE_URL\s*=\s*["']?([^\s"']+)["']?/m);
        if (match) dbUrl = match[1];
      }
    }

    const dbName = targetApp.data?.database ?? targetApp.id;
    let user = "postgres";
    let dbPass = "changeme-postgres";
    let host = "localhost";
    let port = "5432";

    if (dbUrl) {
      try {
        const url = new URL(dbUrl);
        user = url.username || user;
        dbPass = url.password || dbPass;
        host = url.hostname || host;
        port = url.port || port;
      } catch {
        // Fallback
      }
    }

    return { dbName, user, password: dbPass, host, port, dbUrl };
  }

  const plan = {
    appId,
    strategy,
    container: app.backup.container || (strategy === "postgresql" ? "workspace-postgres" : null),
    containerPath: strategy === "filesystem" ? app.backup.containerPath : null,
    legacyContainerPaths: strategy === "filesystem" ? (app.backup.legacyContainerPaths ?? []) : [],
    localFallbacks: strategy === "filesystem" ? app.backup.localPaths : [],
    destinationRoot: `.local/backups/${app.id}`,
    excludes: [".env", "secret values"],
    retention: "Keeps 3 latest snapshots automatically",
  };
  if (mode === "--plan") {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    process.exit(0);
  }
  if (mode !== "--confirm") {
    process.stderr.write(`Usage: node scripts/backup-app.mjs ${appId} --plan|--confirm|--prune [keepCount]\n`);
    process.exit(1);
  }

  const stamp = new Date().toISOString().replaceAll(":", "-");
  const destination = resolve(root, ".local/backups", app.id, stamp);
  const payload = resolve(destination, "data");
  mkdirSync(payload, { recursive: true });

  let source = "local";

  if (strategy === "postgresql") {
    const dbConfig = getDatabaseConfig(app);
    const backupFile = resolve(payload, "backup.sql");
    const containerName = app.backup.container || "workspace-postgres";
    const inspected = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", containerName], { encoding: "utf8" });

    if (inspected.status === 0 && inspected.stdout.trim() === "true") {
      const dumpArgs = ["exec", "-i", "-e", `PGPASSWORD=${dbConfig.password}`, containerName, "pg_dump", "-U", dbConfig.user, "-d", dbConfig.dbName];
      const result = spawnSync("docker", dumpArgs, { encoding: "utf8" });
      if (result.status === 0) {
        writeFileSync(backupFile, result.stdout);
        source = `container:${containerName}`;
      } else {
        throw new Error(`Container PG dump failed: ${result.stderr.trim()}`);
      }
    } else {
      const dumpArgs = ["-U", dbConfig.user, "-h", dbConfig.host, "-p", dbConfig.port, "-d", dbConfig.dbName];
      const localEnv = { ...process.env };
      localEnv["PGPASSWORD"] = dbConfig.password;
      const result = spawnSync("pg_dump", dumpArgs, { encoding: "utf8", env: localEnv });
      if (result.status === 0) {
        writeFileSync(backupFile, result.stdout);
        source = "local-pg_dump";
      } else {
        throw new Error(`No running database container and local pg_dump failed: ${(result.stderr || "").trim()}`);
      }
    }
  } else {
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
  writeFileSync(resolve(destination, "manifest.json"), `${JSON.stringify({ appId, createdAt: new Date().toISOString(), source, targetPath: app.backup.containerPath || "postgresql", files }, null, 2)}\n`);

  // Automatically prune older backups, retaining the 3 latest snapshots to save disk space
  const pruned = pruneBackups(root, appId, 3);

  process.stdout.write(`${JSON.stringify({ destination: relative(root, destination), source, files: files.length, prunedBackups: pruned }, null, 2)}\n`);
}

if (process.argv[1] && (process.argv[1].endsWith("backup-app.mjs") || process.argv[1].endsWith("backup-app"))) {
  try {
    runBackupCli();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
