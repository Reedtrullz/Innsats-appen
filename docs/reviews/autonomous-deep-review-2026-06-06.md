# Autonomous Deep Review — Beredskapsboka / Innsats-appen

**Generated:** 2026-06-06T18:10:31Z  
**Repo:** `/Users/reidar/Projectos/Beredskapsboka`  
**Local HEAD:** `f957f1d2438b05e6b3bcc8dfe902ca0fd58946fa`  
**origin/main:** `8f85c01ddd08e0714b97644f4e5537f23a29c403`  
**Branch state at review:** `main...origin/main [ahead 2]`  
**Scope:** Whole-project review for tasks that can be done autonomously while the owner is away. This is **local review evidence only**. It is not CI, deployment, live-site, physical-device, source-owner, or production-governance proof.

## Current local state and non-claims

Pre-existing local state observed before/after gates:

```text
## main...origin/main [ahead 2]
 M content/workplans/workplans.json
 M docs/manual-tests/group-13-coverage-matrix.md
 M docs/manual-tests/task-385-iphone-safari-real-device.md
 M docs/release/staging-pilot-checklist.md
?? AGENTS.md
?? docs/manual-tests/evidence/
?? lib/AGENTS.md
```

Tracked dirty diff summary at the time of this report:

```text
content/workplans/workplans.json                      |  8 ++++----
docs/manual-tests/group-13-coverage-matrix.md         |  4 ++--
docs/manual-tests/task-385-iphone-safari-real-device.md | 19 +++++++++++++++++++
docs/release/staging-pilot-checklist.md               |  2 +-
4 files changed, 26 insertions(+), 7 deletions(-)
```

**Do not overclaim:**

- No push was performed.
- No GitHub Actions run was watched to `completed/success` for this local SHA.
- No deploy was performed or verified.
- No live `/api/health.version` check was used as proof for this local SHA.
- Physical-device evidence is still separate from Chromium/Playwright evidence.
- Owner/source-authority decisions are not inferable from code or tests.

## Local gate ledger

| Gate | Result | Notes |
|---|---:|---|
| `npm run --silent check:workplans` | PASS | `Workplan snapshot fresh (12 workplans)` |
| `npm run --silent report:source-governance:strict` | PASS | 61 sources, 53 referenced, 53/53 pilot-approved referenced, 0 pilot blockers, 0 public-body blockers |
| `npm run --silent report:stale-content` | PASS | No stale or expired content for 2026-06-06 |
| `npm run --silent validate:content` | PASS | Content graph valid; coverage report generated with 0 release-board gaps |
| `npm run --silent validate:maps` | PASS | `Map package validation OK: 0 package(s)` |
| `npm run --silent typecheck` | PASS | exit 0 |
| `npm run --silent lint` | PASS | exit 0 |
| `npm run --silent test` | PASS | Initial review: 95 files, 685 tests passed. Follow-up after regression test: 95 files, 686 tests passed. Noise still present: jsdom navigation and canvas not-implemented messages. |
| `npm run --silent audit:ci` | PASS for high/critical gate | Exit 0 because audit level is high. `npm audit` still reports 3 moderate Next/PostCSS advisories with no fix available. |
| `npm run --silent build:app` | PASS | Next 16.2.7 production build, 152 static pages generated. |
| `npm run --silent perf:budget` | PASS | Largest route JS: `/oppdrag` 274.6 KiB gzip under 350 KiB route budget. |
| `npm run --silent e2e:prod:no-build` | PASS after follow-up | Initial review found 36/37 passed due to stale `tests/e2e/core-mobile-journey.spec.ts:53`; follow-up fixed the assertion and reran 37/37 passing. |
| `npm run --silent perf:lighthouse` | PASS | Lighthouse mobile budget for `/hurtigkort`, performance score 98, resource budget pass. |

### Resolved immediate gate finding

`tests/e2e/core-mobile-journey.spec.ts:51-53` was stale relative to current source-governance data. The page still shows the global card-level pilot warning, while the source link itself now renders:

```text
SRC - Operativt konsept for Sivilforsvaret · verified Høy kilde-risiko
```

Follow-up implemented after this review:

- `tests/e2e/core-mobile-journey.spec.ts` now asserts the card-level pilot warning, source-link `· verified`, source-link `Høy kilde-risiko`, and absence of `unverified`.
- `tests/components/action-card-detail.test.tsx` now has a regression test proving card-level pilot warning stays visible even when the linked source is verified but high-risk.
- Spec reviewer verdict: PASS.
- Quality reviewer first caught a false-positive regex risk (`unverified` contains `verified`); the assertion was tightened and re-review verdict was APPROVED.
- Controller-side `npm run --silent check:ci` passed after the first fix: workplan freshness, content build/validation, map validation, typecheck, lint, 95 Vitest files / 686 tests, production build, 37/37 Playwright E2E, performance budget, and Lighthouse score 98.

### Follow-up gate-hygiene task completed

A second autonomous task from Batch A was completed after subagent implementation plus two-stage review:

