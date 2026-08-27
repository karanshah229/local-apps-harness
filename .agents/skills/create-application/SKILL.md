---
name: create-application
description: Create a new web, full-stack, desktop, Android, iOS, or multi-stack hybrid application and integrate every required workspace, container, route, data, health, backup, test, and registry edge.
---

# Create an application

1. Require a completed product ledger from `understand-product-request`.
2. Read `.agents/references/recipe-contracts.md`, select the appropriate composable layers (web, desktop, mobile, API, database) based strictly on user requirements (or ask clarifying questions if ambiguous), run `pnpm platform:recipe -- <recipe-id>`, and verify cross-layer compatibility before finalizing the implementation plan. Invoke `review-stack-exception` only if no recipe or combination can meet a concrete requirement.
3. Invoke `plan-connected-change` with `create`; allocate unique IDs, paths, packages, routes, ports, databases, and desktop/mobile bundle IDs.
4. Create only requested product behavior through the relevant frontend (`build-react-frontend`), desktop (`build-tauri-desktop`), mobile (`build-react-native-expo`, `build-native-android`, `build-native-ios`), backend (`build-fastify-backend`), or data build skills. Add the technical application contract from `.agents/references/app-contract.md`.
5. After source, Dockerfile, and Compose wiring exist, register a complete record with `pnpm platform:register -- <record.json> --confirm`; it generates Nginx and rolls both files back if validation fails. Then test and invoke `verify-connected-change`.

Complete when the requested journeys work from the registered access URL, desktop binary, or mobile artifact, the registered stack passes its recipe policy, and no operational edge is missing.
