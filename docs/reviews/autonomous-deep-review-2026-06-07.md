# Autonomous Deep Review — Beredskapsboka / Innsats-appen

**Generated:** 2026-06-07T02:47:53Z  
**Repo:** `/Users/reidar/Projectos/Beredskapsboka`  
**Audited branch/HEAD:** `main` / `f27941907861db4d6d6696b3741bea76b101e589`  
**origin/main:** `f27941907861db4d6d6696b3741bea76b101e589`  
**Production URL:** <https://innsats.reidar.tech>  
**Scope:** Whole-project audit focused on work an autonomous agent can do safely without owner/device/source-governance/production-side decisions.

## Current repo state and non-claims

Pre-existing dirty state before this review was preserved:

```text
 M docs/manual-tests/README.md
 M docs/manual-tests/group-13-coverage-matrix.md
 M docs/manual-tests/task-385-iphone-safari-real-device.md
?? AGENTS.md
?? docs/manual-tests/task-385-user-manual-instructions.md
?? lib/AGENTS.md
```

This report is a **new local artifact**. Unless separately committed/pushed, it is not CI-verified or deployed.

Do not overclaim:

- The dirty docs/new report are not pushed by this audit.
- No new CI/deploy run was created for this local report artifact.
- Physical iPhone/Android/install/update/weak-network evidence remains separate from Chromium automation.
- Owner/admin/source/domain decisions are not inferable from tests.

## Verification ledger from this review

| Check | Result | Evidence |
|---|---:|---|
| `HEAD == origin/main` | PASS | Both are `f27941907861db4d6d6696b3741bea76b101e589`. |
| Node runtime | PASS | `node v22.22.3`, `npm 10.9.8`. |
| Codebase size scan | PASS | `uvx pygount`: 668 files, 67,756 code lines; TS 16,536 LOC; TSX 10,290 LOC; JSON 37,767 lines. |
| `npm run --silent check:ci` | PARTIAL local fail | Audit/workplans/content/generated/maps/typecheck/lint/Vitest passed; failed at Next build with `ENOTEMPTY: rmdir .next/server`. |
| Clean production build retry | PASS | `rm -rf .next && npm run --silent build:app` passed; 152 static pages generated. |
| Production E2E | PASS | `npm run --silent e2e:prod:no-build`: 37/37 Playwright tests passed. |
| Performance budget | PASS | Largest route `/oppdrag`: 274.6 KiB gzip under 350 KiB. |
| Lighthouse mobile | PASS | `/hurtigkort` performance score 97, resource budget pass. |
| Strict source governance | PASS | 61 sources, 53 referenced, 53 pilot-approved referenced, 0 pilot blockers, 0 public-body blockers. |
| Stale content | PASS | No stale or expired content for 2026-06-07. |
| Exact-SHA GitHub run | PASS | `gh run view 27079193198`: `CI / Deploy`, status `completed`, conclusion `success`, headSha `f279419...`; jobs `Automatic checks`, `Build and push GHCR image`, and `Deploy to VPS with Ansible` all completed success. |
| Live health | PASS | `curl https://innsats.reidar.tech/api/health`: `status=healthy`, `nodeEnv=production`, `version=f27941907861db4d6d6696b3741bea76b101e589`. |

Specialist temp reports used for synthesis:

- `/tmp/beredskapsboka-audit-security.md`
- `/tmp/beredskapsboka-audit-pwa.md`
- `/tmp/beredskapsboka-audit-architecture.md`
- `/tmp/beredskapsboka-audit-tests.md`
- `/tmp/beredskapsboka-audit-deploy.md`
- `/tmp/beredskapsboka-audit-content.md`

## Executive synthesis

The app is in a strong technical state for a deployed offline-first PWA: exact-SHA production is healthy, current CI/deploy for `f279419...` is successful, strict source governance passes, local tests/E2E/perf pass after cleaning stale `.next`, and physical iPhone Airplane Mode evidence exists for Task 385’s offline subset.

The biggest autonomous work now is not “make the app basically work”; it is:

