---
name: deploy-and-rollback
description: Deploy a validated local checkpoint through Docker Compose, Nginx, and Tailscale with backup, approval, immutable versioning, health gates, journey checks, and automatic rollback.
---

# Deploy and roll back

1. Read `.agents/references/approval-policy.md`; resolve the app, current release, data, volumes, route, and rollback image.
2. Require a clean validated checkpoint and successful `verify-connected-change`; inspect `pnpm platform:deploy -- <app-id> --plan`.
3. Ask for approval immediately before changing the live service, then run the deterministic deploy with `--confirm-live-change`; it backs up mutable data and captures rollback images.
4. Validate the registered access URL and confirmed smoke journeys after its container and Nginx gates pass.
5. On failure, restore the prior image/configuration and verify the previous journeys before reporting.

Complete when the new registered URL works and rollback is recorded, or the previous version is proven restored.
