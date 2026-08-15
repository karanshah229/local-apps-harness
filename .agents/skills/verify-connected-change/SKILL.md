---
name: verify-connected-change
description: Verify after app creation or change that source, data, mobile, environment, Docker, Nginx, Tailscale, health, backup, tests, and registry are complete with no stale references.
---

# Verify a connected change

1. Read `../../references/verification-contract.md`; compare the completed work with its change record and account for every required surface.
2. Run `pnpm platform:check` and `pnpm platform:scan -- <app-id>`; scan previous identifiers separately after rename, route, port, or identity changes.
3. Build affected packages/images and validate Compose, Nginx, Prisma migrations, health, and relevant mobile configuration.
4. Run confirmed user journeys and affected regressions at the registered access URL or device target.
5. Compare visible behavior with requested/confirmed/excluded requirements and remove invented behavior.

Complete only when every applicable verification-matrix row and required surface passes, no unintended stale identifier remains, and rollback information is current.
