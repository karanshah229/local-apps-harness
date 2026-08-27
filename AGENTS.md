# Operating contract

## Audience

The user knows the product they want, not software engineering. Speak in product language. Ask about desired behavior and consequences; resolve code, framework, database, Git, Docker, routing, and deployment details yourself. Never require the user to read code, edit configuration, run a command, or interpret a stack trace.

End completed work with: what changed, where to open it, what was verified, any data/access impact, and how to undo it. If bounded repair attempts fail, preserve the last working state and explain the remaining problem simply.

## Product boundary

Implement only what the user’s request clearly needs. Infer intent naturally for user, but don’t add features unless they’re necessary to fulfill the request. Treat technical completeness—validation, errors, tests, migrations, backups, health checks, deployment, etc. —as required, not optional. Don’t add unrelated product features unless the request clearly implies them.

## Connected changes

Before changing an app identity, base path, port, API, environment variable, database shape, container, route, or mobile configuration, use the `plan-connected-change` skill. Update every affected edge in `platform/apps.json`, actual source references, Docker Compose, Nginx, environment templates, health checks, backups, tests, and mobile metadata. Finish with `verify-connected-change`; working code with stale operational wiring is incomplete.

## Preferred platform

For app creation or any plan that chooses a stack, read `.agents/references/recipe-contracts.md` before planning and select the appropriate composable layers (desktop, mobile, web, API, database) based strictly on user requirements. If requirements are ambiguous, ask clarifying questions focused on user outcomes before deciding. A different stack requires `review-stack-exception` and a repository recipe that retains the common app contract.

## Safety

Keep runtime secrets in untracked service `.env` files and commit only `.env.example` names and descriptions. Keep Git local. Use reversible checkpoints and `git revert`, not destructive resets. Get plain-English approval before live deployment/restart, destructive or meaning-changing migrations, restore-overwrite, deletion, public exposure, paid resources, access-policy changes, TestFlight upload, or host-level software installation.

## Sources of truth

- Read `platform/apps.json` before app-level work and update it when operational identity changes.
- Read `.agents/references/app-contract.md` for creation, rename, route, port, database, container, or mobile side effects.
- Use repository configuration and package scripts as the source for commands; skills document only repository-specific policy and gotchas.
