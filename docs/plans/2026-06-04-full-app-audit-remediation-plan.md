# Full App Audit Remediation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Close the confirmed full-app audit gaps in Innsats-appen/Beredskapsboka without weakening the MVP boundaries: local-only, offline-capable, source-backed, no patient/persondata, no official command-system claims, and no hidden backend sync.

**Architecture:** Fix correctness and safety before refactoring. The first phase locks product semantics with failing tests: source confidence wording, mission/map scoping, API privacy headers, and offline shell coverage. The second phase implements narrow shared helpers and wiring. The third phase hardens tests, CI/deploy, content freshness and maintainability. Every task is small enough to review independently and should be committed separately.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Vitest, Playwright, service worker PWA, IndexedDB/idb, localStorage, Zod, Docker/GHCR, GitHub Actions, Ansible.

---

## Audit baseline

- Reviewed SHA: `b859ed74f5d3c7627d9307b919172462c098c949`.
- Local gate: `npm run check:ci` passed on this SHA.
- Live health: `https://innsats.reidar.tech/api/health` returned `status=healthy`, `nodeEnv=production`, and version `b859ed74f5d3c7627d9307b919172462c098c949`.
- Current source statuses: `public/generated-content/source-documents.json` contains `61` sources, all `unverified`.
- Current release coverage gap: `public/generated-content/content-coverage-report.json` reports `content-orphan-sources` count `10`.
- Live context APIs currently emit shared-cache headers for query-bearing endpoints:
  - `/api/context/geocode?q=Trondheim` -> `Cache-Control: s-maxage=3600, stale-while-revalidate=86400`
  - `/api/context/weather?lat=63.43&lon=10.39` -> `Cache-Control: s-maxage=900, stale-while-revalidate=3600`

## Confirmed findings to fix

### High

1. Global map state is not scoped to mission.
   - Evidence: `lib/maps/operations-map.ts:27-32` defines `MissionMapState` without `missionId`; `OPERATIONS_MAP_STORAGE_KEY` is one global key at `lib/maps/operations-map.ts:32`; `/kart` picks `missions[0]` at `components/offline-map-panel.tsx:197-202`; mission dashboard reads the global map snapshot at `components/mission-context-panel.tsx:806-817` and passes it to summaries/exports.
   - Risk: markers/sectors from one local incident can leak into another mission dashboard, after-action report, or oppdragsmappe.

2. Active mission selection is implicit and wrong when multiple missions exist.
   - Evidence: `components/mission-context-panel.tsx:1034` uses `const activeMission = missions[0]`; “Andre lokale oppdrag” at `components/mission-context-panel.tsx:1056-1067` is read-only.
   - Risk: operators cannot deliberately open/select the active incident; map -> log can attach to the wrong mission.

3. Source confidence says “Verifisert kildegrunnlag” even when source status is only current/fresh, not `verified`.
   - Evidence: `components/action-card-detail.tsx:55-65` computes `hasVerifiedSourceBase` from freshness only; generated sources are all `unverified`.
   - Risk: users over-trust unverified public/research source material.

4. Offline app-shell cache does not cover several visible app links.
   - Evidence: `public/sw.js:18-59` omits `/begrensninger`, `/kjente-begrensninger`, `/data-pa-enheten`, `/personvern`, `/datakilder`, and `/release`; those are linked from `components/decision-support-notice.tsx:11-15` and `app/(app)/mer/page.tsx:25-32,48-50`.
   - Risk: visible links can fail offline after service-worker warmup.

5. Deployment replaces the live container before candidate health is proven and has no rollback block.
   - Evidence: `deploy/playbook.yml:91-101` recreates the Compose service, then only later fails on local/public health at `deploy/playbook.yml:119-126` and `169-176`.
   - Risk: a bad image/config can take production down even though CI/deploy reports failure.

### Medium

6. Context APIs expose user lookup/location parameters through shared cache headers.
   - Evidence: `app/api/context/weather/route.ts:14`, `app/api/context/geocode/route.ts:18,25`, and `app/api/context/hazards/route.ts:23` use `s-maxage`/`stale-while-revalidate`.

7. MET/NVE upstream fetches lack abort timeouts.
   - Evidence: Kartverket has `AbortController` in `lib/integrations/kartverket.ts:22-30`; MET/NVE fetch paths do not.

8. API routes return adapter/config error messages directly.
   - Evidence: `app/api/context/weather/route.ts:16`, `app/api/context/geocode/route.ts:27`, and `app/api/context/hazards/route.ts:17,25` return `error.message`.

9. Local-data import parses unbounded JSON before hard size/depth/count checks.
   - Evidence: `lib/local-data/local-data.ts` has warning copy and schema guards but no hard pre-parse byte cap or recursive depth cap before `JSON.parse`.

10. Free-text operational fields rely mainly on warnings, not high-confidence privacy guards.
    - Evidence: mission field log/RUH/welfare fields in `components/mission-context-panel.tsx` and export helpers can persist/export arbitrary strings.

11. The context panel is hidden when there are no stale signals, even if sources are disabled/unavailable.
    - Evidence: `components/mission-context-panel.tsx:889` renders `ContextSignalPanel` only when `staleSignals.length > 0`.

12. Etter CTAs do not deep-link to after-action/RUH/oppdragsmappe controls.
    - Evidence: `app/(app)/etter/page.tsx:11-13` links all three controls to `/oppdrag`.

13. Search empty state is misleading when filters hide raw hits.
    - Evidence: `components/search-box.tsx` filters raw results after search but zero filtered hits look the same as no matches.

14. Release page mobile/touch coverage is incomplete.
    - Evidence: release is linked from `/mer`, but route is not in the 360px overflow E2E list; `components/release-readiness-tool.tsx` contains fixed multi-column layout and small controls.

15. Release/workplan copy says “sync” in ways that can imply backend/cloud synchronization.
    - Evidence: `components/release-readiness-tool.tsx` copy around generated workplans and `docs/ui-operational-command-surface.md`.

16. Content coverage reports orphan sources but release board does not drive remediation tasks for them.
    - Evidence: `content-orphan-sources` count `10` in generated coverage report.

17. `components/mission-context-panel.tsx` is too large and mixes UI, persistence, export and audit concerns.
    - Evidence: 1103-line component and 995-line paired test.

18. Vitest passes but emits React `act(...)` warnings.
    - Evidence: `npm test` passed in the audit, but warnings came from mission/context component tests.

19. Service worker is plain JS with duplicated metadata and limited behavior-level tests.
    - Evidence: `public/sw.js` duplicates metadata also represented in `lib/offline/service-worker-metadata.ts`; tests mainly assert string/metadata alignment.

20. Docker/CI/release reproducibility has drift risks.
    - Evidence: Dockerfile default `ARG NODE_VERSION=22`; CI pins `22.22.3`; runner image only gets `VERSION` through Compose env; manual playbook defaults to mutable `latest`; CI uses `ssh-keyscan` TOFU for host key.

21. Content import fallback can make stale private-vault snapshots look freshly generated.
    - Evidence: CI/Docker set `ALLOW_PREGENERATED_CONTENT=1`; `scripts/import-obsidian.ts` fallback rewrites manifest timestamps.

---

## Architecture and runtime dependency audit

- Runtime heartbeat is static/generated content + service worker + local browser stores + optional context APIs.
- There is no plugin-style silent import chain, but service-worker install/fetch failures can silently degrade offline behavior. Tasks touching `public/sw.js`, generated-content manifests, or local storage migration must include production-mode Playwright verification.
- Any task touching context APIs must verify both direct route-handler tests and live/production-mode route behavior, because CDN/shared caching semantics are not visible in component tests.
- Any task touching deployment must include exact-SHA GitHub Actions verification and live `/api/health` verification before claiming deployed.

