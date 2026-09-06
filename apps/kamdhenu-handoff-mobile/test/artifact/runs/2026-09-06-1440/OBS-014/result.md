# OBS-014 QA Test Result

- **Flow ID**: `OBS-014`
- **Feature Area**: `task-create`
- **Trigger**: Tap Save with a title containing leading/trailing spaces (`"  QA-FLOW-014  "`)
- **Verdict**: **Pass**
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T14:43:27+05:30` (UTC: `2026-09-06T09:13:27Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Opened New Task screen via deep link `kamdhenu-handoff-qa://task/new`.
3. Entered `"  QA-FLOW-014  "` into the title input field.
4. Captured `before.png` showing the populated form with untrimmed title.
5. Tapped Create button (coordinates `946, 207`).
6. Waited 2 seconds for SQLite insertion, router navigation back, and log file flush.
7. Captured `after.png` showing navigation back to the task list view with the new task created.
8. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Event 1: Started** | `task_create_started` (`info`, `started`) | Emitted at `09:13:27.679Z`, attemptId `1788686007679-8caees` | **PASS** |
| **Event 2: SQL Started** | `task_create_sql_started` (`info`, `started`) | Emitted at `09:13:27.680Z`, same attemptId | **PASS** |
| **Event 3: SQL Committed** | `task_create_sql_committed` (`info`, `success`) | Emitted at `09:13:27.846Z`, durationMs=167 | **PASS** |
| **Event 4: Nav Completed** | `task_create_navigation_completed` (`info`, `success`) | Emitted at `09:13:27.847Z`, durationMs=168 | **PASS** |
| **Attempt Correlation** | All 4 events share identical `attemptId` | Identical `1788686007679-8caees` across all 4 events | **PASS** |
| **Journey Correlation** | Stable `journeyId` | `1788685806473-rronrocz` on all entries | **PASS** |
| **Duration Timing** | Non-negative duration in ms | `durationMs` = 167ms and 168ms | **PASS** |
| **Privacy Redaction** | No sensitive text logged | Sensitive key patterns safely redacted; zero leaked task strings | **PASS** |
| **Sentry Telemetry** | No error exception uploaded on success | Standard breadcrumbs logged, no exception | **PASS** |

---

## Evidence Files

- `before.png`: New Task form populated with padded whitespace title.
- `after.png`: Returned task list displaying the successfully created task.
- `local-log.jsonl`: Extracted diagnostics file containing all 4 correlated events.

---

## Next Flow

- Next P0 Flow in execution plan: `OBS-016` (Task Create: Fully populated task success branch with all metadata counts).
