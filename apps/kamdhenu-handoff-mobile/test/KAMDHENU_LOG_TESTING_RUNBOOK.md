# Kamdhenu Android Logging QA Runbook

This is the handoff document for any agent testing the Kamdhenu Handoff logging feature. Read it completely before touching the connected phone. The test inventory is `test/artifact/kamdhenu-logs-user-flow-matrix.csv`; this runbook defines how to execute it safely and how to judge results.

## Mission and present scope

- Test all 151 Android rows: 54 `OBS-*` instrumentation cases and 97 `FLOW-*` user journeys.
- Priority distribution: 101 P0, 45 P1, and 5 P2.
- Matrix baseline: 81 `unverified`, 69 `missing`, and 1 `mismatch`. A row marked `missing` is a known instrumentation gap, not a test pass.
- Android only. Do not plan, perform, or report iOS testing.
- Validate three distinct outputs where applicable: the local JSONL file, the shareable diagnostic report, and Sentry Issues/error events.
- Sentry Explore > Logs is not an expected destination for this implementation. Routine events use `react-native-logs` locally and Sentry breadcrumbs. Breadcrumbs become visible when attached to a Sentry error/crash event.

## Non-negotiable safety rules

1. The only WhatsApp recipient permitted is exactly **Karan Shah (You)**. Never send to any other person, group, channel, or suggestion.
2. In Android's share sheet, never tap a suggested contact. Tap the **WhatsApp app icon first**, select **Karan Shah (You)** inside WhatsApp, confirm the UI says `1 selected` and the final destination is exactly `Karan Shah (You)`, then send.
3. Before every phone interaction, confirm both ADB and scrcpy are connected. If either disconnects or scrcpy disappears, stop the entire test immediately. Do not continue with ADB, WhatsApp Desktop, Chrome/Sentry, or inferred results. Save the last completed checkpoint, capture the failure if possible, and tell Karan what disconnected.
4. Do not clear app data, uninstall the production app, delete tasks/contacts/lists that were not created for the current case, reset the phone, clear logcat, or modify production data merely to simplify a test.
5. The QA app may keep all test records. Cleanup is not required. Its package and data are separate from production.
6. Screenshots can contain real contact suggestions or message content. Keep evidence local and uncommitted. Do not upload, publish, or quote unrelated contact information.
7. Never print, copy, commit, or include values from `.env.local`, Sentry tokens, the DSN, authorization headers, or other secrets in evidence.
8. Deliberate crash buttons are QA-only and require the on-screen confirmation. Never attempt fault injection in package `com.kamdhenu.handoff`.

## Sources of truth

All paths below are relative to the repository root unless noted.

- Matrix: `apps/kamdhenu-handoff-mobile/test/artifact/kamdhenu-logs-user-flow-matrix.csv`
- This runbook: `apps/kamdhenu-handoff-mobile/test/KAMDHENU_LOG_TESTING_RUNBOOK.md`
- Logger: `apps/kamdhenu-handoff-mobile/src/services/clientLogger.ts`
- Sentry setup: `apps/kamdhenu-handoff-mobile/src/services/sentry.ts`
- QA probes: `apps/kamdhenu-handoff-mobile/src/services/qaDiagnostics.ts`
- QA controls: Settings > QA Diagnostics
- QA APK: `apps/kamdhenu-handoff/releases/Kamdhenu-Handoff-QA-1.0.17.apk`
- Production package: `com.kamdhenu.handoff`
- QA package: `com.kamdhenu.handoff.qa`
- QA deep link: `kamdhenu-handoff-qa://`
- Local file inside either app: `files/kamdhenu-diagnostics.jsonl`
- Prior smoke evidence: `apps/kamdhenu-handoff-mobile/test/artifact/runs/2026-09-06-env-smoke/OBS-009/`

At discovery time the repository HEAD was `5f77ef0`; the logging feature was introduced by `3dfb990`. Always record the actual `git rev-parse HEAD` in a new run because the branch may advance.

## Known implementation behavior

