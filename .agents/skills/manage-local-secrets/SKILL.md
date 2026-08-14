---
name: manage-local-secrets
description: Add, replace, validate, redact, or rotate runtime secrets in local service environment files and connect their names through app, Docker, mobile, tests, and deployment configuration.
---

# Manage local secrets

1. Resolve the owning service and every consumer of the variable name.
2. Store the value only in the service's untracked `.env`; record the name and description in `.env.example`.
3. Add startup validation and explicit Compose `env_file` forwarding. Expose only intentionally public non-secret values to web/mobile builds.
4. Update values without echoing them to chat, command arguments, logs, screenshots, or artifacts.
5. Run the secret check and verify connectivity through a redacted result. If exposed, guide replacement and provider rotation.

Complete when the service works, the variable name is connected everywhere needed, and no value is tracked or printed.
