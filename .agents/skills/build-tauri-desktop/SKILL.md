---
name: build-tauri-desktop
description: Build or change Tauri desktop applications for macOS, Windows, Linux, and Web using Tauri (Rust) and React/Vite/Tailwind/shadcn.
---

# Build the Tauri desktop application

1. Confirm requested desktop features: window configurations, system tray, local file operations, native dialogues, or desktop shortcuts.
2. Maintain clean separation between the frontend (React, Vite, Tailwind, shadcn/ui) in `src/` and backend Rust commands in `src-tauri/`.
3. Read `../../references/ui-styling.md` for consistent visual language and theme tokens.
4. Keep IPC commands strictly typed, validated, and bounded; never expose raw system shell execution without strict argument whitelisting.
5. If connecting to a central Fastify API or database, configure environment parameters properly.
6. Verify desktop builds across target OS environments (macOS `.app`/`.dmg`, Windows `.msi`/`.exe`, Linux `.deb`/`.AppImage`).

Complete when desktop journeys and builds pass on target platforms.
