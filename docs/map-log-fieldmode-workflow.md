# Map, log and Feltmodus workflow

Primary field flow:

Kart → Logg → Oppdrag → Etterrapport → Oppdragsmappe

This workflow documents the current MVP operational surface for local map notes, field logs, mission context, after-action reports and local mission-folder export. It is mobile-first and offline-capable, but it remains decision support only.

## Boundary

The current MVP uses mission-scoped overlays and schematic 0-100 map coordinates for operational annotations. Approved local map packages can provide background context, but marker positions, sectors, `Logg herfra` references, GeoJSON exports and SVG map images remain local-only decision support, not authoritative navigation, not official order material and not an official archive.

MapLibre/PMTiles support is optional and browser-only. PMTiles packages are app-local static assets with documented attribution/provenance; no runtime tile URL may point to Kartverket, OpenStreetMap, Statkart, Mapbox or any other external provider. If a PMTiles package is unavailable, not approved, not cached, too heavy for the device, or the browser cannot initialize MapLibre, the app must use fallback til skjematisk kart.

Pilot map scope is schematic/local overlay only until an approved app-local PMTiles package, license/provenance note, attribution, cache-size decision and real-device offline evidence exist. The absence of PMTiles cache controls is intentional when `approvedLocalMapPackageManifests` is empty.

No backend sync, no login, no live tracking, no push notifications and no official command-system write path are part of this iteration. Optional browser-only MapLibre/PMTiles support is limited to approved local assets; any Leaflet runtime, MBTiles browser runtime, external map source, coordinate conversion or broader MapLibre expansion requires a separate governed package plan.

Do not enter patient/persondata, private addresses, skjermede locations, names, IDs, birth dates, health details, radio identifiers, restricted object names or restricted operational information. Export only sanitized exercise/test data unless an approved field procedure says otherwise.

## Prepare before mission

1. Open the app online before departure and wait for the service worker/offline shell to be ready.
2. Create or open the active local mission in `/oppdrag/ny` or `/oppdrag`; all map objects and field-log entries are scoped to the active mission.
3. Open `/kart`, choose the approved local map package if one is relevant, read its attribution/provenance, and cache it locally. Treat PMTiles as optional local background context, not a live tile feed.
4. Test kartpakke, `Logg herfra`, quick field log and Feltmodus while still online; then toggle flymodus/offline and verify `/oppdrag`, `/kart` and `/feltmodus` still load.
5. If the PMTiles view fails or the package is not present, continue with fallback til skjematisk kart and schematic 0-100 references.

## Operational use

1. Create or open a local mission in `/oppdrag/ny` or `/oppdrag`.
2. Open `/kart` from `/under`, `/oppdrag`, Feltmodus quick actions or `/mer`.
3. Add/edit/delete a mission-scoped marker or sector using schematic 0-100 coordinates. Use sectors/teiger only for local coordination notes; the app is not a navigation or surveying tool.
4. Use `Logg herfra` on the selected marker or sector when the observation must be preserved in the mission field log. Keep the text short, source-backed and free of persondata.
5. Review `/oppdrag` for `Kart og logg`, critical observations, `Loggoversikt`, manual order-update suggestions and active-mission summaries.
6. In Etter phase, generate an after-action report and Oppdragsmappe as local exports.

## Feltmodus and glove mode

Feltmodus prioritizes map and log quick actions so a user can move quickly from observation to local mission record. The quick-action region links directly to `Kart`, `Hurtiglogg`, `Aktivt oppdrag`, `Kjør sjekkliste`, `5-punktsordre`, `Sambandsplan`, `Eksporter status` and `Søk`.

When Feltmodus with hanskemodus/glove mode is active, operational controls use larger touch targets for field use. Administrative controls such as cache reset remain standard-size so they are not accidentally emphasized. Feltmodus does not add speech upload, backend sync, live position sharing, official order submission or patient/persondata handling.

## Dashboard and Etter exports

`/oppdrag` is the active mission dashboard:

- `Kart og logg` summarizes visible mission-scoped markers, sectors and map-linked field logs.
- `Loggoversikt` lists active-mission field-log entries and lets the user filter map-linked observations.
- Critical observations and RUH/velferd follow-up are surfaced for manual review; routine welfare reminders and positive feedback are not promoted as incidents.
- After-action report exports include structured field-log entries, map summary and sanitized local map-package provenance.
- Oppdragsmappe bundles mission summary, checklist summary, field-log Markdown, map GeoJSON/SVG, after-action Markdown, sanitized map-package metadata and a local JSON manifest in a browser-generated package.

## Export expectations

- Field-log exports include the sanitized map reference label and schematic reference when present.
- After-action exports include structured field-log entries by default, a sanitized map summary and safe map-package provenance only.
- Oppdragsmappe export includes `packageId`/title/attribution/version/provenance for controlled local packages, never raw tile URLs, style URLs, bounds, center, internal IDs or unapproved package paths.
- Free-text map notes and internal local IDs are not part of the Oppdragsmappe map artifacts.

## Non-goals

- No backend sync, no login, no live tracking.
- No patient/persondata workflow.
- No real lat/lng input, GPS tracking, live blue-force tracking, official navigation or surveying.
- No external runtime tile providers; no Kartverket/OpenStreetMap/Statkart/Mapbox network calls from the map flow.
- No official command-system, CIM, Nødnett or archive integration.
- No push notifications or central incident database.

## Verification

Use these checks when changing this flow:

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm run test -- tests/docs/group-14-docs.test.ts
npm run test -- tests/mission/after-action-report.test.ts tests/mission/mission-folder-export.test.ts tests/components/mission-context-panel.test.tsx
npm run e2e:prod -- tests/e2e/map-log-mission-flow.spec.ts tests/e2e/offline-map.spec.ts
```