1. **Truth/gate hygiene** — remove stale release/source/manual status text, make clean builds deterministic, and make doc/evidence states machine-checkable.
2. **Privacy/local-data hardening** — purge orphan map state, reject orphan imports, throttle PIN attempts, validate per-key localStorage imports, and extend PII guards to profile/reminders.
3. **PWA/offline robustness** — close service-worker generated-route asset caching drift, add install metadata, automate two-build update and low-connectivity support checks.
4. **Architecture containment** — centralize generated artifact metadata, stop duplicating SW/static-shell constants, type generated content graphs, split oversized UI components.
5. **Supply-chain/deploy hardening** — action/toolchain pinning, digest-aware image evidence, stronger deploy verifier parity.

The main non-autonomous blockers remain physical/device evidence, field-condition evidence, GitHub/admin governance decisions, production rollback acceptance/drill, and source-owner decisions for future rejected/internal source reuse.

## Recommended autonomous execution order

1. **Batch 1 — truth + gate stabilization**: clean build path, gate sequence parity, release/source docs truth sync, manual evidence parser, stale card warning copy.
2. **Batch 2 — local privacy/data integrity**: orphan map purge, import referential integrity, per-key localStorage schemas, PIN throttling, profile/reminder PII guards.
3. **Batch 3 — service worker/PWA support automation**: generated-route asset precache, manifest icons/installability, update-after-offline Chromium support, low-connectivity support, WebKit/Firefox smoke.
4. **Batch 4 — architecture foundations**: generated artifact registry, SW metadata generation/drift check, typed generated graph, context route helper, integration payload parsers.
5. **Batch 5 — deploy/supply-chain static hardening**: pin Actions/toolchains, nodeEnv deploy verifier, staging doc cleanup, digest-aware image evidence path.
6. **Batch 6 — larger refactors and ratchets**: split `OfflineMapPanel`, version map localStorage, split `ReleaseReadinessTool`, add coverage thresholds, ratchet Lighthouse.

## Autonomous work backlog

### Batch 1 — truth, release, and gate hygiene

| ID | Severity | Task | Files / evidence | Autonomous? | Verification |
|---|---:|---|---|---|---|
| AUT-001 | High | Add deterministic clean production build path so stale `.next/server` cannot break `check:ci` with `ENOTEMPTY`. | `package.json:14-15,41`; observed local failure during this audit. | Yes | `npm run build:app && npm run build:app`; `npm run check:ci` without manual cleanup. |
| AUT-002 | Medium | Normalize local `check:ci` and GitHub Actions gate order, then test full sequence parity. | `package.json:41`; `.github/workflows/ci.yml:75-82`; `tests/deploy/ci-deploy-security.test.ts`. | Yes | `npm run test -- tests/deploy/ci-deploy-security.test.ts`; CI step order matches local script. |
| AUT-003 | High | Sync release/workplan truth: source governance is now strict-clean and should not be shown as 55-blocked. | `content/workplans/workplans.json:6157-6164`; `docs/release/pilot-rollout-plan.md:24-32`. | Yes | `npm run report:source-governance:strict`; `npm run check:workplans`; release board no stale source blocker. |
| AUT-004 | High | Reconcile staging/release text: staging checklist records exact-SHA success while rollout/workplan text still claims missing staging evidence. | `docs/release/staging-pilot-checklist.md:18-29`; `content/workplans/workplans.json:6301-6308`; `docs/release/pilot-rollout-plan.md:18,33`. | Partly | Docs/workplan sync is autonomous; DNS/TLS change remains owner/admin. |
| AUT-005 | Medium | Fix stale tilfluktsrom card warnings that still say “Ikke kildegodkjent for pilot” even though the referenced source is approved. Preserve private/sheltered-location warnings. | `content/curated/action-cards.yaml:58,580`; source evidence in `content/generated/source-documents.json`. | Yes | `npm run build:content`; `npm run report:source-governance:strict`; spot-check affected cards. |
| AUT-006 | Medium | Restructure source-governance remediation queue so historical pending rows cannot be mistaken for current blockers. | `docs/source-governance-remediation-queue.md:5-13,117-175`. | Yes | Docs test / static grep for stale current-blocker phrasing. |
| AUT-007 | Medium | Strengthen manual-test docs test to parse latest result/status, SHA, and `blocked/partial pass/pass` rather than matching old blocked packets. | `tests/manual-tests/manual-test-docs.test.ts:85-93`; Task 385 docs. | Yes | `npm run test -- tests/manual-tests/manual-test-docs.test.ts`; stale fixture fails. |
| AUT-008 | Low | Add explicit Playwright/Vitest focused-test guards (`forbidOnly`, CI only policy). | `playwright.config.ts:10-27`; `vitest.config.ts:5-10`. | Yes | Temporary `.only` should fail in CI/list gate; remove before commit. |
| AUT-009 | Low | Add production HTTP security/header contracts in Playwright/APIRequestContext, not only `next.config` tests. | `tests/security/security-headers.test.ts`; `tests/e2e/context-api-privacy.spec.ts`. | Yes | `npm run build:app && npm run e2e:prod:no-build` with header spec. |
| AUT-010 | Low | Ratchet Lighthouse score floor from 0.40 toward current reality, after clean-build stability is fixed. | `scripts/lighthouse-mobile-budget.ts:11-14,228-233`. | Yes | `npm run perf:lighthouse` across multiple clean runs before raising. |
| AUT-011 | Medium | Document/snapshot moderate Next/PostCSS advisories with expiry while high/critical audit remains the release gate. | `package.json`, `package-lock.json`, `docs/release/*`. | Yes | `npm audit --json` snapshot; high/critical gate still passes. |

