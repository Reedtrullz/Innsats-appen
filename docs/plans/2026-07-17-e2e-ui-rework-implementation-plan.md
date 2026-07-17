# E2E UI rework — implementation plan

Date: 2026-07-17
Status: implemented in code and browser verification; physical field exercise remains separate
Baseline: `main` / `1e4e39017da6523c59be2ae3b4dcc246bb068063`

## Outcome

Replace the fragmented application flow with one stable information architecture and one continuous operational mission spine, while preserving the existing visual system, offline/local-only contract, mission data, map packages, exports, and conservative authority language.

The intended primary flow is:

`Home → Start/continue mission → Next action → Quick log → Checklist → Tools → Finish`

The stable main navigation is:

`Hjem · Søk · Oppdrag · Kart · Mer`

## Non-goals

- Do not redesign the navy/cyan visual identity, typography, icon system, radii, or semantic colours.
- Do not introduce backend sync, live tracking, official command status, person-data workflows, or external runtime map tiles.
- Do not rewrite mission storage or export formats merely to support the new layout.
- Do not mark content as professionally reviewed without an actual professional review.
- Do not remove compatibility routes until production evidence shows that replacements work offline.

## Delivery model

Ship six independently reversible vertical slices. Each slice gets focused tests and a clean mobile browser walkthrough. `npm run check:ci` is required before a production push. After a push, wait for CI/deploy and confirm that `/api/health` returns the exact pushed SHA.

Use one small commit per coherent slice. Avoid a long-lived redesign branch; when implementation is authorized, work from a fresh exact-`main` baseline and preserve the user's existing untracked files.

## Phase 0 — Freeze the target experience

Estimated effort: 0.5–1 focused day.

### Deliverables

- Produce target-state designs for five states using the existing design tokens and audit screenshots:
  1. Home without an active mission.
  2. Home with an active mission.
  3. Mission spine with next action and quick log.
  4. Search results and action-card detail.
  5. Map canvas with its tool sheet.
- Specify mobile states at 390×844 and 430×932, plus the existing `max-w-3xl` desktop behaviour.
- Define component states for loading, no match, offline, stale content, unreviewed content, completed action, skipped action, and write-in-progress.
- Approve the wording hierarchy: operational instruction first; authority/review status visible; detailed governance one tap away.

### Gate

- Every primary action is visible in the first mobile viewport.
- The target uses existing CSS variables, `OperationalIcon`, `StatusPill`, `SectionCard`, `CommandCard`, and existing mission/map primitives where they fit.
- No new navigation, colour, icon, or storage contract remains implicit.

## Slice A — Trust and runtime correctness

Estimated effort: 1–2 focused days. This blocks the visible rework.

### Work

1. Repair the flow-style YAML values that split safety sentences at commas.
2. Add content-validation regression coverage for suspicious one-word fragments and safety-list round trips.
3. Display all three professional-review states consistently:
   - `Faglig godkjent`
   - `Til gjennomgang`
   - `Ikke faglig vurdert`
4. Keep source status separate from professional-review status in search, lists, cards, and mission recommendations.
5. Replace the silent scenario-only fallback in `missionCards()` with an explicit result contract:
   - exact phase + role + scenario results;
   - optional same-phase widened-role results, clearly labelled;
   - other-phase results only after an explicit `Vis også andre faser` action.
6. Make `RoleProvider` hydration-safe using the same `useSyncExternalStore` pattern already used by mode/theme/field-mode state.
7. Add a route-transition/scroll contract so a newly opened route starts at its heading unless navigation targets an explicit hash.

### Main seams

- `content/curated/action-cards.yaml`
- `scripts/validate-content.ts`
- `lib/content/schemas.ts`
- `components/tiltak-card.tsx`
- `components/action-card-detail.tsx`
- `components/search-box.tsx`
- `components/mission/dashboard/mission-command-dashboard.tsx`
- `lib/role/role-context.tsx`
- shell/navigation transition handling

### Gate

- Zero fragmented `doNot` values in generated content.
- Every action card renders one professional-review status.
- No recommendation from another phase appears without explicit consent.
- No React hydration error during cold load, role hydration, or normal navigation.
- Fresh route navigation begins at the intended top heading; hash links still work.

## Slice B — Shell, home, and stable navigation

Estimated effort: 1–1.5 focused days.

### Work

1. Change the fixed navigation to `Hjem · Søk · Oppdrag · Kart · Mer`.
2. Keep `/hurtigkort` temporarily as a compatibility route that opens the relevant Søk intent; remove it from the primary navigation.
3. Reduce Home to one state-aware primary CTA and one secondary CTA:
   - no mission: `Start oppdrag` + `Finn tiltak`;
   - active mission: `Fortsett oppdrag` + `Finn tiltak`.
4. Keep role as one global profile/lens choice; expose editing through a compact control rather than another full selector.
5. Combine connectivity, content age, and decision-support boundary into one compact shell status row with a details disclosure.
6. Make `Må leses` critical only for new, critical, unacknowledged content; preserve versioned acknowledgement locally.
7. Update service-worker/static-shell route coverage for the new navigation without removing old route compatibility.

