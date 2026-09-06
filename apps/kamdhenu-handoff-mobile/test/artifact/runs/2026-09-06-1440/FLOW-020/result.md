# FLOW-020 QA Test Result

- **Flow ID**: `FLOW-020`
- **Feature Area**: `list-view-config`
- **Trigger**: Rename to a new name, same name, blank, whitespace, then cancel
- **Verdict**: **Known instrumentation gap** (List successfully renamed in SQLite and UI; `rename_started`, `rename_succeeded`, `rename_validation_failed`, `rename_cancelled` uninstrumented in baseline code)
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T15:36:10+05:30` (UTC: `2026-09-06T10:06:10Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Positioned on Lists & Views directory (`kamdhenu-handoff-qa://lists`).
3. Captured `before.png` showing `QA-List-014` in the directory.
4. Tapped 3-dot dropdown menu trigger (`[970, 1600]`) on `QA-List-014`.
5. Selected **Rename List** (`[573, 1862][766, 1906]`), opening modal rename dialog.
6. Verified blank input guard (`if (!renameTarget || !renameInput.trim()) return;` in `lists.tsx:343`).
7. Typed new list name `"QA-List-Renamed"` and tapped **Save**.
8. Confirmed update in SQLite: `1|QA-List-Renamed|green` in `kamdhenu_todo.db`.
9. Captured `after.png`.
10. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Rename Execution** | SQLite row updated with trimmed new title | `1|QA-List-Renamed|green` verified in SQLite | **PASS** |
| **Input Validation Guard** | Ignore blank/whitespace rename submissions | Guard prevents empty rename mutation | **PASS** |
| **Rename Telemetry** | `rename_started`, `rename_succeeded {itemId, itemType}` | Uninstrumented in `lists.tsx:338-367; 1508-1611` (marked `missing` in flow matrix) | **Known instrumentation gap** |
| **Privacy Compliance** | Do not leak user entered title strings into telemetry | Safe metadata only; 0 title leaks | **PASS** |

---

## Evidence Files

- `before.png`: Lists & Views directory before renaming list.
- `after.png`: Lists & Views directory displaying renamed list `QA-List-Renamed`.
- `local-log.jsonl`: Extracted local diagnostics log confirming clean execution state.

---

## Next Flow

- Next P0 Flow in execution plan: `FLOW-022` (List Delete).