- The local logger stores at most 250 newline-delimited JSON entries.
- It flushes best-effort after a 250 ms timer. Wait at least one second after the last action before pulling the file unless the action explicitly flushes it.
- Each entry should contain `timestamp`, `app`, `environment`, `release`, `platform`, `journeyId`, `event`, `outcome`, and `level`, plus optional safe metadata such as `durationMs`, `taskId`, or `attemptId`.
- The sensitive-key matcher redacts keys containing title, note, message, phone, email, name, query, content, description, due date, subtask, payload, token, secret, password, or authorization.
- The local report is loaded across launches, malformed prior lines are discarded, and writes are serialized.
- Sentry is disabled when `__DEV__` is true. The QA APK's final manifest is debuggable for `run-as`, while its Gradle variant and JavaScript bundle remain release-mode, so `__DEV__` is false and Sentry can run. Keeping the Gradle variant release-mode also avoids mixing debug native code with release React Native libraries.
- Normal replay sampling is zero. Error replay sampling is one, but `beforeErrorSampling` permits replay only for crash/hang-like events. Text, images, and vectors are masked.
- `Share diagnostic report` logs `diagnostic_share_started` before composing the outgoing report. `diagnostic_share_completed` happens after the share result returns and may therefore appear only in the next report/pull.
- Logging and telemetry are best effort and must never block the product journey.

## Environment facts and limitations already established

- Connected phone observed: OPPO CPH2717 / CPH2717IN.
- Observed wireless ADB serial: `adb-9HUKNZ89FAHMCIUG-PSQuMr._adb-tls-connect._tcp`. Rediscover it; do not assume the serial remains stable.
- scrcpy was started as `scrcpy --tcpip`. Computer-use tooling cannot attach to its SDL CLI window because it is not exposed as a normal bundle-backed macOS app. Use scrcpy visually and ADB for deterministic control/evidence.
- Chrome had Sentry open at organization `personal-4ck`, project `kamdhenu-todo`. Explore > Logs displayed “Waiting for this project's first log”; that is consistent with the code and is not evidence that local logging failed.
- Production `run-as com.kamdhenu.handoff` fails because the release APK is not debuggable. Use in-app diagnostic sharing or filtered logcat for production evidence.
- QA `run-as com.kamdhenu.handoff.qa` is the supported direct-pull path.
- Android logcat is noisy and rotates quickly. Capture the relevant process/event immediately. Do not clear logcat because it may destroy useful evidence.
- Android's system share sheet exposes unrelated contacts. Treat every suggestion as unsafe; enter WhatsApp before choosing a recipient.
- WhatsApp Desktop is synced and may be used to inspect a message already sent to self. It does not relax the recipient rule.

## Preflight

Run from the repository root. Use a task-specific variable name; never overwrite common environment variables.

```bash
git status --short
git rev-parse HEAD
adb devices -l
pgrep -fl 'scrcpy.*--tcpip'
```

Choose the one connected device and set it explicitly:

```bash
TASK_DEVICE_SERIAL='replace-with-current-adb-serial'
adb -s "$TASK_DEVICE_SERIAL" get-state
adb -s "$TASK_DEVICE_SERIAL" shell getprop ro.product.model
adb -s "$TASK_DEVICE_SERIAL" shell pm list packages | rg 'com\.kamdhenu\.handoff'
adb -s "$TASK_DEVICE_SERIAL" shell dumpsys package com.kamdhenu.handoff.qa | rg 'versionName|versionCode|DEBUGGABLE'
```

Expected after QA installation: both `com.kamdhenu.handoff` and `com.kamdhenu.handoff.qa` exist. If the QA package is absent, stop and ask Karan to install the APK or, if explicitly asked, install it with:

```bash
adb -s "$TASK_DEVICE_SERIAL" install -r apps/kamdhenu-handoff/releases/Kamdhenu-Handoff-QA-1.0.17.apk
```

Create one timestamped run directory and never overwrite an earlier run:

```text
apps/kamdhenu-handoff-mobile/test/artifact/runs/YYYY-MM-DD-HHMM/<FLOW-ID>/
```

Each flow directory must contain `before.png`, `after.png`, `local-log.jsonl` or a documented substitute, `result.md`, and any relevant `sentry.png`, `whatsapp.png`, or `logcat.txt`. The run root must contain `checkpoint.json`.

Recommended `checkpoint.json` shape:

```json
{
  "runId": "YYYY-MM-DD-HHMM",
  "gitCommit": "full commit",
  "deviceSerial": "current serial",
  "package": "com.kamdhenu.handoff.qa",
  "lastCompletedFlow": "OBS-009",
  "nextFlow": "OBS-010",
  "connectionState": "connected",
  "updatedAt": "ISO-8601 timestamp",
  "notes": "short factual note"
}
```

Update the checkpoint immediately after every flow, before starting the next. Also update it before any deliberate crash.

## Connection gate

Before each flow and before every send/crash, run both checks:

```bash
adb -s "$TASK_DEVICE_SERIAL" get-state
pgrep -fl 'scrcpy.*--tcpip'
```

