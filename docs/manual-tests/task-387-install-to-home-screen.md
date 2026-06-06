# Task 387: Install to Home Screen manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

Evidence fields must include:
- Installed-app launch route: `/`.
- Screenshot of the standalone home command surface after launch.
- Screenshot or notes proving links from `/` to `/hurtigkort`, `/sok`, `/oppdrag`, and `/data-pa-enheten` are visible or reachable.
- Confirmation that only sanitized test mission names/data were used.

## Evidence required

- Device/browser/OS version.
- Exact deployed SHA from `https://innsats.reidar.tech/api/health`.
- Screenshots of route markers using sanitized test mission names only.
- Offline/low-connectivity/update condition used.
- Pass/fail result and notes.
- Confirmation that no persondata, patient data, real Nødnett groups, private addresses, or skjermede positions were entered.

## Exact SHA evidence packet (ready, not executed)

- Tested URL: https://staging.198.23.137.16.nip.io (replace with the exact pilot/staging URL used during the manual run).
- Expected `/api/health.version`: d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f (replace with the candidate SHA before rerun).
- Observed `/api/health.version`: blocked — no physical/lab run observed it.
- Device/browser/OS: blocked — physical device installed PWA / standalone launch; no browser automation accepted.
- Network condition: blocked — OS-level install-to-home-screen run on physical iOS/Android device or real-device lab was not available.
- Sanitized screenshot/log path: blocked — no sanitized physical/lab evidence captured.
- Result: blocked | pass | fail — blocked because OS-level install-to-home-screen run on physical iOS/Android device or real-device lab was not available.
- Privacy note: no persondata/patientdata/private location entered.

## Steps / Steg

1. On iOS Safari: Share -> Add to Home Screen; on Android Chrome: install prompt/menu.
2. Launch from the installed icon.
3. Verify app name, icon, start_url `/`, standalone display and safe area.
4. Confirm the installed app opens on `/` (home command surface) and links to `/hurtigkort`, `/sok`, `/oppdrag`, and `/data-pa-enheten` are visible or reachable.
5. Prime cache, close app, disable network, relaunch installed PWA.
6. Record OS-level screenshots; browser automation alone cannot prove this.

## Expected result / Forventet resultat

Installed PWA launches at `/` (home command surface), exposes links to `/hurtigkort`, `/sok`, `/oppdrag`, and `/data-pa-enheten`, and works offline from the OS home screen.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. The app remains local/offline decision support, not an official command system.

## Execution attempt / status (2026-06-06T00:47:31Z)

Status: blocked — not executed.

Discovery performed from the controller Mac before any manual-device evidence was claimed:

- Staging build available: `https://staging.198.23.137.16.nip.io` with `/api/health.version` = `d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f`.
- iOS discovery found a paired iPhone entry, but it was offline/unavailable to automation; no iPhone Safari run was performed.
- Android discovery found no connected Android device and `adb` was not available.
- No BrowserStack, Sauce Labs, LambdaTest, Appium, or equivalent real-device-cloud credentials/tools were present in the execution environment.
- Desktop Chromium/Playwright/browser emulation was intentionally not accepted as pass evidence for this task.
- No persondata, patientdata, real Nødnett groups, private addresses, skjermede positions, sensitive samband or official operational plans were entered or captured.

Required unblocker: connect/unlock the iOS/Android physical device(s) capable of OS-level install-to-home-screen testing or provide a real-device-cloud lab, then rerun this script and replace this blocked status with sanitized pass/fail evidence.
