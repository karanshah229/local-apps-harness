#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const registryPath = resolve(root, "platform/apps.json");
const nginxPath = resolve(root, "infra/nginx/nginx.conf");
const [recordFile, confirm] = process.argv.slice(2).filter((arg) => arg !== "--");

if (!recordFile || confirm !== "--confirm") {
  process.stderr.write("Usage: node scripts/register-app.mjs APP_RECORD.json --confirm\n");
  process.exit(1);
}

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const app = JSON.parse(readFileSync(resolve(process.cwd(), recordFile), "utf8"));
for (const field of ["id", "displayName", "recipe", "status", "capabilities", "paths", "web", "docker", "nginx"]) {
  if (app[field] === undefined) throw new Error(`Missing required app field: ${field}`);
}

const conflicts = [
  ["id", app.id, (item) => item.id],
  ["base path", app.web?.basePath, (item) => item.web?.basePath],
  ["port", app.api?.internalPort, (item) => item.api?.internalPort],
  ["Docker service", app.docker?.service, (item) => item.docker?.service],
  ["Nginx route", app.nginx?.route, (item) => item.nginx?.route],
  ["Android package", app.mobile?.androidPackage, (item) => item.mobile?.androidPackage],
  ["iOS bundle ID", app.mobile?.iosBundleId, (item) => item.mobile?.iosBundleId],
];
for (const [label, value, select] of conflicts) {
  if (value !== null && value !== undefined && registry.apps.some((item) => select(item) === value)) {
    throw new Error(`Cannot register ${app.id}: duplicate ${label} '${value}'`);
  }
}

const previousRegistry = readFileSync(registryPath, "utf8");
const previousNginx = readFileSync(nginxPath, "utf8");
registry.apps.push(app);
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
const generated = spawnSync(process.execPath, ["scripts/generate-nginx.mjs", "--write"], { cwd: root, encoding: "utf8" });
if (generated.status !== 0) {
  writeFileSync(registryPath, previousRegistry);
  writeFileSync(nginxPath, previousNginx);
  throw new Error(`Nginx generation failed: ${generated.stderr.trim()}`);
}
const checked = spawnSync(process.execPath, ["scripts/platform.mjs", "check"], { cwd: root, encoding: "utf8" });
if (checked.status !== 0) {
  writeFileSync(registryPath, previousRegistry);
  writeFileSync(nginxPath, previousNginx);
  process.stderr.write(`Registration rolled back:\n${checked.stdout}${checked.stderr}`);
  process.exit(1);
}
process.stdout.write(`Registered ${app.id}, generated its Nginx route, and verified operational wiring.\n`);
