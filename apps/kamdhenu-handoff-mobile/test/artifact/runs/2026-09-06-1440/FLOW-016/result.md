# FLOW-016 QA Test Result

- **Flow ID**: `FLOW-016`
- **Feature Area**: `view-create`
- **Trigger**: Create a custom view with a trimmed non-empty name
- **Verdict**: **Known instrumentation gap** (with SQLite query column mismatch defect in `createCustomView`)
- **Device**: Android OPPO CPH2717 (`adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`)
- **Package**: `com.kamdhenu.handoff.qa` (version: `1.0.17-qa`, versionCode: `17`)
- **Git Commit**: `5f77ef054b82a32faa1b99429252e1bd4d11dec7`
- **Timestamp**: `2026-09-06T15:23:00+05:30` (UTC: `2026-09-06T09:53:00Z`)

---

## Actual Steps Executed

1. Verified active ADB connection and running `scrcpy` instance.
2. Positioned on Lists & Views directory (`kamdhenu-handoff-qa://lists`).
3. Captured `before.png` showing the directory screen with `VIEWS (0)` and `New View` CTA.
4. Tapped **New View** CTA (`[783, 476][1029, 573]`), opening inline form.
5. Typed `"QA-View-016"` into TextInput (`[136, 616][786, 714]`) and submitted.
6. SQLite query rejected the insert due to 15 values provided for 16 columns in `createCustomView()`, displaying the native database rejection dialog.
7. Captured `after.png`.
8. Extracted diagnostic log file `files/kamdhenu-diagnostics.jsonl` via `run-as com.kamdhenu.handoff.qa`.
9. Dismissed error alert dialog.

---

## Assertions & Findings

| Assertion | Expected | Observed | Status |
|---|---|---|---|
| **View Creation Events** | `custom_view_create_started`, `custom_view_create_succeeded`, `view_opened` | No events emitted (uninstrumented branch in `lists.tsx:299-322`, marked `missing` in flow matrix) | **Known instrumentation gap** |
| **Mutation Failure Telemetry** | `local_mutation_failed` logged on SQLite rejection | `local_mutation_failed` (`operation: create_custom_view`, `durationMs: 41`, `level: error`, `outcome: failure`) logged cleanly | **PASS** |
| **Implementation Defect** | Clean SQLite insertion | `15 values for 16 columns` query defect in `sqlite.ts:1552-1558` | **DEFECT REPRODUCED** |
| **Privacy Redaction** | No sensitive user strings in failure payload | Safe metadata only (`operation`, `durationMs`); 0 user content leaked | **PASS** |

---

## Evidence Files

- `before.png`: Lists & Views directory before view creation attempt.
- `after.png`: Error alert dialog displayed on device: `"Call to function 'NativeDatabase.prepareSync' has been rejected. Caused by: Error code .: 15 values for 16 columns"`.
- `local-log.jsonl`: Extracted local diagnostics log capturing `local_mutation_failed` event.

---

## Next Flow

- Next P0 Flow in execution plan: `FLOW-017` (View create failure branch / empty title validation).
