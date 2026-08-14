# Skill: Local Application Deployment

This guide explains how to spin up and build workspace applications locally.

## Workspace Management (using pnpm)

### Install All Dependencies
```bash
pnpm install
```
This generates the root lockfile and links workspaces together.

### Run All Applications Concurrently
```bash
pnpm dev
```
Runs the turbo dev pipeline, spinning up all services in parallel.

### Build All Workspaces
```bash
pnpm build
```

## Running Target Services
Use filters to isolate execution to a single app:

### Spin up SIP Manager Backend
```bash
pnpm --filter sip-manager-backend dev
```

### Spin up Stock Manager Client
```bash
pnpm --filter stock-manager-client dev
```

### Run Prisma Migrations (inside SIP Manager Backend)
```bash
pnpm --filter sip-manager-backend prisma db push
```