---

## Phase 1 — Safety/correctness blockers first

### Task 1: Make source confidence require verified source status

**Objective:** Prevent unverified but current sources from being labeled “Verifisert kildegrunnlag”.

**Files:**
- Modify: `components/action-card-detail.tsx:55-65`
- Test: `tests/components/action-card-detail.test.tsx`

**Step 1: Write failing test**

Add a test that renders a card linked to a current-but-unverified source and expects “Kilde krever kontroll”, not “Verifisert kildegrunnlag”.

```tsx
it('does not call current unverified sources verified', () => {
  render(<ActionCardDetail card={cardWithSource('src-unverified')} sources={[currentSource({ id: 'src-unverified', status: 'unverified' })]} />);
  expect(screen.getByText(/Kilde krever kontroll/i)).toBeInTheDocument();
  expect(screen.queryByText(/Verifisert kildegrunnlag/i)).not.toBeInTheDocument();
});
```

**Step 2: Run test to verify failure**

Run:
```bash
source ~/.nvm/nvm.sh && nvm use 22
npm run test -- tests/components/action-card-detail.test.tsx -t "unverified sources"
```
Expected: FAIL because current unverified source is labeled verified.

**Step 3: Write minimal implementation**

Change `hasVerifiedSourceBase` to require `source.status === 'verified'`:

```tsx
const hasVerifiedSourceBase = missingSourceIds.length === 0
  && sourceReviews.length > 0
  && sourceReviews.every((item) => item.source.status === 'verified' && item.freshness.state === 'current');
```

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/components/action-card-detail.test.tsx tests/content/coverage.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add components/action-card-detail.tsx tests/components/action-card-detail.test.tsx
git commit -S -m "fix: require verified source status for trust label"
```

### Task 2: Add failing multi-mission map leakage regression

**Objective:** Prove that global map state currently leaks into unrelated missions before changing storage shape.

**Files:**
- Test: `tests/mission/mission-map-scope.test.ts`
- Test: `tests/components/mission-context-panel.test.tsx`
- Test: `tests/e2e/map-log-mission-flow.spec.ts`

**Step 1: Write failing unit/helper test**

Create a test describing the desired helper contract even before the helper exists.

```ts
import { mapStateForMission, normalizeMissionMapState } from '@/lib/maps/operations-map';

