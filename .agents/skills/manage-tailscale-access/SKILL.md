---
name: manage-tailscale-access
description: Configure or diagnose private application access through this host's Tailscale network, Nginx entrypoint, device DNS, binding, and reachability without public exposure.
---

# Manage private access

1. Inspect `pnpm platform:tailscale -- --status`; if Tailscale is stopped, explain how to connect it without changing host state yourself.
2. Read `../../../docs/networking.md` for the current access boundary. This workspace deliberately exposes Nginx to its local network; do not widen it to internet access or alter that decision without a confirmed request.
3. Preview with `--plan` and ask immediately before `--confirm-private-access`, which adds Tailscale Serve independently of LAN access.
4. Test from the host and a tailnet client, separating Tailscale, private DNS, Serve, Nginx, and app failures.
5. Public Funnel exposure is a separate product and safety decision; never infer it from a request for remote access.
6. Return the simplest working private URL.

Complete when an authorized tailnet device reaches the registered journey without opening a public path.