### Batch 2 — privacy, local-data, and security hardening

| ID | Severity | Task | Files / evidence | Autonomous? | Verification |
|---|---:|---|---|---|---|
| SEC-001 | High | Purge mission-scoped map objects and active map IDs when deleting/resetting missions or clearing archives. | `lib/mission/local-store.ts:148-155`; `components/mission-context-panel.tsx:382-390`; `lib/local-data/local-data.ts:35-44`. | Yes | Unit/component tests prove deleted mission IDs leave no orphan map state/backups. |
| SEC-002 | High | Reject local-data imports with checklist runs whose `missionId` is not present in imported missions. | `lib/local-data/local-data.ts:415-416,493-494`; `lib/mission/local-store.ts:189-197`. | Yes | Import test rejects orphan run before `replaceLocalMissionData`. |
| SEC-003 | High | Add per-key schemas for allowlisted localStorage import values before writing them. | `lib/local-data/local-data.ts:318-339,374-384`; allowlisted keys in local-data module. | Yes | Malformed allowed-key imports rejected/normalized; local-data tests pass. |
| SEC-004 | High | Add PIN failed-attempt throttling/cooldown and local failed-unlock audit entries. | `lib/privacy/local-profile.ts:460-465`; `components/local-privacy-profile-panel.tsx:135-153`. | Yes | Fake-timer and component tests for cooldown/audit without PIN leak. |
| SEC-005 | High | Extend sensitive-text rejection to local profile display name/callsign and competence reminders. | `lib/privacy/local-profile.ts:149-155,211-224,334-345`; `tests/privacy/local-profile.test.ts`. | Yes | Norwegian ID/phone/email/private-location fixture tests. |
| SEC-006 | Medium | Add `private, no-store` headers to service-worker offline `/api/context/*` 503 responses. | `public/sw.js:290-296`. | Yes | Service-worker VM fetch test verifies 503 no-store path. |
| SEC-007 | Medium | Add clear/copy-and-clear controls for generated backup/audit/map/mission export textareas. | `components/local-data-backup-panel.tsx:74-90,145`; `components/offline-map-panel.tsx:1011-1017`; `components/mission/mission-folder-export-controls.tsx:12-40`; `components/local-privacy-profile-panel.tsx:220-226,379-381`. | Yes | Component tests show exported text can be wiped. |
| SEC-008 | Medium | Add generated-content cache age purge or stronger stale UX beyond current label-only behavior. | `public/sw.js:199-210,247-267`; `lib/offline/service-worker-metadata.ts:69-74`. | Yes | SW cache-age tests and offline E2E stale/fallback assertion. |
| SEC-009 | Low | Replace persisted-ID `Math.random` fallbacks with centralized crypto-first ID generation or fail-closed behavior. | `lib/maps/operations-map.ts:166-168`; `lib/privacy/local-profile.ts:593-595`; `components/field-mode-panel.tsx:67-69`. | Yes | Static/unit test disallows `Math.random` in persisted ID paths. |
| SEC-010 | Medium | Harden CSP/security headers: reduce `script-src 'unsafe-inline'` if compatible; add HSTS/COOP/CORP/Permissions-Policy where PWA-safe. | `next.config.ts:3-22`; `tests/security/security-headers.test.ts:21-35`. | Partly | Code/test autonomous; final browser/PWA compatibility smoke required. |
| SEC-011 | Partly | Decide and implement coordinate precision policy for context APIs if current 4-decimal rounding is too precise. | `lib/integrations/route-guards.ts:69-79`; context route files. | Partly | Agent can draft options/tests; owner chooses privacy/usability trade-off. |
| SEC-012 | Partly | Decide whether retention settings stay as non-enforcing reminders or become deletion enforcement. | `components/local-privacy-profile-panel.tsx:201-218`; `tests/privacy/local-profile.test.ts:109-117`. | Partly | Owner/product semantics needed before destructive deletion behavior. |

