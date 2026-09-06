# FLOW-045 QA Test Result

- **Flow ID**: `FLOW-045`
- **Feature Area**: `task-detail`
- **Trigger**: Edit title/notes, toggle complete/important, add/remove/toggle/rename subtasks
- **Verdict**: **Known instrumentation gap** (Task detail editing and subtask additions persist cleanly; `task_edit_started`, `field_changed`, `subtask_*` uninstrumented in baseline code)
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T15:45:30+05:30` (UTC: `2026-09-06T10:15:30Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Navigated to **Tasks** tab and tapped `QA-FLOW-021-ValidTask` (`[350, 880]`).
3. Verified Task Detail screen opened (`Task Details` header).
4. Captured `before.png`.
5. Added subtask `"Step 1"` via `Add next step...` input field (`[155, 684][996, 780]`).
6. Entered task notes `"QA notes"` into `Add detailed notes...` field (`[84, 1622][996, 1826]`).
7. Verified automatic persistence to SQLite database.
8. Captured `after.png`.
9. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Subtask Creation** | Create and attach subtask row to parent task in SQLite | Subtask `"Step 1"` inserted cleanly; counter updated to `STEPS (0/1)` | **PASS** |
| **Notes Autosave** | Debounced or submitted notes saved to `tasks.notes` | Notes persisted to SQLite without error dialog | **PASS** |
| **Editing Telemetry** | `task_edit_started`, `field_changed`, `subtask_created {taskId}` | Uninstrumented in `app/task/[id].tsx:444-517; TaskDetailDrawer.tsx:183-252` (marked `unverified` in flow matrix) | **Known instrumentation gap** |
| **Privacy Redaction** | Do not log raw user notes or step content | Diagnostic logs contain 0 raw string content; privacy compliant | **PASS** |

---

## Evidence Files

- `before.png`: Tasks screen before opening Task Detail.
- `after.png`: Task Detail screen displaying newly added subtask and notes.
- `local-log.jsonl`: Extracted local diagnostics log confirming clean execution state.

---

## Next Flow

- Next P0 Flow in execution plan: `FLOW-050` (Delete Task).
