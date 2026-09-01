import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function waitForHealth(port, child, output) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode})\n${output.join("")}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok && (await response.json()).status === "ok") return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`health check timed out\n${output.join("")}`);
}

async function runServerJourney({ directory, env }) {
  const port = await freePort();
  const output = [];
  const scriptPath = existsSync(resolve(root, directory, "dist/server.js"))
    ? "dist/server.js"
    : "src/server.js";
  const child = spawn(process.execPath, [scriptPath], {
    cwd: resolve(root, directory),
    env: { ...process.env, ...env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));
  try {
    await waitForHealth(port, child, output);
    const response = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(response.status, 200);
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolveExit) => {
      if (child.exitCode !== null) resolveExit();
      else {
        child.once("exit", resolveExit);
        setTimeout(() => { child.kill("SIGKILL"); resolveExit(); }, 2000).unref();
      }
    });
  }
}

test("Stock Manager API starts with disposable data/uploads and reports healthy", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "stock-journey-"));
  const uploads = resolve(directory, "uploads");
  mkdirSync(uploads);
  try {
    await runServerJourney({
      directory: "apps/stock-manager-server",
      env: { DATABASE_PATH: resolve(directory, "stock.db"), UPLOADS_PATH: uploads },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
