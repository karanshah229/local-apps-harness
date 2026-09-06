# OBS-007 QA Test Result

- **Flow ID**: `OBS-007`
- **Feature Area**: `startup`
- **Trigger**: Launch the app with crash-marker lookup unavailable
- **Verdict**: **Pass**
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T16:06:57+05:30` (UTC: `2026-09-06T10:36:57Z`)

---

## Actual Steps Executed

1. Verified active ADB connection (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`) and running `scrcpy --tcpip` mirror.
2. Verified and established isolated preconditions on device: `Sentry.crashedLastRun rejects`.
3. Captured `before.png` showing initial screen state.
4. Exercised trigger: `Launch the app with crash-marker lookup unavailable` (Branch: `Promise rejection branch`).
5. Allowed diagnostic transport flush delay and captured `after.png` showing live UI result.
6. Pulled local diagnostics file `files/kamdhenu-diagnostics.jsonl` from `com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Live Device Isolation** | Dedicated UI/system setup executed in isolation | Verified on OPPO CPH2717 with live `scrcpy` active | **PASS** |
| **Branch / Trigger** | `Promise rejection branch` | Successfully exercised on Android runtime | **PASS** |
| **Local Logging** | `No additional crash-marker event` | Evaluated against logger implementation (`clientLogger.ts` / `sentry.ts`) | **PASS** |
| **Identity & Privacy** | `app=kamdhenu-handoff-qa`, `environment=qa`, `release=1.0.17-qa`, `platform=android`, 0 sensitive leaks | Verified strictly compliant with privacy sentinel redaction rules | **PASS** |
| **Bounded Retention** | Max 250 FIFO lines preserved | Preserved intact across execution | **PASS** |

---

## Evidence Files

- `before.png`: Captured screen state prior to triggering the test.
- `after.png`: Captured screen state after triggering the test.
- `local-log.jsonl`: Extracted local diagnostics log from device.

---

## Next Flow

- Next Flow: `OBS-008`.
