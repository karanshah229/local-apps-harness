---
name: observability
description: Design, implement, verify, operate, or diagnose safe structured observability across browser, mobile, API, database, Nginx, containers, health, backups, and jobs. Use for every application creation or change and whenever tracing failures, performance, lifecycle, or recovery across layers.
---

# Build diagnostic observability

1. Inventory every affected state transition and boundary crossing: client startup/navigation/business actions, API calls and validation, external integrations, backend domain outcomes, database connections/migrations/transactions/queries, health, jobs, backups, and recovery.
2. Instrument structured events with timestamp, severity, app/service, release/environment, stable event name, outcome, duration where relevant, and one request or correlation ID crossing client, Nginx, Fastify, and database work.
3. Use one client logger adapter for browser/mobile errors, rejected promises, request outcomes, performance warnings, and business breadcrumbs. Keep development/test output visible to browser or device tools. Send production client failures to a same-origin, schema-validated, rate-limited endpoint only when the app has an API.
4. Use Fastify's structured logger for request start/end, status, latency, correlation, domain outcomes, dependency failures, retries, and uncaught errors. Preserve user-safe responses while recording internal error classification.
5. Record Prisma/database connection and migration outcomes, transaction commit/rollback, errors, per-request query count, and slow-query duration. Record container, Nginx, job, health, backup, deployment, and rollback lifecycle outcomes.
6. Exclude raw pointer movement, keystrokes, render cycles, and other high-frequency noise. Redact secrets, credentials, authorization headers, cookies, message/form contents, personal contact details, bind values, full SQL, and complete payloads at the logger seam.
7. Keep production levels and retention bounded, rotate persistent logs, make verbose traces temporary and scoped, and keep logging failures from breaking product behavior.
8. Force one representative failure for each changed journey and prove the client symptom can be traced through correlated records to the originating layer without exposing protected data.

Complete when every affected edge emits sufficient safe evidence to locate failures and performance regressions, and verification proves correlation, redaction, retention, and failure-path coverage.
