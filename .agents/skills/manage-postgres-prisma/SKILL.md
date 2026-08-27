---
name: manage-postgres-prisma
description: Manage this workspace's PostgreSQL and Prisma schemas, migrations, data compatibility, backups, containers, deployment order, and rollback risks.
---

# Manage PostgreSQL through Prisma

1. Resolve the registered database, Prisma schema, clients, and backup handler; read `../../references/backend-design.md`.
2. For shared PostgreSQL (`workspace-postgres`), ensure the target database exists by running `node scripts/ensure-postgres-db.mjs <db_name>` before applying migrations.
3. Model only requested data. Account for existing rows, nullability, defaults, uniqueness, indexes, relations, and deletion behavior.
4. Back up before applying a live migration. Require approval for loss or meaning changes.
5. Generate a named migration, inspect its SQL, and test it against disposable representative data, including constraints, indexes, query plans, and query-count budgets.
6. Update validation, API, UI/mobile states, fixtures, Compose dependencies, health, deployment order, and registry metadata.

Complete when migration and application tests pass and restore/rollback limitations are recorded in plain language.
