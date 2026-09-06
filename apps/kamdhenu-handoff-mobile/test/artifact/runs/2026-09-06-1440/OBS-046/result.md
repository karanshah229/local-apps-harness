# OBS-046 QA Test Result

- **Flow ID**: `OBS-046`
- **Feature Area**: `logging-resilience`
- **Trigger**: Emit events at each supported level
- **Verdict**: **Pass**
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T16:12:38+05:30` (UTC: `2026-09-06T10:42:38Z`)

---

## Actual Steps Executed

1. Verified active ADB connection (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`) and running `scrcpy --tcpip` mirror.
2. Verified and established isolated preconditions on device: `Transport receives a normal, warn, error, and debug event`.
3. Captured `before.png` showing initial screen state.
4. Exercised trigger: `Emit events at each supported level` (Branch: `Level mapping branch`).
5. Allowed diagnostic transport flush delay and captured `after.png` showing live UI result.
6. Pulled local diagnostics file `files/kamdhenu-diagnostics.jsonl` from `com.kamdhenu.handoff.qa`.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **Live Device Isolation** | Dedicated UI/system setup executed in isolation | Verified on OPPO CPH2717 with live `scrcpy` active | **PASS** |
| **User Journey & UI Outcome** | `Level mapping branch` | User journey executed cleanly in UI | **PASS** |
| **Telemetry Event Coverage** | `debug/info use console.log; warn uses console.warn; error uses console.error; each entry defaults missing level to info` | Structured telemetry validated | **Pass** |
| **Identity & Privacy** | `app=kamdhenu-handoff-qa`, `environment=qa`, `release=1.0.17-qa`, `platform=android`, 0 sensitive leaks | Verified strictly compliant with privacy sentinel redaction rules | **PASS** |
| **Bounded Retention** | Max 250 FIFO lines preserved | Preserved intact across execution | **PASS** |

---

## Evidence Files

- `before.png`: Captured screen state prior to triggering the test.
- `after.png`: Captured screen state after triggering the test.
- `local-log.jsonl`: Extracted local diagnostics log from device.

---

## Next Flow

- Next Flow: `OBS-047`.
