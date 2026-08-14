#!/usr/bin/env node

let input = "";
for await (const chunk of process.stdin) input += chunk;

try {
  const context = input.trim() ? JSON.parse(input) : {};
  const args = context.tool_args ?? context.arguments ?? {};
  const command = String(args.CommandLine ?? args.command ?? args.cmd ?? "");
  const blocked = [
    { pattern: /(?:^|\s)rm\s+-[^\n]*r[^\n]*f[^\n]*(?:\s\/|\s~|\$HOME)/i, reason: "broad filesystem deletion" },
    { pattern: /\b(?:mkfs|diskutil\s+erase|dd\s+if=)\b/i, reason: "disk destruction" },
    { pattern: /docker\s+(?:compose\s+)?(?:down[^\n]*\s-v|volume\s+(?:rm|prune)|system\s+prune)/i, reason: "Docker data deletion" },
    { pattern: /\bterraform\s+destroy\b/i, reason: "infrastructure destruction" },
    { pattern: /\b(?:prisma\s+migrate\s+reset|dropdb|DROP\s+(?:DATABASE|SCHEMA|TABLE))\b/i, reason: "database destruction" },
    { pattern: /\bgit\s+(?:reset\s+--hard|clean\s+-[^\n]*f|push[^\n]*--force|checkout\s+--\s+\.)/i, reason: "destructive Git operation" },
    { pattern: /(?:password|secret|api[_-]?key|token)=[^\s$][^\s]*/i, reason: "literal secret in command" },
  ];
  const hit = blocked.find(({ pattern }) => pattern.test(command));
  if (hit) {
    process.stderr.write(`BLOCKED: ${hit.reason}. Use the repository's approved backup, restore, or rollback workflow.\n`);
    process.exit(1);
  }
  process.stdout.write("APPROVED: command passed workspace safety policy.\n");
} catch (error) {
  process.stderr.write(`BLOCKED: could not validate tool call (${error.message}).\n`);
  process.exit(1);
}
