# Task 376: Browser compatibility smoke matrix

## Prerequisites / Forutsetninger

- Test an HTTPS production build and record build SHA and content version.
- Use safe test data only: no persondata, no patientdata, no private locations, no sensitive samband or official operational plans.
- Have `docs/manual-tests/result-log-template.md` ready.
- Automated Playwright Chromium coverage is required before this matrix is treated as ready for manual browser checks.
- Firefox, WebKit/Safari and mobile browser results must be recorded from the named browser/device, not inferred from Chromium alone.

## Browser compatibility matrix

| Browser/device | Minimum smoke route set | Required checks | Evidence boundary |
| --- | --- | --- | --- |
| Chromium desktop/current Chrome | `/hurtigkort`, `/oppdrag`, `/data-pa-enheten`, `/offline` | Search, create local mission, checkbox persistence, export/import schema check, offline reload | Automated Playwright is acceptable for baseline plus sanitized screenshot on release candidate |
| Firefox desktop/current ESR or stable | same route set | Layout, forms, IndexedDB/localStorage, download/export textareas, offline status copy | Manual or browser-lab evidence required |
| WebKit desktop/Safari Technology Preview or Safari stable | same route set | Layout, form labels, IndexedDB/localStorage, service-worker status, no horizontal overflow | Manual or browser-lab evidence required |
| iPhone Safari | see Task 385 | Mobile Safari, safe area, installed/offline behavior where applicable | Physical device or real-device lab required |
| Android Chrome | see Task 386 | Mobile Chrome, keyboard/back/orientation/local state | Physical device or real-device lab required |

## Steps / Steg

1. Run the automated Chromium Group 13 E2E suite and record the command/result in the result log.
2. For each browser/device row, open the HTTPS build and record browser version, OS, viewport/orientation and network state.
3. Navigate the minimum smoke route set.
4. On `/hurtigkort`, search for `tilfluktsrom` and open the Klargjør tilfluktsrom card.
5. On `/oppdrag`, create a sanitized local mission and tick one checklist item.
6. Reload `/oppdrag` and verify the mission/checklist state is still present.
7. On `/data-pa-enheten`, generate a local JSON backup and verify it reports schema v1 without uploading anything.
8. Prime `/offline`, disable network where supported, reload `/hurtigkort` and verify offline/stale status is honest.
9. Record pass/fail per row and link defects to exact browser/device rows.

## Expected result / Forventet resultat

The browser compatibility smoke matrix shows which browsers were actually tested, which are automated proxies, and which require physical or browser-lab evidence. The app remains usable for the smoke route set without backend sync, account login, persondata, or official command-system claims.

## Evidence / Dokumentasjon

For each row, attach a sanitized result log with build SHA, content/cache version, browser version, OS/device, route set, pass/fail, defects and screenshots/video paths. Mark rows as `not executed` rather than passed when the browser/device was unavailable.

## Privacy / Personvern

No persondata, patientdata, names, IDs, private/skjermede locations, sensitive samband details or official operational plans are entered or captured. Backups stay local and are not uploaded.
