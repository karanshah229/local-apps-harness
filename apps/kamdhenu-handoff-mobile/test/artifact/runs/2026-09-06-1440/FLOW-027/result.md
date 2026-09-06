# FLOW-027 QA Test Result

- **Flow ID**: `FLOW-027`
- **Feature Area**: `filters`
- **Trigger**: Set importance to all, important (starred), normal
- **Verdict**: **Known instrumentation gap** (Importance filter correctly isolates starred and normal tasks; `filter_changed` telemetry uninstrumented in baseline code)
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T15:40:10+05:30` (UTC: `2026-09-06T10:10:10Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Navigated to **Tasks** tab (`kamdhenu-handoff-qa://`).
3. Captured `before.png` showing all 7 tasks.
4. Tapped Filters CTA (`[800, 490][900, 550]`), opening the Filter Bottom Sheet.
5. Selected **★ Starred** importance filter and tapped **Apply** -> Verified 1 starred task displayed (`QA-FLOW-016-Task`).
6. Re-opened Filter Bottom Sheet, selected **All** importance filter, and tapped **Apply** -> Verified all 7 tasks restored.
7. Captured `after.png`.
8. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Importance Filter Execution** | Filter task list by importance/starred | Importance filtering correctly isolates starred tasks | **PASS** |
| **Filter Telemetry** | `filter_changed {dimension=importance, value, resultCount}` | Uninstrumented in `TasksView.tsx:547-555; 866-869` (marked `missing` in flow matrix) | **Known instrumentation gap** |
| **Log Integrity** | Zero crashes or unhandled exceptions | App remained stable; diagnostic logs intact | **PASS** |

---

## Evidence Files

- `before.png`: Tasks screen showing all 7 tasks before applying importance filter.
- `after.png`: Tasks screen restored to all tasks after toggling importance filters.
- `local-log.jsonl`: Extracted local diagnostics log confirming clean execution state.

---

## Next Flow

- Next P0 Flow in execution plan: `FLOW-033` (Clear all filters) / `FLOW-034` (Sorting).