If either check fails:

1. Stop touching the phone and all related UIs.
2. Mark `connectionState` as `disconnected` and preserve `lastCompletedFlow`/`nextFlow`.
3. Save any already-returned command output; do not invent the result of an in-flight step.
4. Report that testing is paused and identify whether ADB, scrcpy, or both were lost.
5. Resume only after Karan restores the connection and both gates pass again.

## Exact per-flow execution loop

1. Read the entire matrix row: trigger, preconditions, branch, current/expected output, privacy rule, priority, source reference, and notes.
2. Classify it as observable user action, local-log mechanics, failure injection, Sentry-only, privacy, or Android-not-applicable.
3. Check ADB and scrcpy; record the foreground package with `adb shell dumpsys window | rg 'mCurrentFocus|mFocusedApp'`.
4. Establish only the data required by the row. Give test items a flow-specific prefix such as `QA-FLOW-042` so they can be distinguished without inspecting private content.
5. Capture `before.png`:

   ```bash
   adb -s "$TASK_DEVICE_SERIAL" exec-out screencap -p > before.png
   ```

6. Perform exactly one trigger/branch. For WhatsApp, obey the self-only sequence. For destructive QA crash probes, first save the checkpoint.
7. Wait one second for ordinary logs. Capture `after.png` immediately.
8. Pull local evidence from QA:

   ```bash
   adb -s "$TASK_DEVICE_SERIAL" exec-out run-as com.kamdhenu.handoff.qa cat files/kamdhenu-diagnostics.jsonl > local-log.jsonl
   ```

   Production fallback: capture filtered logcat immediately or Settings > Share diagnostic report to `Karan Shah (You)`.

9. Locate the exact event(s), parse each JSON line, and correlate using `journeyId`, `attemptId`, `taskId`, timestamps, and event order. Do not accept a visually similar older entry.
10. If the row expects Sentry, use the Sentry **Issues** or event view, not Explore > Logs. Verify project, environment, release/dist, event/tag, breadcrumb order, and masking. Capture a screenshot without exposing credentials.
11. Check that the actual product outcome still matches the journey. Telemetry success alone is not a pass.
12. Write `result.md` with verdict, actual steps, assertions, exact evidence files, anomalies, connection status, and the next flow.
13. Update the run checkpoint. Only then continue.

## Verdict rules

- **Pass**: the user journey and every expected output for the row were directly observed and correlated.
- **Fail**: expected implemented behavior was exercised and contradicted by evidence.
- **Known instrumentation gap**: the matrix/current source says the event is missing. Confirm the user journey still works, preserve evidence, and do not relabel the gap as a pass.
- **Android not applicable**: the row genuinely requires iOS or a mechanism unavailable on Android; cite the reason.
- **Blocked by unavailable mechanism**: a required safe fault, account state, or connection cannot be produced. State exactly what is missing.

Never infer `Pass` from source code alone, from an old entry, or from the absence of a visible error.

## Evidence assertions

For a normal event, verify:

- valid one-line JSON and ISO timestamp;
- `app=kamdhenu-handoff-qa`, `environment=qa`, `release=1.0.17-qa`, `platform=android` in the QA APK;
- exact event and outcome from the matrix;
- stable `journeyId` across the same launch and a new ID after a true process restart;
- correct `attemptId` ordering for multi-step attempts;
- duration is non-negative where present;
- no title, note, phone, email, message body, due date, subtask text, token, or authorization value leaks;
- diagnostic report contains the same retained JSON entries as the local file at capture time;
- product behavior is unchanged if local writing or Sentry delivery fails.

For retention, tap **Generate 260 retention events**, pull the file, and assert it has no more than 250 valid lines. Use the returned run ID and sequence fields to show that the newest entries survived and the oldest were evicted. Account for the probe action itself and any lifecycle/share events when calculating the exact retained subset.

For persistence, pull the file, force-stop only the QA package, reopen it, wait for startup, and pull again. Prior retained entries should remain and new startup entries should append. Do not clear QA app data between pulls.

For flush timing, test immediately-after-action and after-one-second pulls separately. A delayed flush is expected; loss after the explicit QA flush or after a clean relaunch is not.

## Privacy regression procedure

Use unmistakable sentinel values only in the QA app, for example:

- title: `QA_SECRET_TITLE_9f2a`
- note: `QA_SECRET_NOTE_9f2a`
- phone: `+919999990001`
- email: `qa-secret-9f2a@example.invalid`
- token-shaped text: `QA_TOKEN_9f2a`

