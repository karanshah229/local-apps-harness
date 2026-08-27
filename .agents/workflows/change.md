---
description: Implement a requested change and all connected technical effects
---

1. **Step 0 (Upfront Clarification)**: Use `understand-product-request` to clarify ambiguous feature expectations with plain-language outcome questions before modifying code.
2. **Step 1 (Plan Impact & Commit State)**: Use `plan-connected-change` to map affected surfaces. Make a clean `git commit` of working state and take a database backup if models change.
3. **Step 2 (Implement & Verify)**: Use `change-application`, run `test-user-journeys` for new features and regression suites, and invoke `verify-connected-change`.
4. **Step 3 (Hand-off)**: Report completed work in plain language with access links, verified regressions, and undo instructions.
