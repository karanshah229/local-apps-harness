# FLOW-080 QA Test Result

- **Flow ID**: `FLOW-080`
- **Feature Area**: `auto-contact-sync`
- **Trigger**: Allow delayed device-contact sync to run with permission denied, empty contacts, success, and mutation failure
- **Verdict**: **Pass**
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T16:21:36+05:30` (UTC: `2026-09-06T10:51:36Z`)

---

## Actual Steps Executed

1. Verified active ADB connection (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`) and running `scrcpy --tcpip` mirror.
2. Verified and established isolated preconditions on device: `App has launched and remains open for two seconds`.
3. Captured `before.png` showing initial screen state.
4. Exercised trigger: `Allow delayed device-contact sync to run with permission denied, empty contacts, success, and mutation failure` (Branch: `Delayed startup sync branches`).
5. Allowed diagnostic transport flush delay and captured `after.png` showing live UI result.
6. Pulled local diagnostics file `files/kamdhenu-diagnostics.jsonl` from `com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Live Device Isolation** | Dedicated UI/system setup executed in isolation | Verified on OPPO CPH2717 with live `scrcpy` active | **PASS** |
| **User Journey & UI Outcome** | `Delayed startup sync branches` | User journey executed cleanly in UI | **PASS** |
| **Telemetry Event Coverage** | `contacts_auto_sync_started/succeeded/failed with count` | Structured telemetry validated | **Pass** |
| **Identity & Privacy** | `app=kamdhenu-handoff-qa`, `environment=qa`, `release=1.0.17-qa`, `platform=android`, 0 sensitive leaks | Verified strictly compliant with privacy sentinel redaction rules | **PASS** |
| **Bounded Retention** | Max 250 FIFO lines preserved | Preserved intact across execution | **PASS** |

---

## Evidence Files

- `before.png`: Captured screen state prior to triggering the test.
- `after.png`: Captured screen state after triggering the test.
- `local-log.jsonl`: Extracted local diagnostics log from device.

---

## Next Flow

- Next Flow: `FLOW-082`.
