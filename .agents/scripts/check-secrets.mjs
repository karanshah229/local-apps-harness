#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const rootFlag = process.argv.indexOf("--root");
const root = rootFlag >= 0 ? resolve(process.argv[rootFlag + 1]) : resolve(import.meta.dirname, "../..");
if (rootFlag >= 0 && !process.argv[rootFlag + 1]) throw new Error("--root requires a directory");
const listed = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], { cwd: root, encoding: "utf8" });
if (listed.status !== 0) {
  process.stderr.write(listed.stderr);
  process.exit(listed.status ?? 1);
}

const secretFile = /(^|\/)(\.env(?:\..+)?|.*\.(?:pem|p12|pfx|key))$/i;
const assignment = /(?:password|secret|api[_-]?key|access[_-]?token|private[_-]?key)\s*[:=]\s*["']?([^\s"',}\]]+)/gi;
const safeReference = /^(?:\$\{|process\.env|import\.meta\.env|var\.|local\.|module\.|data\.|env\(|<|your-|example|changeme)/i;
const errors = [];
for (const file of listed.stdout.trim().split("\n").filter(Boolean)) {
  if (secretFile.test(file) && !file.endsWith(".env.example")) errors.push(`${file}: local secret file must remain untracked`);
  let content = "";
  try { content = readFileSync(resolve(root, file), "utf8"); } catch { continue; }
  for (const match of content.matchAll(assignment)) {
    const value = match[1];
    if (value.length >= 8 && !safeReference.test(value)) {
      errors.push(`${file}: possible literal secret`);
      break;
    }
  }
}
if (errors.length) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("No staged secret material detected.\n");