- `package.json` now runs `npm run audit:ci` first inside `check:ci`, preserving all previous gates.
- `tests/deploy/ci-deploy-security.test.ts` now reads `package.json` and locks package/CI audit-gate parity: high/critical audit script, `check:ci` inclusion/order before content/app build, and CI workflow `run: npm run audit:ci`.
- Spec reviewer verdict: PASS.
- Quality reviewer verdict: APPROVED, with only a minor note that the string guard is focused rather than full CI/package parity.
- Controller-side `npm run --silent check:ci` passed after this second fix: audit high/critical gate exited 0 while still printing the known 3 moderate Next/PostCSS advisories with no fix available; workplan freshness/content/map/typecheck/lint passed; 95 Vitest files / 687 tests passed; production build passed; 37/37 Playwright E2E passed; performance budget and Lighthouse score 98 passed.

## Recommended autonomous work order for the next hours

These batches are intentionally ordered to maximize useful autonomous progress while avoiding owner/device/secret/deploy gates.

1. **Restore green production E2E**
   - Fix stale `core-mobile-journey` source-status expectation.
   - Rerun production build + E2E.
   - If green, record in a local report only; do not claim CI/live.
2. **Tighten test/gate hygiene**
   - Add coverage/untested-source guards, CI/package script parity tests, dirty-generated-artifact gate, and reduce Vitest noise.
3. **Local-data/privacy hardening**
   - Add deletion/retention guarantees for map/mission/profile state, PIN throttling, sensitive-text corpus expansion, stricter localStorage import schemas.
4. **PWA/offline/mobile hardening**
   - Add manifest icons/metadata, route-vs-service-worker drift tests, offline link crawler expansion, cache-age/stale UX, storage quota UX.
5. **CI/deploy static safety**
   - Pin actions/base images/tool versions, add CodeQL/dependency review/container scan/SBOM, static Ansible/compose validation. Do not change secrets or environment protection without owner approval.
6. **Refactor large UI/domain modules only after tests are stronger**
   - `components/offline-map-panel.tsx`, `components/mission-context-panel.tsx`, and `lib/mission/after-action-report.ts` can be split safely, but each split should be paired with focused tests and full gates.
7. **Manual-test docs and release truthfulness**
   - Update docs to separate automated Chromium proof from physical-device proof; leave physical tasks blocked until real device evidence exists.

## P0 / first-hour autonomous tasks

| ID | Severity | Task | Files | Autonomous? | Verification |
|---|---:|---|---|---|---|
| AUTO-001 | P0 | Fix stale production E2E assertion for source status `verified` vs `unverified` while preserving pilot-warning assertion. | `tests/e2e/core-mobile-journey.spec.ts:51-53` | Yes | `npm run build:app && npm run e2e:prod:no-build` |
| AUTO-002 | P0 | Add a regression assertion that card-level warning and source-level status can differ: warning remains until pilot/governance is fully ready even if one source is verified. | `tests/e2e/core-mobile-journey.spec.ts`, `tests/components/action-card-detail.test.tsx` | Yes | focused component test + production E2E |
| AUTO-003 | P0 | Re-run and record the full local gate ledger after E2E fix. | `docs/reviews/*` or task evidence file | Yes | `npm run check:ci` if acceptable runtime; otherwise gate-by-gate ledger |
| AUTO-004 | P0 | Add a dirty-generated-artifact gate after content build so `build:content` cannot silently leave generated tracked snapshots stale. | `package.json`, `scripts/sync-workplans.ts`, CI tests | Yes | `npm run build:content && git diff --exit-code -- content/workplans/workplans.json` |
| AUTO-005 | P0 | Add explicit CI/package gate parity test so `npm run check:ci` and GitHub Actions cannot drift. | `.github/workflows/ci.yml`, `package.json`, `tests/deploy/ci-deploy-security.test.ts` | Yes | `npm run test -- tests/deploy/ci-deploy-security.test.ts` |

## Security, privacy, and local-data tasks

