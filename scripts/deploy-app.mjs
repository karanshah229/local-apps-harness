#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const [appId, mode] = process.argv.slice(2).filter((arg) => arg !== "--");
const app = JSON.parse(readFileSync(resolve(root, "platform/apps.json"), "utf8")).apps.find((item) => item.id === appId);
if (!app) throw new Error(`Unknown app '${appId}'`);

const plan = {
  appId,
  privateRoute: app.web?.basePath,
  service: app.docker.service,
  sequence: ["validate-connected-wiring", app.backup ? "create-verified-local-backup" : null, "capture-current-images", "build-app-and-nginx", "replace-services", "wait-for-health", "validate-nginx", "rollback-images-on-failure"].filter(Boolean),
  approval: "Changing the live private application requires explicit approval.",
};
if (mode === "--plan") {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  process.exit(0);
}
if (mode !== "--confirm-live-change") {
  process.stderr.write(`Usage: node scripts/deploy-app.mjs ${appId} --plan|--confirm-live-change\n`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

run(process.execPath, ["scripts/platform.mjs", "check"]);
const backupResult = app.backup ? JSON.parse(run(process.execPath, ["scripts/backup-app.mjs", appId, "--confirm"])) : null;

const compose = ["compose", "-f", "infra/docker-compose.yml"];
const imageName = run("docker", [...compose, "config", "--images", app.docker.service]).split("\n")[0];
const nginxImageName = run("docker", [...compose, "config", "--images", "nginx"]).split("\n")[0];
const inspectImage = (container) => {
  const result = spawnSync("docker", ["inspect", "-f", "{{.Image}}", container], { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
};
const previousAppImage = inspectImage(app.docker.containerName);
const previousNginxImage = inspectImage("workspace-nginx");

function rollback(reason) {
  if (previousAppImage) run("docker", ["tag", previousAppImage, imageName]);
  if (previousNginxImage) run("docker", ["tag", previousNginxImage, nginxImageName]);
  if (previousAppImage || previousNginxImage) run("docker", [...compose, "up", "-d", app.docker.service, "nginx"]);
  throw new Error(`${reason} Previous container images were restored.`);
}

try {
  run("docker", [...compose, "build", app.docker.service, "nginx"]);
  run("docker", [...compose, "up", "-d", app.docker.service, "nginx"]);
  if (backupResult) {
    run("docker", [...compose, "stop", app.docker.service]);
    run("docker", ["cp", `${resolve(root, backupResult.destination, "data")}/.`, `${app.docker.containerName}:${app.backup.containerPath}`]);
    run("docker", [...compose, "start", app.docker.service]);
  }
  let health = "";
  for (let attempt = 0; attempt < 30; attempt += 1) {
    health = run("docker", ["inspect", "-f", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}", app.docker.containerName]);
    if (health === "healthy" || health === "running") break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  if (health !== "healthy" && health !== "running") throw new Error(`${app.displayName} did not become healthy.`);
  run("docker", [...compose, "exec", "-T", "nginx", "nginx", "-t"]);
  process.stdout.write(`${JSON.stringify({ appId, status: "deployed", privateRoute: app.web?.basePath, health }, null, 2)}\n`);
} catch (error) {
  rollback(error.message);
}
