# Operational command surface UI

The field-facing app should answer: **Hva står du i nå?** It is a mobile-first decision-support surface for quickly finding source-backed tiltak, opening a local mission, and exporting local notes without implying official command authority.

Primary flow:

Situation → Phase → Next action → Checklist → Export → Source

Operational navigation:

- Hjem: command entry point with situation prompts, local/offline status, and direct starts for search or local mission.
- Søk: fast local/offline search across tiltak, kilder, learning modules, glossary, protection measures, and FAQ entries.
- Oppdrag: current local mission dashboard with situation, next recommended action, checklist progress, map/log summary, local tasks/status/resources, and local exports.
- Kart/Feltmodus workflow: local-only Kart → Logg → Oppdrag → Etterrapport → Oppdragsmappe using schematic 0-100 coordinates; see `docs/map-log-fieldmode-workflow.md`.
- Kort: tiltakskort / hurtigkort for source-backed action cards and phase filters.
- Mer: sources, modules, field mode, privacy, map, device-data controls, and admin/release links.

/release stays outside the operational shell. It is an admin/release-readiness surface, not a field action, and it must not appear as a primary field navigation tab.

## What changed

- The home page is now the operational entry point, not a generic landing page.
- `/sok` is a first-class operational search route for local/offline lookup.
- `/mer` collects secondary support and admin surfaces so the field bottom navigation can stay focused on Hjem, Søk, Oppdrag, Kort, and Mer.
- Card lists use a shared TiltakCard presentation so source confidence, priority, and first actions are visible before opening detail pages.
- Card detail pages show source confidence before steps and keep source links close to action guidance.
- `/oppdrag` starts with situation and next-action context before local logs, exports, and administrative controls.

## MVP boundaries

MVP boundaries remain unchanged: no login, no central incident database, no backend mission sync, no patient/persondata, no official command-system integration, and no private/skjermede tilfluktsrom data.

All mission data, checklist runs, field logs, order/comms drafts, and release-board overrides stay local to the browser unless the user manually exports or copies them. The app remains decision support; official orders, local samband plan, and approved source material govern real operations.
