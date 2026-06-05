# Task 387: Install to Home Screen manual test script

## Prerequisites / Forutsetninger

- Test an HTTPS build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have the result-log template ready and collect only sanitized evidence.

## Evidence / Dokumentasjon

Record pass/fail, device/browser, network state, screenshots or video paths, console/errors if available, and privacy notes. Screenshots must not contain sensitive or personal information.

Evidence fields must include:
- Installed-app launch route: `/`.
- Screenshot of the standalone home command surface after launch.
- Screenshot or notes proving links from `/` to `/hurtigkort`, `/sok`, `/oppdrag`, and `/data-pa-enheten` are visible or reachable.
- Confirmation that only sanitized test mission names/data were used.

## Steps / Steg

1. On iOS Safari: Share -> Add to Home Screen; on Android Chrome: install prompt/menu.
2. Launch from the installed icon.
3. Verify app name, icon, start_url `/`, standalone display and safe area.
4. Confirm the installed app opens on `/` (home command surface) and links to `/hurtigkort`, `/sok`, `/oppdrag`, and `/data-pa-enheten` are visible or reachable.
5. Prime cache, close app, disable network, relaunch installed PWA.
6. Record OS-level screenshots; browser automation alone cannot prove this.

## Expected result / Forventet resultat

Installed PWA launches at `/` (home command surface), exposes links to `/hurtigkort`, `/sok`, `/oppdrag`, and `/data-pa-enheten`, and works offline from the OS home screen.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. The app remains local/offline decision support, not an official command system.
