# FLOW-024 QA Test Result

- **Flow ID**: `FLOW-024`
- **Feature Area**: `task-list-search`
- **Trigger**: Search exact/fuzzy text across title, notes, assignee, list, due date
- **Verdict**: **Known instrumentation gap** (Task list search filters accurately in UI; `task_search_changed` telemetry uninstrumented in baseline code)
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T15:38:25+05:30` (UTC: `2026-09-06T10:08:25Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Navigated to **Tasks** tab (`kamdhenu-handoff-qa://`).
3. Captured `before.png` showing 7 tasks in list.
4. Tapped search field (`[150, 455][685, 584]`).
5. Typed `"021"`, filtering tasks in real time.
6. Verified task list filtered down to 1 matching item: `QA-FLOW-021-ValidTask`.
7. Captured `after.png`.
8. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Search Filter Execution** | Filter tasks list to matching subset | Tasks list accurately filtered to 1 matching item (`QA-FLOW-021-ValidTask`) | **PASS** |
| **Search Telemetry** | `task_search_changed {viewKey, queryLength, resultCount}` without raw text | Uninstrumented in `TasksView.tsx:843-910` (marked `unverified/missing` in flow matrix) | **Known instrumentation gap** |
| **Privacy Compliance** | Do not log raw search queries or task contents | Diagnostic logs remain clean with 0 raw text leaked | **PASS** |

---

## Evidence Files

- `before.png`: Tasks screen showing all 7 tasks before search filter.
- `after.png`: Tasks screen showing search query `"021"` and filtered result `QA-FLOW-021-ValidTask`.
- `local-log.jsonl`: Extracted local diagnostics log confirming clean execution state.

---

## Next Flow

- Next P0 Flow in execution plan: `FLOW-025` (Task list search no-match and clear).
