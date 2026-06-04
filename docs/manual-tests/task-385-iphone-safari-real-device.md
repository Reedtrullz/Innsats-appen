# Task 385: iPhone Safari real device manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

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