it('filters map objects by mission id', () => {
  const state = normalizeMissionMapState({ markers: [
    marker({ id: 'a', missionId: 'mission-a', label: 'A' }),
    marker({ id: 'b', missionId: 'mission-b', label: 'B' }),
  ], drawings: [] });
  expect(mapStateForMission(state, 'mission-a').markers.map((m) => m.id)).toEqual(['a']);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/mission/mission-map-scope.test.ts
```
Expected: FAIL because `mapStateForMission` and `missionId` support do not exist.

**Step 3: Do not implement yet**

Stop after RED; implementation happens in Tasks 3-5 so schema migration is explicit.

**Step 4: Commit only if project convention allows RED commits**

If not committing RED tests separately, keep this staged for Task 3. Preferred local sequence: implement Task 3 immediately before committing.

### Task 3: Add mission-scoped map object schema with backward-compatible migration

**Objective:** Add optional `missionId` to map markers/drawings and normalize legacy objects safely.

**Files:**
- Modify: `lib/maps/operations-map.ts:7-32,141-207`
- Test: `tests/maps/operations-map.test.ts`
- Test: `tests/mission/mission-map-scope.test.ts`

**Step 1: Write failing migration tests**

```ts
it('preserves legacy map objects without mission id but marks them unscoped', () => {
  const state = normalizeMissionMapState({ markers: [{ id: 'old', itemType: 'marker', kind: 'hazard', label: 'Old', point: { x: 10, y: 10 }, createdAt: '2026-06-04T10:00:00.000Z' }], drawings: [] });
  expect(state.markers[0].missionId).toBeUndefined();
});

it('keeps mission ids on imported map state', () => {
  const state = normalizeMissionMapState({ markers: [{ id: 'm1', missionId: 'mission-a', itemType: 'marker', kind: 'hazard', label: 'Fare', point: { x: 10, y: 10 }, createdAt: '2026-06-04T10:00:00.000Z' }], drawings: [] });
  expect(mapStateForMission(state, 'mission-a').markers).toHaveLength(1);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/maps/operations-map.test.ts tests/mission/mission-map-scope.test.ts
```
Expected: FAIL.

**Step 3: Implement minimal schema**

Add `missionId?: string` to `MissionMapMarker` and `MissionMapDrawing`, sanitize it in normalizers, and add:

```ts
export function mapStateForMission(state: MissionMapState, missionId: string): MissionMapState {
  return {
    markers: state.markers.filter((marker) => marker.missionId === missionId),
    drawings: state.drawings.filter((drawing) => drawing.missionId === missionId),
  };
}
```

Legacy unscoped objects must not be shown on a mission dashboard by default after this task. If legacy display is needed, add a clearly labeled “unscoped local map objects” migration UX later; do not silently attach them.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/maps/operations-map.test.ts tests/mission/mission-map-scope.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/maps/operations-map.ts tests/maps/operations-map.test.ts tests/mission/mission-map-scope.test.ts
git commit -S -m "fix: scope local map objects to missions"
```

### Task 4: Wire `/kart` marker creation to the selected/active mission

**Objective:** Ensure new markers/drawings and map->log entries are explicitly associated with a mission.

**Files:**
- Modify: `components/offline-map-panel.tsx:197-281`
- Modify: `lib/maps/operations-map.ts` if constructor signatures need `missionId`
- Test: `tests/components/offline-map-panel.test.tsx`

**Step 1: Write failing test**

```tsx
it('stores mission id when adding a marker from the map panel', async () => {
  await seedMission({ id: 'mission-a', title: 'A' });
  render(<OfflineMapPanel />);
  await userEvent.type(screen.getByLabelText(/Markørnavn/i), 'Fare nord');
  await userEvent.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));
  const state = readMissionMapState();
  expect(state.markers[0].missionId).toBe('mission-a');
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/components/offline-map-panel.test.tsx -t "mission id"
```
Expected: FAIL because marker has no mission id.

**Step 3: Implement minimal wiring**

Before `createMissionMapMarker` and `createMissionMapDrawing`, explicitly guard `if (!activeMission)`: set the blocked status message and return without saving. Pass `missionId: activeMission.id` into both constructors. Add regression tests that marker and drawing saves are blocked when no mission exists, so Task 3 cannot be bypassed by new unscoped map objects.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/components/offline-map-panel.test.tsx tests/maps/operations-map.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add components/offline-map-panel.tsx lib/maps/operations-map.ts tests/components/offline-map-panel.test.tsx tests/maps/operations-map.test.ts
git commit -S -m "fix: attach map objects to active mission"
```

### Task 5: Filter dashboard summaries and exports by current mission

**Objective:** Prevent unrelated map objects from appearing in mission dashboard, after-action report, or oppdragsmappe.

**Files:**
- Modify: `components/mission-context-panel.tsx:806-817,847,869,871`
- Modify: `lib/mission/after-action-report.ts`
- Modify: `lib/mission/mission-folder-export.ts`
- Test: `tests/components/mission-context-panel.test.tsx`
- Test: `tests/mission/after-action-report.test.ts`
- Test: `tests/mission/mission-folder-export.test.ts`

**Step 1: Write failing tests**

```ts
it('excludes map objects from other missions in after-action reports', () => {
  const report = buildAfterActionReport({
    mission: mission({ id: 'mission-a' }),
    mapState: normalizeMissionMapState({ markers: [marker({ missionId: 'mission-b', label: 'Wrong' })], drawings: [] }),
  });
  expect(JSON.stringify(report)).not.toContain('Wrong');
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/mission/after-action-report.test.ts tests/mission/mission-folder-export.test.ts -t "other missions"
```
Expected: FAIL.

**Step 3: Implement minimal filtering**

In `MissionCommandDashboard`, derive:

```ts
const scopedMapState = useMemo(() => mapStateForMission(mapState, mission.id), [mapState, mission.id]);
```

Pass `scopedMapState` to `MissionMapSummary`, `AfterActionReportControls`, and `MissionFolderExportControls`. Also update `buildAfterActionReport` and `buildMissionFolderExport` to derive `mapStateForMission(input.mapState, input.mission.id)` internally before building map summaries/artifacts. Keep component-level scoping as defense in depth, but make the library helpers safe when called directly from tests or future UI.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/components/mission-context-panel.test.tsx tests/mission/after-action-report.test.ts tests/mission/mission-folder-export.test.ts tests/maps/operations-map.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add components/mission-context-panel.tsx lib/mission/after-action-report.ts lib/mission/mission-folder-export.ts tests/components/mission-context-panel.test.tsx tests/mission/after-action-report.test.ts tests/mission/mission-folder-export.test.ts
git commit -S -m "fix: filter mission exports to scoped map objects"
```

### Task 6: Add explicit active mission selection

**Objective:** Let users choose which local mission is active instead of assuming `missions[0]`.

**Files:**
- Modify: `components/mission-context-panel.tsx:894-1068`
- Create: `lib/mission/active-mission-selection.ts`
- Test: `tests/mission/active-mission-selection.test.ts`
- Test: `tests/components/mission-context-panel.test.tsx`

**Step 1: Write failing test**

```tsx
it('can open another local mission as the active dashboard', async () => {
  await seedMissions([mission({ id: 'mission-a', title: 'A' }), mission({ id: 'mission-b', title: 'B' })]);
  render(<MissionContextPanel mode="list" contentVersion="test" checklists={[]} actionCards={[]} />);
  await userEvent.click(await screen.findByRole('button', { name: /Åpne B som aktivt oppdrag/i }));
  expect(screen.getByRole('heading', { name: /B/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/components/mission-context-panel.test.tsx -t "open another local mission"
```
Expected: FAIL because no open/activate button exists.

**Step 3: Implement minimal selection helper**

Create `lib/mission/active-mission-selection.ts` with a localStorage key and pure helpers:

```ts
export const ACTIVE_MISSION_STORAGE_KEY = 'beredskapsboka-active-mission-id-v1';
export function selectActiveMission(missions: MissionContext[], selectedId?: string | null) {
  return missions.find((mission) => mission.id === selectedId) ?? missions[0] ?? null;
}
```

Add buttons in “Andre lokale oppdrag” to set selected id and refresh dashboard.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/mission/active-mission-selection.test.ts tests/components/mission-context-panel.test.tsx
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/mission/active-mission-selection.ts components/mission-context-panel.tsx tests/mission/active-mission-selection.test.ts tests/components/mission-context-panel.test.tsx
git commit -S -m "feat: select active local mission explicitly"
```

### Task 7: Wire `/kart` to the selected mission instead of first mission

**Objective:** Make map->log target the selected active mission and show that target clearly.

**Files:**
- Modify: `components/offline-map-panel.tsx:197-281`
- Modify: `lib/mission/active-mission-selection.ts`
- Test: `tests/components/offline-map-panel.test.tsx`
- Test: `tests/e2e/map-log-mission-flow.spec.ts`

**Step 1: Write failing test**

```tsx
it('logs map observations to the selected mission, not missions[0]', async () => {
  await seedMissions([mission({ id: 'a', title: 'A' }), mission({ id: 'b', title: 'B' })]);
  saveSelectedActiveMissionId('b');
  render(<OfflineMapPanel />);
  await addHazardMarkerAndCreateLog();
  expect(await getMission('b')).toMatchObject({ fieldLogEntries: expect.arrayContaining([expect.objectContaining({ text: expect.any(String) })]) });
  expect(await getMission('a')).toMatchObject({ fieldLogEntries: [] });
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/components/offline-map-panel.test.tsx -t "selected mission"
```
Expected: FAIL.

**Step 3: Implement minimal wiring**

Use `selectActiveMission(...)` in `/kart` after loading missions. Add visible copy: “Feltlogg går til: <mission title>”.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/components/offline-map-panel.test.tsx tests/mission/active-mission-selection.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add components/offline-map-panel.tsx lib/mission/active-mission-selection.ts tests/components/offline-map-panel.test.tsx
git commit -S -m "fix: use selected mission for map logging"
```

### Task 8: Add multi-mission production E2E

**Objective:** Prove the full app no longer leaks map/log state across missions.

**Files:**
- Modify: `tests/e2e/map-log-mission-flow.spec.ts`
- Modify: `tests/e2e/helpers.ts`

**Step 1: Write failing E2E**

Add a production E2E that creates two missions, selects mission B, adds a map marker/log, opens mission A and verifies B’s marker/log is absent, then opens mission B and verifies present.

**Step 2: Run test to verify failure before Tasks 6-7, or pass after them**

Run:
```bash
rm -rf .next
source ~/.nvm/nvm.sh && nvm use 22
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3045 npx playwright test tests/e2e/map-log-mission-flow.spec.ts --workers=1 --timeout=120000
```
Expected after Tasks 6-7: PASS.

**Step 3: Commit**

```bash
git add tests/e2e/map-log-mission-flow.spec.ts tests/e2e/helpers.ts
git commit -S -m "test: prove mission scoped map log flow"
```

---

## Phase 2 — API/privacy/offline hardening

### Task 9: Make context API responses private/no-store

**Objective:** Stop shared caches from storing query-bearing location/search context responses.

**Files:**
- Modify: `app/api/context/weather/route.ts`
- Modify: `app/api/context/geocode/route.ts`
- Modify: `app/api/context/hazards/route.ts`
- Create: `tests/security/context-api-cache-privacy.test.ts`
- Create: `tests/e2e/context-api-privacy.spec.ts`

**Step 1: Write failing tests**

```ts
it('does not emit shared cache headers for geocode lookups', async () => {
  const response = await GET(new Request('http://test/api/context/geocode?q=Trondheim'));
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/security/context-api-cache-privacy.test.ts
```
Expected: FAIL because current routes use `s-maxage`.

**Step 3: Implement minimal helper**

Create a local constant in each route or a shared helper:

```ts
const PRIVATE_CONTEXT_HEADERS = { 'Cache-Control': 'private, no-store' };
```

Use it for all successful context responses and guard errors.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/security/context-api-cache-privacy.test.ts tests/integrations/route-guards.test.ts
npm run typecheck
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3054 npx playwright test tests/e2e/context-api-privacy.spec.ts --workers=1 --timeout=120000
```
Expected: PASS.

**Step 5: Commit**

```bash
git add app/api/context tests/security/context-api-cache-privacy.test.ts tests/e2e/context-api-privacy.spec.ts
git commit -S -m "fix: make context api responses private"
```

### Task 10: Redact public context API errors

**Objective:** Prevent upstream paths/config text from leaking to public clients.

**Files:**
- Modify: `app/api/context/weather/route.ts`
- Modify: `app/api/context/geocode/route.ts`
- Modify: `app/api/context/hazards/route.ts`
- Create: `tests/security/context-api-error-redaction.test.ts`

**Step 1: Write failing tests**

```ts
it('redacts upstream error details from weather responses', async () => {
  vi.mocked(fetchMetSignals).mockRejectedValueOnce(new Error('MET_USER_AGENT must include real contact information in production'));
  const response = await GET(new Request('http://test/api/context/weather?lat=63&lon=10'));
  expect(await response.json()).toEqual({ error: 'weather unavailable' });
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/security/context-api-error-redaction.test.ts
```
Expected: FAIL because current routes return `error.message`.

**Step 3: Implement minimal redaction**

Return stable generic errors only. If server logging is needed, use `console.error` in server-only route handlers with sanitized labels, but do not include upstream URL/path/config in JSON. Extend `tests/e2e/context-api-privacy.spec.ts` to smoke the built production routes and assert public JSON bodies do not contain known adapter/config strings such as `MET_USER_AGENT`, upstream path names, or raw URL paths.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/security/context-api-error-redaction.test.ts tests/integrations/met.test.ts tests/integrations/nve.test.ts tests/integrations/route-guards.test.ts
npm run typecheck
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3055 npx playwright test tests/e2e/context-api-privacy.spec.ts --workers=1 --timeout=120000
```
Expected: PASS.

**Step 5: Commit**

```bash
git add app/api/context tests/security/context-api-error-redaction.test.ts tests/e2e/context-api-privacy.spec.ts
git commit -S -m "fix: redact context api error details"
```

### Task 11: Add shared upstream fetch timeout helper for MET/NVE

**Objective:** Bound public API route execution when upstreams hang.

**Files:**
- Create: `lib/integrations/fetch-json.ts`
- Modify: `lib/integrations/met.ts`
- Modify: `lib/integrations/nve.ts`
- Modify: `lib/integrations/kartverket.ts` if adopting the shared helper
- Test: `tests/integrations/upstream-timeouts.test.ts`

**Step 1: Write failing tests**

```ts
it('aborts MET locationforecast when upstream never resolves', async () => {
  const fetchImpl = vi.fn(() => new Promise<Response>(() => undefined));
  await expect(fetchMetSignals({ lat: 63, lon: 10 }, { fetchImpl, timeoutMs: 10 })).rejects.toThrow(/timed out|aborted/i);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/integrations/upstream-timeouts.test.ts
```
Expected: FAIL because MET/NVE do not accept timeout injection.

**Step 3: Implement minimal helper**

```ts
export async function fetchJsonWithTimeout(url: string, options: { fetchImpl?: typeof fetch; timeoutMs?: number; init?: RequestInit; allowNotModified?: boolean } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 6000);
  try {
    const response = await (options.fetchImpl ?? fetch)(url, { ...(options.init ?? {}), signal: controller.signal });
    if (response.status === 304 && options.allowNotModified) return null;
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
```

Keep public-route redaction from Task 10 so helper errors do not leak. Preserve existing MET/NVE request headers and existing MET `304 Not Modified` semantics when moving fetches to the shared helper.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/integrations/upstream-timeouts.test.ts tests/integrations/met.test.ts tests/integrations/nve.test.ts tests/integrations/kartverket.test.ts
npm run typecheck
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3056 npx playwright test tests/e2e/context-api-privacy.spec.ts --workers=1 --timeout=120000
```
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/integrations tests/integrations/upstream-timeouts.test.ts
git commit -S -m "fix: add timeouts to context upstream fetches"
```

### Task 12: Add hard local-data import limits before JSON.parse

**Objective:** Prevent oversized/deep local JSON imports from exhausting browser resources.

**Files:**
- Modify: `lib/local-data/local-data.ts`
- Test: `tests/security/local-data-import-limits.test.ts`
- Test: `tests/local-data/local-data.test.ts`

**Step 1: Write failing tests**

```ts
it('rejects oversized import text before parsing JSON', () => {
  const huge = '{"x":"' + 'a'.repeat(MAX_LOCAL_IMPORT_TEXT_CHARS + 1) + '"}';
  expect(() => parseLocalDataImport(huge)).toThrow(/too large/i);
});

it('rejects deeply nested import objects', () => {
  const deep = JSON.stringify(makeDeepObject(60));
  expect(() => parseLocalDataImport(deep)).toThrow(/too deep/i);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/security/local-data-import-limits.test.ts
```
Expected: FAIL because hard caps do not exist.

**Step 3: Implement minimal limits**

Add constants near existing local-data guardrails:

```ts
export const MAX_LOCAL_IMPORT_TEXT_CHARS = 2_000_000;
export const MAX_LOCAL_IMPORT_DEPTH = 25;
export const MAX_LOCAL_IMPORT_MISSIONS = 100;
export const MAX_LOCAL_IMPORT_CHECKLIST_RUNS = 500;
```

Check text length before `JSON.parse`, then recursively validate depth/counts after parse but before applying.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/security/local-data-import-limits.test.ts tests/local-data/local-data.test.ts
```
For Playwright, build first and run separately:
```bash
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3046 npx playwright test tests/e2e/local-data-import-export-roundtrip.spec.ts --workers=1 --timeout=120000
```
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/local-data/local-data.ts tests/security/local-data-import-limits.test.ts tests/local-data/local-data.test.ts
git commit -S -m "fix: bound local data import size and depth"
```

### Task 13: Add high-confidence free-text privacy guards

**Objective:** Block obvious patient/persondata/private-location text before save/export/import.

**Files:**
- Create: `lib/privacy/sensitive-text.ts`
- Modify: `lib/mission/schemas.ts`
- Modify: `lib/mission/field-log.ts`
- Modify: `lib/mission/ruh-welfare.ts`
- Modify: `lib/mission/mission-folder-export.ts`
- Modify: `lib/local-data/local-data.ts`
- Modify: `components/mission-context-panel.tsx`
- Test: `tests/security/free-text-privacy-guards.test.ts`
- Test: `tests/mission/field-log.test.ts`
- Test: `tests/mission/after-action-report.test.ts`
- Test: `tests/mission/mission-folder-export.test.ts`
- Test: `tests/local-data/local-data.test.ts`

**Step 1: Write failing tests**

```ts
it.each(['fødselsnummer 01017012345', 'pasient Ola Nordmann', 'skjermet tilfluktsrom adresse'])('rejects sensitive free text: %s', (text) => {
  expect(() => assertNoSensitiveOperationalText(text, 'fieldLog.text')).toThrow(/persondata|pasientdata|skjermet/i);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/security/free-text-privacy-guards.test.ts
```
Expected: FAIL.

**Step 3: Implement minimal utility**

Add one shared detector with explicit patterns and context labels. Use it in local import, field-log/RUH/welfare builders, after-action/folder export builders, and UI submit handlers. Keep false positives low; this is a high-confidence blocker, not NLP.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/security/free-text-privacy-guards.test.ts tests/mission/field-log.test.ts tests/mission/after-action-report.test.ts tests/mission/mission-folder-export.test.ts tests/local-data/local-data.test.ts tests/components/mission-context-panel.test.tsx tests/security/privacy-boundaries.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/privacy/sensitive-text.ts lib/mission lib/local-data/local-data.ts components/mission-context-panel.tsx tests/security/free-text-privacy-guards.test.ts tests/mission tests/local-data/local-data.test.ts tests/components/mission-context-panel.test.tsx
git commit -S -m "fix: block sensitive operational free text"
```

### Task 14: Add app-wide security headers

**Objective:** Add defense-in-depth browser headers for a public offline PWA.

**Files:**
- Modify: `next.config.ts`
- Create: `tests/security/security-headers.test.ts`

**Step 1: Write failing test**

```ts
it('defines conservative browser security headers', async () => {
  const headers = await nextConfig.headers?.();
  const all = JSON.stringify(headers);
  expect(all).toMatch(/Content-Security-Policy/);
  expect(all).toMatch(/X-Content-Type-Options/);
  expect(all).toMatch(/Permissions-Policy/);
  expect(all).toMatch(/Referrer-Policy/);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/security/security-headers.test.ts
```
Expected: FAIL because `headers()` is missing.

**Step 3: Implement headers**

Add `headers()` to `next.config.ts`. Start conservative:

```ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.met.no https://api.kartverket.no https://ws.geonorge.no https://api01.nve.no; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
    ],
  }];
}
```

Do not add `'unsafe-eval'` to production CSP. If a development-only Next/Turbopack path requires it, gate that value on `process.env.NODE_ENV !== 'production'` and add a test that production headers exclude `'unsafe-eval'`.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/security/security-headers.test.ts
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3047 npx playwright test tests/e2e/core-mobile-journey.spec.ts --workers=1 --timeout=120000
```
Expected: PASS.

**Step 5: Commit**

```bash
git add next.config.ts tests/security/security-headers.test.ts
git commit -S -m "feat: add browser security headers"
```

### Task 15: Expand offline app shell to visible linked routes

**Objective:** Ensure every visible app-shell/More/DecisionSupportNotice link works offline after service-worker warmup.

**Files:**
- Modify: `public/sw.js:18-59`
- Test: `tests/e2e/offline.spec.ts`
- Test: `tests/e2e/mobile-offline-performance.spec.ts`
- Test: `tests/offline/service-worker-metadata.test.ts`

**Step 1: Write failing E2E**

Add a test that warms the SW, sets offline, crawls links from `/`, `/mer`, and the decision-support notice, and expects each route’s heading to render.

**Step 2: Run test to verify failure**

Run:
```bash
rm -rf .next
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3048 npx playwright test tests/e2e/offline.spec.ts -g "visible shell links" --workers=1 --timeout=120000
```
Expected: FAIL for omitted routes.

**Step 3: Implement minimal shell expansion**

Add omitted routes: `/begrensninger`, `/kjente-begrensninger`, `/data-pa-enheten`, `/personvern`, `/datakilder`, `/release` only if intentionally offline-cacheable. If `/release` should stay admin/non-operational, update `/mer` copy and test to allow network-only admin routes; do not silently cache it against product policy.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/offline/service-worker-metadata.test.ts
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3048 npx playwright test tests/e2e/offline.spec.ts tests/e2e/mobile-offline-performance.spec.ts --workers=1 --timeout=120000
```
Expected: PASS.

**Step 5: Commit**

```bash
git add public/sw.js tests/e2e/offline.spec.ts tests/e2e/mobile-offline-performance.spec.ts tests/offline/service-worker-metadata.test.ts
git commit -S -m "fix: cache visible app shell routes offline"
```

---

## Phase 3 — Operational UX gaps

### Task 16: Make disabled/unavailable context sources visible even with zero signals

**Objective:** Show users when public context APIs are disabled/unavailable, even if there is no cached signal history.

**Files:**
- Modify: `components/mission-context-panel.tsx:819-823,889`
- Modify: `components/context-signal-panel.tsx`
- Test: `tests/components/mission-context-panel.test.tsx`
- Test: `tests/components/context-signal-panel.test.tsx` if created

**Step 1: Write failing test**

```tsx
it('shows disabled context sources even when no signals exist', async () => {
  disableAllExternalSources();
  renderMissionDashboard(mission({ externalSignals: [] }));
  expect(screen.getByRole('region', { name: /Offentlig kontekst/i })).toHaveTextContent(/utilgjengelig|avslått|ingen ferske/i);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/components/mission-context-panel.test.tsx -t "disabled context sources"
```
Expected: FAIL because panel is hidden.

**Step 3: Implement minimal rendering**

Render `ContextSignalPanel` when `staleSignals.length > 0 || disabledSources.length > 0`. Add empty-state copy in the panel when `signals.length === 0`.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/components/mission-context-panel.test.tsx
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add components/mission-context-panel.tsx components/context-signal-panel.tsx tests/components/mission-context-panel.test.tsx
git commit -S -m "fix: show unavailable context source state"
```

### Task 17: Add after-action/RUH/oppdragsmappe deep links

**Objective:** Make Etter phase CTAs land on the advertised dashboard sections.

**Files:**
- Modify: `app/(app)/etter/page.tsx:11-13`
- Modify: `components/mission-context-panel.tsx` section wrappers around RUH, after-action and oppdragsmappe controls
- Test: `tests/components/phase-pages.test.tsx`
- Test: `tests/e2e/full-for-under-etter-journey.spec.ts`

**Step 1: Write failing test**

```tsx
it('links Etter CTAs to the exact dashboard sections', () => {
  render(<EtterPage />);
  expect(screen.getByRole('link', { name: /Åpne etterrapport/i })).toHaveAttribute('href', '/oppdrag#etterrapport');
  expect(screen.getByRole('link', { name: /RUH og velferd/i })).toHaveAttribute('href', '/oppdrag#ruh-velferd');
  expect(screen.getByRole('link', { name: /Oppdragsmappe/i })).toHaveAttribute('href', '/oppdrag#oppdragsmappe');
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/components/phase-pages.test.tsx -t "Etter CTAs"
```
Expected: FAIL because all hrefs are `/oppdrag`.

**Step 3: Implement IDs and hrefs**

Wrap/control sections with `id="etterrapport"`, `id="ruh-velferd"`, and existing/verified `id="oppdragsmappe"`.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/components/phase-pages.test.tsx tests/components/mission-context-panel.test.tsx
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3049 npx playwright test tests/e2e/full-for-under-etter-journey.spec.ts --workers=1 --timeout=120000
```
Expected: PASS.

**Step 5: Commit**

```bash
git add 'app/(app)/etter/page.tsx' components/mission-context-panel.tsx tests/components/phase-pages.test.tsx tests/e2e/full-for-under-etter-journey.spec.ts
git commit -S -m "fix: deep link etter phase actions"
```

### Task 18: Clarify Må leses / Nødvarsel wording

**Objective:** Prevent content-change warnings from sounding like official emergency/public alerts.

**Files:**
- Modify: `app/(app)/ma-leses/page.tsx`
- Modify: `app/(app)/kjente-begrensninger/page.tsx`
- Test: `tests/docs/group-14-docs.test.ts` or `tests/components/phase-pages.test.tsx`

**Step 1: Write failing test**

```ts
it('states that Må leses is not Nødvarsel or official population warning', () => {
  const text = renderPageText(<MustReadPage />);
  expect(text).toMatch(/ikke Nødvarsel/i);
  expect(text).toMatch(/ikke offisiell befolkningsvarsling/i);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/components/phase-pages.test.tsx -t "Nødvarsel"
```
Expected: FAIL.

**Step 3: Implement copy**

Add explicit copy: “Dette er kritiske innholdsendringer i Beredskapsboka. Det er ikke Nødvarsel, ikke pushvarsel og ikke offisiell befolkningsvarsling.”

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/components/phase-pages.test.tsx tests/docs/group-14-docs.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add 'app/(app)/ma-leses/page.tsx' 'app/(app)/kjente-begrensninger/page.tsx' tests/components/phase-pages.test.tsx tests/docs/group-14-docs.test.ts
git commit -S -m "docs: distinguish content warnings from nødvarsel"
```

### Task 19: Improve filtered-search empty state

**Objective:** Tell users when filters hide matches and provide a reset action.

**Files:**
- Modify: `components/search-box.tsx`
- Test: `tests/components/search-box.test.tsx`
- Test: `tests/e2e/critical-search.spec.ts`

**Step 1: Write failing test**

```tsx
it('explains when filters hide search results', async () => {
  render(<SearchBox documents={docsWithUnderHit} generatedAt="2026-06-04T00:00:00.000Z" />);
  await userEvent.click(screen.getByRole('link', { name: /Før/i }));
  await userEvent.type(screen.getByLabelText(/Søk lokalt/i), 'pumpe');
  expect(screen.getByText(/treff skjult av filtre/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Nullstill filtre/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/components/search-box.test.tsx -t "filters hide"
```
Expected: FAIL.

**Step 3: Implement empty-state branch**

If `rawResults.length > 0 && filteredResults.length === 0`, show hidden-count copy and a reset link preserving `q` but removing role/phase/scenario/type filters.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/components/search-box.test.tsx
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3050 npx playwright test tests/e2e/critical-search.spec.ts --workers=1 --timeout=120000
```
Expected: PASS.

**Step 5: Commit**

```bash
git add components/search-box.tsx tests/components/search-box.test.tsx tests/e2e/critical-search.spec.ts
git commit -S -m "fix: explain search results hidden by filters"
```

### Task 20: Make release page mobile-safe and touch-target tested

**Objective:** Ensure `/release` works on 360px mobile if it remains linked from `/mer`.

**Files:**
- Modify: `components/release-readiness-tool.tsx`
- Modify: `tests/e2e/accessibility-mobile.spec.ts`
- Modify: `tests/e2e/mobile-offline-performance.spec.ts` if `/release` should be cached/covered
- Test: `tests/components/release-readiness-tool.test.tsx`

**Step 1: Write failing E2E**

Add `/release` to no-horizontal-overflow route list and add a generic visible-control touch target check for `button`, `a`, `input`, `select`, and `textarea` on critical routes.

**Step 2: Run test to verify failure**

Run:
```bash
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3051 npx playwright test tests/e2e/accessibility-mobile.spec.ts --workers=1 --timeout=120000
```
Expected: likely FAIL on `/release` layout/control sizes.

**Step 3: Implement responsive release layout**

Convert fixed grid/table-like rows into stacked cards under `sm`. Ensure all interactive controls have `min-h-11` or larger.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/components/release-readiness-tool.test.tsx
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3051 npx playwright test tests/e2e/accessibility-mobile.spec.ts --workers=1 --timeout=120000
```
Expected: PASS.

**Step 5: Commit**

```bash
git add components/release-readiness-tool.tsx tests/components/release-readiness-tool.test.tsx tests/e2e/accessibility-mobile.spec.ts
git commit -S -m "fix: make release board mobile safe"
```

### Task 21: Rename release/workplan “sync” copy to generated local artifact copy

**Objective:** Avoid implying backend/cloud sync for workplans/release data.

**Files:**
- Modify: `components/release-readiness-tool.tsx`
- Modify: `docs/ui-operational-command-surface.md`
- Modify: `README.md` if needed
- Test: `tests/components/release-readiness-tool.test.tsx`
- Test: `tests/docs/group-14-docs.test.ts`

**Step 1: Write failing test**

```tsx
it('does not describe workplan loading as automatic backend sync', () => {
  render(<ReleaseReadinessTool />);
  expect(screen.queryByText(/Automatic sync/i)).not.toBeInTheDocument();
  expect(screen.getByText(/generated-content/i)).toBeInTheDocument();
  expect(screen.getByText(/ingen backend-synk/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/components/release-readiness-tool.test.tsx -t "backend sync"
```
Expected: FAIL if current copy says automatic sync.

**Step 3: Implement copy-only fix**

Use “Generert lokal artefakt”, “lastet fra `/generated-content/workplans.json`”, and “ingen backend-synk”.

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- tests/components/release-readiness-tool.test.tsx tests/docs/group-14-docs.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add components/release-readiness-tool.tsx docs/ui-operational-command-surface.md README.md tests/components/release-readiness-tool.test.tsx tests/docs/group-14-docs.test.ts
git commit -S -m "docs: clarify generated workplan artifact wording"
```

### Task 22: Resolve orphan source coverage

**Objective:** Either link the 10 orphan sources to user-facing content or mark them explicitly archival/out-of-scope.

**Files:**
- Modify: `content/curated/*.yaml`
- Modify: `lib/content/coverage-report.ts`
- Modify: `scripts/validate-content.ts`
- Test: `tests/content/coverage.test.ts`
- Test: `tests/content/validate-content.test.ts`

**Step 1: Write failing threshold test**

```ts
it('does not leave orphan sources without accepted-risk metadata', () => {
  const report = buildContentCoverageReport(graphFixture);
  expect(report.releaseBoard.gaps.find((gap) => gap.id === 'content-orphan-sources')?.count ?? 0).toBe(0);
});
```

If some sources are intentionally archival, introduce `acceptedRisk: true` / `publicationScope: archival` and assert those are excluded with explicit rationale.

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/content/coverage.test.ts -t "orphan sources"
```
Expected: FAIL because current generated report has count 10.

**Step 3: Link or classify each orphan**

Use the coverage report to list orphan IDs. Update curated content to reference them or add accepted-risk metadata that is displayed on `/kildegjennomgang`/`/release`.

**Step 4: Run content build/validation**

Run:
```bash
npm run build:content
npm run test -- tests/content/coverage.test.ts tests/content/validate-content.test.ts tests/content/curated-fixtures.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add content lib/content scripts tests/content public/generated-content content/generated content/workplans
git commit -S -m "fix: close orphan source coverage gaps"
```

---

## Phase 4 — Maintainability and test harness

### Task 23: Split mission dashboard into focused components without behavior changes

**Objective:** Reduce `components/mission-context-panel.tsx` risk by extracting stable subcomponents one at a time.

**Files:**
- Modify: `components/mission-context-panel.tsx`
- Create: `components/mission/field-log-controls.tsx`
- Create: `components/mission/ruh-welfare-controls.tsx`
- Create: `components/mission/after-action-report-controls.tsx`
- Create: `components/mission/mission-folder-export-controls.tsx`
- Create: `components/mission/local-mission-controls.tsx`
- Test: existing component tests plus new focused tests

**Step 1: Extract lowest-risk export controls first**

Move `MissionFolderExportControls` into `components/mission/mission-folder-export-controls.tsx` without code changes.

**Step 2: Run tests**

Run:
```bash
npm run test -- tests/components/mission-context-panel.test.tsx tests/mission/mission-folder-export.test.ts
npm run typecheck
```
Expected: PASS.

**Step 3: Commit**

```bash
git add components/mission-context-panel.tsx components/mission/mission-folder-export-controls.tsx tests/components/mission-context-panel.test.tsx
git commit -S -m "refactor: extract mission folder export controls"
```

**Step 4: Repeat one component per commit**

Order: after-action, field-log, RUH/welfare, local mission controls. Never extract more than one component per commit. After each extraction run the same focused tests and `npm run typecheck`.

### Task 24: Add typed fixtures and fail tests on React act warnings

**Objective:** Make tests fail when React state updates leak outside act, and stop using `as any` mission fixtures.

**Files:**
- Create: `tests/helpers/mission-fixtures.ts`
- Modify: `tests/setup.ts`
- Modify: `tests/components/mission-context-panel.test.tsx`
- Modify: other mission/local-data tests as needed

**Step 1: Add console warning guard in tests/setup.ts**

Write a failing test or temporarily prove that current suite emits act warnings.

**Step 2: Implement guarded setup**

In `tests/setup.ts`, spy on `console.error`/`console.warn` after each test and fail on `not wrapped in act` unless explicitly allowed by a helper.

**Step 3: Replace fixtures**

Create builders that parse through `MissionContextSchema` instead of `as any`.

**Step 4: Run tests**

Run:
```bash
npm run test -- tests/components/mission-context-panel.test.tsx tests/mission/local-store.test.ts tests/local-data/local-data.test.ts
npm run test
```
Expected: PASS with no act warnings.

**Step 5: Commit**

```bash
git add tests/setup.ts tests/helpers/mission-fixtures.ts tests/components/mission-context-panel.test.tsx tests/mission tests/local-data
git commit -S -m "test: fail on react act warnings and type mission fixtures"
```

### Task 25: Add central browser storage cleanup for tests

**Objective:** Prevent localStorage/IndexedDB/global mock leakage across unit/component tests.

**Files:**
- Modify: `tests/setup.ts`
- Modify: tests that intentionally depend on storage persistence

**Step 1: Write failing leakage test**

Create a small test file that writes to localStorage in one test and expects it absent in the next.

**Step 2: Implement cleanup**

Add `afterEach` in `tests/setup.ts` to clear `localStorage`, `sessionStorage`, fake IndexedDB DBs known to the app, timers, and restored mocks. Provide opt-out helper only if necessary.

**Step 3: Run tests**

Run:
```bash
npm run test
```
Expected: PASS.

**Step 4: Commit**

```bash
git add tests/setup.ts tests/**/*.test.ts tests/**/*.test.tsx
git commit -S -m "test: centralize browser storage cleanup"
```

### Task 26: Add behavior-level service worker tests or generate sw.js from typed source

**Objective:** Make offline behavior testable beyond string/metadata checks.

**Files:**
- Create: `lib/offline/static-app-shell.ts`
- Modify: `public/sw.js` or create build script to generate it
- Modify: `tests/offline/service-worker-metadata.test.ts`
- Create: `tests/offline/service-worker-behavior.test.ts`

**Step 1: Write failing behavior test**

Mock `CacheStorage`, `fetch`, and service-worker event handlers. Assert install precaches static shell routes and discovered `/kort/*` / `/kilder/*` routes.

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/offline/service-worker-behavior.test.ts
```
Expected: FAIL because behavior harness does not exist.

**Step 3: Implement minimal extraction/generation**

Move route list metadata into a typed file used by both tests and service-worker generation. If full generation is too much, export a JSON manifest and have `sw.js` import/load it only if compatible with browser SW constraints.

**Step 4: Run tests**

Run:
```bash
npm run test -- tests/offline/service-worker-metadata.test.ts tests/offline/service-worker-behavior.test.ts
npm run build:app
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3052 npx playwright test tests/e2e/offline.spec.ts --workers=1 --timeout=120000
```
Expected: PASS.

**Step 5: Commit**

```bash
git add public/sw.js lib/offline tests/offline tests/e2e/offline.spec.ts
git commit -S -m "test: cover service worker offline behavior"
```

---

## Phase 5 — Deployment and content pipeline hardening

### Task 27: Make deploy rollback-safe

**Objective:** Keep the previous production version serving if candidate promotion/health fails.

**Files:**
- Modify: `deploy/playbook.yml`
- Modify: `deploy/templates/compose.production.yml.j2` if blue/green port/project is used
- Test: `tests/deploy/playbook-safety.test.ts` or existing deploy tests if present
- Docs: `deploy/README.md`

**Step 1: Write failing static deploy-safety test**

```ts
it('deploy playbook has rollback or blue-green candidate verification before promotion', () => {
  const playbook = readFileSync('deploy/playbook.yml', 'utf8');
  expect(playbook).toMatch(/rescue:|candidate|blue|green|previous image/i);
  expect(playbook).toMatch(/Verify public deployment version/);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/deploy/playbook-safety.test.ts
```
Expected: FAIL.

**Step 3: Implement safe deployment**

Preferred approach: blue/green candidate on a temporary localhost port, verify candidate `/api/health.version`, switch Caddy reverse proxy, verify public exact SHA, then remove old container. Alternative: capture previous image and wrap promotion/verification in `block/rescue` that restores previous image.

**Step 4: Run tests and dry run**

Run:
```bash
npm run test -- tests/deploy/playbook-safety.test.ts
ansible-playbook -i deploy/inventory/hosts.yml deploy/playbook.yml --syntax-check
```
Expected: PASS.

**Step 5: Commit**

```bash
git add deploy/playbook.yml deploy/templates/compose.production.yml.j2 deploy/README.md tests/deploy/playbook-safety.test.ts
git commit -S -m "fix: make deploy rollback safe"
```

### Task 28: Enforce immutable production image/version inputs

**Objective:** Prevent manual production deploys from using mutable `latest` without explicit override.

**Files:**
- Modify: `deploy/playbook.yml:24-40`
- Test: `tests/deploy/playbook-safety.test.ts`

**Step 1: Write failing tests**

Assert playbook rejects default mutable tags unless `allow_mutable_tag=true` and requires 40-char `app_version` for production.

**Step 2: Implement assert**

Add vars:

```yaml
allow_mutable_tag: false
```

And assertions for SHA tag/app_version unless override is true.

**Step 3: Run tests**

Run:
```bash
npm run test -- tests/deploy/playbook-safety.test.ts
ansible-playbook -i deploy/inventory/hosts.yml deploy/playbook.yml --syntax-check
```
Expected: PASS.

**Step 4: Commit**

```bash
git add deploy/playbook.yml tests/deploy/playbook-safety.test.ts
git commit -S -m "fix: reject mutable production deploy inputs"
```

### Task 29: Pin Docker runtime Node and bake VERSION into runner image

**Objective:** Make local CI and production image runtime reproducible and self-identifying.

**Files:**
- Modify: `Dockerfile`
- Modify: `.github/workflows/ci.yml`
- Test: `tests/deploy/dockerfile.test.ts`

**Step 1: Write failing tests**

```ts
it('pins Docker node version and carries VERSION into runner stage', () => {
  const dockerfile = readFileSync('Dockerfile', 'utf8');
  expect(dockerfile).toMatch(/ARG NODE_VERSION=22\.22\.3/);
  expect(dockerfile).toMatch(/FROM node:\$\{NODE_VERSION\}-slim AS runner/);
  expect(dockerfile).toMatch(/ENV[\s\S]*VERSION=\$\{VERSION\}/);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/deploy/dockerfile.test.ts
```
Expected: FAIL.

**Step 3: Implement Dockerfile fix**

Pin `ARG NODE_VERSION=22.22.3`, pass it in CI if desired, and add `ARG VERSION=local` + `ENV VERSION=${VERSION}` in runner.

**Step 4: Run tests/build**

Run:
```bash
npm run test -- tests/deploy/dockerfile.test.ts
npm run build:app
```
Expected: PASS.

**Step 5: Commit**

```bash
git add Dockerfile .github/workflows/ci.yml tests/deploy/dockerfile.test.ts
git commit -S -m "fix: pin docker runtime and bake app version"
```

### Task 30: Pin SSH host key verification in CI deploy

**Objective:** Replace per-run trust-on-first-use `ssh-keyscan` with a pinned expected host key/fingerprint.

**Files:**
- Modify: `.github/workflows/ci.yml:166-174`
- Docs: `deploy/README.md`
- Test: `tests/deploy/ci-deploy-security.test.ts`

**Step 1: Write failing static test**

Assert workflow compares `ssh-keyscan` output to a configured `VPS_SSH_HOST_KEY` or `VPS_SSH_HOST_KEY_SHA256` before writing known_hosts.

**Step 2: Implement CI step**

Use GitHub secret/variable `VPS_SSH_HOST_KEY` and fail if `ssh-keyscan` output differs. Do not print private keys.

**Step 3: Run tests**

Run:
```bash
npm run test -- tests/deploy/ci-deploy-security.test.ts
```
Expected: PASS.

**Step 4: Commit**

```bash
git add .github/workflows/ci.yml deploy/README.md tests/deploy/ci-deploy-security.test.ts
git commit -S -m "fix: pin deploy ssh host key"
```

### Task 31: Preserve source snapshot freshness metadata in pregenerated content fallback

**Objective:** Stop clean CI/Docker fallback from making stale private-vault snapshots look freshly generated.

**Files:**
- Modify: `scripts/import-obsidian.ts:153-160,234-238`
- Modify: `lib/content/schemas.ts` if manifest schema needs fields
- Modify: `content/generated/manifest.json`
- Modify: `public/generated-content/manifest.json`
- Test: `tests/content/import-obsidian.test.ts`
- Test: `tests/content/validate-content.test.ts`

**Step 1: Write failing test**

```ts
it('does not rewrite source snapshot generatedAt when using pregenerated fallback', async () => {
  const result = await importObsidianSources({ allowPregenerated: true, now: '2030-01-01T00:00:00.000Z' });
  expect(result.manifest.sourceSnapshotGeneratedAt).not.toBe('2030-01-01T00:00:00.000Z');
  expect(result.manifest.usedPregeneratedFallback).toBe(true);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- tests/content/import-obsidian.test.ts -t "pregenerated fallback"
```
Expected: FAIL.

**Step 3: Implement metadata**

Add manifest fields such as `sourceSnapshotGeneratedAt`, `sourceSnapshotHash`, and `usedPregeneratedFallback`. Keep `generatedAt` for current build time only if UI labels make the distinction clear.

**Step 4: Run content gates**

Run:
```bash
npm run build:content
npm run test -- tests/content/import-obsidian.test.ts tests/content/validate-content.test.ts tests/offline/service-worker-metadata.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add scripts/import-obsidian.ts lib/content/schemas.ts content/generated public/generated-content tests/content
git commit -S -m "fix: preserve source snapshot freshness metadata"
```

### Task 32: Add workplan snapshot drift detection

**Objective:** Make CI/local validation fail when ignored `.hermes/plans` changed but tracked `content/workplans/workplans.json` is stale.

**Files:**
- Modify: `scripts/sync-workplans.ts`
- Modify: `tests/workplans/sync-workplans.test.ts`
- Modify: `package.json` if adding a dedicated check script

**Step 1: Write failing test**

Create a temp plans dir with one plan newer/different than an existing snapshot and assert check mode fails with a drift message.

**Step 2: Implement check mode**

Add `syncWorkplans({ mode: 'check' })` or CLI flag `--check` that compares generated snapshot to tracked snapshot without writing. Include plan source hash/count metadata.

**Step 3: Wire CI if stable**

Add `npm run check:workplans` to `check:ci` only if it works in both local `.hermes/plans` and CI snapshot-only modes.

**Step 4: Run tests**

Run:
```bash
npm run test -- tests/workplans/sync-workplans.test.ts
npm run sync:workplans
npm run build:content
```
Expected: PASS.

**Step 5: Commit**

```bash
git add scripts/sync-workplans.ts tests/workplans/sync-workplans.test.ts package.json content/workplans/workplans.json public/generated-content/workplans.json content/generated/workplans.json
git commit -S -m "fix: detect stale workplan snapshots"
```

---

## Final closeout task

### Task 33: Run final audit, full gates, docs/workplan sync, CI and live verification

**Objective:** Prove the remediation sequence is safe, deployed, and reflected in project status.

**Files:**
- Modify only if needed: `docs/plans/2026-06-04-full-app-audit-remediation-plan.md`
- Modify generated artifacts only if `npm run build:content`/sync changes them.

**Step 1: Local full gate**

Run:
```bash
source ~/.nvm/nvm.sh && nvm use 22
npm run check:ci
```
Expected: PASS.

**Step 2: Focused production E2E for remediated flows**

Run:
```bash
PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3053 npx playwright test \
  tests/e2e/map-log-mission-flow.spec.ts \
  tests/e2e/offline.spec.ts \
  tests/e2e/accessibility-mobile.spec.ts \
  tests/e2e/full-for-under-etter-journey.spec.ts \
  --workers=1 --timeout=120000
```
Expected: PASS.

**Step 3: Post-implementation audit**

Use `subagent-driven-development/references/post-implementation-audit.md` and `software-development/writing-plans/references/provenance-ui-post-implementation-audit.md`. Re-read changed files; verify no cross-mission leaks, no export privacy leaks, no context cache leakage, no official-authority wording regressions.

**Step 4: Commit final generated docs if any**

Run:
```bash
git diff --check
git status --short
```
Commit only tracked generated artifacts that changed.

**Step 5: Push and verify exact SHA**

Run:
```bash
SHA=$(git rev-parse HEAD)
git push origin main
gh run list --commit "$SHA" --limit 20
gh run watch <run-id> --exit-status
gh run view <run-id> --json status,conclusion,headSha,jobs,url
curl -fsS https://innsats.reidar.tech/api/health
```
Expected: GitHub Actions `status=completed`, `conclusion=success`, deploy job success, and live `/api/health.version` equals the exact pushed SHA.

**Step 6: Mark plan complete**

If this plan is mirrored to a workplan/release board later, update source metadata first, run `npm run sync:workplans`, verify Obsidian/JSON mirrors, then commit tracked snapshots separately.

---

## Plan review history

- Initial audit: four parallel read-only specialist audits plus controller verification. Local `npm run check:ci` passed. Controller confirmed live context API cache headers, live health SHA, all generated source statuses (`unverified: 61`), and current orphan-source gap (`10`).
- Controller adjustments before writing plan: removed an unverified claim that role/scenario coverage had zero-count gaps after direct JSON inspection showed no role/scenario zero counts in the current report; kept the confirmed orphan-source gap.
- Independent plan review #1: NOT APPROVED. Blockers found: context API tasks lacked production-route verification, some Playwright commands could use stale/missing `.next`, map-scope tasks needed explicit no-mission guards and library-level export filtering, Task 13 omitted local import/folder export privacy files, and review history was pending. This revision patches those blockers and also fixes non-blocking issues around missing imports, MET `304`/headers in timeout helper guidance, and production CSP `'unsafe-eval'`.
- Independent plan review #2: APPROVED. Focused re-review confirmed the blocker patches: context API production E2E added, production Playwright commands build first, map scoping is guarded at save and library export layers, privacy guards cover import/folder export files, review history is complete, and no new command/path blockers were found.

## Execution handoff

Plan complete and saved. Recommended execution: use `subagent-driven-development`; dispatch a fresh implementation subagent per task or per very small cluster, then run two-stage review after each task: spec compliance first, code quality/security second. Parent/controller owns final commits, pushes, CI/deploy verification, and live health checks.
