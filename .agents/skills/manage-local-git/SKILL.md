---
name: manage-local-git
description: Create reversible local checkpoints, isolate incomplete work, inspect history, undo changes, and recover working application states without remote Git or destructive resets.
---

# Manage local Git

1. Inspect the worktree and preserve unrelated user changes.
2. Record a pre-change checkpoint before risky connected work; isolate incomplete work when it could disturb the working version.
3. Commit only validated task changes with a product-language message.
4. Undo published local checkpoints with `git revert`; restore uncommitted agent work only when its exact ownership is known.
5. Verify the application after recovery and explain which product changes were undone.

Complete when the working tree and running behavior match the selected checkpoint without losing unrelated work.
