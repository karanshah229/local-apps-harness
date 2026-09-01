#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadRecipe, validateRecipePolicy } from "./recipe-policy.mjs";

const root = resolve(import.meta.dirname, "..");
const registryPath = resolve(root, "platform/apps.json");
const ignored = new Set([".git", ".turbo", "node_modules", "dist", "build", "out", "coverage", ".local"]);

function registry() {
  return JSON.parse(readFileSync(registryPath, "utf8"));
}

function appById(id) {
  const app = registry().apps.find((candidate) => candidate.id === id);
  if (!app) throw new Error(`Unknown app '${id}'. Run 'pnpm platform:list' to see app names.`);
  return app;
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (entry.isFile() && statSync(path).size <= 1_000_000) files.push(path);
  }
  return files;
}

function referencesFor(app) {
  const needles = new Set([
    app.id,
    app.displayName,
    app.web?.basePath,
    app.api?.internalPort?.toString(),
    app.docker?.service,
    app.nginx?.route,
    app.nginx?.upstream,
    app.mobile?.androidPackage,
    app.mobile?.iosBundleId,
  ].filter(Boolean));
  const matches = [];
  for (const file of walk(root)) {
    let content;
    try { content = readFileSync(file, "utf8"); } catch { continue; }
    const found = [...needles].filter((needle) => content.includes(needle));
    if (found.length) matches.push({ file: relative(root, file), values: found });
  }
  return matches;
}

const impactMap = {
  create: ["web", "api", "database", "mobile", "environment", "docker", "nginx", "health", "backup", "tests", "registry"],
  rename: ["web", "api", "database", "mobile", "environment", "docker", "nginx", "health", "backup", "tests", "registry"],
  route: ["web", "api", "mobile", "environment", "docker", "nginx", "health", "tests", "registry"],
  port: ["api", "mobile", "environment", "docker", "nginx", "health", "tests", "registry"],
  api: ["web", "api", "mobile", "environment", "nginx", "health", "tests", "registry"],
  database: ["api", "database", "environment", "docker", "health", "backup", "tests", "registry"],
  environment: ["web", "api", "mobile", "environment", "docker", "tests", "registry"],
  mobile: ["api", "mobile", "environment", "tests", "registry"],
};

function validate() {
  const data = registry();
  const errors = [];
  const warnings = [];
  const unique = (label, values) => {
    const seen = new Set();
    for (const value of values.filter((item) => item !== null && item !== undefined)) {
      if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`);
      seen.add(value);
    }
  };
  unique("app id", data.apps.map((app) => app.id));
  unique("web base path", data.apps.map((app) => app.web?.basePath));
  unique("internal port", data.apps.map((app) => app.api?.internalPort));
  unique("Docker service", data.apps.map((app) => app.docker?.service));
  unique("Nginx route", data.apps.map((app) => app.nginx?.route));
  unique("Android package", data.apps.map((app) => app.mobile?.androidPackage));
  unique("iOS bundle id", data.apps.map((app) => app.mobile?.iosBundleId));

  const nginx = readFileSync(resolve(root, "infra/nginx/nginx.conf"), "utf8");
  const compose = readFileSync(resolve(root, "infra/docker-compose.yml"), "utf8");
  if (!compose.includes('"0.0.0.0:80:80"')) errors.push("Nginx must bind port 80 on every host interface for the registered local-network access mode");
  const generatedNginx = spawnSync(process.execPath, ["scripts/generate-nginx.mjs"], { cwd: root, encoding: "utf8" });
  if (generatedNginx.status !== 0 || generatedNginx.stdout !== nginx) errors.push("infra/nginx/nginx.conf is stale; run 'pnpm platform:nginx -- --write'");
  for (const app of data.apps) {
    errors.push(...validateRecipePolicy(root, app));
    for (const path of Object.values(app.paths).filter(Boolean)) {
      if (!existsSync(resolve(root, path))) errors.push(`${app.id}: missing path ${path}`);
    }
    if (app.docker) {
      if (!existsSync(resolve(root, app.docker.dockerfile))) errors.push(`${app.id}: missing ${app.docker.dockerfile}`);
      if (!compose.match(new RegExp(`^  ${escapeRegex(app.docker.service)}:`, "m"))) errors.push(`${app.id}: Docker service is absent from Compose`);
      if (!compose.includes(`container_name: ${app.docker.containerName}`)) errors.push(`${app.id}: container name ${app.docker.containerName} is absent from Compose`);
      for (const volume of app.docker.volumes) {
        if (!compose.match(new RegExp(`^  ${escapeRegex(volume)}:`, "m"))) errors.push(`${app.id}: volume ${volume} is not declared in Compose`);
      }
      if (app.backup && app.backup.container !== app.docker.containerName) errors.push(`${app.id}: backup container does not match registered container name`);
    } else if (app.web || app.api || app.backup) {
      errors.push(`${app.id}: hosted web, API, or backup wiring requires a Docker service`);
    }
    if (app.nginx) {
      if (!nginx.includes(`location ${app.nginx.route}`)) errors.push(`${app.id}: Nginx route ${app.nginx.route} is absent`);
      if (!nginx.includes(app.nginx.upstream)) errors.push(`${app.id}: Nginx upstream ${app.nginx.upstream} is absent`);
    } else if (app.web) {
      errors.push(`${app.id}: a hosted web app requires an Nginx route`);
    }
    if (app.api && !app.api.healthPath && app.recipe.includes("legacy")) warnings.push(`${app.id}: legacy API has no registered health endpoint`);
  }

  const trackedEnv = spawnSync("git", ["ls-files", "*.env", ".env", "**/.env"], { cwd: root, encoding: "utf8" });
  if (trackedEnv.stdout.trim()) errors.push(`Tracked secret environment files: ${trackedEnv.stdout.trim().replaceAll("\n", ", ")}`);
  return { errors, warnings };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const [command = "check", ...args] = process.argv.slice(2).filter((arg) => arg !== "--");
try {
  if (command === "list") {
    print(registry().apps.map(({ id, displayName, status, web, docker }) => ({ id, displayName, status, basePath: web?.basePath ?? null, service: docker?.service ?? null })));
  } else if (command === "inspect") {
    print(appById(args[0]));
  } else if (command === "recipe") {
    print(loadRecipe(root, args[0]));
  } else if (command === "scan") {
    const app = appById(args[0]);
    print({ appId: app.id, references: referencesFor(app) });
  } else if (command === "impact") {
    const [id, type] = args;
    const app = type === "create" ? null : appById(id);
    if (!impactMap[type]) throw new Error(`Unknown change type '${type}'. Use: ${Object.keys(impactMap).join(", ")}`);
    print({ appId: id, changeType: type, requiredSurfaces: impactMap[type], currentReferences: app ? referencesFor(app) : [] });
  } else if (command === "check") {
    const result = validate();
    print(result);
    if (result.errors.length) process.exitCode = 1;
  } else {
    throw new Error("Usage: platform.mjs [list|recipe RECIPE|inspect APP|scan APP|impact APP TYPE|check]");
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