### Batch 3 — PWA, offline, mobile, accessibility, and performance

| ID | Severity | Task | Files / evidence | Autonomous? | Verification |
|---|---:|---|---|---|---|
| PWA-001 | High | Cache HTML-discovered `_next` assets for discovered generated dynamic routes, not just route HTML. | `public/sw.js:220-221`; `tests/offline/service-worker-behavior.test.ts:73-83`. | Yes | VM test with unique generated-route `_next` script; offline E2E generated card/source route. |
| PWA-002 | Medium | Add explicit 192/512/maskable PNG icons, Apple touch icon metadata where appropriate, and installability assertions. | `app/manifest.ts:13-19`; `public/icon.svg`; Task 387 docs. | Yes for code; no for final device pass | Lighthouse/PWA manifest assertion; physical Task 387 still required. |
| PWA-003 | High | Add a Chromium support drill for two-build update-after-offline: Build A offline, Build B reconnect, update prompt, `SKIP_WAITING`, cache version change, IndexedDB retention. | `components/service-worker-registration.tsx:123-126`; `tests/components/service-worker-registration.test.tsx:44-57`; `docs/manual-tests/task-389-update-after-offline.md`. | Yes for supporting automation | New E2E/SW fixture; final Task 389 needs real device/staged deploy evidence. |
| PWA-004 | Medium | Add optional WebKit/Firefox mobile/browser smoke projects while keeping Chromium as default CI and physical tasks separate. | `playwright.config.ts:18-23`; E2E tests. | Yes | `npx playwright test --project=webkit-smoke --project=firefox-smoke`. |
| PWA-005 | Medium | Add low-connectivity support automation: slow/flaky generated content and context API requests with stale/fallback labels and local-write continuity. | `tests/e2e/offline.spec.ts:79-126`; Task 388 docs. | Yes for supporting automation | Chromium throttled/failure-mix E2E; final Task 388 still real network/device lab. |
| PWA-006 | Medium | Investigate Safari direct-route Next RSC prefetch access-control console errors and add regression or document as benign. | Task 385 evidence report lines 66-70; Next/SW route path. | Yes/Partly | Reproduce with WebKit/Safari tooling; physical Safari may be needed to close. |
| PWA-007 | Low-Medium | Add Lighthouse PWA/installability category checks, not performance-only. | `scripts/lighthouse-mobile-budget.ts:210-220`; `config/lighthouse-mobile-budget.json`. | Yes | Lighthouse PWA/manifest assertions. |
| PWA-008 | Medium | Keep Task 385 final physical checklist current for current SHA and update docs after owner result. | `docs/manual-tests/task-385-user-manual-instructions.md`; `task-385-iphone-safari-real-device.md`. | Yes for prep/docs; no for pass | Owner-run physical iPhone keyboard/toolbar/orientation/action-row result. |

### Batch 4 — architecture, generated artifacts, and code quality

