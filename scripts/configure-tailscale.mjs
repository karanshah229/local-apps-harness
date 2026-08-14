#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const mode = process.argv.slice(2).filter((arg) => arg !== "--")[0] ?? "--status";
const target = "http://127.0.0.1:80";

function run(args) {
  return spawnSync("tailscale", args, { encoding: "utf8" });
}

function tailscaleState() {
  const result = run(["status", "--json"]);
  if (result.status !== 0) return { connected: false, reason: (result.stderr || result.stdout).trim() || "Tailscale is unavailable" };
  let status;
  try {
    status = JSON.parse(result.stdout);
  } catch {
    return { connected: false, reason: (result.stderr || result.stdout).trim() || "Tailscale returned an unreadable status" };
  }
  return {
    connected: status.BackendState === "Running",
    backendState: status.BackendState,
    dnsName: status.Self?.DNSName?.replace(/\.$/, "") ?? null,
    addresses: status.TailscaleIPs ?? [],
  };
}

const plan = {
  privacy: "Tailscale Serve forwards privately to local Nginx; the workspace also has separately requested local-network access on port 80.",
  action: `Tailscale Serve will share ${target} only with devices authorized on this tailnet.`,
  changesPublicExposure: false,
};

if (mode === "--plan") {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  process.exit(0);
}

const state = tailscaleState();

if (mode === "--status") {
  const serve = state.connected ? run(["serve", "status", "--json"]) : null;
  process.stdout.write(`${JSON.stringify({ ...state, serve: serve?.status === 0 ? JSON.parse(serve.stdout || "{}") : null }, null, 2)}\n`);
  process.exit(0);
}

if (mode !== "--confirm-private-access") {
  process.stderr.write("Usage: node scripts/configure-tailscale.mjs --plan|--status|--confirm-private-access\n");
  process.exit(1);
}
if (!state.connected) {
  process.stderr.write(`Tailscale is not connected (${state.backendState ?? state.reason}). Open Tailscale and connect this computer, then run this command again. Nothing was exposed.\n`);
  process.exit(1);
}

const configured = run(["serve", "--bg", "--yes", target]);
if (configured.status !== 0) {
  process.stderr.write(`${(configured.stderr || configured.stdout).trim()}\n`);
  process.exit(configured.status ?? 1);
}
const status = run(["serve", "status", "--json"]);
if (status.status !== 0) {
  process.stderr.write("Tailscale accepted the change, but its private URL could not be verified.\n");
  process.exit(1);
}
process.stdout.write(`${JSON.stringify({ status: "private-access-configured", target, dnsName: state.dnsName, serve: JSON.parse(status.stdout || "{}") }, null, 2)}\n`);
