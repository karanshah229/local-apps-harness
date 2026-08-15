# Preferred recipe contracts

Read only when creating an application or reviewing a stack exception.

## Selection

- Use `react-web` only when the browser experience needs no server-side data or behavior.
- Use `full-stack-sqlite` for server-side behavior that runs as one application instance, expects modest write concurrency, keeps data on its local private volume, and can use verified file-level backup and restore.
- Use `full-stack-postgresql` when the confirmed behavior or scale needs multiple application instances, sustained concurrent writes, shared database access from multiple services, replication or high availability, or online/managed recovery such as point-in-time restore.
- Use `expo-mobile` for a requested mobile app.
- Treat registered `legacy` recipes as descriptions of existing apps, never as templates for new apps.

## React web

Prefer the released TanStack OSS project that directly matches a confirmed need: Router for multiple navigable routes, Query for server state, Table for data grids, Virtual for measured long-list rendering cost, Form for complex validated forms, Store for shared client state, and Pacer for rate-controlled interactions. Consider TanStack charting or hotkey packages only after checking their current release maturity and passing `review-stack-exception` when the suitable package is prerelease or unpublished. Install no capability without a confirmed use. Copy only shadcn components used by confirmed screens. Keep the app deployable below its registered base path.

## Full stack data

Choose the database from confirmed product and operating needs without asking the user to choose technology. Record the reason in the implementation plan. Use Zod-compatible request schemas and `/healthz`. Keep database access server-only. Serve the web build through the application service unless the registry records a separate service.

When using `full-stack-postgresql`, apps must reuse the shared `postgres` service (`workspace-postgres`) in `infra/docker-compose.yml`. Do not spin up separate PostgreSQL containers per app. Allocate a distinct database name for each app on the shared instance. If the service is missing, declare it using image `postgres:15-alpine` and a persistent volume `postgres-data` before running the app.

## Expo mobile

Use shared design tokens and platform-native components. Support Android APK and iOS simulator/local signed IPA. Upload to TestFlight only after approval.

## Exception

Use another stack only for a concrete unmet requirement. Record the evidence, rejected preferred-stack approach, maintenance cost, and how the exception implements the common health, environment, container, test, backup, deployment, and rollback contract. Complete the review only after its recipe exists under `templates/` and passes repository validation.
