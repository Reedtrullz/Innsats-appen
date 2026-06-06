# Task 388: Low-connectivity manual test script

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
- Device/browser/OS: blocked — physical device under weak cellular/network-lab condition; no desktop throttling pass accepted.
- Network condition: blocked — weak-network/cellular/network-lab run on a real device was not available.
- Sanitized screenshot/log path: blocked — no sanitized physical/lab evidence captured.
- Result: blocked | pass | fail — blocked because weak-network/cellular/network-lab run on a real device was not available.
- Privacy note: no persondata/patientdata/private location entered.

## Steps / Steg

1. Prime cache online.
2. Use weak cellular, throttled router, network link conditioner or real-device lab.
3. Open `/hurtigkort`, `/oppdrag`, selected cards and local mission while network is slow/flaky.
4. Confirm cached content appears, external context shows stale/failure honestly, and local writes continue.
5. Record latency, failures and screenshots with sanitized data.

## Expected result / Forventet resultat

The app remains usable and honest under weak/unstable connectivity.

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

Required unblocker: provide a weak-network/cellular/network-lab setup on a real device or real-device lab, then rerun this script and replace this blocked status with sanitized pass/fail evidence.
