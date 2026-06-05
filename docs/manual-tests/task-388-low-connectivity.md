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
