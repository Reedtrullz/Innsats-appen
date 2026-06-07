# Deployment status and verification notes

Updated: 2026-06-07T11:53:07Z

## How to verify the current production SHA

Do not treat this markdown file as the source of the current live SHA. Every docs-only status commit also creates a new Git commit, runs CI/CD, and deploys a new immutable image. The source of truth for what is live is the public health endpoint plus the completed GitHub Actions run for that exact SHA.

Use:

```bash
git fetch origin main --quiet
git rev-parse origin/main
curl -fsS https://innsats.reidar.tech/api/health
gh run list --commit "$(git rev-parse origin/main)" --limit 5 \
  --json databaseId,status,conclusion,headSha,url
```

The health response must return `status=healthy`, `nodeEnv=production`, and `version` equal to the SHA being claimed. The matching GitHub Actions run must be `completed/success` for the same `headSha` before a change is described as deployed.

## Audit hardening deployment checkpoint — 2026-06-06

The latest audit-hardening application/documentation checkpoint verified before this ledger update was:

- Verified SHA: `72d5d33836c10789aa05d84e93e52dfbfd4e96b2`
- GitHub Actions run: https://github.com/Reedtrullz/Innsats-appen/actions/runs/27064109045
- Workflow: `CI / Deploy`
- Run result: `status=completed`, `conclusion=success`, `headSha=72d5d33836c10789aa05d84e93e52dfbfd4e96b2`
- Successful jobs: `Automatic checks`, `Build and push GHCR image`, `Deploy to VPS with Ansible`
- Live health at 2026-06-06T14:10:16Z returned `status=healthy`, `nodeEnv=production`, `version=72d5d33836c10789aa05d84e93e52dfbfd4e96b2`, and `Cache-Control: private, no-store, no-cache, max-age=0`.

Live browser smoke on the same deployment checked:

- `/release`: hydrated release board showed `Ikke pilotklar` with then-current pilot blockers and loaded 12 generated workplans from `/generated-content/workplans.json`. That live-smoke snapshot is historical; use the generated workplan artifact and local gates below for current candidate truth.
- `/kart`: rendered the schematic/offline map surface and local marker/layer controls; no approved PMTiles packages were claimed.
- `/data-pa-enheten`: rendered local-only backup/import privacy copy.
- `/oppdrag`: rendered the local mission surface and local archive boundary copy.

This file is still not the source of truth for the current live SHA. If this documentation/workplan ledger commit is pushed, verify that new exact SHA with the commands above before reporting the final deployed version.

## Last audited application-code baseline

The last non-doc audit/remediation baseline was:

- Application-code SHA: `1a26acbfc6f72152e14906d3ecc04d424275aee4`
- Commit summary: `fix: pass final audit gate for map runtime and direct exports`
- Scope: final Task 22 audit gate for App Router map-runtime budget detection, direct field-log/RUH export scoping, lazy MapLibre/PMTiles loading, and the lazy-view component test wait.

The following docs/workplan snapshot commit then deployed that application-code baseline with the completed operational-map/log workplan ledger:

- Deployed snapshot SHA: `1750a377362c44734dd802be8095ad317957f1c9`
- GitHub Actions run: https://github.com/Reedtrullz/Innsats-appen/actions/runs/27030600338
- GHCR image tag: `ghcr.io/reedtrullz/innsats-appen:1750a377362c`
- Live health at 2026-06-05T17:52:52Z returned `status=healthy`, `nodeEnv=production`, and `version=1750a377362c44734dd802be8095ad317957f1c9`.

That run completed with conclusion `success` for all deploy-chain jobs:

- `Automatic checks`: high/critical npm audit, workplan snapshot freshness, content build, TypeScript, ESLint, Vitest, production build, Playwright Chromium install, mobile JavaScript performance budget, Lighthouse mobile budget, and Playwright production smoke/E2E.
- `Build and push GHCR image`: published immutable SHA image and `latest`.
- `Deploy to VPS with Ansible`: deployed the immutable image and verified the public health endpoint returned the exact SHA.

Future docs-only commits may supersede the deployed snapshot SHA while leaving the application-code baseline above unchanged. Always re-run the commands in the previous section for the current live SHA.

## Local validation performed for the operational map/log/Feltmodus release closeout

Before pilot approval and after every content change, run `npm run report:source-governance:strict` as a regression gate. Strict source-governance gate PASS for the current local candidate: `sourceCount=61`, `referencedSourceCount=53`, `pilotApprovedReferencedSourceCount=53`, `pilotBlockingReferencedSourceCount=0`, and `publicBodyBlockingSourceCount=0`. This removes the stale source-governance blocker only; it does not prove device, staging, DNS, support-owner, CI/deploy, or live exact-SHA readiness.

Before pushing the release closeout, this local gate passed under Node 22:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npm run check:ci
```

The local gate included workplan freshness, content build, map package validation, TypeScript, ESLint, 93 Vitest files / 603 tests, production Next build, 37 Playwright production E2E tests, mobile JavaScript performance budget, and Lighthouse mobile budget.

Additional live verification for `1750a377362c44734dd802be8095ad317957f1c9` checked:

- `https://innsats.reidar.tech/api/health` matched the deployed SHA.
- `/kart` rendered `Offline kart`, `Lokale kartpakker`, and map/log controls.
- `/oppdrag` rendered active-mission dashboard markers after creating temporary browser-local exercise data.
- `/generated-content/workplans.json` reported the operational map/log/Feltmodus workplan as `completed`, `stage=release`, `completedTaskCount=23`, `taskCount=23`.
- Temporary browser-local IndexedDB/localStorage verification data was cleared after the live smoke.

## Workplan / release-board truthfulness

The operational map/log/Feltmodus workplan is complete:

- Workplan: `Operational Map, Logging and Field Mode Deep Integration Implementation Plan`
- Completed tasks: 23/23
- Stage: `release`

Broader pilot/go evidence remains separate from deployment health. A healthy deployed app is not the same as field pilot approval. The following evidence classes must remain explicit until actually tested on target devices/environments:

- iPhone Safari real-device or real-device lab.
- Android Chrome real-device or real-device lab.
- Install-to-home-screen / standalone PWA launch.
- Low-connectivity and offline-update behavior outside local Chromium emulation.
- Staging/rollback ownership and support channel evidence for the chosen pilot group.

## Boundary reminders

- MVP remains local-browser/offline-first: no auth, backend mission sync, push notifications, live tracking, central incident database, patient/persondata workflow, real Nødnett/samband identifiers, or official command-system integration.
- Public stale-content reports, release-board notes and manual-test evidence must not expose owner/reviewer names, real incidents, private positions, patient data, secrets, or API keys.
- Do not use `latest` as release evidence; use immutable SHA tags and exact health/version checks.