### Main seams

- `components/app-shell.tsx`
- `components/bottom-nav.tsx`
- home components and `components/home-active-mission.tsx`
- `components/operational-status.tsx`
- `components/decision-support-notice.tsx`
- must-read local acknowledgement storage
- `lib/offline/static-app-shell.ts`
- `public/sw.js` through `npm run build:sw`

### Gate

- Navigation order is identical for all roles and mission states.
- Home's primary CTA is visible at 390×844 without scrolling.
- The shell has at most one persistent status/warning row below the header.
- Old `/hurtigkort` links remain functional online and offline.
- Keyboard focus and `aria-current` remain correct.

## Slice C — One continuous mission spine

Estimated effort: 3–4 focused days. This is the core rework.

### Work

1. Introduce a new composition layer without changing stored mission data:
   - `MissionStickyHeader`
   - `MissionNextAction`
   - `MissionQuickLogDock`
   - `MissionChecklistSection`
   - `MissionToolsMenu`
   - `MissionFinishSection`
2. Replace the top-level `Nå · Arbeid · Eksport` mode switch with the continuous sequence.
3. Preserve the one-tap, explicitly confirmed, freely reversible `Før · Under · Etter` phase control.
4. Keep `RunbookView` as the next-action engine. Serialize done/skip writes and expose undo/reopen.
5. Place quick log directly after the current action and make it reachable within two actions from every mission tool.
6. Reuse existing checklist runners, but show one primary checklist first. Move secondary checklists behind `Relevante kontroller`.
7. Convert order, comms, status, field log, map, logistics, MFE, RUH, and reporting into bounded tool routes or sheets that retain mission context and provide a clear return to the spine.
8. Move archive/export/after-action controls into `Avslutt oppdrag`; expose them earlier only through an explicit advanced action.
9. Retire `MissionModeControl` and the three old panel compositions only after new-path E2E and offline-reopen tests pass.

### Compatibility strategy

- Keep `MissionContext`, IndexedDB/local-store keys, checklist-run records, field-log entries, map state, and exports unchanged in the first cutover.
- Treat layout state as disposable UI state; do not persist which old panel was open.
- Resolve existing dashboard hashes to their new tool/section destinations during the compatibility window.
- Add schema migration only if a later feature truly needs new durable data, and keep reads backward-compatible.

### Main seams

- `components/mission-context-panel.tsx`
- `components/mission/dashboard/mission-command-dashboard.tsx`
- `components/mission/dashboard/mission-now-panel.tsx`
- `components/runbook/runbook-view.tsx`
- `lib/mission/runbook.ts`
- existing mission tool/export components
- `lib/mission/local-store.ts`
- `lib/mission/schemas.ts`

### Gate

- A clean user can create, execute, log, change phase, reopen offline, finish, export, archive, and delete one mission without ambiguity.
- First action is above the fold.
- Quick log is never more than two actions away.
- Rapid taps do not lose progress; every completed/skipped step has a correction path.
- Existing locally stored mission fixtures open without migration loss.
- No primary mission task depends on the removed tab structure.

## Slice D — Intent-led search and instruction-first cards

Estimated effort: 1.5–2 focused days.

### Work

1. Merge Hurtigkort into Søk using three entry intents:
   - `Hva har skjedd?`
   - `Hva må jeg gjøre?`
   - `Finn kilde`
2. Rank exact operational terms and active-mission context above generic token matches, but never silently hide the user's selected phase.
3. Show only title, first action, phase, authority, and one professional-review status in the default result row.
4. Put source status, type, matched terms, and implementation metadata behind `Detaljer` or filters.
5. Put the first numbered action in the first viewport of the action-card page. Keep real stop warnings and competence gates visible but compact.
6. Add `Logg fra dette kortet` when a mission is active and a clear `Tilbake til oppdrag` path.
7. Preserve `/hurtigkort` deep-link compatibility until production traffic/tests no longer require it.

### Main seams

- `components/search-box.tsx`
- `lib/content/search.ts`
- `lib/content/search-documents.ts`
- `components/action-card-list.tsx`
- `components/tiltak-card.tsx`
- `components/action-card-detail.tsx`
- recent-card storage and current `/hurtigkort` routes

### Gate

- Critical fixture queries return the intended card in the top three.
- No raw `unverified` implementation copy appears in the default result UI.
- One review badge, not a badge cloud, communicates the trust state.
- The first action is visible at 390×844 for representative high-risk cards.
- Search and action cards work with no network after the app shell/content cache is ready.

## Slice E — Map-first operational canvas

Estimated effort: 2–3 focused days.

### Work

1. Split the current 1,265-line `OfflineMapPanel` into state/orchestration, canvas, tool sheet, planners, and package/settings components.
2. Make `/kart` a full-height map canvas with a compact bottom sheet for:
   - marker;
   - quick log;
   - sector/drawing;
   - layers.
3. Open pump, RADIAC, search-sector, or MRE planning as one selected mission tool at a time.
4. Move package download, import/export, storage/privacy, and map administration to `Mer → Data og offline`, while preserving a compact offline-package state in the map.
5. Preserve all mission-scoped marker/drawing/log links and PMTiles range behaviour.

