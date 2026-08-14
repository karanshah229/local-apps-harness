# Preferred recipe contracts

Read only when creating an application or reviewing a stack exception.

## React web

Use TypeScript, Vite, React Router when there is more than one route, TanStack Query for server state, Tailwind, and shadcn/ui. Copy only shadcn components used by confirmed screens. Keep the app deployable below its registered base path.

## Full stack

Pair the React recipe with TypeScript Fastify, Zod-compatible request schemas, PostgreSQL, Prisma schema/migrations, `/healthz`, Vitest, and Playwright. Keep database credentials server-only. Serve the web build through the application service unless the registry records a separate service.

## Expo mobile

Use Expo, React Native, TypeScript, NativeWind, and shared design tokens. Keep platform-native components rather than browser shadcn components. Support Android APK and iOS simulator/local signed IPA. Upload to TestFlight only after approval.

## Exception

Use another stack only for a concrete unmet requirement. Record the evidence, rejected preferred-stack approach, maintenance cost, and how the exception implements the common health, environment, container, test, backup, deployment, and rollback contract.
