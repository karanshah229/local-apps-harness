#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const ignored = new Set([".git", ".local", ".turbo", "node_modules", "dist", "build", "coverage"]);
const files = [];
function walk(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(item.name)) continue;
    const path = resolve(directory, item.name);
    if (item.isDirectory()) walk(path);
    else if (item.isFile() && statSync(path).size < 1_000_000) files.push(path);
  }
}
walk(root);

const failures = [];
for (const file of files.filter((path) => path.endsWith(".mjs") || /\/apps\/[^/]+-server\/src\/.*\.js$/.test(path))) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) failures.push(`${relative(root, file)}: JavaScript syntax error\n${result.stderr.trim()}`);
}
for (const file of files.filter((path) => path.endsWith(".json"))) {
  try { JSON.parse(readFileSync(file, "utf8")); } catch (error) { failures.push(`${relative(root, file)}: invalid JSON (${error.message})`); }
}
for (const file of files.filter((path) => /\.agents\/(?:skills\/[^/]+\/SKILL|workflows\/[^/]+)\.md$/.test(path))) {
  const source = readFileSync(file, "utf8");
  if (!source.startsWith("---\n") || !/\n(?:name|description):\s*.+/.test(source)) failures.push(`${relative(root, file)}: missing instruction frontmatter`);
}
for (const args of [["diff", "--check"], ["diff", "--cached", "--check"]]) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) failures.push(result.stdout.trim() || result.stderr.trim());
}
const platform = spawnSync(process.execPath, ["scripts/platform.mjs", "check"], { cwd: root, encoding: "utf8" });
if (platform.status !== 0) failures.push(platform.stderr.trim() || platform.stdout.trim());

if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`Workspace lint passed (${files.length} files checked).\n`);
