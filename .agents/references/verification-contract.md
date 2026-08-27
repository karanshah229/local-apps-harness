# Verification contract

Read when planning or verifying application work.

Create a verification matrix from confirmed acceptance examples, changed interfaces, failure risks, and operational edges. Every applicable row needs an agent-runnable command, expected assertion, and retained result; mark a row not applicable only with evidence.

## Required layers

- **Source**: formatting, lint, type checking, dependency validation, production build, and focused unit tests.
- **Web**: Playwright against the registered base-path URL and real API. Cover confirmed journeys plus relevant loading, empty, validation, failure, retry, responsive, keyboard, accessibility, refresh/deep-link, browser-console, and failed-network states. Retain screenshots for changed screens and visual regressions.
- **Desktop (Tauri)**: `cargo test` for Rust commands and backend plugins; web frontend unit tests; Playwright / WebDriver / native test runner against the running Tauri webview window. Verify window lifecycle, system tray, local file operations, and platform builds.
- **API**: start the real service with disposable representative data, then use repeatable curl scripts and integration tests to assert health, success, validation, stable error shapes, status codes, idempotency where required, and dependency failures.
- **Database**: apply Prisma migrations to a disposable database, validate constraints, relations, indexes, representative existing rows, transaction behavior, and query plans/counts for list journeys. Run engine-specific integrity plus backup/restore verification; test migration compatibility before live use.
- **React Native (Expo)**: use Jest with `jest-expo` and React Native Testing Library for logic and component/integration behavior. Run confirmed Android and iOS journeys on real simulators/emulators or devices with Maestro.
- **Native Android (Kotlin)**: run Gradle test tasks (`./gradlew testDebugUnitTest`), AndroidX / Espresso or UI Automator for UI and device-level journeys, permission checks, and background service lifecycle tests.
- **Native iOS (Swift)**: run `xcodebuild test` or Swift Package tests, XCTest and XCUITest on iOS Simulator for journeys, entitlements, permission prompts, and platform integrations.
- **Operations**: validate Docker builds and health, Compose dependencies, generated Nginx, registered routes, environment names, data volumes, backup handlers, rollback wiring, and private-network reachability when affected.
- **Observability**: force a representative client, API, and database failure where applicable; assert correlated, redacted diagnostic events identify the originating edge.

## Evidence gate

Run focused checks while building, then the full affected matrix after integration. A change is complete only when every applicable row passes against the integrated artifact and the result records command, target, exit status, key assertion, and evidence path. A successful build, mock-only test, health check, or screenshot alone never proves a journey.
