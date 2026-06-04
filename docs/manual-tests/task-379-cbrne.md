# Task 379: CBRNE manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

## Steps / Steg

1. Open `/moduler/cbrn`.
2. Open `/kort/cbrne-startkort`, `/kort/cbrne-soneinndeling`, `/kort/cbrne-verneutstyr-stoppkriterier`, and `/kort/mre-ren-uren-side-grovrens`.
3. Create a CBRNE mission using safe test data.
4. Verify fagmyndighet/order/stop-criteria warnings and competence notes are visible.
5. Go offline and reload the module/card.

## Expected result / Forventet resultat

CBRNE cards and module remain warning-first, source-backed and offline usable.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. The app remains local/offline decision support, not an official command system.
