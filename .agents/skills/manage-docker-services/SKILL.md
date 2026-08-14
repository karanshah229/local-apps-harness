---
name: manage-docker-services
description: Maintain this monorepo's Dockerfiles, build contexts, image and service identity, Compose topology, volumes, environment, health dependencies, rebuilds, and rollback wiring.
---

# Manage workspace containers

1. Resolve the registered Dockerfile, service, ports, volumes, dependencies, and Nginx upstream.
2. Build from the repository root so cross-workspace frontend/server inputs are available; keep cache boundaries at lockfiles and package manifests.
3. Use stable service identity and immutable release image tags. Preserve volume ownership across renames and rollbacks.
4. Pass local configuration through explicit `env_file`; add healthchecks and dependency conditions for new standard apps.
5. Validate Compose, build the affected image, start it behind Nginx, and test registered health and journeys.

Complete when the registry, Dockerfile, Compose, volumes, upstream, health, and rollback image agree. Never use generic prune operations as repair.
