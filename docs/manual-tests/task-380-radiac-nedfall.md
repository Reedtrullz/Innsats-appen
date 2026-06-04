# Task 380: RADIAC/nedfall manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

## Steps / Steg

1. Open `/moduler/radiac`.
2. Open `/kort/radiac-dosekontroll`, `/kort/radiac-malepunkt`, `/kort/radiac-oppholdstid-rullering`, and `/kort/jod-atomberedskap`.
3. Create a RADIAC/nedfall mission and run the RADIAC equipment checklist if selected.
4. Verify no app-side dose-limit calculation or official order claim is made.
5. Reload offline and verify checklist state.

## Expected result / Forventet resultat

RADIAC/nedfall flow preserves competence/order boundaries and offline state.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. The app remains local/offline decision support, not an official command system.
