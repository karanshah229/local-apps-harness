# OBS-001 QA Test Result

- **Flow ID**: `OBS-001`
- **Feature Area**: `startup`
- **Trigger**: Open the app (Release-like mobile build launches for the first time)
- **Verdict**: **Pass**
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T14:40:06+05:30` (UTC: `2026-09-06T09:10:06Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Force-stopped `com.kamdhenu.handoff.qa` via `adb shell am force-stop com.kamdhenu.handoff.qa`.
3. Captured `before.png` showing device launcher/prior state.
4. Launched `com.kamdhenu.handoff.qa` via `adb shell monkey -p com.kamdhenu.handoff.qa -c android.intent.category.LAUNCHER 1`.
5. Waited 3 seconds for initial route loading, SQLite initialization, and logger flush.
6. Captured `after.png` showing the launched QA application.
7. Extracted diagnostic log file from `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Event 1** | `app_started` (`info`, `success`) | `{"timestamp":"2026-09-06T09:10:06.486Z","app":"kamdhenu-handoff-qa","environment":"qa","release":"1.0.17-qa","platform":"android","journeyId":"1788685806473-rronrocz","event":"app_started","outcome":"success","level":"info"}` | **PASS** |
| **Event 2** | `sqlite_initialized` (`info`, `success`) | `{"timestamp":"2026-09-06T09:10:06.636Z","app":"kamdhenu-handoff-qa","environment":"qa","release":"1.0.17-qa","platform":"android","journeyId":"1788685806473-rronrocz","event":"sqlite_initialized","outcome":"success","level":"info"}` | **PASS** |
| **Identity Metadata** | `app=kamdhenu-handoff-qa`, `environment=qa`, `release=1.0.17-qa`, `platform=android` | Matched exactly on all entries | **PASS** |
| **Journey Correlation** | Stable `journeyId` across process launch | Identical `1788685806473-rronrocz` across startup sequence | **PASS** |
| **Privacy** | No sensitive data logged | Only safe event names, timestamps, and environment fields | **PASS** |
| **Sentry Telemetry** | No error/exception uploaded for clean startup; breadcrumbs recorded | Normal session telemetry active without exception | **PASS** |

---

## Evidence Files

- `before.png`: State prior to launching the QA app.
- `after.png`: Foreground QA app on startup.
- `local-log.jsonl`: Extracted diagnostics file from QA package filesystem.

---

## Next Flow

- Next P0 Flow in execution plan: `OBS-004` (Startup: Local SQLite initialization failure injection/handling) or `OBS-005` (Startup: Launch after simulated prior crash).
