# OBS-033 QA Test Result

- **Flow ID**: `OBS-033` (also covers `FLOW-067` & `FLOW-095` crash preservation)
- **Feature Area**: `global-error` / `crash-recovery`
- **Trigger**: Trigger fatal JavaScript crash probe via QA diagnostics panel, verify clean exit, relaunch app, and assert pre-crash log preservation
- **Verdict**: **Pass**
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T15:01:13+05:30` (UTC: `2026-09-06T09:31:13Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Saved pre-crash checkpoint to ensure state safety.
3. Navigated to Settings > QA Diagnostics panel and captured `before.png`.
4. Tapped **JS crash** button (`304, 1694`).
5. Verified confirmation modal: *"Trigger JavaScript crash? The QA app will close deliberately..."*.
6. Tapped **Crash QA app** confirmation button (`719, 1410`).
7. Observed the QA process terminate and Android return focus to the Launcher.
8. Relaunched `com.kamdhenu.handoff.qa` via `adb shell monkey`.
9. Waited 3 seconds for new process startup and SQLite initialization.
10. Captured `after.png` showing the relaunched application.
11. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Pre-Crash Logging** | `qa_js_crash_requested` emitted & flushed before throw | Emitted at `09:31:13.720Z` under journey `1788685806473-rronrocz` | **PASS** |
| **Clean Process Termination** | App terminates on fatal error | Process exited, focus returned to Launcher | **PASS** |
| **Log Persistence Across Crash** | Prior 250 log entries survive crash intact | All diagnostic entries preserved without data loss | **PASS** |
| **New Process Journey ID** | New process launch assigns fresh `journeyId` | Generated new `journeyId: 1788687078611-ldeg7u6r` | **PASS** |
| **Post-Crash Startup** | `app_started` and `sqlite_initialized` emitted | Both startup events recorded in sequence | **PASS** |
| **Telemetry & Privacy** | Crash event queued for Sentry symbolication; zero data leaks | Safe metadata only; clean recovery | **PASS** |

---

## Evidence Files

- `before.png`: Settings QA Diagnostics panel with crash confirmation modal.
- `after.png`: Relaunched application on task list view.
- `local-log.jsonl`: Extracted local log file showing pre-crash and post-crash log lines.

---

## Next Flow

- Next P0 Flow in execution plan: `FLOW-005` (Navigation: Custom-view enter and back branch).
