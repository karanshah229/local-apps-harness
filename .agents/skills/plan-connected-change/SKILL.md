---
name: plan-connected-change
description: Map all repository and operational side effects before changing an app identity, route, port, API, database, environment, container, mobile configuration, or creating an app.
---

# Plan a connected change

1. Resolve the app in `platform/apps.json`; use `create` for an unregistered app.
2. Run `pnpm platform:impact -- <app-id> <create|rename|route|port|api|database|environment|mobile>`.
3. Read `.agents/references/app-contract.md` for the selected branch.
4. Scan actual references with `pnpm platform:scan -- <app-id>` and inspect relevant configs rather than trusting the registry alone.
5. Produce a change record matching `platform/change-record.schema.json`, including every affected surface, verification, approval gate, and rollback.

Complete when every actual reference and every required surface is accounted for or explicitly proven unaffected.