| ID | Severity | Task | Files | Autonomous? | Verification / blocker |
|---|---:|---|---|---|---|
| SEC-001 | High | Purge map objects and active map IDs when deleting/resetting missions or archives. | `lib/mission/local-store.ts`, `lib/maps/operations-map.ts`, `components/mission-context-panel.tsx` | Yes | Unit + component reset tests proving no orphan map state. |
| SEC-002 | High | Make retention policy actually delete expired local data rather than only describing settings. | `lib/privacy/local-profile.ts`, `lib/mission/local-store.ts` | Yes | Fake-timer retention expiry tests. |
| SEC-003 | High | Reject sensitive/PII text in profile, reminder, audit, and operational note fields before persistence. | `lib/privacy/local-profile.ts`, `lib/privacy/sensitive-text.ts`, relevant components | Yes | Fixtures for Norwegian fødselsnummer-like strings, email, phone, address/person-name patterns. |
| SEC-004 | High | Expand sensitive-text corpus for Norwegian phone, DOB, address, shelter/private-location variants. | `lib/privacy/sensitive-text.ts`, `tests/security/free-text-privacy-guards.test.ts` | Yes | Expanded fixtures pass and false positives reviewed. |
| SEC-005 | High | Block sensitive context API queries before upstream calls and before logging/storage. | `lib/integrations/route-guards.ts`, `app/api/context/*/route.ts` | Yes | 400/no-store tests for restricted queries and private terms. |
| SEC-006 | High | Decide whether precise lat/lon should be rounded or gated for context APIs. | `lib/integrations/route-guards.ts`, `docs/external-context-sources.md` | No | Needs product/privacy decision; autonomous agent can draft options/tests only. |
| SEC-007 | High | Decide whether backups should strip or high-friction gate coordinates/external signals. | `lib/local-data/local-data.ts`, `components/local-data-backup-panel.tsx` | No | Needs owner choice; autonomous agent can implement if policy is chosen. |
| SEC-008 | High | Add PIN verify throttling/cooldown and audit failed attempts locally. | `lib/privacy/local-profile.ts`, `components/local-privacy-profile-panel.tsx` | Yes | Lockout/cooldown unit and component tests. |
| SEC-009 | High | Replace CSP `script-src 'unsafe-inline'` with nonce/hash strategy or document why blocked. | `next.config.ts`, `tests/security/security-headers.test.ts` | Partly | Code task is autonomous; final browser/prod validation required. |
| SEC-010 | Medium | Add HSTS, COOP/CORP/permissions-policy hardening where compatible with PWA and map use. | `next.config.ts`, security header tests | Yes | Header tests + production browser smoke. |
| SEC-011 | Medium | Harden Docker runtime defaults: read-only filesystem, dropped caps, no-new-privileges, tmpfs where compatible. | `deploy/templates/compose.production.yml.j2`, `Dockerfile`, deploy tests | Yes | Rendered compose tests + container smoke. |
| SEC-012 | Medium | Pin caret dependencies or document update policy with a lockfile drift guard. | `package.json`, `package-lock.json`, `.github/workflows/ci.yml` | Yes | `npm ci`, audit, typecheck/lint/test. |
| SEC-013 | Medium | Add SBOM/provenance/signing and deploy by immutable digest rather than mutable tags. | `.github/workflows/ci.yml`, `deploy/playbook.yml`, `deploy/README.md` | Partly | Static workflow changes autonomous; signing/deploy policy needs owner acceptance. |
| SEC-014 | Medium | Enforce or purge stale generated-content cache beyond threshold. | `public/sw.js`, `lib/offline/service-worker-metadata.ts` | Yes | Service-worker stale-cache tests. |
| SEC-015 | Medium | Add private no-store headers to service-worker context-API offline 503 paths. | `public/sw.js`, `tests/offline/service-worker-behavior.test.ts` | Yes | SW fetch tests. |
| SEC-016 | Medium | Add auto-clear/export-clear controls for backup/audit textareas. | `components/local-data-backup-panel.tsx`, `components/local-privacy-profile-panel.tsx` | Yes | Component tests. |
| SEC-017 | Medium | Add per-key schemas for allowlisted localStorage import values. | `lib/local-data/local-data.ts`, `lib/field-mode/field-mode.ts`, `lib/maps/operations-map.ts` | Yes | Malicious allowed-key import tests. |
| SEC-018 | Medium | Enforce import referential integrity for missions, checklist runs, field logs, map links. | `lib/local-data/local-data.ts`, `lib/mission/local-store.ts` | Yes | Orphan-run/import tests. |
| SEC-019 | Low | Remove `Math.random` fallback IDs or make crypto absence fail closed. | `lib/maps/operations-map.ts`, `lib/privacy/local-profile.ts`, `components/field-mode-panel.tsx` | Yes | No-`Math.random` test. |
| SEC-020 | Low | Add CI scan for PII/secrets/shelter IDs in generated public artifacts and assets. | `scripts/validate-content.ts`, `content/curated/*`, `public/generated-content/*` | Yes | Fixture scan tests. |

## PWA, offline, mobile, performance, and accessibility tasks

