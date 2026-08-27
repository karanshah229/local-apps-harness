#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const [dbName] = process.argv.slice(2).filter((arg) => arg !== "--");
if (!dbName || !/^[a-zA-Z0-9_-]+$/.test(dbName)) {
  process.stderr.write("Usage: node scripts/ensure-postgres-db.mjs DB_NAME\n");
  process.exit(1);
}

const containerName = "workspace-postgres";
const dbUser = process.env.POSTGRES_USER || "postgres";
const dbPass = process.env.POSTGRES_PASSWORD || "changeme-postgres";

function ensureOnContainer() {
  const check = spawnSync("docker", [
    "exec", "-i", "-e", `PGPASSWORD=${dbPass}`, containerName,
    "psql", "-U", dbUser, "-tc", `SELECT 1 FROM pg_database WHERE datname = '${dbName}';`
  ], { encoding: "utf8" });

  if (check.status !== 0) {
    throw new Error(`Failed to query database existence on ${containerName}: ${check.stderr.trim()}`);
  }

  if (check.stdout.trim() === "1") {
    return { dbName, status: "exists", container: containerName };
  }

  const create = spawnSync("docker", [
    "exec", "-i", "-e", `PGPASSWORD=${dbPass}`, containerName,
    "psql", "-U", dbUser, "-c", `CREATE DATABASE "${dbName}";`
  ], { encoding: "utf8" });

  if (create.status !== 0) {
    throw new Error(`Failed to create database '${dbName}' on ${containerName}: ${create.stderr.trim()}`);
  }

  return { dbName, status: "created", container: containerName };
}

function ensureLocal() {
  const localEnv = { ...process.env };
  localEnv["PGPASSWORD"] = dbPass;

  const check = spawnSync("psql", [
    "-U", dbUser, "-tc", `SELECT 1 FROM pg_database WHERE datname = '${dbName}';`
  ], { encoding: "utf8", env: localEnv });

  if (check.status === 0) {
    if (check.stdout.trim() === "1") {
      return { dbName, status: "exists", container: "local" };
    }
    const create = spawnSync("psql", [
      "-U", dbUser, "-c", `CREATE DATABASE "${dbName}";`
    ], { encoding: "utf8", env: localEnv });
    if (create.status === 0) {
      return { dbName, status: "created", container: "local" };
    }
  }
  return null;
}

try {
  const containerRunning = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", containerName], { encoding: "utf8" });
  if (containerRunning.status === 0 && containerRunning.stdout.trim() === "true") {
    const result = ensureOnContainer();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    const localResult = ensureLocal();
    if (localResult) {
      process.stdout.write(`${JSON.stringify(localResult, null, 2)}\n`);
    } else {
      process.stdout.write(`${JSON.stringify({ dbName, status: "skipped_no_postgres_running" }, null, 2)}\n`);
    }
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
