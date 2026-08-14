# Tailscale Infrastructure Setup

This folder holds the configurations and documentation for setting up secure local networking and proxying via **Tailscale**.

## Overview
Tailscale allows accessing our local service stack (like Nginx, APIs, and databases) securely from remote locations or mobile apps without opening ports publicly.

## Basic Setup
1. **Install Tailscale** on the host machine.
2. **Authenticate** the host device inside your Tailnet.
3. Nginx currently listens on `0.0.0.0:80` by explicit local-network access choice; review `docs/networking.md` before changing that boundary.
4. Run `pnpm platform:tailscale -- --plan`, then use `--confirm-private-access` after approval to add Tailscale Serve.
5. Use the private HTTPS name reported by Tailscale Serve from authorized tailnet devices.