| ID | Severity | Task | Files | Autonomous? | Verification / blocker |
|---|---:|---|---|---|---|
| PWA-001 | High | Finish iPhone Safari real-device offline/low-connectivity/orientation/back/keyboard evidence. | `docs/manual-tests/task-385-iphone-safari-real-device.md`, `docs/manual-tests/evidence/*` | No | Physical iPhone/Safari evidence with exact SHA. |
| PWA-002 | High | Run Android Chrome real-device PWA/local-state/offline smoke. | `docs/manual-tests/task-386-android-chrome-real-device.md` | No | Physical/lab Android evidence. |
| PWA-003 | High | Validate install-to-home-screen/start URL/icons/update prompt on iOS and Android. | `docs/manual-tests/task-387-install-to-home-screen.md`, `app/manifest.ts` | No | Installed PWA screenshots/evidence. |
| PWA-004 | High | Run rain/gloves/darkness/stress touch/contrast/readability scenario. | `docs/manual-tests/task-384-rain-gloves-darkness-stress.md`, `components/field-mode-panel.tsx` | No | Field-condition evidence. |
| PWA-005 | High | Run two-build update-after-offline drill on real device. | `docs/manual-tests/task-389-update-after-offline.md`, `components/service-worker-registration.tsx`, `public/sw.js` | No | Build A/B exact SHA evidence. |
| PWA-006 | Medium | Add PNG/maskable icons and richer manifest metadata. | `app/manifest.ts`, `public/icon.svg`, `public/icons/*` | Yes | Lighthouse PWA/manifest snapshot tests. |
| PWA-007 | Medium | Generate or validate `public/sw.js` from typed route metadata to avoid duplicated shell lists. | `public/sw.js`, `lib/offline/static-app-shell.ts`, `tests/offline/*` | Yes | `npm run test -- tests/offline`. |
| PWA-008 | Medium | Cap service-worker install precache cost and guard route/asset count/bytes. | `public/sw.js`, `tests/offline/service-worker-behavior.test.ts` | Yes | Install-budget unit tests + prod E2E offline. |
| PWA-009 | Medium | Expand offline-link crawler to all visible internal links, including dynamic card/source/training routes. | `tests/e2e/offline.spec.ts`, `public/sw.js` | Yes | `npm run e2e:prod:no-build -- offline.spec.ts` after build. |
| PWA-010 | Medium | Show cache age/content timestamp in offline status, not only `navigator.onLine`. | `components/offline-status.tsx`, `lib/offline/service-worker-metadata.ts` | Yes | Component + E2E stale/fallback assertions. |
| PWA-011 | Medium | Add skip link/main landmark and global focus-visible styling. | `components/app-shell.tsx`, `app/page.tsx`, `app/globals.css` | Yes | Axe + keyboard Playwright. |
| PWA-012 | Medium | Add `prefers-reduced-motion` guards for transitions/backdrops/animations. | `app/globals.css`, components with `transition` | Yes | CSS/unit smoke + visual check. |
| PWA-013 | Medium | Add safe-area support for sticky header/update toast. | `components/app-shell.tsx`, `components/service-worker-registration.tsx`, `app/globals.css` | Yes | Mobile viewport E2E. |
| PWA-014 | Medium | Extend mobile touch target coverage to `/release` and admin-ish pages. | `tests/e2e/accessibility-mobile.spec.ts`, `components/release-readiness-tool.tsx` | Yes | Axe/no-overflow/touch-target E2E. |
| PWA-015 | Medium | Raise Lighthouse floor and audit more routes than `/hurtigkort`. | `scripts/lighthouse-mobile-budget.ts`, `config/lighthouse-mobile-budget.json` | Yes | `npm run perf:lighthouse`. |
| PWA-016 | Medium | Add route-level LCP/CLS/INP proxy budgets in Playwright. | `tests/e2e/mobile-offline-performance.spec.ts` | Yes | Prod E2E metrics budget. |
| PWA-017 | Medium | Assert `/kart` without package does not load MapLibre/PMTiles runtime. | `scripts/performance-budget.ts`, `tests/e2e/mobile-offline-performance.spec.ts` | Yes | Request/chunk assertions. |
| PWA-018 | Medium | Add storage quota/eviction UX for offline content and map packages. | `components/offline-status.tsx`, `components/offline-map-panel.tsx`, `lib/maps/offline-map.ts` | Yes | Mocked quota tests + E2E banner. |
| PWA-019 | Low | Improve search empty state when filters hide hits on mobile. | `components/search-box.tsx`, `tests/components/search-box.test.tsx` | Yes | Component + keyboard E2E. |
| PWA-020 | Low | Maintain browser compatibility matrix that separates Chromium automation from physical-device proof. | `docs/manual-tests/group-13-coverage-matrix.md`, `tests/manual-tests/manual-test-docs.test.ts` | Yes | Docs test; physical rows remain blocked. |

## Code quality and architecture tasks

