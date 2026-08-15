# Preferred recipe contracts

Read only when creating an application or reviewing a stack exception.

## Selection

- Use `full-stack` whenever requested behavior stores, shares, or processes data on a server. App size does not change this choice.
- Use `react-web` only when the browser experience needs no server-side data or behavior.
- Use `expo-mobile` for a requested mobile app.
- Treat registered `legacy` recipes as descriptions of existing apps, never as templates for new apps.

## React web

Use React Router when there is more than one route and TanStack Query for server state. Copy only shadcn components used by confirmed screens. Keep the app deployable below its registered base path.

## Full stack

Use Zod-compatible request schemas and `/healthz`. Keep database credentials server-only. Serve the web build through the application service unless the registry records a separate service.

## Expo mobile

Use shared design tokens and platform-native components. Support Android APK and iOS simulator/local signed IPA. Upload to TestFlight only after approval.

## Exception

Use another stack only for a concrete unmet requirement. Record the evidence, rejected preferred-stack approach, maintenance cost, and how the exception implements the common health, environment, container, test, backup, deployment, and rollback contract. Complete the review only after its recipe exists under `templates/` and passes repository validation.
