---
name: backup-and-restore
description: Back up, verify, retain, or restore registered PostgreSQL or SQLite data, uploads, and local operational configuration without exporting local secrets.
---

# Back up and restore

1. Resolve the app's data engine, uploads, volumes, backup handler, retention, and current release from the registry.
2. Inspect with `pnpm platform:backup -- <app-id> --plan`, then create a timestamped local backup with `--confirm`. Keep app ID, source checkpoint/schema state where applicable, and checksums; exclude `.env` values.
3. Verify a backup in disposable storage with `pnpm platform:restore -- <app-id> <backup-directory|latest> --verify` before calling it valid.
4. Preview restore with `--plan`, explain the registered database/uploads that will be overwritten, and ask immediately before `--confirm-overwrite`.
5. The built-in filesystem handler restores registered SQLite data, creates a safety backup first, scopes container changes to one service, checks health, and rolls back on failure. A PostgreSQL app must register and implement its dump/restore handler before use; never substitute file copying.
6. Restore in dependency order, run migrations only when required, then verify health and confirmed journeys.

Complete when the backup has a verified restore test or the restored app has passed its data and user checks.
