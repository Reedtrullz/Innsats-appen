# ADR: Offline Map Operational Overlays, Export and Post-MVP Integrations

Date: 2026-06-04

## Status

Accepted for MVP local/offline implementation.

## Decision

Beredskapsboka will support only local schematic 0-100 map overlays in the MVP:

- marker types: incident site, hazard, resource, meeting point, IL-KO, pump location and observation
- drawing types: point, line, polygon and sector/teig
- local layer toggles for marker/drawing categories
- localStorage-only save/load/reset for overlays and sectors
- local SVG map-image export with privacy warning
- sanitized GeoJSON export/import using schematic coordinates only

The map remains a decision-support sketch, not an authoritative navigation map and not an official command system.

For this iteration, schematic 0-100 coordinates remain the only supported coordinates for markers, sectors, logging links, mission summaries and exports.

## Privacy and governance constraints

Exports and imports must show this warning:

> Lokale kartmarkører og sektorer kan røpe innsatssted, ressurser eller observasjoner. Eksporter bare sanitert øvingsdata, aldri persondata, pasientdata, private adresser eller skjermede operasjonelle posisjoner.

All import code must drop unknown fields. The MVP must not import raw upstream geometry, real map-provider tiles, true lat/lon, patient/person data, private addresses, shared live positions, backend sync payloads, or official order/incident identifiers.

## KML import evaluation

KML import is post-MVP research only. It is not implemented because KML can contain true coordinates, private place names, embedded styles, external references and large nested geometry. A future KML plan must define sanitization, size limits, parser dependency policy, provenance labels and explicit user preview before local save.

## QR/file-based sector import design

Sector/teig transfer from leadership can be designed later as manual QR text or file import. The MVP design guardrails are:

1. no backend sync
2. no automatic acceptance of orders
3. explicit preview before saving
4. local browser storage only
5. unknown fields dropped
6. imported sectors labeled as unverified local decision support

## Blue-force/live position tracking research

Shared live position/blue-force tracking is post-MVP only and intentionally not implemented. It would require a separate security, privacy, authentication, key-management and operational governance plan before any code work.

## Verification

- Unit tests cover markers, layers, drawings, distance/area measurement, local save/load/reset, SVG export and GeoJSON import/export sanitization.
- Component/E2E tests cover local marker and sector workflows without map tile/network dependencies.