Exercise the relevant journey, then search the pulled JSONL, diagnostic report, filtered logcat, and Sentry event/breadcrumb contexts. The sentinel values must not appear. Safe identifiers, counts, booleans, durations, event names, and `[REDACTED]` may appear. Record whether redaction happened at the logger and whether any call site bypassed it.

The matrix labels the privacy flow as a mismatch, but current source appears to redact sensitive keys and task creation currently logs IDs/counts/booleans. Treat the matrix as potentially stale and decide only from this sentinel test.

## WhatsApp procedure

Only send to **Karan Shah (You)**:

1. Trigger the Kamdhenu share action.
2. If Android shows direct-share people, ignore all of them.
3. Tap the WhatsApp app icon.
4. Search for or tap `Karan Shah (You)` inside WhatsApp.
5. Verify `1 selected` and the destination label exactly.
6. Send and capture evidence.
7. Use WhatsApp Desktop only to verify the self-chat copy if useful.

If any other recipient becomes selected, cancel immediately without sending, capture the state if safe, and mark the flow failed/blocked as appropriate.

## Sentry handled-error and crash procedure

The Sentry tab may initially show no Logs. Navigate to **Issues** for these probes.

### Handled error

1. Save checkpoint and record current time.
2. Settings > QA Diagnostics > **Capture handled error**.
3. Pull local JSONL and verify `qa_handled_error_probe` with failure/error fields.
4. In Sentry Issues, find the new event in project `kamdhenu-todo`, environment `qa`, release `1.0.17-qa`, dist `17-qa`.
5. Verify safe diagnostic context, tags, and prior breadcrumbs. No replay is expected for a non-crash handled error under the crash/hang gate.

### JavaScript crash

1. Save checkpoint with the next step `reopen QA after JS crash`.
2. Tap **JS crash**, read the warning, and confirm.
3. Observe whether Android closes/reports the QA app; do not interact with production.
4. Reopen QA, wait for upload, and pull the local file. Look for `qa_js_crash_requested`, a fatal/uncaught event, and on the next launch `previous_session_crashed` when the SDK reports it.
5. In Sentry Issues verify the crash event, breadcrumbs, and masked replay eligibility. If no event arrives, record network/DSN/release details without exposing secret values.

### Native crash

Repeat the same checkpoint discipline with **Native crash**. The native crash may upload only after the next launch. Verify package identity so Android's crash belongs to `.qa`. A crash replay is eligible, but availability still depends on the installed Sentry native SDK and successful upload.

## Matrix execution order

Do not execute purely in CSV order when setup would obscure correlation. Use these batches while retaining original flow IDs:

1. P0 startup/lifecycle/observability config and the completed environment smoke.
2. P0 task creation and autosave, including duplicate taps, validation, SQLite failure, navigation, backgrounding, and correlation.
3. P0 diagnostic sharing, privacy, local persistence, retention, malformed prior data, and logging-resilience cases.
4. P0 global errors, handled error, JavaScript crash, native crash, crash recovery, and Sentry attachment.
5. Remaining P0 product areas: navigation, data load, lists/views, task detail, contacts, WhatsApp, bulk actions.
6. P1 and then P2 regressions, grouped by feature area to minimize state churn.
7. Re-run privacy sentinels after any crash/error case that attaches breadcrumbs or diagnostic context.

Within each feature batch, test success first, then cancellation/ignored branches, validation branches, concurrency/repeated taps, data failures, native integration failures, and finally crash/recovery.

Some failure rows require controlled fault injection. Prefer QA-only probes, temporary QA data, mocked/blocked network where safely reversible, permission denial, invalid input, or force-stopping only the QA package. Never corrupt the production SQLite database or modify phone-wide accounts/settings to manufacture a failure.

## Completed smoke case: OBS-009

Verdict: **Pass** on 2026-09-06 using production package `com.kamdhenu.handoff`, version 1.0.17 (17).

- App was foregrounded, Android Home was pressed, and launcher became foreground.
- Exact logcat event:

  ```json
  {"timestamp":"2026-09-06T05:51:21.999Z","app":"kamdhenu-handoff","environment":"production","release":"1.0.17","platform":"android","journeyId":"1788672720592-kwisgv6h","event":"app_state_background","outcome":"success","level":"debug"}
  ```

