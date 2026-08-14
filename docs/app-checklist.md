# Application integration checklist

The executable source of truth is `platform/apps.json`; use `pnpm platform:impact`, the `plan-connected-change` skill, and `.agents/references/app-contract.md` rather than maintaining a second detailed checklist here.

An application is integrated only when its requested behavior, workspace packages, environment template, deterministic route/ports, data and migrations, Dockerfile, Compose service/volumes, Nginx route, health check, backup handler, tests, and registry entry agree. Include data, API, Android, or iOS surfaces only when the product requires them.

Finish with `pnpm platform:check`, actual-reference scanning, affected builds, and `verify-connected-change`.
