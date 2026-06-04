# Map, log and Feltmodus workflow

Primary field flow:

Kart → Logg → Oppdrag → Etterrapport → Oppdragsmappe

This workflow documents the current MVP operational surface for local map notes, field logs, mission context, after-action reports and local mission-folder export. It is mobile-first and offline-capable, but it remains decision support only.

## Boundary

The current MVP uses schematic 0-100 map coordinates only. Map markers, sectors, map-derived field-log references, GeoJSON exports and SVG map images are local-only decision support, not authoritative navigation, not official order material and not an official archive.

No backend sync, no login, no live tracking, no push notifications and no official command-system write path are part of this iteration. MapLibre/Leaflet/MBTiles requires a separate governed package plan before any runtime dependency, tile package, external map source or coordinate conversion is added.

Do not enter patient/persondata, private addresses, skjermede locations, names, IDs, birth dates, health details, radio identifiers, restricted object names or restricted operational information. Export only sanitized exercise/test data unless an approved field procedure says otherwise.

## Operational use

1. Create or open a local mission in `/oppdrag/ny` or `/oppdrag`.
2. Open `/kart` from `/under`, `/oppdrag`, Feltmodus quick actions or `/mer`.
3. Add a schematic marker or sector using 0-100 coordinates.
4. Create a local field-log entry from the marker when it should be preserved in the mission log.
5. Review `/oppdrag` for the map/log summary, critical observations and manual order-update suggestions.
6. In Etter phase, generate an after-action report and oppdragsmappe as local exports.

## Feltmodus and glove mode

Feltmodus prioritizes map and log quick actions so a user can move quickly from observation to local mission record. When Feltmodus with hanskemodus/glove mode is active, operational map controls use larger touch targets for field use. Administrative controls such as cache reset remain standard-size so they are not accidentally emphasized.

## Export expectations

- Field-log exports include the sanitized map reference label and schematic reference when present.
- After-action exports include structured field-log entries by default and a sanitized map summary.
- Oppdragsmappe export bundles mission summary, checklist summary, field-log Markdown/JSON, map GeoJSON/SVG and after-action Markdown/JSON in a local browser-generated package.
- Free-text map notes and internal local IDs are not part of the oppdragsmappe map artifacts.

## Non-goals

- No backend sync, no login, no live tracking.
- No patient/persondata workflow.
- No real lat/lng, GPS, MapLibre, Leaflet, MBTiles, Kartverket tile runtime or external tile source.
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