| ID | Severity | Task | Files | Autonomous? | Verification |
|---|---:|---|---|---|---|
| CODE-001 | Medium | Split the large map UI into hooks/panels for state, import/export, editor, and SVG rendering. | `components/offline-map-panel.tsx` | Yes | `npm run test -- tests/components/offline-map-panel.test.tsx`; full gates after split. |
| CODE-002 | Medium | Extract GeoJSON import/privacy parsing from UI into map domain helpers. | `components/offline-map-panel.tsx`, new/updated `lib/maps/*` | Yes | `tests/maps/operations-map.test.ts`, panel tests. |
| CODE-003 | Medium | Split mission dashboard into smaller feature sections and an update hook/reducer. | `components/mission-context-panel.tsx` | Yes | `tests/components/mission-context-panel.test.tsx`. |
| CODE-004 | Medium | Break after-action report builder into section builders. | `lib/mission/after-action-report.ts` | Yes | `tests/mission/after-action-report.test.ts`. |
| CODE-005 | Medium | Replace `any` graph model in validation with typed/Zod-parsed graph. | `scripts/validate-content.ts` | Yes | `npm run validate:content`, content validation tests. |
| CODE-006 | Medium | Centralize generated-content artifact registry. | `lib/content/load-content.ts`, `scripts/compile-curated.ts`, `scripts/validate-content.ts`, `lib/offline/static-app-shell.ts` | Yes | Content compile/validate/load tests. |
| CODE-007 | Medium | Typecheck/generate service-worker metadata instead of duplicating constants in `public/sw.js`. | `public/sw.js`, `lib/offline/service-worker-metadata.ts`, `lib/offline/static-app-shell.ts` | Yes | SW/offline tests + E2E offline. |
| CODE-008 | Medium | Refactor context API routes through a single guarded handler. | `app/api/context/*/route.ts`, `private-context-response.ts` | Yes | Context API/security/integration tests. |
| CODE-009 | Medium | Route Kartverket through shared `fetchJsonWithTimeout` and source-health conventions. | `lib/integrations/kartverket.ts`, `lib/integrations/fetch-json.ts`, `lib/integrations/source-health.ts` | Yes | Kartverket + timeout tests. |
| CODE-010 | Medium | Consolidate crypto-first ID generation. | `lib/maps/operations-map.ts`, `lib/privacy/local-profile.ts`, `lib/mission/map-log-link.ts` | Yes | Unit tests for affected ID paths. |
| CODE-011 | Medium | Add explicit IndexedDB migration runner for future DB versions. | `lib/mission/local-store.ts`, `lib/local-data/local-data.ts` | Yes | Migration tests. |
| CODE-012 | Medium | Create shared domain sanitizers instead of duplicated text cleanup. | `lib/maps/operations-map.ts`, `lib/privacy/local-profile.ts`, `lib/mission/map-log-link.ts`, `lib/local-data/local-data.ts` | Yes | Privacy/security/map tests. |
| CODE-013 | Medium | Build reusable localStorage external-store adapter. | `lib/privacy/local-profile.ts`, `lib/maps/offline-map.ts`, `lib/maps/operations-map.ts`, `lib/field-mode/field-mode.ts`, `lib/integrations/source-settings.ts` | Yes | Component persistence tests. |
| CODE-014 | Low | Use `z.infer` output types where schema defaults matter instead of input shapes. | `lib/content/schemas.ts`, downstream consumers | Yes | `npm run typecheck`, content tests. |
| CODE-015 | Low | Split slow mega-tests into fixture-backed focused suites. | `tests/components/mission-context-panel.test.tsx`, `tests/components/offline-map-panel.test.tsx`, helpers | Yes | Same coverage/count with lower duration. |
| CODE-016 | Low | Add shared React test harness for mission/map/profile storage. | `tests/helpers/*`, component tests | Yes | No behavior change; tests pass. |
| CODE-017 | Low | Return structured storage errors instead of silent catches in persistence APIs. | `lib/privacy/local-profile.ts`, `lib/maps/operations-map.ts`, `lib/mission/local-store.ts` | Partly | Product copy/UX decision may be needed for surfaced errors. |
| CODE-018 | Medium | Add typed route/app-shell registry to avoid nav/SW/page-list drift. | `app/**/page.tsx`, `components/bottom-nav.tsx`, `lib/offline/static-app-shell.ts` | Yes | App-shell/SW/offline tests. |
| CODE-019 | Low | Add `@ts-check` or a TS build path for `public/sw.js`. | `public/sw.js`, config/tests | Yes | Lint/typecheck catches SW shape errors. |

## Test coverage, quality gates, and reliability tasks

