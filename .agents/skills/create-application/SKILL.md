---
name: create-application
description: Create a new web, full-stack, Android, iOS, or shared mobile application and integrate every required workspace, container, route, data, health, backup, test, and registry edge.
---

# Create an application

1. Require a completed product ledger from `understand-product-request`.
2. Read `.agents/references/recipe-contracts.md`, select the recipe, and run `pnpm platform:recipe -- <recipe-id>`. Use the exact returned stack in the implementation plan. Invoke `review-stack-exception` only if no recipe can meet a concrete requirement.
3. Invoke `plan-connected-change` with `create`; allocate unique IDs, paths, packages, routes, ports, databases, and mobile bundle IDs.
4. Create only requested product behavior through the recipe-relevant frontend, backend, data, or mobile build skills. Add the technical application contract from `.agents/references/app-contract.md`.
5. After source, Dockerfile, and Compose wiring exist, register a complete record with `pnpm platform:register -- <record.json> --confirm`; it generates Nginx and rolls both files back if validation fails. Then test and invoke `verify-connected-change`.

Complete when the requested journeys work from the registered access URL or mobile artifact, the registered stack passes its recipe policy, and no operational edge is missing.
