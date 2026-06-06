# Task 385: iPhone Safari real device manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

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
- Device/browser/OS: blocked — physical iPhone / Safari; no Chromium emulation accepted.
- Network condition: blocked — physical iPhone Safari or real-device lab was not available.
- Sanitized screenshot/log path: blocked — no sanitized physical/lab evidence captured.
- Result: blocked | pass | fail — blocked because physical iPhone Safari or real-device lab was not available.
- Privacy note: no persondata/patientdata/private location entered.

## Steps / Steg

1. Use a physical iPhone or real-device lab; Chromium emulation is not enough.
2. Record iPhone model, iOS version and Safari version.
3. Open the HTTPS site, create a local mission, run a checklist and reload offline.
4. Check safe-area/notch, keyboard, orientation, back/forward and Safari toolbar behavior.
5. Record sanitized screenshots and defects.

## Expected result / Forventet resultat

iPhone Safari works on a physical device; if no device is available, status remains not executed.

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

Required unblocker: connect/unlock the relevant physical device(s) or provide a real-device-cloud lab, then rerun this script and replace this blocked status with sanitized pass/fail evidence.

## Execution attempt / status (2026-06-06T16:41:26Z)

Status: blocked — not executed.

Fresh discovery performed from the controller Mac before any physical-device evidence was claimed:

- Production build available: `https://innsats.reidar.tech` with `/api/health.version` = `8f85c01ddd08e0714b97644f4e5537f23a29c403`.
- Staging build available: `https://staging.198.23.137.16.nip.io` with `/api/health.version` = `d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f`.
- Local release candidate at discovery time was `e2017a94ba8a933c5be972969bfd2cdd7e1dbacb`, ahead of `origin/main`; it was not claimed as deployed or device-tested.
- iOS discovery via `xcrun xctrace list devices` found `ReePhone (26.4.2)` offline/unavailable to automation; no iPhone Safari run was performed.
- `idevice_id`, `ios_webkit_debug_proxy`, and `appium` were not installed.
- Android discovery found no connected Android device and `adb` was not available.
- No BrowserStack, Sauce Labs, LambdaTest, Appium, Device Farm, or equivalent real-device-cloud environment indicators were present.
- Desktop Chromium/Playwright/browser emulation remains supporting evidence only and was intentionally not accepted as pass evidence for this task.
- No persondata, patientdata, real Nødnett groups, private addresses, skjermede positions, sensitive samband or official operational plans were entered or captured.

Required unblocker remains unchanged: connect/unlock a physical iPhone capable of Safari testing or provide a real-device-cloud lab, then rerun this script and replace this blocked status with sanitized pass/fail evidence.
