# Preferred recipe contracts

Read only when creating an application or reviewing a stack exception.

## Selection

- Use `react-web` only when the browser experience needs no server-side data or behavior.
- Use `full-stack-sqlite` for server-side behavior that runs as one application instance, expects modest write concurrency, keeps data on its local private volume, and can use verified file-level backup and restore.
- Use `full-stack-postgresql` when the confirmed behavior or scale needs multiple application instances, sustained concurrent writes, shared database access from multiple services, replication or high availability, or online/managed recovery such as point-in-time restore.
- Use `expo-mobile` for a requested mobile app.
- Treat registered `legacy` recipes as descriptions of existing apps, never as templates for new apps.

## React web

Use React Router when there is more than one route and TanStack Query for server state. Copy only shadcn components used by confirmed screens. Keep the app deployable below its registered base path.

## Full stack data

Choose the database from confirmed product and operating needs without asking the user to choose technology. Record the reason in the implementation plan. Use Zod-compatible request schemas and `/healthz`. Keep database access server-only. Serve the web build through the application service unless the registry records a separate service.

## Expo mobile

Use shared design tokens and platform-native components. Support Android APK and iOS simulator/local signed IPA. Upload to TestFlight only after approval.

## Exception

Use another stack only for a concrete unmet requirement. Record the evidence, rejected preferred-stack approach, maintenance cost, and how the exception implements the common health, environment, container, test, backup, deployment, and rollback contract. Complete the review only after its recipe exists under `templates/` and passes repository validation.