| ID | Severity | Task | Files | Autonomous? | Verification |
|---|---:|---|---|---|---|
| TEST-001 | High | Add Vitest coverage gate/thresholds. | `vitest.config.ts`, `package.json`, `.github/workflows/ci.yml` | Yes | `npm run test -- --coverage`; CI fails below thresholds. |
| TEST-002 | High | Add per-file untested-source guard. | `scripts/*`, `tests/*`, `package.json` | Yes | Command lists 0 unexpected untested source files. |
| TEST-003 | Medium | Put `npm run audit:ci` inside `check:ci` or document why high-only audit is separate. | `package.json`, `tests/deploy/ci-deploy-security.test.ts` | Yes | `check:ci` includes audit or explicit audited exception. |
| TEST-004 | Medium | Triage/document moderate Next/PostCSS advisory with expiring allowlist if no fix. | `package.json`, `package-lock.json`, `docs/release/dependency-advisory-snapshot.md` | Yes | `npm audit --json` snapshot and expiry. |
| TEST-005 | High | Add dirty-worktree/generated-artifact gate after content build. | `package.json`, `scripts/sync-workplans.ts`, CI | Yes | Gate fails if generated tracked artifacts change. |
| TEST-006 | Medium | Assert CI/package gate parity and order. | `.github/workflows/ci.yml`, `package.json`, `tests/deploy/ci-deploy-security.test.ts` | Yes | Test proves same gates/order. |
| TEST-007 | Low | Add JUnit/coverage artifact upload for Vitest. | `vitest.config.ts`, `.github/workflows/ci.yml` | Yes | Failed CI uploads reports. |
| TEST-008 | Medium | Harden Playwright config with retries/workers/forbidOnly appropriate for CI. | `playwright.config.ts` | Yes | `npx playwright test --list`; CI rejects `.only`. |
| TEST-009 | Medium | Add WebKit/mobile Safari emulation project as automation, while not replacing physical proof. | `playwright.config.ts`, `tests/e2e/*` | Yes | Playwright lists Chromium + WebKit mobile. |
| TEST-010 | High | Automate two-build service-worker update drill where possible. | `tests/e2e/offline.spec.ts`, `public/sw.js`, staging docs | Yes | Build A offline then Build B update prompt in automation. |
| TEST-011 | Medium | Raise content coverage thresholds for zero/low buckets. | `lib/content/coverage-report.ts`, `tests/content/coverage.test.ts`, `scripts/validate-content.ts` | Yes | `npm run validate:content` fails on empty critical buckets. |
| TEST-012 | Medium | Add route-vs-offline-shell drift test. | `lib/offline/static-app-shell.ts`, `tests/offline/service-worker-metadata.test.ts`, `app/**/page.tsx` | Yes | New route absent from shell fails tests. |
| TEST-013 | Medium | Add non-empty map-package validation fixtures. | `scripts/validate-map-packages.ts`, `tests/maps/validate-map-packages.test.ts`, `tests/fixtures/*` | Yes | Invalid PMTiles/manifest fixture fails. |
| TEST-014 | Medium | Expand Lighthouse/perf routes and score floor. | `scripts/lighthouse-mobile-budget.ts`, `config/lighthouse-mobile-budget.json`, CI | Yes | Audits `/`, `/hurtigkort`, `/sok`, `/oppdrag`, `/kart`; score floor raised. |
| TEST-015 | Low | Remove Vitest noise from jsdom gaps. | `tests/setup.ts`, map/component tests | Yes | `npm run test` has no `Not implemented: navigation/canvas` noise. |
| TEST-016 | Medium | Add Docker image smoke before push/deploy. | `.github/workflows/ci.yml`, `Dockerfile`, deploy tests | Yes | CI builds image, runs container, checks `/api/health` + static assets. |

## CI/CD, deploy, and release-governance tasks

| ID | Severity | Task | Files / systems | Autonomous? | Verification / blocker |
|---|---:|---|---|---|---|
| DEPLOY-001 | High | Record pilot go/no-go governance decision: admin pushes, PR reviews, env gates, secret scope, exact-SHA policy. | `docs/release/deployment-governance-checklist.md` | No | Owner approval required. |
| DEPLOY-002 | High | Enforce stricter `main` protection: PR reviews, stale approval dismissal, admin enforcement. | GitHub branch protection + docs | No | GitHub admin/owner decision. |
| DEPLOY-003 | High | Add `production`/`staging` environment protection rules. | GitHub env settings, `.github/workflows/*.yml` | No | GitHub admin/owner decision. |
| DEPLOY-004 | High | Move deploy SSH keys to environment-scoped secrets. | `.github/workflows/ci.yml`, `.github/workflows/staging.yml`, `deploy/README.md` | No | Secret material/admin access. |
| DEPLOY-005 | High | Drill production rollback and capture evidence. | `docs/release/rollback-drill-evidence.md`, `deploy/playbook.yml` | No | Production maintenance window/owner approval. |
| DEPLOY-006 | High | Fix canonical staging DNS/TLS or formalize `nip.io` fallback as staging identity. | `docs/release/staging-pilot-checklist.md`, workflow/docs | No | DNS/TLS ownership. |
| DEPLOY-007 | High | Complete physical/lab release evidence Tasks 385-389. | `docs/manual-tests/task-385-*.md` through `task-389-*.md` | No | Device/field validation. |
| DEPLOY-008 | Medium | Resolve any remaining strict source-governance/pilot disposition with source owner. | `docs/source-governance-*.md`, `content/curated/*`, `scripts/report-source-governance.ts` | No | Source-owner/authority decision. Current strict local gate is clean. |
| DEPLOY-009 | Medium | Track/resolve moderate Next/PostCSS advisory when upstream fix exists. | advisory docs, `package.json`, `package-lock.json` | Partly | No fix available currently. |
| DEPLOY-010 | Medium | Pin third-party GitHub Actions by commit SHA. | `.github/workflows/*.yml` | Yes | Workflow lint/static tests. |
| DEPLOY-011 | Medium | Add CodeQL/SAST and dependency-review gates for PRs. | `.github/workflows/codeql.yml`, `.github/workflows/ci.yml` | Yes | Workflow syntax + PR gate. |
| DEPLOY-012 | Medium | Add container image vulnerability scan gate before push/deploy. | `.github/workflows/ci.yml`, `Dockerfile` | Yes | CI scan result artifact. |
| DEPLOY-013 | Medium | Generate SBOM + provenance/attestation for GHCR images. | `.github/workflows/ci.yml`, `deploy/README.md` | Yes | SBOM/provenance artifact present. |
| DEPLOY-014 | Medium | Digest-pin Docker base image and document update cadence. | `Dockerfile`, `docs/dependency-update-policy.md` | Yes | Dockerfile test + build. |
| DEPLOY-015 | Medium | Pin Ansible and `community.docker` exact versions. | workflows, `deploy/requirements.yml`, `deploy/publish-and-deploy.sh` | Yes | Static deploy tests. |
| DEPLOY-016 | Medium | Stop publishing/deploying ambiguous `latest`, or label it explicitly non-release/non-evidence. | workflows, `deploy/publish-and-deploy.sh`, `deploy/README.md` | Yes | Tests/docs confirm immutable tag/digest evidence. |
| DEPLOY-017 | Medium | Harden staging inventory generation against untrusted input/YAML injection. | `.github/workflows/staging.yml` | Yes | Static tests for escaping. |
| DEPLOY-018 | Low | Pass `NODE_VERSION=${{ env.NODE_VERSION }}` in staging Docker builds for parity. | `.github/workflows/staging.yml`, `tests/deploy/dockerfile.test.ts` | Yes | Dockerfile/workflow test. |
| DEPLOY-019 | Medium | Add deploy static validation: Ansible syntax, compose render, Caddy block lint. | workflows, `deploy/playbook.yml`, `deploy/templates/compose.production.yml.j2` | Yes | Static validation gate. |
| DEPLOY-020 | Low | Add privacy-safe uptime failure escalation beyond red scheduled runs. | `.github/workflows/monitoring.yml`, `docs/release/uptime-monitoring-privacy.md` | Yes | Workflow/docs tests. |