- Settings > Share diagnostic report was sent only to `Karan Shah (You)` and contained the same journey ID and exact background event plus startup/SQLite entries.
- App was returned to `com.kamdhenu.handoff/.MainActivity`; ADB and scrcpy stayed connected.
- Evidence and detailed assertions are under `test/artifact/runs/2026-09-06-env-smoke/OBS-009/`; run checkpoint is one directory above.
- No Sentry event was expected because this was a normal breadcrumb/debug event.

## Known or suspected issues to preserve in reports

1. Production private-file extraction is unavailable because the APK is not debuggable. This is why the separate QA package exists.
2. Sentry Explore > Logs remains empty by design; the app has not enabled the Sentry Logs product. Do not file that alone as a local-logging defect.
3. `logError()` currently captures `new Error(event.event)` rather than the original `Error`. This can lose the original message and stack while retaining only an `error_class` tag. Matrix OBS-019/OBS-033 expect the original error; record this as a static discrepancy pending device evidence.
4. The observability change record says “unmasked replay,” but current source masks text, images, and vectors. Treat the change record wording as stale or contradictory and verify the safe masked behavior.
5. The matrix has 69 rows already marked missing and one mismatch. These remain explicit coverage gaps until implementation and device evidence prove otherwise.
6. A 250 ms async transport/flush creates a timing edge. Pulling too quickly can miss the newest line; use the documented wait or explicit QA probe flush.
7. The share report can contain `diagnostic_share_started` but not its own `diagnostic_share_completed` because completion occurs after the report is composed.
8. Direct-share suggestions create a real mis-send risk. The WhatsApp-app-first sequence is mandatory.
9. Screenshots may expose unrelated contact names. Keep them uncommitted and avoid including them in summaries.
10. If scrcpy or ADB drops during a step, that step has no reliable verdict and must be resumed or repeated after reconnection.
11. The first QA build attempt failed because Gradle-level `debuggable true` selected debug C++ linkage while dependencies used release libraries, producing undefined React Native symbols. The fix is the QA manifest-only debuggable flag; do not move that flag back into the Gradle build type.
12. Android lint normally rejects a hardcoded debuggable manifest. The QA overlay carries a narrowly scoped `HardcodedDebugMode` suppression because this package is deliberately non-production and registered separately; never copy that suppression into the production manifest.

## Build, inspect, install, pull, and undo

Build from the repository root:

```bash
pnpm --dir apps/kamdhenu-handoff-mobile build:android:qa
```

Expected artifact:

```text
apps/kamdhenu-handoff/releases/Kamdhenu-Handoff-QA-1.0.17.apk
```

Verified build produced on 2026-09-06:

- size: 113.12 MB;
- SHA-256: `5b0217bba1cd714ab82a5c73fad861666442d851b7bb6f235729b1f87d24b56e`;
- package/version: `com.kamdhenu.handoff.qa`, `1.0.17-qa` (17);
- visible label: `Kamdhenu Handoff QA`;
- minimum/target Android API: 24/36;
- final manifest: debuggable true, scheme `kamdhenu-handoff-qa`;
- signing: valid APK Signature Scheme v2 using the repository's Android debug certificate;
- bundled ABIs include arm64-v8a, armeabi-v7a, x86, and x86_64.

The QA build intentionally sets `SENTRY_DISABLE_AUTO_UPLOAD=true`, so building it does not upload source maps or create remote build artifacts. Runtime events still use the bundled public DSN. A non-fatal Sentry Gradle module-collection warning may mention `android/node_modules`; record it if symbolication is incomplete, but distinguish it from runtime event delivery.

After installation, launch by tapping **Kamdhenu Handoff QA** or:

```bash
adb -s "$TASK_DEVICE_SERIAL" shell monkey -p com.kamdhenu.handoff.qa -c android.intent.category.LAUNCHER 1
```

Direct pull:

```bash
adb -s "$TASK_DEVICE_SERIAL" exec-out run-as com.kamdhenu.handoff.qa cat files/kamdhenu-diagnostics.jsonl > local-log.jsonl
```

To undo on the phone without affecting production:

```bash
adb -s "$TASK_DEVICE_SERIAL" uninstall com.kamdhenu.handoff.qa
```

That deletes only QA app data. It does not touch `com.kamdhenu.handoff`. The APK and evidence are ignored local artifacts unless intentionally added later.

## Completion gate for the whole matrix

Testing is complete only when every one of the 151 flow IDs has a verdict and evidence reference, all P0 failures were reproduced or explicitly blocked, local/report/Sentry outputs were distinguished correctly, privacy sentinels were absent everywhere, all deliberate crashes were followed by recovery checks, the final checkpoint says `complete`, and ADB/scrcpy were connected at the final save.