### Main seams

- `components/offline-map-panel.tsx`
- `components/maps/offline-maplibre-view.tsx`
- `components/offline-map/schematic-map.tsx`
- `lib/maps/operations-map.ts`
- `lib/maps/offline-map.ts`
- map planners and mission-map summary components

### Gate

- Real PMTiles and schematic fallback both render online and offline.
- Existing mission markers and drawings survive the component split.
- Add marker, add drawing/sector, quick-log from map, edit, and delete remain usable at 390 px with no horizontal overflow.
- Package Range requests still return correct `206` semantics.
- Only one specialist planner is visually active at a time.

## Slice F — Accessibility, field validation, and cleanup

Estimated effort: 1–2 focused days plus external field-test time.

### Automated and browser work

- Run axe coverage on all five navigation destinations and the full mission journey.
- Verify keyboard-only navigation, focus return from sheets/tools, focus after route changes, and error focus.
- Verify 200% browser zoom, large text, reduced motion, light/dark/system themes, 390×844, 430×932, and the current desktop width.
- Check portrait/landscape and safe-area behaviour.
- Keep touch targets at least 44×44 px; use 48–56 px for primary field controls.
- Run clean-state and offline-reopen browser journeys.
- Run `npm run check:ci` and keep Lighthouse/performance budgets green.

### Physical field exercise

Use 2–3 users on their own phones:

1. Cold-start to the first correct instruction; target under 30 seconds.
2. Start a mission, complete/skip/reopen a step, and change phase.
3. Add a critical quick log and locate it again.
4. Add a map marker and sector offline.
5. Create/copy a 5-point order; target under 3 minutes with gloves.
6. Finish and export the mission.

Record time, wrong taps, backtracking, unread text, hesitation, accidental phase changes, lost progress, and user wording.

### Final cleanup gate

- Remove old mode-panel code and `/hurtigkort` compatibility only in a separate cleanup commit after production evidence and field-test acceptance.
- Update screenshots, architecture tests, offline route lists, documentation, and manual test scripts.
- Do not claim field readiness from browser or CI evidence alone.

## Verification ladder for every slice

1. Focused unit/component tests for the touched contract.
2. Content/generated/service-worker checks when relevant.
3. Typecheck, lint, and `git diff --check`.
4. Fresh production build; if `.next` reports a transient cleanup `ENOTEMPTY`, clean/retry once before diagnosing a regression.
5. Real mobile browser walkthrough with saved screenshots and console/network inspection.
6. Full `npm run check:ci` before push.
7. Push the small, green slice to `main` only after explicit implementation authorization.
8. Wait for CI/deploy; bind the successful run to the full commit SHA.
9. Confirm `https://innsats.reidar.tech/api/health` reports that exact SHA.
10. Re-run the changed production flow, including offline/service-worker update behaviour where relevant.

## Rollback strategy

- Keep every slice independently revertible and avoid mixing content corrections, shell navigation, mission layout, search ranking, and map refactoring in one commit.
- Preserve local storage schemas and old route compatibility until after production verification.
- If a slice fails in production, revert that slice, wait for the rollback deploy, verify the rollback SHA through `/api/health`, and re-run the affected browser journey.
- Bump the service-worker cache version whenever shell/routes/assets change so clients do not remain on a mixed old/new UI.
- Treat a healthy backend as insufficient if the visible production UI is stale or broken.

## Overall definition of done

- Stable `Hjem · Søk · Oppdrag · Kart · Mer` navigation.
- One state-aware primary action on Home.
- One continuous mission spine with the first action above the fold.
- Quick log within two actions from every operational surface.
- No silent cross-phase recommendations.
- Clear, separate professional-review and source status.
- Intent-led search with useful top-three results and no metadata cloud.
- Map-first canvas with one active specialist tool at a time.
- Existing offline mission, checklist, map, export, and PMTiles behaviour preserved.
- Full CI, mobile browser, offline reopen, exact-SHA production readback, accessibility checks, and physical field exercise recorded separately and without overclaiming.

## Estimate and critical path

Expected implementation effort is approximately 10–14 focused engineering days plus the external field exercise. The critical path is:

`Trust/runtime → Shell → Mission spine → Search/cards → Map → Field acceptance`

The professional review of operational content is an external dependency. The UI can accurately expose `Ikke faglig vurdert` before that review, but it cannot turn those cards into approved operational guidance.

## Evidence inputs

- Screenshot-first audit: `/Users/reidar/.codex/visualizations/2026/07/17/019f6f87-1d1a-7b81-815b-ea34dd9c87d6/beredskapsboka-e2e-ui-audit/e2e-ui-rework-audit.md`
- Existing UX acceptance checklist: `docs/ux-fix-plan.md`
- Existing guided runbook specification: `docs/plans/2026-06-10-guided-runbook-ui-spec.md`
- Offline map architecture: `docs/adr/2026-06-04-offline-map-architecture.md`
- Offline operational overlays: `docs/adr/2026-06-04-offline-map-operational-overlays.md`