| ID | Severity | Task | Files / evidence | Autonomous? | Verification |
|---|---:|---|---|---|---|
| ARCH-001 | High | Introduce a typed generated-artifact registry for filenames, schemas, public mirror policy, count fields, and SW cache policy. | `scripts/compile-curated.ts:125`; `lib/content/load-content.ts:53`; `scripts/validate-content.ts:56,277`; `lib/offline/static-app-shell.ts:33`; `public/sw.js:49`. | Yes | Registry tests; content compile/validate/load/search tests. |
| ARCH-002 | High | Stop manual service-worker/static-shell metadata duplication; generate or drift-check `public/sw.js` constants from TS metadata/registry. | `public/sw.js:1,19,167`; `lib/offline/service-worker-metadata.ts`; `lib/offline/static-app-shell.ts`. | Yes | `check:sw`/unit test compares SW constants to TS registry; offline tests pass. |
| ARCH-003 | Medium-High | Replace broad `any` content graph validation with Zod-inferred generated graph types and shared selectors. | `scripts/validate-content.ts:27,47,95`; `lib/content/coverage-report.ts:3,55`. | Yes | Typecheck plus content validation tests; reduce `any` count. |
| ARCH-004 | Medium-High | Split 1035-line `OfflineMapPanel` into import/privacy helpers, renderer, package-cache controls, mission editor, field-log bridge. | `components/offline-map-panel.tsx`; `lib/maps/operations-map.ts`. | Yes | Existing offline-map component/map tests plus full Vitest after each split. |
| ARCH-005 | Medium | Extract repeated context API route flow into shared helper for guard/rate-limit/fetch/validate/error/no-store behavior. | `app/api/context/weather/route.ts`; `hazards/route.ts`; `geocode/route.ts`; `private-context-response.ts`. | Yes | Context API/security/integration tests for 400/429/502/no-store. |
| ARCH-006 | Medium | Normalize external integration payloads from `unknown` with minimal schemas/parsers instead of `any`/raw `response.json()`. | `lib/integrations/met.ts:69,76`; `lib/integrations/kartverket.ts:22,53`; `lib/integrations/fetch-json.ts:47`. | Yes | Integration parser tests and upstream-timeout tests. |
| ARCH-007 | Medium | Version operations-map localStorage with `{ schemaVersion, markers, drawings }` and legacy migration path. | `lib/maps/operations-map.ts:300,310`; allowlist in `lib/local-data/local-data.ts:35`. | Yes | Map storage migration tests and local-data backup/import tests. |
| ARCH-008 | Low-Medium | Add cached content selectors/bundles for repeated dynamic route lookups. | Dynamic route pages using `getActionCards`, `getSourceDocuments`, `getTrainingPaths`; `lib/content/load-content.ts`. | Yes | Route/component tests plus build. |
| ARCH-009 | Low-Medium | Split 627-line `ReleaseReadinessTool` into persistence/fetch/scoring hooks and presentational components. | `components/release-readiness-tool.tsx:183,199,207,230,298`. | Yes | Release readiness tests and E2E release workplans smoke. |
| ARCH-010 | Low | Add explicit `@ts-check`/static validation path for `public/sw.js` if generation is deferred. | `public/sw.js`. | Yes | JS type/lint/drift test catches SW shape errors. |

### Batch 5 — tests, coverage, and reliability ratchets

| ID | Severity | Task | Files / evidence | Autonomous? | Verification |
|---|---:|---|---|---|---|
| TEST-001 | Medium | Add Vitest coverage instrumentation and pragmatic thresholds/ratchet mode. | `vitest.config.ts:5-10`; `package.json:21-23`. | Yes | `npm run test:coverage`; CI fails below threshold. |
| TEST-002 | Low | Consider failing on unexpected `console.error`/`console.warn` in Vitest with allowlist helper. | `tests/setup.ts:81-107`. | Yes | Fixture `console.error` test fails unless allowlisted. |
| TEST-003 | Medium | Add full CI/package gate parser test, beyond current audit-check presence. | `.github/workflows/ci.yml`; `package.json`; `tests/deploy/ci-deploy-security.test.ts`. | Yes | Sequence parity test. |
| TEST-004 | Medium | Add production response header route contract for `/`, `/hurtigkort`, `/api/health`, and representative generated assets. | E2E/header tests. | Yes | Production-mode Playwright/APIRequestContext. |
| TEST-005 | Medium | Add supporting browser-smoke command for WebKit/Firefox without changing physical-device pass criteria. | `playwright.config.ts`; E2E scripts. | Yes | Browser smoke list/run. |
| TEST-006 | Medium | Make stale manual evidence states machine-checkable with current SHA fields and latest-status parsing. | Manual test docs and `tests/manual-tests/manual-test-docs.test.ts`. | Yes | Docs test catches stale old blocked packet. |
| TEST-007 | Low | Add JUnit/coverage artifact upload if CI output triage becomes difficult. | `.github/workflows/ci.yml`; `vitest.config.ts`. | Yes | CI artifact output on failure. |

