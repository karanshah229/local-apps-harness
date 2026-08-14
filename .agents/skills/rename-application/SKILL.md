---
name: rename-application
description: Rename an application safely across visible copy, registry identity, source paths, packages, containers, routes, data, Android, and iOS without stale references or data loss.
---

# Rename an application

1. Clarify which identities change: display name, stable ID, URL, source/package, Docker, database, Android package, or iOS bundle ID.
2. Invoke `plan-connected-change` with `rename` and read the identity branch of `.agents/references/app-contract.md`.
3. Preserve data and keep a redirect when the user-facing route changes.
4. Apply the resolved identity map across all discovered references and the registry.
5. Scan both old and new values, build, test, and invoke `verify-connected-change`.

Complete when intended old values are absent, preserved URLs redirect, data remains accessible, and all new identities are unique.
