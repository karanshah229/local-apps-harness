# OBS-009 environment smoke test

- Result: PASS
- Matrix case: OBS-009
- Trigger: Send AppState change to background
- Expected local event: `app_state_background` with success outcome and debug level
- Device: Android CPH2717
- Installed app: `com.kamdhenu.handoff`, version 1.0.17, build 17
- Runtime environment recorded by app: production
- Started: 2026-09-06 11:20 IST
- Trigger observed: 2026-09-06 11:21:21.999 IST
- Finished: 2026-09-06 11:28 IST

## Assertions

1. Kamdhenu Handoff was foregrounded before the trigger: PASS.
2. Android Home moved Kamdhenu Handoff to the background and foregrounded the launcher: PASS.
3. React Native emitted exactly one observed `app_state_background` event for the trigger: PASS.
4. The event contains `app=kamdhenu-handoff`, `environment=production`, `release=1.0.17`, `platform=android`, `outcome=success`, `level=debug`, and a journey ID: PASS.
5. The in-app diagnostic report retained the same event and journey ID after reopening the app: PASS.
6. The report was sent only to WhatsApp destination `Karan Shah (You)`: PASS.
7. The app returned to Kamdhenu Handoff after evidence collection: PASS.
8. Sentry event: not expected for a normal debug breadcrumb and not tested in this case.

## Environment findings

- ADB and scrcpy remained connected for the complete case.
- The installed production APK is not debuggable. `run-as` correctly rejects private-file access, so direct extraction of `files/kamdhenu-diagnostics.jsonl` is unavailable for this build.
- The supported in-app diagnostic share path successfully exposes the persistent report.
- The Android share sheet surfaces unrelated direct-contact suggestions. Safe WhatsApp testing must select the WhatsApp application first, then select and verify `Karan Shah (You)` before sending.
- Device logcat is noisy and rotates quickly. Capture each relevant log line immediately after its trigger.

## Evidence

- `before.png`: Kamdhenu Handoff foregrounded on All tasks.
- `after.png`: Android launcher after the background trigger.
- `device-log.txt`: exact structured React Native event.
- `settings.png`: diagnostic-share control in app version 1.0.17.
- `share-sheet.png`: Android share sheet before destination selection.
- `whatsapp-picker.png`: WhatsApp recipient picker with no selection.
- `whatsapp-selected.png`: exactly one selected recipient, Karan Shah (You).
- `whatsapp-sent.png`: diagnostic report delivered to Karan Shah (You).
- `report-expanded.png`: persistent report showing the complete `app_state_background` event.
- `final.png`: WhatsApp delivery state before returning to Kamdhenu Handoff.

Screenshots are local, uncommitted test evidence. Some capture surrounding device UI and contact names; do not publish them.
