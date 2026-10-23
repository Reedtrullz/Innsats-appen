# Beredskapsboka / Innsats-appen

Offline-first, mobile field-support PWA for source-backed Norwegian Civil Defence (Sivilforsvaret) decision support before, during and after incidents.

- Repository: https://github.com/Reedtrullz/Innsats-appen
- Production domain: https://innsats.reidar.tech
- Production runtime: Cloudflare Worker `beredskapsboka-preview` with private R2 map packages
- Current live SHA source of truth: `curl -fsS https://innsats.reidar.tech/api/health` and the completed GitHub Actions run for that exact SHA. Do not treat a markdown file as the permanent live version; docs-only commits also deploy immutable images. See `docs/release/current-deployment-status.md`.

## What this is

Beredskapsboka/Innsats-appen turns a curated Obsidian knowledge bank into a local/offline operational support app for Sivilforsvaret-style field work. It is designed for quick mobile use under imperfect connectivity, with source-backed action cards, local mission context, checklists, map/log notes, after-action exports and privacy-safe local reset.

The app is decision support only. It is not an official command, order, journal, tracking, alerting or archive system. Local browser data stays on the device unless the user manually exports or copies it.

## Current app capabilities

- Source-backed quick cards, search, phase pages and specialist modules for før/under/etter innsats.
- Local mission dashboard with active phase, role/scenario context, next recommended actions, checklist progress, order/comms export tools, public context signals and release-safe local reset.
- Kart → Logg → Oppdrag → Etterrapport → Oppdragsmappe workflow:
  - optional app-local MapLibre/PMTiles packages with schematic fallback,
  - mission-scoped markers, sectors/teiger and GeoJSON/SVG export,
  - explicit `Logg herfra` actions and active-mission field-log summaries,
  - sanitized after-action report and mission-folder export metadata.
- Feltmodus/glove-mode quick actions for map, log, active mission, checklist, 5-punktsordre, sambandsplan, status export and search.
- Offline-first PWA shell with service-worker/cache verification and strict client CSP/no external runtime tile-provider fetches.
- Generated workplan/release metadata for the `/release` board, sourced from local `.hermes/plans` and mirrored into safe generated JSON.

## GitHub repository metadata

Recommended GitHub About description:

```text
Offline-first Norwegian Civil Defence field-support PWA with local missions, checklists, map/log workflow and privacy-safe exports.
```

Recommended topics/tags:

```text
pwa, offline-first, emergency-preparedness, civil-defense, sivilforsvaret, incident-response, field-operations, nextjs, typescript, service-worker, pmtiles, maplibre, privacy-first, norwegian, preparedness, checklists, field-logging
```

## Requirements

- Node 22.x. On Reidar's machine, use:
  ```bash
  source ~/.nvm/nvm.sh && nvm use 22
  ```
- pnpm 10.34.5 via Corepack (`corepack enable`; version pinned by `packageManager` in package.json).
- Playwright browsers installed for E2E checks (`pnpm exec playwright install chromium` if missing).
- Optional for live MET weather context: set `MET_USER_AGENT` to a real contact-bearing user agent before production use.

## Source of truth

The Obsidian knowledge bank is the source of source extracts and project notes. Configure it with:

```text
OBSIDIAN_BEREDSKAPSBOKA_PATH=/path/to/your/Obsidian/Beredskapsboka
```

Curated MVP content lives in `content/curated/*.yaml`. Build scripts compile it to `content/generated/*` and mirror browser-readable JSON to `public/generated-content/*`. The sanitized `content/generated/source-documents.json` snapshot and its tracked `content/generated/source-snapshot-metadata.json` sidecar are committed so clean GitHub Actions/Docker runners can build and test without access to the private Obsidian vault while still preserving source-snapshot freshness metadata; refresh both with `pnpm run build:content` and rely on the privacy tests before committing changes.

Workplans live in `.hermes/plans/*.md` when developing locally. `pnpm run sync:workplans` extracts safe metadata/task headings into `content/workplans/workplans.json`, mirrors `content/generated/workplans.json` + `public/generated-content/workplans.json`, and writes `20-Workplans.md` in the Obsidian project folder when the vault is available. `/release` fetches the generated local workplan artifact from `/generated-content/workplans.json` and merges it into the browser-local release board while preserving local status overrides; dette er en statisk artefakt uten backend-synk.

## App commands

```bash
source ~/.nvm/nvm.sh && nvm use 22
corepack enable
pnpm install
pnpm run dev                # local Next dev server
pnpm run build:content      # import Obsidian, compile curated YAML, build search index, generate workplan artifacts, validate graph/artifacts
pnpm run sync:workplans     # generate safe .hermes/plans metadata into Obsidian + generated local workplan artifacts for /release
pnpm run typecheck          # TypeScript gate
pnpm run test               # Vitest unit/component/integration/security/content tests
pnpm run build              # content build + production Next build
pnpm run e2e                # build + production-mode Playwright E2E (service worker/offline checks)
pnpm run e2e:prod           # same build + production-mode E2E alias; set PLAYWRIGHT_PORT=3007 if local port 3000 is busy
pnpm run e2e:prod:no-build  # production-mode Playwright E2E against an existing production build
pnpm run check              # alias for check:ci
pnpm run check:ci           # build content + typecheck + lint + Vitest + production build + production E2E + perf budgets
```