## Content, source-governance, domain, and manual evidence tasks

| ID | Severity | Task | Files | Autonomous? | Verification / blocker |
|---|---:|---|---|---|---|
| CONTENT-001 | High | Strip non-public source bodies from committed/generated public snapshots if any non-public body can still appear. | `content/generated/source-documents.json`, `scripts/import-obsidian.ts`, `tests/content/validate-content.test.ts` | Yes | No non-approved-public body in generated/public JSON; strict pass. |
| CONTENT-002 | High | Re-review `strong-public-replacement`/`public-replacement-approved` body publication boundaries. | `content/generated/source-documents.json`, `docs/source-governance-open-web-research-2026-06-06.md`, `lib/content/source-policy.ts` | No | Source-owner/public-evidence decision. |
| CONTENT-003 | Medium | Fix stale pilot-go/source-governance doc strings that still mention old blocker counts. | `docs/release/pilot-rollout-plan.md`, `docs/source-governance-remediation-queue.md` | Yes | `npm run --silent report:source-governance:strict`; grep stale blocker counts. |
| CONTENT-004 | Medium | Add release-board/go-no-go truth check for source-governance freshness. | `components/release-readiness-tool.tsx`, `lib/release/plan.ts`, tests | Yes | Release board uses current strict status, not historical text. |
| CONTENT-005 | High | Record owner decision on branch/env governance. | `docs/release/deployment-governance-checklist.md` | No | Owner decision. |
| CONTENT-006 | High | Drill/accept production rollback, not staging-only. | `docs/release/rollback-drill-evidence.md`, `deploy/playbook.yml` | No | Production maintenance window. |
| CONTENT-007 | High | Resolve intended staging DNS/TLS or formalize fallback. | `docs/release/staging-pilot-checklist.md`, DNS/runbooks | No | DNS/TLS ownership. |
| CONTENT-008 | Medium | Decide PMTiles pilot scope; approved package needs provenance/license/size/offline evidence. | `lib/maps/offline-map-package-manifest.ts`, `docs/map-log-fieldmode-workflow.md` | No | Owner/source/package decision. |
| CONTENT-009 | High | Complete Task 385 iPhone Safari final pass. | `docs/manual-tests/task-385-iphone-safari-real-device.md` | No | Hardware evidence. |
| CONTENT-010 | High | Complete Task 386 Android Chrome. | `docs/manual-tests/task-386-android-chrome-real-device.md` | No | Hardware/lab evidence. |
| CONTENT-011 | High | Complete Task 387 install-to-home-screen. | `docs/manual-tests/task-387-install-to-home-screen.md` | No | Installed PWA evidence. |
| CONTENT-012 | High | Complete Task 388 low-connectivity. | `docs/manual-tests/task-388-low-connectivity.md` | No | Network lab/field evidence. |
| CONTENT-013 | High | Complete Task 389 update-after-offline. | `docs/manual-tests/task-389-update-after-offline.md` | No | Build A/B evidence. |
| CONTENT-014 | Medium | Run Task 384 rain/gloves/darkness/stress. | `docs/manual-tests/task-384-rain-gloves-darkness-stress.md` | No | Field-condition notes/screenshots. |
| CONTENT-015 | Medium | Run Task 383 offline-use target-device smoke. | `docs/manual-tests/task-383-offline-use.md` | No | Target-device offline route/local mission evidence. |
| CONTENT-016 | Medium | Run Task 377 flom/pumpe scenario. | `docs/manual-tests/task-377-flom-pumpe.md` | Yes | Sanitized result log/screenshots + exact SHA. |
| CONTENT-017 | Medium | Run Task 378 SAR/ettersøkning scenario. | `docs/manual-tests/task-378-sar-ettersokning.md` | Yes | Schematic-map/local-only notes + offline reload. |
| CONTENT-018 | High | Run Task 379 CBRNE warning/stop review. | `docs/manual-tests/task-379-cbrne.md` | No | Domain reviewer/manual pass. |
| CONTENT-019 | High | Run Task 380 RADIAC/nedfall boundary review. | `docs/manual-tests/task-380-radiac-nedfall.md` | No | Domain reviewer verifies no dose/order overclaim. |
| CONTENT-020 | Medium | Run Task 382 etter-innsats/MBK export review. | `docs/manual-tests/task-382-etter-innsats-mbk.md` | Yes | Sanitized MBK/after-action exports, local-only copy. |

