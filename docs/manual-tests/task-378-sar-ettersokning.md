# Task 378: SAR/ettersøkning manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

## Steps / Steg

1. Open `/kort/sok-og-redning-startkort`, `/kort/soketeig-sektor`, and `/kort/posisjonsrapport-kart-kompass-gps`.
2. Create a Søk og redning mission with sanitized location `Testområde SAR`.
3. Use `/kart` only for local schematic notes; do not enter real search plans or persondata.
4. Verify local/offline and no live tracking warnings.
5. Reload offline and confirm mission/card remains usable.

## Expected result / Forventet resultat

SAR/ettersøkning content is navigable, local-only and usable offline.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. The app remains local/offline decision support, not an official command system.
