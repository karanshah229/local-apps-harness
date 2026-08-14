# Deployment Guide

This document describes how to deploy the applications in the monorepo locally and in production.

## Prerequisites
- Node.js >= 18
- pnpm >= 9
- Docker & Docker Compose (optional for containerized deployment)

## Local Development
To run all applications concurrently in watch/development mode:
```bash
pnpm install
pnpm dev
```
To run a specific application:
```bash
pnpm --filter stock-manager-client dev
```

## Production Build
To build all applications and packages:
```bash
pnpm build
```
This runs `turbo build` which automatically caches successful builds and only recompiles modified packages.

## Docker Deployment
We containerize services using the respective Dockerfiles:
- **Nginx Proxy**: Located in `infra/nginx/`. Built with `docker build -t app-nginx ./infra/nginx`.
- **Microsoft To Do App**: Located in `apps/microsoft-todo-server/Dockerfile.whatsapp`.
