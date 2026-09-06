# FLOW-034 QA Test Result

- **Flow ID**: `FLOW-034`
- **Feature Area**: `sorting`
- **Trigger**: Choose sort field (Alphabetical, Due Date, Creation Date, Smart Sort) and reset
- **Verdict**: **Known instrumentation gap** (Sorting ordering updates instantly in UI; `sort_changed`, `sort_persist_succeeded` uninstrumented in baseline code)
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T15:40:50+05:30` (UTC: `2026-09-06T10:10:50Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Navigated to **Tasks** tab (`kamdhenu-handoff-qa://`).
3. Captured `before.png`.
4. Tapped Sort Trigger Button (`[920, 480][1020, 560]`), opening the Sort Bottom Sheet.
5. Selected **Alphabetical** sort option and tapped **Done** -> Observed tasks re-ordered alphabetically.
6. Re-opened Sort Bottom Sheet, selected **Smart Sort**, and tapped **Done** -> Observed tasks restored to smart sort order.
7. Captured `after.png`.
8. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Sort Reordering Execution** | Task order adjusts to selected sort field | Tasks re-order immediately across Alphabetical and Smart Sort modes | **PASS** |
| **Sort Telemetry** | `sort_changed and sort_persist_succeeded {viewKey, field, direction}` | Uninstrumented in `TasksView.tsx:479-490; SingleListView.tsx:471-476` (marked `missing` in flow matrix) | **Known instrumentation gap** |
| **Log Integrity** | Zero crashes or unhandled exceptions | App remained stable; diagnostic logs intact | **PASS** |

---

## Evidence Files

- `before.png`: Tasks screen before changing sort order.
- `after.png`: Tasks screen after applying and resetting sort options.
- `local-log.jsonl`: Extracted local diagnostics log confirming clean execution state.

---

## Next Flow

- Next P0 Flow in execution plan: `FLOW-035` (Task Single-Interaction: Toggle Complete, Toggle Important).
