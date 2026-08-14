---
name: manage-nginx-routing
description: Add, change, validate, or repair this workspace's generated Nginx routes, exact redirects, upstreams, base paths, WebSockets, upload limits, and private app URLs.
---

# Manage Nginx routing

1. Resolve the registered base path, route, upstream, protocol needs, and frontend asset behavior.
2. Keep an exact no-slash redirect and a trailing-slash prefix location for path-hosted apps.
3. Preserve forwarded headers; add WebSocket or upload configuration only when requested behavior requires it.
4. Update frontend/API base configuration, health probes, tests, and registry, then run `pnpm platform:nginx -- --write`.
5. Validate configuration before reload, test direct and refresh navigation, then scan the old route.

Complete when the registered URL, assets, API calls, refreshes, and relevant protocol behavior work through Nginx.
