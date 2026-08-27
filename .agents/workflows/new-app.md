---
description: Create and privately publish a new application from a plain-language idea
---

1. **Step 0 (Upfront Clarification)**: Use `understand-product-request` to clarify target devices (desktop vs. mobile vs. web), multi-user sync needs, and special hardware requirements before planning or writing code.
2. **Step 1 (Plan & Compose)**: Select composable layers from `.agents/references/recipe-contracts.md` and invoke `create-application`.
3. **Step 2 (Verify)**: Run `test-user-journeys` across all target layers and `verify-connected-change`.
4. **Step 3 (Hand-off)**: Report completed work in plain language with access URLs/binaries and undo guidance. Do not publish/deploy live until the user requests it.
