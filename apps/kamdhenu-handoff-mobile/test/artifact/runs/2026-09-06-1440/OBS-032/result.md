# OBS-032 QA Test Result

- **Flow ID**: `OBS-032`
- **Feature Area**: `global-error` / `sentry-handled-error`
- **Trigger**: Trigger handled error probe via QA diagnostics panel
- **Verdict**: **Pass**
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T14:58:06+05:30` (UTC: `2026-09-06T09:28:06Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Navigated to Settings > QA Diagnostics panel.
3. Captured `before.png` showing the QA Diagnostics options.
4. Tapped **Capture handled error** button (coordinates `541, 1370`).
5. Waited 3 seconds for `logError` execution, Sentry `captureException` dispatch, and file flush.
6. Captured `after.png` showing the completion dialog.
7. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.
8. Dismissed completion modal by tapping OK.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Local Event Name** | `qa_handled_error_probe` | Emitted at `09:28:06.092Z` | **PASS** |
| **Outcome & Level** | `outcome: failure`, `level: error` | `outcome: "failure"`, `level: "error"` | **PASS** |
| **Identity Metadata** | `app=kamdhenu-handoff-qa`, `environment=qa`, `release=1.0.17-qa`, `platform=android` | Matched exactly | **PASS** |
| **Safe Marker Data** | `probe: handled_error`, `safeMarker: QA_HANDLED_ERROR_PROBE` | Safe metadata serialized without corruption | **PASS** |
| **Journey Correlation** | Stable `journeyId` | Identical `1788685806473-rronrocz` | **PASS** |
| **Sentry Telemetry** | `Sentry.captureException` triggered with tag `app_event=qa_handled_error_probe` and prior breadcrumb trail | Dispatched with error level and safe context | **PASS** |
| **Privacy Redaction** | No private metadata leaked | Zero user or sensitive content | **PASS** |

---

## Evidence Files

- `before.png`: Settings QA Diagnostics panel before trigger.
- `after.png`: Completion dialog showing successful handled error capture.
- `local-log.jsonl`: Extracted local log verifying `qa_handled_error_probe` error entry.

---

## Next Flow

- Next P0 Flow in execution plan: `OBS-033` (Fatal Error / JavaScript Crash & Relaunch Recovery).
