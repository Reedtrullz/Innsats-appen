# Task 385: iPhone Safari real device manual test script

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

## Exact SHA evidence packet (ready, not executed)

- Tested URL: https://staging.198.23.137.16.nip.io (replace with the exact pilot/staging URL used during the manual run).
- Expected `/api/health.version`: d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f (replace with the candidate SHA before rerun).
- Observed `/api/health.version`: blocked — no physical/lab run observed it.
- Device/browser/OS: blocked — physical iPhone / Safari; no Chromium emulation accepted.
- Network condition: blocked — physical iPhone Safari or real-device lab was not available.
- Sanitized screenshot/log path: blocked — no sanitized physical/lab evidence captured.
- Result: blocked | pass | fail — blocked because physical iPhone Safari or real-device lab was not available.
- Privacy note: no persondata/patientdata/private location entered.

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

## Execution attempt / status (2026-06-06T00:47:31Z)

Status: blocked — not executed.

Discovery performed from the controller Mac before any manual-device evidence was claimed:

- Staging build available: `https://staging.198.23.137.16.nip.io` with `/api/health.version` = `d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f`.
- iOS discovery found a paired iPhone entry, but it was offline/unavailable to automation; no iPhone Safari run was performed.
- Android discovery found no connected Android device and `adb` was not available.
- No BrowserStack, Sauce Labs, LambdaTest, Appium, or equivalent real-device-cloud credentials/tools were present in the execution environment.
- Desktop Chromium/Playwright/browser emulation was intentionally not accepted as pass evidence for this task.
- No persondata, patientdata, real Nødnett groups, private addresses, skjermede positions, sensitive samband or official operational plans were entered or captured.

Required unblocker: connect/unlock the relevant physical device(s) or provide a real-device-cloud lab, then rerun this script and replace this blocked status with sanitized pass/fail evidence.

## Execution attempt / status (2026-06-06T16:41:26Z)

Status: blocked — not executed.

Fresh discovery performed from the controller Mac before any physical-device evidence was claimed:

- Production build available: `https://innsats.reidar.tech` with `/api/health.version` = `8f85c01ddd08e0714b97644f4e5537f23a29c403`.
- Staging build available: `https://staging.198.23.137.16.nip.io` with `/api/health.version` = `d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f`.
- Local release candidate at discovery time was `e2017a94ba8a933c5be972969bfd2cdd7e1dbacb`, ahead of `origin/main`; it was not claimed as deployed or device-tested.
- iOS discovery via `xcrun xctrace list devices` found `ReePhone (26.4.2)` offline/unavailable to automation; no iPhone Safari run was performed.
- `idevice_id`, `ios_webkit_debug_proxy`, and `appium` were not installed.
- Android discovery found no connected Android device and `adb` was not available.
- No BrowserStack, Sauce Labs, LambdaTest, Appium, Device Farm, or equivalent real-device-cloud environment indicators were present.
- Desktop Chromium/Playwright/browser emulation remains supporting evidence only and was intentionally not accepted as pass evidence for this task.
- No persondata, patientdata, real Nødnett groups, private addresses, skjermede positions, sensitive samband or official operational plans were entered or captured.

Required unblocker remains unchanged: connect/unlock a physical iPhone capable of Safari testing or provide a real-device-cloud lab, then rerun this script and replace this blocked status with sanitized pass/fail evidence.

## Execution attempt / status (2026-06-06T17:34:29Z)

Status: blocked — partial real-device iPhone Safari evidence captured; final pass not claimed.

Physical-device testing started after Developer Mode was enabled, then stopped at user request so the iPhone could be disconnected. Evidence captured before stopping:

