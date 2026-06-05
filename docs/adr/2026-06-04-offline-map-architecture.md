# ADR: Offline map architecture foundation

Dato: 2026-06-04
Status: Accepted for MVP foundation
Tasks: 273-281

## Context

Beredskapsboka must remain mobile-first, local-only and useful offline after initial installation. The Group 9A map work needs a basic `/kart` surface, source/limitation attribution, optional local map package controls, cache warning/reset and E2E coverage.

At the foundation decision time, the app intentionally avoided map runtime dependencies. Adding MBTiles readers, MapLibre, Leaflet or bundled raster/vector tile packages at that stage would have increased bundle size, service-worker/cache pressure and operational governance scope before the product had a reviewed map data supply chain. The MVP must also avoid backend sync, auth, persondata, private/skjermede locations, official command-system claims and exposure of raw upstream geometry from external context signals.

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
- Future Leaflet work, MBTiles browser runtime, external map-source use, coordinate conversion, broader MapLibre expansion, or additional local tile package classes must come through a separate governed ADR/package plan covering licenses, update cadence, package signing/integrity, storage quotas, user consent and performance budgets.

## Acceptance notes

The implementation must include:

- Navigation to `/kart`.
- Visible map attribution and limitation copy.
- Local-only package selection/cache/reset controls.
- Cache size warning.
- Performance guard for capped rendered features.
- Unit/component tests and an E2E test asserting the page does not request tile/map-provider URLs.

## Foundation boundary and accepted local package iteration

The original operational map/logging/Feltmodus integration boundary continued to use the schematic local map architecture while package governance was unresolved. That historical boundary is now superseded by the governed local tile-package iteration below: optional browser-only MapLibre/PMTiles is allowed for approved app-local packages, while Leaflet, MBTiles browser runtime, Kartverket/external tile runtime, coordinate conversion and broader MapLibre expansion remain out of scope unless a separate governed package plan approves them.

If additional real offline tiles are needed later, create a separate governed package plan before coding. That plan must cover license/attribution, tile source approval, package generation, package signing or integrity, update cadence, offline storage quota, user consent, cache eviction, bundle/performance budgets, and production verification that no external tile network calls occur during offline use.

## Governed local tile-package iteration

This iteration may add an optional browser-only MapLibre renderer for approved local tile packages. PMTiles is the browser runtime package format because it can be read from app-local static files through MapLibre's custom protocol without a tile server. MBTiles is build-time/source input only; any MBTiles package must be converted or transformed before it is referenced by the browser.

No runtime tile URL may point to Kartverket, OpenStreetMap or any external provider. Field use must be able to disable the network after app install/package caching and still render the selected map package or gracefully fall back to the schematic map.

Kartverket-derived data requires visible attribution `©Kartverket` and a link to Kartverket where possible. Geovekst zoom levels 12-20 require explicit permission before copying or packaging. Until package provenance is documented, the app must not claim a Kartverket offline base map.

The existing schematic map remains the safe fallback and the source of truth for local operational overlays when a local package is missing, unsupported, expired, too large, or not approved.

Current pilot state: the schematic map package list is not the same as approved PMTiles package manifests. Until `approvedLocalMapPackages` contains at least one reviewed PMTiles/style pair under `/map-packages/`, the UI must not present PMTiles cache/install as available.
