# Task 377: Flom/pumpe manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

## Steps / Steg

1. Open `/hurtigkort`, search `flom` and `pumpe`.
2. Open `/kort/flom-pumpe-start` and `/kort/flom-pumpe-vannforsyning`.
3. Create `/oppdrag/ny` with phase Under, scenario Flom, and safe location `Testområde flom`.
4. Verify pump, hose, safety and source-warning copy is visible.
5. Prime cache, go offline, reload mission/card and verify local state remains.

## Expected result / Forventet resultat

Flom/pumpe cards, mission, checklist fallback and offline reload work without persondata.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. The app remains local/offline decision support, not an official command system.
