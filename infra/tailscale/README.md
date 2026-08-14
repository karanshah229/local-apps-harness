# Tailscale Infrastructure Setup

This folder holds the configurations and documentation for setting up secure local networking and proxying via **Tailscale**.

## Overview
Tailscale allows accessing our local service stack (like Nginx, APIs, and databases) securely from remote locations or mobile apps without opening ports publicly.

## Basic Setup
1. **Install Tailscale** on the host machine.
2. **Authenticate** the host device inside your Tailnet.
3. Configure the **Nginx Proxy** to listen on the Tailscale IP interface for secure traffic routing.
4. Set up Tailscale **MagicDNS** or local aliases for easy machine discovery.
