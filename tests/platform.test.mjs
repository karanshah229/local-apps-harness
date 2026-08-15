import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { validateRecipePolicy } from "../scripts/recipe-policy.mjs";

const root = resolve(import.meta.dirname, "..");

test("platform schemas are valid JSON", () => {
  for (const schema of ["apps.schema.json", "change-record.schema.json"]) {
    assert.doesNotThrow(() => JSON.parse(readFileSync(resolve(root, "platform", schema), "utf8")), schema);
  }
});

test("application registry and operational wiring are consistent", () => {
  const result = spawnSync(process.execPath, ["scripts/platform.mjs", "check"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.errors, []);
});

test("local-network ingress binds port 80 on every host interface", () => {
  const compose = readFileSync(resolve(root, "infra/docker-compose.yml"), "utf8");
  assert.match(compose, /0\.0\.0\.0:80:80/);
});

test("route changes include every connected operational surface", () => {
  const result = spawnSync(process.execPath, ["scripts/platform.mjs", "impact", "microsoft-todo", "route"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  for (const surface of ["web", "api", "mobile", "environment", "nginx", "health", "tests", "registry"]) {
    assert.ok(report.requiredSurfaces.includes(surface), `missing ${surface}`);
  }
});

test("safety hook blocks destructive Docker volume removal", () => {
  const result = spawnSync(process.execPath, [".agents/scripts/validate-tool-call.mjs"], {
    cwd: root,
    encoding: "utf8",
    input: JSON.stringify({ tool_args: { CommandLine: "docker compose down -v" } }),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BLOCKED/);
});

test("safety hook allows read-only status commands", () => {
  const result = spawnSync(process.execPath, [".agents/scripts/validate-tool-call.mjs"], {
    cwd: root,
    encoding: "utf8",
    input: JSON.stringify({ tool_args: { CommandLine: "docker compose ps" } }),
  });
  assert.equal(result.status, 0, result.stderr);
});

test("minimal recipes explicitly exclude common feature creep", () => {
  for (const recipeId of ["full-stack-sqlite", "full-stack-postgresql"]) {
    const recipe = JSON.parse(readFileSync(resolve(root, `templates/${recipeId}/recipe.json`), "utf8"));
    for (const capability of ["authentication", "roles", "analytics", "notifications", "search", "uploads", "realtime", "reports"]) {
      assert.ok(recipe.forbiddenDefaults.includes(capability), `${recipeId} may silently add ${capability}`);
    }
  }
});

test("every web recipe includes shadcn/ui", () => {
  for (const recipeId of ["react-web", "full-stack-sqlite", "full-stack-postgresql"]) {
    const recipe = JSON.parse(readFileSync(resolve(root, `templates/${recipeId}/recipe.json`), "utf8"));
    assert.ok(recipe.stack.includes("shadcn-ui"), `${recipeId} must include shadcn/ui`);
  }
});

test("agent build and repair paths reach centralized technical contracts", () => {
  const expectedPointers = new Map([
    [".agents/skills/build-react-frontend/SKILL.md", ["references/ui-styling.md", "references/recipe-contracts.md"]],
    [".agents/skills/build-fastify-backend/SKILL.md", ["references/backend-design.md"]],
    [".agents/skills/verify-connected-change/SKILL.md", ["references/verification-contract.md"]],
  ]);
  for (const [path, pointers] of expectedPointers) {
    const content = readFileSync(resolve(root, path), "utf8");
    for (const pointer of pointers) assert.ok(content.includes(pointer), `${path} does not reach ${pointer}`);
  }
});

test("observability is one model-invoked skill rather than repeated pointers", () => {
  const skill = readFileSync(resolve(root, ".agents/skills/observability/SKILL.md"), "utf8");
  assert.match(skill, /description: .*every application creation or change/);
  assert.match(skill, /correlation ID crossing client, Nginx, Fastify, and database work/);
  assert.match(skill, /Force one representative failure/);
  assert.equal(existsSync(resolve(root, ".agents/references/observability.md")), false);
  for (const path of [
    ".agents/skills/build-react-frontend/SKILL.md",
    ".agents/skills/build-fastify-backend/SKILL.md",
    ".agents/skills/build-expo-mobile/SKILL.md",
    ".agents/skills/manage-postgres-prisma/SKILL.md",
    ".agents/skills/diagnose-and-repair/SKILL.md",
    ".agents/skills/manage-nginx-routing/SKILL.md",
    ".agents/skills/manage-docker-services/SKILL.md",
    ".agents/skills/backup-and-restore/SKILL.md",
    ".agents/skills/deploy-and-rollback/SKILL.md",
  ]) {
    assert.doesNotMatch(readFileSync(resolve(root, path), "utf8"), /observability\.md/);
  }
});

test("verification contract names real tools for every application layer", () => {
  const contract = readFileSync(resolve(root, ".agents/references/verification-contract.md"), "utf8");
  for (const tool of ["Playwright", "curl", "Prisma migrations", "Maestro", "Espresso", "XCTest/XCUITest"]) {
    assert.ok(contract.includes(tool), `verification contract is missing ${tool}`);
  }
  assert.match(contract, /correlated, redacted diagnostic events/);
});

test("backend contract guards normalization, service seams, and N+1 queries", () => {
  const contract = readFileSync(resolve(root, ".agents/references/backend-design.md"), "utf8");
  assert.match(contract, /deep modules with small interfaces/);
  assert.match(contract, /third normal form/);
  assert.match(contract, /N\+1/);
  assert.match(contract, /query budget/);
});

test("UI contract rejects the default AI palette unless explicitly requested", () => {
  const contract = readFileSync(resolve(root, ".agents/references/ui-styling.md"), "utf8");
  assert.match(contract, /excludes purple, violet, and indigo/);
  assert.match(contract, /only when the confirmed requirement ledger quotes the user's explicit request/);
  assert.match(contract, /scan theme tokens, CSS, and utility classes/);
});

test("PostgreSQL recipe rejects SQLite data", () => {
  const errors = validateRecipePolicy(root, {
    id: "custom-events",
    status: "planned",
    recipe: "full-stack-postgresql",
    paths: { web: "apps/custom-events-web", api: "apps/custom-events-api" },
    api: { internalPort: 5010, healthPath: "/healthz" },
    data: { engine: "sqlite", database: "events.db" },
    backup: { strategy: "filesystem" },
  });
  assert.ok(errors.some((error) => /requires PostgreSQL data/.test(error)));
  assert.ok(errors.some((error) => /PostgreSQL backup strategy/.test(error)));
});

test("PostgreSQL recipe accepts PostgreSQL data", () => {
  assert.deepEqual(validateRecipePolicy(root, {
    id: "custom-events",
    status: "planned",
    recipe: "full-stack-postgresql",
    paths: { web: "apps/custom-events-web", api: "apps/custom-events-api" },
    api: { internalPort: 5010, healthPath: "/healthz" },
    data: { engine: "postgresql", database: "custom_events" },
    backup: { strategy: "postgresql" },
  }), []);
});

test("SQLite recipe accepts SQLite data with a persistent volume and filesystem backup", () => {
  assert.deepEqual(validateRecipePolicy(root, {
    id: "custom-events",
    status: "planned",
    recipe: "full-stack-sqlite",
    paths: { web: "apps/custom-events-web", api: "apps/custom-events-api" },
    api: { internalPort: 5010, healthPath: "/healthz" },
    data: { engine: "sqlite", database: "events.db" },
    docker: { volumes: ["custom-events-data"] },
    backup: { strategy: "filesystem" },
  }), []);
});

test("registration rejects a database that contradicts its recipe without changing the registry", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "recipe-policy-"));
  const record = resolve(directory, "custom-events.json");
  const registryPath = resolve(root, "platform/apps.json");
  const before = readFileSync(registryPath, "utf8");
  writeFileSync(record, JSON.stringify({
    id: "custom-events-policy-probe",
    displayName: "Custom Events",
    recipe: "full-stack-postgresql",
    status: "planned",
    capabilities: ["events", "whatsapp-sharing"],
    paths: { web: "apps/custom-events-web", api: "apps/custom-events-api" },
    web: { basePath: "/events" },
    api: { internalPort: 5010, healthPath: "/healthz" },
    data: { engine: "sqlite", database: "events.db" },
    docker: { service: "custom-events", containerName: "custom-events-app", dockerfile: "apps/custom-events-api/Dockerfile", volumes: ["custom-events-data"] },
    nginx: { route: "/events/", upstream: "custom-events:5010" },
    backup: { strategy: "filesystem", container: "custom-events-app", containerPath: "/app/data" },
    mobile: null,
  }));
  try {
    const result = spawnSync(process.execPath, ["scripts/register-app.mjs", record, "--confirm"], { cwd: root, encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /full-stack-postgresql recipe requires PostgreSQL data/);
    assert.equal(readFileSync(registryPath, "utf8"), before);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("recipe command returns exact SQLite and PostgreSQL planning contracts", () => {
  for (const [recipeId, database] of [["full-stack-sqlite", "sqlite"], ["full-stack-postgresql", "postgresql"]]) {
    const result = spawnSync(process.execPath, ["scripts/platform.mjs", "recipe", recipeId], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const recipe = JSON.parse(result.stdout);
    assert.equal(recipe.id, recipeId);
    assert.ok(recipe.stack.includes("shadcn-ui"));
    assert.ok(recipe.stack.includes(database));
  }
});

test("backup planning is deterministic and excludes secrets", () => {
  const result = spawnSync(process.execPath, ["scripts/backup-app.mjs", "microsoft-todo", "--plan"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.appId, "microsoft-todo");
  assert.ok(plan.excludes.includes(".env"));
});

test("a real local backup can be verified in disposable storage", () => {
  const backup = spawnSync(process.execPath, ["scripts/backup-app.mjs", "microsoft-todo", "--confirm"], { cwd: root, encoding: "utf8" });
  assert.equal(backup.status, 0, backup.stderr);
  const destination = JSON.parse(backup.stdout).destination;
  try {
    const verify = spawnSync(process.execPath, ["scripts/restore-app.mjs", "microsoft-todo", destination, "--verify"], { cwd: root, encoding: "utf8" });
    assert.equal(verify.status, 0, verify.stderr);
    const report = JSON.parse(verify.stdout);
    assert.equal(report.status, "verified");
    assert.ok(report.sqliteDatabases >= 1);
  } finally {
    const absolute = resolve(root, destination);
    if (existsSync(absolute)) rmSync(absolute, { recursive: true, force: true });
  }
});

test("approved restore overwrites only registered data in an isolated workspace", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "restore-workspace-"));
  const database = resolve(directory, "apps/example/data.db");
  mkdirSync(resolve(directory, "scripts"), { recursive: true });
  mkdirSync(resolve(directory, "platform"), { recursive: true });
  mkdirSync(resolve(directory, "apps/example"), { recursive: true });
  cpSync(resolve(root, "scripts/backup-app.mjs"), resolve(directory, "scripts/backup-app.mjs"));
  cpSync(resolve(root, "scripts/restore-app.mjs"), resolve(directory, "scripts/restore-app.mjs"));
  cpSync(resolve(root, "apps/microsoft-todo-server/todo.db"), database);
  writeFileSync(resolve(directory, "platform/apps.json"), JSON.stringify({ apps: [{
    id: "example",
    displayName: "Example",
    docker: { service: "example", containerName: "missing-example-container" },
    backup: { strategy: "filesystem", container: "missing-example-container", containerPath: "/app/data", localPaths: ["apps/example/data.db"] },
  }] }));
  try {
    const backup = spawnSync(process.execPath, ["scripts/backup-app.mjs", "example", "--confirm"], { cwd: directory, encoding: "utf8" });
    assert.equal(backup.status, 0, backup.stderr);
    const original = readFileSync(database);
    writeFileSync(database, "temporary newer data");
    const destination = JSON.parse(backup.stdout).destination;
    const restore = spawnSync(process.execPath, ["scripts/restore-app.mjs", "example", destination, "--confirm-overwrite"], { cwd: directory, encoding: "utf8" });
    assert.equal(restore.status, 0, restore.stderr);
    assert.deepEqual(readFileSync(database), original);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("secret scanner allows references but blocks a staged literal", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "secret-scan-"));
  const scanner = resolve(root, ".agents/scripts/check-secrets.mjs");
  const git = (...args) => spawnSync("git", args, { cwd: directory, encoding: "utf8" });
  try {
    assert.equal(git("init", "-q").status, 0);
    writeFileSync(resolve(directory, "safe.tf"), "password = var.db_password\napi_key = process.env.API_KEY\n");
    assert.equal(git("add", "safe.tf").status, 0);
    const safe = spawnSync(process.execPath, [scanner, "--root", directory], { encoding: "utf8" });
    assert.equal(safe.status, 0, safe.stderr);

    writeFileSync(resolve(directory, "unsafe.tf"), `${["api", "key"].join("_")} = "literal-secret-123"\n`);
    assert.equal(git("add", "unsafe.tf").status, 0);
    const unsafe = spawnSync(process.execPath, [scanner, "--root", directory], { encoding: "utf8" });
    assert.notEqual(unsafe.status, 0);
    assert.match(unsafe.stderr, /possible literal secret/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Tailscale planning is non-mutating and targets loopback", () => {
  const result = spawnSync(process.execPath, ["scripts/configure-tailscale.mjs", "--plan"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.match(plan.action, /127\.0\.0\.1:80/);
  assert.equal(plan.changesPublicExposure, false);
});

test("registration rejects duplicate operational identity without changing the registry", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "platform-register-"));
  const record = resolve(directory, "duplicate.json");
  const registryPath = resolve(root, "platform/apps.json");
  const before = readFileSync(registryPath, "utf8");
  writeFileSync(record, JSON.stringify({
    id: "microsoft-todo",
    displayName: "Duplicate",
    recipe: "react-web",
    status: "planned",
    capabilities: [],
    paths: { web: "apps/duplicate", api: null },
    web: { basePath: "/duplicate" },
    api: null,
    data: null,
    docker: { service: "duplicate", dockerfile: "apps/duplicate/Dockerfile", volumes: [] },
    nginx: { route: "/duplicate/", upstream: "duplicate:80" },
    backup: null,
    mobile: null,
  }));
  const result = spawnSync(process.execPath, ["scripts/register-app.mjs", record, "--confirm"], { cwd: root, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate id/i);
  assert.equal(readFileSync(registryPath, "utf8"), before);
  rmSync(directory, { recursive: true, force: true });
});

test("deployment defaults to a non-mutating approval plan", () => {
  const result = spawnSync(process.execPath, ["scripts/deploy-app.mjs", "stock-manager", "--plan"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.service, "stock");
  assert.match(plan.approval, /explicit approval/i);
  assert.ok(plan.sequence.includes("rollback-images-on-failure"));
});