- Tested URL: `https://innsats.reidar.tech`.
- Observed `/api/health.version` from iPhone Safari runtime fetch: `8f85c01ddd08e0714b97644f4e5537f23a29c403`.
- Device/browser/OS: `ReePhone`, iPhone 12 Pro Max (`iPhone13,4`), iOS `26.5`, Mobile Safari (`com.apple.mobilesafari`) inspected through `ios_webkit_debug_proxy` after `devicectl` confirmed Developer Mode enabled and DDI services usable.
- Sanitized local mission created/verified: `Hermes iPhone Safari test 1905` with location `Øvelse`.
- Online physical Safari evidence passed for route reachability and local-only state: `/oppdrag` rendered the mission card, checklist state `Kontroller ventilasjon` was checked and still present after reload, `/kart` rendered the schematic offline map, and sanitized marker `Hermes markør øvelse (42, 58)` was visible and persisted after reload.
- Evidence packet: `docs/manual-tests/evidence/task-385-iphone-safari-2026-06-06/evidence.json`.
- Sanitized screenshots: `docs/manual-tests/evidence/task-385-iphone-safari-2026-06-06/oppdrag-online.png`, `docs/manual-tests/evidence/task-385-iphone-safari-2026-06-06/map-marker-online.png`, and `docs/manual-tests/evidence/task-385-iphone-safari-2026-06-06/oppdrag-webkit-request-interception.png`.
- Attempted offline/low-connectivity automation: WebKit Inspector `Network.setInterceptionEnabled(interceptRequests=true)` plus reload. It did not produce intercepted requests (`intercepted=[]`) and `navigator.onLine` remained `true`, so this is recorded as supporting reload/cache evidence only, not a hardware Airplane Mode, weak-network, captive-portal, or cellular low-connectivity pass.
- Not completed before user-requested stop: hardware offline/low-connectivity observation, Safari toolbar/back-forward/orientation/manual keyboard observation, install-to-home-screen, Android Chrome, and two-build offline-update drill.
- Privacy note: no persondata, patientdata, real Nødnett groups, private addresses, skjermede positions, sensitive samband or official operational plans were entered or captured. Only sanitized exercise strings were used.

Required unblocker for a final `pass`: rerun on a physical iPhone or real-device lab with manual hardware offline/low-connectivity evidence and the remaining Safari interaction observations, or explicitly record owner-accepted caveats. Current result remains `blocked` because the run was stopped before the full required evidence set was complete.

## Execution attempt / status (2026-06-07T00:35:15Z)

Status: blocked — additional online physical iPhone Safari evidence captured; final pass not claimed.

Continuation run after the iPhone was reconnected:

- Tested URL: `https://innsats.reidar.tech`.
- Observed `/api/health.version` from iPhone Safari runtime fetch: `8f85c01ddd08e0714b97644f4e5537f23a29c403`.
- Device/browser/OS: `ReePhone`, iPhone 12 Pro Max (`iPhone13,4`), iOS `26.5` / build `23F77`, Mobile Safari (`com.apple.mobilesafari`) inspected through `ios_webkit_debug_proxy`; `devicectl` confirmed paired/wired availability and unlocked state.
- Evidence packet: `docs/manual-tests/evidence/task-385-iphone-safari-2026-06-07/report.md`, `continued-online-verification.json`, and `iphone-safari-route-smoke.json`.
- Sanitized screenshots include `oppdrag-verified-state.png`, `map-marker-verified-state.png`, `route-home.png`, `route-hurtigkort.png`, `route-sok.png`, `route-oppdrag.png`, `route-kart.png`, `route-data-pa-enheten.png`, `route-offline.png`, `route-mer.png`, and `route-hurtigkort-search-focused.png`.
- Online physical Safari evidence extended the previous partial run: sanitized mission `Hermes iPhone Safari test 202606070023` remained visible, checklist item `Kontroller ventilasjon` stayed checked and persisted in IndexedDB, and sanitized map marker `Hermes markør øvelse 202606070023` persisted at schematic `(42, 58)` after reload.
- Direct physical Safari route smoke rendered `/`, `/hurtigkort`, `/sok`, `/oppdrag`, `/kart`, `/data-pa-enheten`, `/offline`, and `/mer`; UI-link navigation rendered `/sok`, `/oppdrag`, `/hurtigkort`, and `/mer`. Each tested route reported one `h1` and no page-level horizontal overflow in the inspected 428px viewport.
- Service worker/cache readiness was observed on-device: active SW scope `https://innsats.reidar.tech/`, active state `activated`, cache key `beredskapsboka-v4`.
- Manifest fetched successfully with `start_url: "/"` and `display: "standalone"`, but Safari runtime reported `navigator.standalone=false`; install-to-home-screen/standalone launch was not tested.
- Hardware offline/low-connectivity remained untested: `navigator.onLine=true` and `/api/health` returned HTTP 200 during this run. No Airplane Mode, weak network, captive portal, or cellular low-connectivity pass is claimed.
- Manual interaction caveat: search focus/type and browser history checks were WebKit-programmatic supporting evidence only; manual keyboard, Safari toolbar back/forward, physical rotation/orientation, and home-screen install observations remain incomplete.
- New visual finding: the `/kart` marker action row clips the delete button on the 428px iPhone viewport (`components/offline-map-panel.tsx:895-904`, `<span className="flex gap-2">`); see `map-marker-verified-state.png` and the report.
- New console caveat: direct route navigation recorded Safari console `Fetch API cannot load ...?_rsc=... due to access control checks` events for some Next RSC prefetches; routes still rendered, UI-link navigation did not record the same errors, and manual same-origin fetches succeeded. Treat as follow-up investigation, not a completed failure verdict.
- Privacy note: no persondata, patientdata, real Nødnett groups, private addresses, skjermede positions, sensitive samband or official operational plans were entered or captured. Only sanitized exercise strings were used.

Required unblocker for a final `pass` remains hardware offline/low-connectivity evidence plus manual Safari interaction observations, or owner-accepted caveats.

## Execution attempt / status (2026-06-07T00:46:47Z)

Status: partial pass — hardware offline Airplane Mode evidence passed for the tested scope; final Task 385 pass still awaits manual Safari interaction observations.

After the user enabled Airplane Mode on the iPhone, the physical Safari session was inspected again through WebKit:

- Network proof: `navigator.onLine=false`; iPhone Safari runtime `fetch('/api/health?offlineProbe=...')` failed with `TypeError: Load failed`; an uncached network probe also failed with `TypeError: Load failed`.
- Service worker/cache stayed ready offline: active SW scope `https://innsats.reidar.tech/`, state `activated`, cache key `beredskapsboka-v4`.
- `/oppdrag` reloaded offline and preserved sanitized mission `Hermes iPhone Safari test 202606070023`; checklist item `Kontroller ventilasjon` remained checked and persisted in IndexedDB.
- `/kart` reloaded offline and preserved sanitized marker `Hermes markør øvelse 202606070023` at schematic coordinates `(42, 58)`.
- `/hurtigkort` worked offline for local query `tilfluktsrom`, returning local cached results.
- `/offline` rendered the fallback page with heading `Beredskapsboka er frakoblet`.
- Evidence packet: `docs/manual-tests/evidence/task-385-iphone-safari-2026-06-07/hardware-offline-evidence.json` and updated `report.md`.
- Sanitized offline screenshots: `offline-oppdrag-reload.png`, `offline-kart-marker.png`, `offline-hurtigkort-search.png`, and `offline-fallback-page.png`.
- Privacy note: screenshots were visually checked and contained only sanitized exercise strings; no persondata, patientdata, real Nødnett groups, private addresses, skjermede positions, sensitive samband or official operational plans were entered or captured.
- Remaining before final Task 385 pass: manual Safari keyboard observation, Safari toolbar back/forward observation, physical rotation/orientation/safe-area observation, and install-to-home-screen or explicit owner-accepted caveat if that is covered by Task 387 instead.