### Batch 6 — CI/CD, deploy, release governance static work

| ID | Severity | Task | Files / evidence | Autonomous? | Verification |
|---|---:|---|---|---|---|
| DPL-001 | High | Pin third-party GitHub Actions to full commit SHAs and add a policy/test rejecting mutable external `uses:` tags. | `.github/workflows/ci.yml`, `staging.yml`, `monitoring.yml`. | Yes | Static workflow test; workflow syntax. |
| DPL-002 | Medium | Pin deploy toolchain versions (`ansible`, `community.docker`, maybe runner image) and document update cadence. | `.github/workflows/ci.yml:172-177`; `.github/workflows/staging.yml:124-129`; `deploy/requirements.yml:3-4`. | Yes | Deploy tests and workflow policy tests. |
| DPL-003 | Low | Strengthen deploy health verification to assert `nodeEnv == production`, matching docs and monitoring. | `deploy/playbook.yml:161-165,212-215`; `.github/workflows/ci.yml:247-251`; `app/api/health/route.ts`. | Yes | Deploy verifier tests / playbook safety tests. |
| DPL-004 | Medium | Clean staging host docs/runbooks to consistently use either `staging.198.23.137.16.nip.io` or the intended DNS hostname. | `.github/workflows/staging.yml`; `deploy/README.md`; `docs/release/staging-pilot-checklist.md`; `docs/release/pilot-rollout-plan.md`. | Partly | Docs sync autonomous; DNS/TLS owner/admin if changing hostname. |
| DPL-005 | Medium | Add digest-aware image evidence path: capture build-push digest output, document it, add tests for digest regex/plumbing. | `.github/workflows/ci.yml`; `deploy/playbook.yml`; `deploy/README.md`; `Dockerfile`. | Partly | Non-production/test path autonomous; production digest-only switch owner-approved. |
| DPL-006 | Low | Consider staging concurrency parity with production so staging deploys are queued rather than canceled mid-Ansible run. | `.github/workflows/staging.yml:28-30`; `.github/workflows/ci.yml:22-24`. | Partly | Workflow change autonomous; owner accepts slower staging feedback. |
| DPL-007 | Medium | Add static workflow lint/test for action pinning, deploy verifier parity, immutable tag/digest evidence, and environment-name consistency. | `.github/workflows/*.yml`; `tests/deploy/*`. | Yes | Deploy/security tests. |
| DPL-008 | Medium | Add SBOM/provenance/container scan as a static/CI hardening path if owner accepts policy. | `.github/workflows/ci.yml`; `Dockerfile`; deploy docs. | Partly | Static setup autonomous; scan fail policy may need owner acceptance. |

### Batch 7 — content, source-governance, and evidence work that is autonomous/supporting

| ID | Severity | Task | Files / evidence | Autonomous? | Verification |
|---|---:|---|---|---|---|
| CONT-001 | High | Truth-sync release board/workplan docs to current strict source-governance pass and current deployment evidence. | `content/workplans/workplans.json`; `docs/release/pilot-rollout-plan.md`; release docs. | Yes | `npm run check:workplans`; `npm run report:source-governance:strict`; live SHA note. |
| CONT-002 | Medium | Guard against future accidental use of the 8 rejected/internal/unreferenced high-risk sources. | `content/generated/source-documents.json` references; source-governance scripts/docs. | Partly | Regression/queue clarity autonomous; future approval/source replacement blocked. |
| CONT-003 | Medium | Execute and record sanitized non-physical/manual-browser scenario evidence for Tasks 377-383 where physical device is not required. | `docs/manual-tests/task-377-*.md` through `task-383-offline-use.md`; result log templates. | Yes/Partly | Browser/manual logs with sanitized data; domain review if changing specialist claims. |
| CONT-004 | Medium | Prepare evidence packets/templates for physical Tasks 384-389 without marking them passed. | `docs/manual-tests/*`; group matrix. | Yes for prep; no for pass | Docs tests; final evidence requires field/physical device/lab. |
| CONT-005 | Low | Refresh `docs/release/current-deployment-status.md` with current exact-SHA checkpoint after verified CI/deploy/live evidence. | `docs/release/current-deployment-status.md:21-39,64-82,92-99`. | Yes | Must cite exact `gh run view` and live `/api/health` proof. |

