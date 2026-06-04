# Task 382: Etter innsats / MBK manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

## Steps / Steg

1. Open `/etter` and `/kort/fig-etterinnsats-klargjoring`.
2. Create an Etter mission with role lagfører or materiellansvarlig.
3. Run applicable checklist/MBK controls and generate MBK Markdown/JSON.
4. Generate after-action export with sanitized local order/log text.
5. Verify output says local support, not official inventory/archive.

## Expected result / Forventet resultat

After-action and MBK flow works with local-only warnings and sanitized exports.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. The app remains local/offline decision support, not an official command system.