Useful targeted gates:

```bash
pnpm run test -- tests/content/coverage.test.ts
pnpm run test -- tests/security/privacy-boundaries.test.ts
pnpm run test -- tests/maps/maplibre-runtime.test.ts
pnpm run e2e:prod -- tests/e2e/core-mobile-journey.spec.ts
pnpm run e2e:prod -- tests/e2e/offline.spec.ts
pnpm run e2e:prod -- tests/e2e/map-log-mission-flow.spec.ts tests/e2e/offline-map.spec.ts
```

## Current app surfaces

- `/`, `/sok`, `/hurtigkort`, `/for`, `/under`, `/etter`, `/kilder`, and `/moduler/*` expose the operational command entry point, local/offline search, source-backed cards, phase pages, source views, and specialist modules.
- `/oppdrag/ny` creates a local mission context; `/oppdrag` shows the active mission dashboard with situation, next recommended action, recommended cards, matching checklist progress, map/log summaries, after-action/oppdragsmappe exports, order/comms export tools, and cached/stale public context signals.
- `/kart`, `/under`, Feltmodus quick actions and `/oppdrag` support the local-only Kart → Logg → Oppdrag → Etterrapport → Oppdragsmappe workflow documented in `docs/map-log-fieldmode-workflow.md`. MapLibre/PMTiles packages are optional local assets; the app must still work with the schematic fallback and must not fetch external tile-provider URLs at runtime.
- `/mer` keeps secondary support surfaces together: sources, learning/modules, map, field mode, privacy, device-data controls, and admin links.
- `/release` is a standalone release-readiness board for launch planning, stage gates, active work, generated local workplan artifacts, risk attention, local JSON export, and launch-material links. It intentionally avoids the operational app shell and has ingen backend-synk.

## Runbook

1. Activate Node 22.
2. Build content with `pnpm run build:content` after any content edit.
3. Run `pnpm run test` and `pnpm run typecheck` before committing.
4. Run `pnpm run build` before production/mobile/offline verification.
5. Run `pnpm run e2e:prod` to prove the production shell, service worker, offline flow, local mission storage, privacy reset, and mobile journey.
6. Before claiming pilot-ready, run `pnpm run check:ci`, verify the GitHub Actions run for the exact SHA is `completed/success`, verify production `/api/health` returns the same SHA, and keep real-device/staging evidence blockers explicit until they are actually tested.

## Deployment

`https://innsats.reidar.tech` runs on Cloudflare Workers. The old Ansible/GHCR setup in `deploy/` is reserved for an explicit VPS rollback.

Automatic CI/CD is configured in `.github/workflows/ci.yml`:

1. Pull requests and pushes to `main` run automatic checks: high/critical pnpm audit, workplan freshness, content build, TypeScript, ESLint, Vitest, production build, mobile JS budget, Lighthouse mobile budget, and Playwright production E2E.
2. With `INNSATS_CLOUDFLARE_DEPLOY_ENABLED=1`, passing `main` checks build and deploy the Worker, then verify the exact commit SHA and Worker version at the public health endpoint. The `production` environment holds `CLOUDFLARE_API_TOKEN`.
3. Keep `INNSATS_VPS_DEPLOY_ENABLED=0`. VPS deployment requires an explicit rollback flag and restored VPS routing.

Manual Worker deployment is available with an authenticated Wrangler session:

```bash
pnpm run build:content && pnpm run build:sw && pnpm run deploy:vinext
```

See `deploy/README.md` for the VPS rollback path.

### Cloudflare Worker

`pnpm run build:content && pnpm run build:sw && pnpm run build:vinext` builds the Worker. The build pre-renders public pages into static assets; only `/api/health`, the three `/api/context/*` routes, and approved PMTiles range requests invoke the Worker. `pnpm run start:vinext` runs it locally, and `pnpm run deploy:vinext` deploys `beredskapsboka-preview` at its `workers.dev` URL, `innsats-canary.reidar.tech`, and the production custom domain. `/api/health` reports the built Git SHA and immutable Cloudflare Worker version ID. Content using Next's `revalidate` setting is refreshed by a new static build and deploy, not hourly at request time.

The Worker serves the two PMTiles archives from the private `beredskapsboka-maps` R2 bucket at the existing `/map-packages/` paths. Upload the SHA-256-verified release files under the `map-packages/` key prefix before deploying. `build:vinext` removes the archive copies from `dist/client`; the rollback Next/VPS build still uses the files under `public/`.

## MVP boundaries

See `docs/mvp-boundaries.md` for the full boundary policy. In short: no login, no backend mission sync, no live tracking, no push notifications, no patient/persondata, no central incident database, no official command-system integration, no real Nødnett/samband identifiers, and no private/skjermede tilfluktsrom data in the MVP.

## Content editing

See `docs/content-editing.md` for how to add cards, source documents, warnings/status, and generated-content verification.
