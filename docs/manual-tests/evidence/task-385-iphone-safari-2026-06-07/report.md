# Task 385 iPhone Safari continuation evidence — 2026-06-07

## Scope

Physical iPhone Safari continuation run for Task 385 against production `https://innsats.reidar.tech` using WebKit inspector through `ios_webkit_debug_proxy`.

This report contains the online continuation evidence plus the later hardware Airplane Mode offline evidence. The hardware offline tested scope passed; final Task 385 pass still awaits manual Safari keyboard/toolbar/orientation/home-screen observations.

## Device / build

- Device: `ReePhone`, iPhone 12 Pro Max (`iPhone13,4`), iOS `26.5` / build `23F77`.
- Browser: Mobile Safari (`com.apple.mobilesafari`) inspected with WebKit remote inspector.
- Device state: paired, wired, unlocked since boot, Developer Mode enabled, DDI usable.
- Tested URL: `https://innsats.reidar.tech`.
- Observed `/api/health.version` from the iPhone Safari runtime: `8f85c01ddd08e0714b97644f4e5537f23a29c403`.
- Initial online continuation state: `navigator.onLine=true`; `/api/health` fetch returned HTTP 200. Later Airplane Mode state is recorded below with `navigator.onLine=false` and fetch failures.

## Evidence files

- Online state verification: `continued-online-verification.json`.
- Route smoke evidence packet: `iphone-safari-route-smoke.json`.
- Hardware offline evidence packet after Airplane Mode was enabled: `hardware-offline-evidence.json`.
- Key online screenshots:
  - `oppdrag-verified-state.png`
  - `map-marker-verified-state.png`
  - `route-home.png`
  - `route-hurtigkort.png`
  - `route-sok.png`
  - `route-oppdrag.png`
  - `route-kart.png`
  - `route-data-pa-enheten.png`
  - `route-offline.png`
  - `route-mer.png`
  - `route-hurtigkort-search-focused.png`
- Key hardware-offline screenshots:
  - `offline-oppdrag-reload.png`
  - `offline-kart-marker.png`
  - `offline-hurtigkort-search.png`
  - `offline-fallback-page.png`

## Pass/supporting observations

- Physical Safari loaded the production app and fetched health JSON from the device runtime.
- Service worker was active and ready: scope `https://innsats.reidar.tech/`, active state `activated`, cache key `beredskapsboka-v4`.
- Existing sanitized mission `Hermes iPhone Safari test 202606070023` was visible on `/oppdrag` and persisted in IndexedDB after reload.
- Checklist item `Kontroller ventilasjon` stayed checked after reload and was verified in IndexedDB under template `tilfluktsrom-teknisk-status`.
- Existing sanitized marker `Hermes markør øvelse 202606070023` was visible on `/kart`, persisted after reload, and used schematic coordinates `(42, 58)` only.
- Direct physical Safari route smoke passed for `/`, `/hurtigkort`, `/sok`, `/oppdrag`, `/kart`, `/data-pa-enheten`, `/offline`, and `/mer`.
- UI-link navigation through visible app links passed for `/sok`, `/oppdrag`, `/hurtigkort`, and `/mer`.
- Each tested route reported one `h1` and no page-level horizontal overflow in the inspected 428px-wide iPhone viewport.
- Search input focus/type on `/hurtigkort` found sanitized results for `tilfluktsrom`. This is WebKit-programmatic focus/type evidence, not a manual keyboard observation.
- Manifest fetched successfully from `https://innsats.reidar.tech/manifest.webmanifest` with `start_url: "/"` and `display: "standalone"`. Safari runtime reported `navigator.standalone=false`, so home-screen installed mode was not tested.

## Hardware offline observations after Airplane Mode

After the user enabled Airplane Mode on the iPhone, the same physical Safari session was inspected again.

- Network proof: `navigator.onLine=false`; runtime `fetch('/api/health?offlineProbe=...')` failed with `TypeError: Load failed`; an uncached network probe also failed with `TypeError: Load failed`.
- Service worker remained active offline: scope `https://innsats.reidar.tech/`, state `activated`, cache key `beredskapsboka-v4`.
- `/oppdrag` reloaded offline and still showed the sanitized local mission; `Kontroller ventilasjon` remained checked and persisted in IndexedDB.
- `/kart` reloaded offline and still showed the sanitized marker `Hermes markør øvelse 202606070023` at schematic `(42, 58)`.
- `/hurtigkort` worked offline for local search query `tilfluktsrom` and returned sanitized local results.
- `/offline` rendered the fallback page with the expected `Beredskapsboka er frakoblet` heading.
- Screenshots were visually checked and contained only sanitized exercise strings, no persondata/patientdata/private operational information.

## Findings / caveats

1. **Task 385 still needs manual Safari interaction observations before a final pass.** Hardware offline evidence is now captured, but no manual Safari toolbar tap, manual keyboard observation, physical rotation/orientation check, or install-to-home-screen launch was performed. The WebKit focus/history checks are supporting evidence only.
2. **Map marker action row clips the delete button on 428px iPhone viewport.** `map-marker-verified-state.png` and `offline-kart-marker.png` show the third marker action button (`Slett ...`) partially off-screen. WebKit measured the button rect as `right=485.8` in a `428px` viewport and `fullyVisible=false`; source location: `components/offline-map-panel.tsx:895-904` (`<span className="flex gap-2">`). This is a mobile visual/UX issue for follow-up.
3. **Safari console recorded RSC prefetch access-control errors during direct route navigation.** The route still rendered, UI-link navigation did not record the same errors, and manual same-origin fetches to the same paths succeeded. Treat as a follow-up investigation rather than a route failure until reproduced independently.

## Privacy

Only sanitized exercise strings were used. No persondata, patientdata, real Nødnett groups, private addresses, skjermede positions, sensitive samband details, or official operational plans were entered or captured.

## Result

`hardware-offline evidence passed for tested scope; final Task 385 pass still awaits manual Safari keyboard/toolbar/orientation/home-screen observations`.
