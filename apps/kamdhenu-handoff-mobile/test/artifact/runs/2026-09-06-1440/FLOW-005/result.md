# FLOW-005 QA Test Result

- **Flow ID**: `FLOW-005`
- **Feature Area**: `navigation` (Custom View Scope Enter / Back)
- **Trigger**: Open a custom view, then return to directory
- **Verdict**: **Known instrumentation gap** (with Discovered SQLite Schema Defect)
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T15:11:40+05:30` (UTC: `2026-09-06T09:41:40Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Navigated to Lists & Views directory (`kamdhenu-handoff-qa://lists`).
3. Captured `before.png` showing the directory screen.
4. Tapped **New View** button (`906, 524`) and submitted `"QA-Custom-View"`.
5. Observed SQL mutation execution.
6. Captured `after.png`.
7. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **View Open/Close Logs** | `view_opened {customViewId}` and `view_closed` | Not emitted (unimplemented call sites in `lists.tsx`) | **Known instrumentation gap** |
| **Mutation Failure Telemetry** | `local_mutation_failed` logged on SQLite rejection | `local_mutation_failed` (`error`, `failure`, `operation: create_custom_view`, `durationMs: 30`) | **PASS** |
| **Underlying Discovered Issue** | `createCustomView` query column count mismatch | `createCustomView()` specifies 16 column names in `INSERT INTO custom_views` but only 15 value placeholders/literals in `VALUES (...)` (missing one `NULL`), triggering SQLite query rejection | **DEFECT DISCOVERED** |
| **Privacy Redaction** | No sensitive user strings in failure payload | Safe metadata only (`operation`, `durationMs`) | **PASS** |

---

## Evidence Files

- `before.png`: Lists & Views directory before view creation/navigation.
- `after.png`: Lists & Views directory showing mutation error dialog.
- `local-log.jsonl`: Extracted local log recording `local_mutation_failed` error entry.

---

## Next Flow

- Next P0 Flow in execution plan: `FLOW-008` (Data Load: Tasks, lists, contacts, views loading & query telemetry) / `FLOW-014` (List Create).
