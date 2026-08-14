# Skill: Managing Tailscale VPN

This guide shows how to manage, status check, and troubleshoot Tailscale connections for secure service exposure.

## Quick Reference Commands

### Check Tailscale Status
```bash
tailscale status
```
Lists connected devices and their corresponding Tailnet private IPs.

### Connect / Start Tailscale
```bash
tailscale up
```
Starts the daemon and opens a login prompt if not authenticated.

### Disconnect
```bash
tailscale down
```

### Get Current Device IP
```bash
tailscale ip -4
```

## Useful Config Tips
- Ensure the **Nginx ingress container** binds to `0.0.0.0` or your Tailscale IP so it can receive Tailscale-routed traffic.
- Enable **MagicDNS** in your Tailscale Admin Console to access machines using names (e.g. `http://my-host-mac`) instead of typing raw IPs.
