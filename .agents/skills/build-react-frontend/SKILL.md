---
name: build-react-frontend
description: Build or change this workspace's React web interfaces using TypeScript, Vite, Tailwind, shadcn/ui, registered base paths, and confirmed product behavior.
---

# Build the React frontend

1. Resolve the registered base path and API contract before editing.
2. For visible UI work, read `../../references/ui-styling.md`, encode its app-specific visual language in Tailwind tokens, and copy only shadcn/ui components required by confirmed screens.
3. Select optional frontend capabilities through the TanStack rules in `../../references/recipe-contracts.md`.
4. Preserve deployment below the base path across routing, assets, refresh, and API requests.
5. Implement relevant loading, empty, success, error, responsive, keyboard, and accessible-label states.
6. Test confirmed journeys at desktop and mobile widths; capture visual evidence for design requests.

Complete when requested behavior works at the registered route and no unused demo or product capability was introduced.