## Blocked / non-autonomous queue

These were discovered during the audit but should **not** be marked complete by autonomous code work alone:

| ID | Blocker | Why not autonomous |
|---|---|---|
| BLOCK-001 | Task 385 final iPhone Safari pass | Hardware offline scope passed, but manual keyboard, Safari toolbar back/forward, rotation/orientation/safe-area and current-SHA `/kart` action-row physical re-check require owner/device interaction. |
| BLOCK-002 | Task 386 Android Chrome | Requires physical Android or real-device lab evidence. |
| BLOCK-003 | Task 387 install-to-home-screen / standalone launch | Requires OS-level installed PWA screenshots/evidence. |
| BLOCK-004 | Task 388 low-connectivity/cellular/captive-portal | Requires physical/network lab evidence beyond automated hard-offline Chromium. |
| BLOCK-005 | Task 389 two-build update-after-offline final pass | Requires staged Build A/B and real device/lab evidence; autonomous Chromium drill is support only. |
| BLOCK-006 | Task 384 rain/gloves/darkness/stress | Requires real field-condition observations. |
| BLOCK-007 | GitHub branch/environment governance | Owner/admin decision on admin enforcement, PR review, environment protection, deploy branches, and secret scoping. |
| BLOCK-008 | Production rollback drill/acceptance | Needs production maintenance decision or explicit accepted caveat. |
| BLOCK-009 | Production digest-only deployment and `latest` policy | Agent can prepare plumbing/tests; owner should approve operational recovery semantics. |
| BLOCK-010 | Blue/green/canary deployment adoption | Production topology/availability decision. |
| BLOCK-011 | `staging.innsats.reidar.tech` DNS/TLS | Owner/admin infrastructure change unless nip.io fallback is accepted. |
| BLOCK-012 | Future use of rejected/internal sources | Source-owner/domain approval or public replacement needed before re-reference. |
| BLOCK-013 | Context coordinate precision and retention deletion semantics | Product/privacy owner should decide acceptable behavior before changing user-visible/destructive semantics. |

## Positive findings not to redo

- Exact SHA `f279419...` is CI/deploy/live verified: `gh run view 27079193198` completed success and live `/api/health.version` matches.
- Strict source governance is clean: 53/53 referenced sources pilot-approved; 0 pilot blockers.
- Current generated artifacts pass `check:generated`; stale-content report is clean for 2026-06-07.
- Vitest suite is large and currently green after clean build path: 691 tests listed/passed in latest controller run.
- Production Playwright E2E is green: 37/37.
- High/critical dependency audit gate passes; remaining advisories are moderate Next/PostCSS with no fix available at audit time.
- No tracked `TODO`, `FIXME`, `HACK`, `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` found in scoped source during architecture audit.
- Mission/checklist/field-log/RUH/welfare text PII guards and context API query guards are materially improved versus the prior review.

## Suggested first autonomous sprint

If the next step is execution, start with these because they are high-value, independent enough, and locally verifiable:

1. `AUT-001` clean build path.
2. `AUT-003` + `AUT-005` release/source truth and stale tilfluktsrom copy.
3. `SEC-001` + `SEC-002` + `SEC-003` local data integrity.
4. `PWA-001` generated-route `_next` asset precache.
5. `DPL-001` + `DPL-002` action/toolchain pinning.

Use isolated worktrees or serialized edits for hotspot files. Do not let parallel agents write the same files (`package.json`, `.github/workflows/ci.yml`, `public/sw.js`, `lib/local-data/local-data.ts`, `components/offline-map-panel.tsx`, `content/workplans/workplans.json`) at the same time.
