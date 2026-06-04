# Task 389: Update after offline manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

## Steps / Steg

1. Prime Build A online and create local mission/checklist state.
2. Go offline and use the app.
3. Deploy/open Build B with changed service-worker/cache version.
4. Reconnect and verify `Ny offline-versjon klar` / update-cache prompt appears.
5. Tap update, confirm reload/activation, content version changes and local mission data remains.

## Expected result / Forventet resultat

Offline-created local data survives update activation after reconnect.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. The app remains local/offline decision support, not an official command system.