## Autonomous implementation batches suitable for parallel agents

If execution is started, use isolated worktrees or carefully serialized direct edits. Do **not** let parallel agents edit the same hotspot files.

### Batch A — test/gate hygiene, safe and high leverage

- `AUTO-001`, `AUTO-002`, `TEST-003`, `TEST-004`, `TEST-005`, `TEST-006`, `TEST-015`.
- Hotspots: `package.json`, `.github/workflows/ci.yml`, `tests/deploy/ci-deploy-security.test.ts`, `tests/e2e/core-mobile-journey.spec.ts`.
- Recommended verification: `npm run typecheck && npm run lint && npm run test && npm run build:app && npm run e2e:prod:no-build`.

### Batch B — local-data/privacy hardening

- `SEC-001`, `SEC-002`, `SEC-003`, `SEC-004`, `SEC-008`, `SEC-017`, `SEC-018`, `SEC-019`.
- Hotspots: `lib/mission/local-store.ts`, `lib/privacy/local-profile.ts`, `lib/privacy/sensitive-text.ts`, `lib/local-data/local-data.ts`, `lib/maps/operations-map.ts`.
- Recommended verification: focused privacy/local-data/map tests, then full Vitest.

### Batch C — offline/PWA test improvements

- `PWA-006`, `PWA-007`, `PWA-008`, `PWA-009`, `PWA-010`, `PWA-014`, `PWA-017`, `PWA-018`.
- Hotspots: `public/sw.js`, `lib/offline/static-app-shell.ts`, `tests/e2e/offline.spec.ts`, `tests/offline/*`.
- Recommended verification: `npm run build:app && npm run e2e:prod:no-build`, plus Lighthouse/perf budget.

### Batch D — CI/deploy static hardening

- `DEPLOY-010` through `DEPLOY-020`, except anything that changes secret/environment policy.
- Hotspots: `.github/workflows/*.yml`, `Dockerfile`, `deploy/*`, deploy tests.
- Recommended verification: deploy static tests, Docker build smoke, workflow syntax review. Do not push/deploy without explicit instruction and exact-SHA verification.

### Batch E — refactors after gate confidence

- `CODE-001` through `CODE-013`, `CODE-018`, `CODE-019`.
- These are useful but bigger; do them after test/gate hygiene because they touch large modules.

## Blocked/non-autonomous evidence queue

These should stay open until real evidence exists:

- Physical iPhone Safari evidence: Task 385.
- Physical Android Chrome evidence: Task 386.
- Install-to-home-screen evidence: Task 387.
- Low-connectivity/captive-portal evidence: Task 388.
- Two-build update-after-offline real-device drill: Task 389.
- Rain/gloves/darkness/stress field scenario: Task 384.
- Domain expert review for CBRNE/RADIAC operational boundaries: Tasks 379-380.
- Source-owner review for public publication of any ambiguous source body/excerpt.
- GitHub branch protection/environment/secret scoping decisions.
- Production rollback drill and deploy/live verification.
- Staging DNS/TLS ownership decision.
- Any production claim after docs-only or code commits: requires push, exact-SHA CI/deploy `completed/success`, then live `curl`/browser verification.

## Review method

This review used six parallel read-only specialist audits plus local gate execution:

1. Security/privacy/local-data.
2. PWA/offline/mobile/performance/accessibility.
3. Code quality/architecture/refactorability.
4. Test coverage/gate reliability.
5. CI/CD/deploy/release governance.
6. Content/source-governance/domain/manual evidence.

The task lists above consolidate duplicate findings and mark what is safe for an autonomous coding agent versus what requires owner/device/source/governance evidence.

## Final handoff

The best immediate autonomous target is **Batch A**: make production E2E green again and add gate parity/dirty-artifact/audit hygiene. After that, Batch B and Batch C are the highest-value autonomous hardening streams. Keep all physical, source-owner, GitHub-owner, production rollback, CI/deploy, and live-site claims explicitly blocked until their external evidence is actually produced.
