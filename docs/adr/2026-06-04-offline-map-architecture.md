# ADR: Offline map architecture foundation

Dato: 2026-06-04
Status: Accepted for MVP foundation
Tasks: 273-281

## Context

Beredskapsboka must remain mobile-first, local-only and useful offline after initial installation. The Group 9A map work needs a basic `/kart` surface, source/limitation attribution, optional local map package controls, cache warning/reset and E2E coverage.

The current app has no map dependencies. Adding MBTiles readers, MapLibre, Leaflet or bundled raster/vector tile packages now would increase bundle size, service-worker/cache pressure and operational governance scope before the product has a reviewed map data supply chain. The MVP must also avoid backend sync, auth, persondata, private/skjermede locations, official command-system claims and exposure of raw upstream geometry from external context signals.

## Decision

Use a schematic/local incident map foundation for the MVP:

- Render a static SVG/grid-based schematic map in the browser.
- Keep package metadata small and bundled with the app in `lib/maps/offline-map.ts`.
- Simulate optional map package download by writing a selected package cache record to `localStorage` only.
- Show clear attribution and limitation copy: “Schematic local map package, not authoritative navigation”.
- Do not fetch tile URLs, external map APIs or backend services from the map page.
- Cap rendered schematic features to a small maximum so older phones avoid heavy DOM/SVG work.
- Provide cache size warning and cache reset controls in the local UI.

## Options considered

### MBTiles + MapLibre

Pros:
- Mature vector/raster tile rendering.
- Enables detailed offline maps later if package governance is solved.

Cons for this MVP:
- Heavy dependencies and runtime cost on older phones.
- Requires tile packaging, update, license and attribution governance.
- Increases service worker/cache size risk.
- Easy to imply navigation authority beyond current content governance.

### Leaflet + local tile packages

Pros:
- Familiar API and simpler than full vector stacks.

Cons for this MVP:
- Still needs tile generation/download/storage governance.
- Raster tile pyramids can be large for districts.
- Adds dependency and DOM work before user value is proven.

### Static map packages / schematic local canvas

Pros:
- Zero new map dependencies.
- Works offline with the app shell.
- Privacy-local: cache state stays in `localStorage` and is not synced.
- Small, predictable rendering footprint on older phones.
- Makes limitations explicit and avoids authoritative navigation claims.

Cons:
- Not a navigable or geographically precise map.
- No pan/zoom, routing, coordinates or live geometry overlays.

Chosen for MVP foundation.

## Consequences

- `/kart` is a basic offline-ready schematic map page, not a navigation map.
- “Download” means local selection/cache bookkeeping only; there is no network download in this group.
- Cache warnings are based on estimated metadata size, not measured browser quota usage.
- Reset clears only the map package cache record.
- Future MBTiles/MapLibre/Leaflet work must come through a separate governed ADR/package plan covering licenses, update cadence, package signing/integrity, storage quotas, user consent and performance budgets.

## Acceptance notes

The implementation must include:

- Navigation to `/kart`.
- Visible map attribution and limitation copy.
- Local-only package selection/cache/reset controls.
- Cache size warning.
- Performance guard for capped rendered features.
- Unit/component tests and an E2E test asserting the page does not request tile/map-provider URLs.

## Next iteration boundary

The operational map/logging/Feltmodus integration iteration continues to use the accepted schematic local map architecture. No MapLibre, Leaflet, MBTiles or Kartverket tile runtime is added by the operational-integration iteration.

If real offline tiles are needed later, create a separate governed package plan before coding. That plan must cover license/attribution, tile source approval, package generation, package signing or integrity, update cadence, offline storage quota, user consent, cache eviction, bundle/performance budgets, and production verification that no external tile network calls occur during offline use.
