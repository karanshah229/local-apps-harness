---
name: manage-postgres-prisma
description: Manage this workspace's PostgreSQL and Prisma schemas, migrations, data compatibility, backups, containers, deployment order, and rollback risks.
---

# Manage PostgreSQL through Prisma

1. Resolve the registered database, Prisma schema, clients, and backup handler; read `../../references/backend-design.md`.
2. Model only requested data. Account for existing rows, nullability, defaults, uniqueness, indexes, relations, and deletion behavior.
3. Back up before applying a live migration. Require approval for loss or meaning changes.
4. Generate a named migration, inspect its SQL, and test it against disposable representative data, including constraints, indexes, query plans, and query-count budgets.
5. Update validation, API, UI/mobile states, fixtures, Compose dependencies, health, deployment order, and registry metadata.

Complete when migration and application tests pass and restore/rollback limitations are recorded in plain language.
