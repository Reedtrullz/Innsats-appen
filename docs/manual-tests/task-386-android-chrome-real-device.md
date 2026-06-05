# Task 386: Android Chrome real device manual test script

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

1. Use a physical Android device or real-device lab; desktop Chromium emulation is not enough.
2. Record Android model, OS version and Chrome version.
3. Create mission/checklist state, use hardware/software back, rotate screen and reload offline.
4. Check address-bar resize, keyboard, bottom nav and local persistence.
5. Record sanitized screenshots and defects.

## Expected result / Forventet resultat

Android Chrome works on a physical device; if no device is available, status remains not executed.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. The app remains local/offline decision support, not an official command system.
