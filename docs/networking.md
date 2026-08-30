# Local-network access contract

Nginx is the single application entrypoint. Registered routes and upstreams live in `platform/apps.json`; actual configuration lives in `infra/nginx/nginx.conf`. Each path-hosted app keeps an exact no-slash redirect and a trailing-slash prefix route so browser assets resolve correctly.

Current routes:

- `/todo/` → Kamdhenu ToDo service on port 5005.
- `/stock/` → Stock Manager service on port 5001.
- `/gold/` → Sip of Gold static service on port 80.

Nginx binds to `0.0.0.0:80`, an explicit workspace decision that makes every registered app reachable from devices that can reach this Mac. Local URLs remain clean, such as `http://localhost/gold/`; other devices can use `http://macbook-air/todo/` when that hostname resolves, or `http://macbook-air.local/todo/` through macOS Bonjour. These apps have no automatic authentication, so the Mac firewall and trusted network boundary are part of their access control.

Tailscale Serve remains available for tailnet access. Use `pnpm platform:tailscale -- --plan` to inspect that separate change, `--status` to diagnose it, and `--confirm-private-access` only after approval. If Tailscale is stopped, the command does not change its configuration.

Tailscale supplies device identity and private reachability; it does not imply application-level users or roles. Add authentication only when requested. Finish route changes with `pnpm platform:check` and end-to-end navigation through Nginx.
