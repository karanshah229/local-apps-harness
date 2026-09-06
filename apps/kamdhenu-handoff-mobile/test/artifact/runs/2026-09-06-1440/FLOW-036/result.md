# FLOW-036 QA Test Result

- **Flow ID**: `FLOW-036`
- **Feature Area**: `selection`
- **Trigger**: Long-press a task, tap additional tasks, tap a selected task again, and exit with X/back
- **Verdict**: **Known instrumentation gap** (Multi-select entry, incremental selection/deselection, and clean cancel exit operate as designed; `multiselect_started`, `task_selected`, `task_deselected`, `multiselect_cancelled` uninstrumented in baseline code)
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T15:42:45+05:30` (UTC: `2026-09-06T10:12:45Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Navigated to **Tasks** tab (`kamdhenu-handoff-qa://`).
3. Captured `before.png`.
4. Long-pressed on task `QA-FLOW-021-ValidTask` (`[540, 880]`), entering multi-select mode.
5. Observed top contextual action bar with counter (`1 Selected`) and bulk action buttons.
6. Tapped second task `QA-FLOW-017-DupTap3` (`[540, 1070]`) -> Verified counter increased to `2 Selected`.
7. Tapped second task again -> Verified counter decremented back to `1 Selected`.
8. Tapped Close (X) button on contextual bar (`[100, 520]`), exiting multi-select mode.
9. Captured `after.png`.
10. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Multi-Select Activation** | Long press activates selection mode | Contextual bar appears with selection counter and action controls | **PASS** |
| **Selection / Deselection** | Tap to toggle selection status | Counter increments/decrements accurately | **PASS** |
| **Exit Selection Mode** | Close CTA clears all selections | Multi-select mode dismissed cleanly | **PASS** |
| **Selection Telemetry** | `multiselect_started`, `task_selected`, `multiselect_cancelled {count}` | Uninstrumented in `TasksView.tsx:684-697; 615-628` (marked `missing` in flow matrix) | **Known instrumentation gap** |
| **Log Integrity** | Zero crashes or unhandled exceptions | App remained stable; diagnostic logs intact | **PASS** |

---

## Evidence Files

- `before.png`: Tasks screen in standard view before entering multi-select mode.
- `after.png`: Tasks screen restored to standard view after exiting multi-select mode.
- `local-log.jsonl`: Extracted local diagnostics log confirming clean execution state.

---

## Next Flow

- Next P0 Flow in execution plan: `FLOW-037`–`FLOW-043` (Bulk Actions: Complete, Important, Due Date, Assign, Delete).
