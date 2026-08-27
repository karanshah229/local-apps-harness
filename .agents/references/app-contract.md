# Connected application contract

Read this reference for app creation, rename, base-path, port, API, database, environment, container, route, desktop, or mobile identity work.

Apply `verification-contract.md` across every included surface. Apply `backend-design.md` whenever API, business logic, persistence, or database queries are affected.

## Creation

Account for the chosen source recipe, unique app/package identity, requested capabilities, environment template, deterministic ports, health endpoint, Dockerfile, Compose service and volumes, Nginx route/upstream/redirect, registered access URL, backup handler, tests, and `platform/apps.json`. Include the recipe's database and Prisma only when the app needs server-side data. Include desktop or mobile only when requested.

## Identity and rename

Separate display name, stable registry ID, source paths, package names, Docker service/image, database, Android package, iOS bundle ID, routes, and user-facing URLs. Change only identities included in the request or technically forced by it. Preserve data. Prefer redirects for changed public paths. Scan actual references before and after.

## Base path and API

Check React router basename, Vite base, asset URLs, API clients, Fastify prefix, CORS, WebSocket paths, Nginx exact redirect and prefix location, desktop and mobile API environments, health probes, browser tests, and registry metadata.

## Port and containers

Keep host exposure behind Nginx. Check Fastify listen port, Docker `EXPOSE`, Compose `expose`/healthcheck/dependencies, Nginx upstream, registry, probes, and port uniqueness. Preserve volume ownership across service renames.

When introducing or moving a volume, capture the old in-container/local data path and migrate that backup into the new volume before health or journey checks. A healthy empty database is a failed migration.

## Data

Couple every Prisma migration to a verified backup and disposable-data test. Account for existing rows, nullability, defaults, uniqueness, indexes, API validation, UI states, fixtures, deployment order, and rollback limitations. Require approval for loss or meaning changes.

## Environment and secrets

Keep values in untracked service `.env` files. Keep names and descriptions in `.env.example`. Check startup validation, web/desktop/mobile public-variable rules, Compose `env_file`, tests, deployment preflight, and redaction.

## Desktop (Tauri)

Check Tauri configuration (`tauri.conf.json`), window properties, Rust backend commands/invocations, bundle identifier, capabilities/permissions, system tray, local filesystem security scopes, icons, and platform-specific desktop builds (macOS `.dmg`/`.app`, Windows `.msi`/`.exe`, Linux `.deb`/`.AppImage`).

## Mobile (React Native Expo, Native Android Kotlin, Native iOS Swift)

Check mobile app configuration, API base URL, permissions, icons/splash, deep links, build/version numbers, Android package name, iOS bundle ID, entitlements, build profiles, device/simulator tests, and registry artifacts. Test both platforms when a shared cross-platform app is affected.

## Completion

Run `pnpm platform:check`, scan old and new identifiers, build affected packages/images/binaries, validate Compose and Nginx, execute requested journeys, and confirm the requirement ledger contains no invented visible behavior.
