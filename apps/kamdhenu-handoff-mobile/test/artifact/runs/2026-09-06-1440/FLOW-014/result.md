# FLOW-014 QA Test Result

- **Flow ID**: `FLOW-014`
- **Feature Area**: `list-create`
- **Trigger**: Create a list with a trimmed non-empty name
- **Verdict**: **Known instrumentation gap** (List successfully created in SQLite & UI navigated; events missing in baseline code)
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T15:17:40+05:30` (UTC: `2026-09-06T09:47:40Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Positioned on Lists & Views directory (`kamdhenu-handoff-qa://lists`).
3. Captured `before.png` showing the directory screen with `LISTS (0)` and `New List` CTA.
4. Tapped **New List** CTA (`[799, 1394][1029, 1491]`), opening inline form with list theme pill and input field.
5. Typed `"QA-List-014"` into TextInput (`[136, 1365][786, 1463]`) and submitted.
6. Verified list creation succeeded:
   - SQLite record inserted: `id=1, title='QA-List-014', color_theme='green'` in `kamdhenu_todo.db`.
   - UI navigated directly to the new list scope: header displaying `QA-List-014` and `0 tasks`.
7. Captured `after.png`.
8. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **List Creation Events** | `list_create_started`, `list_create_succeeded {listId, durationMs}`, `list_opened` | No events emitted (uninstrumented branch in `lists.tsx:281-297`, marked `missing` in flow matrix) | **Known instrumentation gap** |
| **SQLite Mutation** | List row inserted cleanly in `lists` table | `1|QA-List-014|green|2026-09-06 09:47:18` verified in `kamdhenu_todo.db` | **PASS** |
| **UI Navigation** | App transitions to list view | Navigated to `QA-List-014` empty list view with "0 tasks" and task creation CTA | **PASS** |
| **Log File Integrity** | 250-line bounded retention & zero unexpected errors | Bounded log preserved without crash or corruption | **PASS** |

---

## Evidence Files

- `before.png`: Lists & Views directory before list creation.
- `after.png`: New list detail view displaying `QA-List-014` header and empty list state.
- `local-log.jsonl`: Extracted local log confirming clean execution state.

---

## Next Flow

- Next P0 Flow in execution plan: `FLOW-015` (List create failure branch / empty title validation).
