# Task 383: Offline use manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

## Steps / Steg

1. Open `/`, `/hurtigkort`, `/for`, `/under`, `/etter`, `/kilder`, `/laering`, selected `/kort/*`, and selected `/moduler/*` online.
2. Wait for service worker/cache readiness.
3. Disable network or use airplane mode.
4. Reload each selected route and verify offline/stale/fallback labels.
5. Create/modify a local mission and confirm it persists offline.

## Expected result / Forventet resultat

Cached public content and local mission state remain usable offline; external failures are transparent.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. The app remains local/offline decision support, not an official command system.
