---
name: diagnose-and-repair
description: Diagnose broken, unavailable, or slow applications across browser/mobile, Nginx, Docker, API, database, disk, backup, and Tailscale layers and attempt bounded safe repairs.
---

# Diagnose and repair

1. Resolve the app and reproduce the exact user-visible symptom before changing anything.
2. Trace from user edge inward: client, private network, Nginx, container/health, API, database/storage, and host resources.
3. Form one evidence-backed hypothesis, test it with the least invasive check, and repair only when the request includes fixing.
4. Try at most three materially different safe approaches; verify the symptom and affected regressions after each change.
5. Restore the last working checkpoint when attempts worsen service. If unresolved, explain what is affected, what still works, and the next needed input without jargon.

Complete when the original symptom is proven fixed or a safe, plain-language handoff is produced.
