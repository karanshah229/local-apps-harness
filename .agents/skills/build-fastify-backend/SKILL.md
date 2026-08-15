---
name: build-fastify-backend
description: Build or change repository-standard TypeScript Fastify APIs, including registered prefixes, schemas, errors, health checks, clients, containers, and tests.
---

# Build the Fastify backend

1. Resolve the app, API prefix, clients, port, and data contract from the registry and source; read `../../references/backend-design.md`.
2. Keep business areas in Fastify plugins; define request/response schemas and stable user-safe errors.
3. Implement `/healthz` without leaking secrets or sensitive data.
4. Update every web/mobile client, environment edge, Docker healthcheck, Nginx route, and test affected by API changes.
5. Run API integration, query-budget, observability, and affected user-journey tests.

Complete when all registered clients and health probes use the current contract.
