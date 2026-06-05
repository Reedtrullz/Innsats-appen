# Beredskapsboka / Innsats-appen

Mobile-first, offline-capable PWA for source-backed Sivilforsvaret decision support.

- Repository: https://github.com/Reedtrullz/Innsats-appen
- Production domain: https://innsats.reidar.tech
- Current live SHA source of truth: `curl -fsS https://innsats.reidar.tech/api/health`; the last audited application-code baseline is `e259b39692b48601a7069fe3fbefad5fe74989c5` via GitHub Actions run `26943809255`. See `docs/release/current-deployment-status.md`.
- GHCR image namespace: `ghcr.io/reedtrullz/innsats-appen`

The app is a local MVP: generated content, mission dashboards, checklist runs, 5-punktsordre exports, sambandsplan exports, and release-readiness board state stay in the browser unless the user manually copies them out.

## Requirements

- Node 22.x. On Reidar's machine, use:
  ```bash
  source ~/.nvm/nvm.sh && nvm use 22
  ```
- npm 10.x via Node 22.
- Playwright browsers installed for E2E checks (`npx playwright install chromium` if missing).
- Optional for live MET weather context: set `MET_USER_AGENT` to a real contact-bearing user agent before production use.

## Source of truth

The Obsidian knowledge bank is the source of source extracts and project notes. Configure it with:

```text
OBSIDIAN_BEREDSKAPSBOKA_PATH=/path/to/your/Obsidian/Beredskapsboka
```

Curated MVP content lives in `content/curated/*.yaml`. Build scripts compile it to `content/generated/*` and mirror browser-readable JSON to `public/generated-content/*`. The sanitized `content/generated/source-documents.json` snapshot and its tracked `content/generated/source-snapshot-metadata.json` sidecar are committed so clean GitHub Actions/Docker runners can build and test without access to the private Obsidian vault while still preserving source-snapshot freshness metadata; refresh both with `npm run build:content` and rely on the privacy tests before committing changes.

Workplans live in `.hermes/plans/*.md` when developing locally. `npm run sync:workplans` extracts safe metadata/task headings into `content/workplans/workplans.json`, mirrors `content/generated/workplans.json` + `public/generated-content/workplans.json`, and writes `20-Workplans.md` in the Obsidian project folder when the vault is available. `/release` fetches the generated local workplan artifact from `/generated-content/workplans.json` and merges it into the browser-local release board while preserving local status overrides; dette er en statisk artefakt uten backend-synk.

## App commands

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm install
npm run dev              # local Next dev server
npm run build:content    # import Obsidian, compile curated YAML, build search index, generate workplan artifacts, validate graph/artifacts
npm run sync:workplans    # generate safe .hermes/plans metadata into Obsidian + generated local workplan artifacts for /release
npm run typecheck        # TypeScript gate
npm run test             # Vitest unit/component/integration/security/content tests
npm run build            # content build + production Next build
npm run e2e              # build + production-mode Playwright E2E (service worker/offline checks)
npm run e2e:prod         # same build + production-mode E2E alias; set PLAYWRIGHT_PORT=3007 if local port 3000 is busy
npm run e2e:prod:no-build  # production-mode Playwright E2E against an existing production build
npm run check            # alias for check:ci
npm run check:ci         # build content + typecheck + lint + Vitest + production build + production E2E + perf budgets
```

Useful targeted gates:

```bash
npm run test -- tests/content/coverage.test.ts
npm run test -- tests/security/privacy-boundaries.test.ts
npm run e2e:prod -- tests/e2e/core-mobile-journey.spec.ts
npm run e2e:prod -- tests/e2e/offline.spec.ts
```

## Current app surfaces

- `/`, `/sok`, `/hurtigkort`, `/for`, `/under`, `/etter`, `/kilder`, and `/moduler/*` expose the operational command entry point, local/offline search, source-backed cards, phase pages, source views, and specialist modules.
- `/oppdrag/ny` creates a local mission context; `/oppdrag` shows the active mission dashboard with situation, next recommended action, recommended cards, matching checklist progress, map/log summaries, after-action/oppdragsmappe exports, order/comms export tools, and cached/stale public context signals.
- `/kart`, `/under`, Feltmodus quick actions and `/oppdrag` support the local-only Kart → Logg → Oppdrag → Etterrapport → Oppdragsmappe workflow documented in `docs/map-log-fieldmode-workflow.md`. MapLibre/PMTiles packages are optional local assets; the app must still work with the schematic fallback and must not fetch external tile-provider URLs at runtime.
- `/mer` keeps secondary support surfaces together: sources, learning/modules, map, field mode, privacy, device-data controls, and admin links.
- `/release` is a standalone release-readiness board for launch planning, stage gates, active work, generated local workplan artifacts, risk attention, local JSON export, and launch-material links. It intentionally avoids the operational app shell and has ingen backend-synk.

## Runbook

1. Activate Node 22.
2. Build content with `npm run build:content` after any content edit.
3. Run `npm run test` and `npm run typecheck` before committing.
4. Run `npm run build` before production/mobile/offline verification.
5. Run `npm run e2e:prod` to prove the production shell, service worker, offline flow, local mission storage, privacy reset, and mobile journey.
6. Before claiming pilot-ready, run `npm run check:ci`, verify the GitHub Actions run for the exact SHA is `completed/success`, verify production `/api/health` returns the same SHA, and keep Tasks 385–389 blocked until real-device/staging evidence exists.

## Deployment

An Ansible/GHCR deploy setup for `https://innsats.reidar.tech` lives in `deploy/`.

Automatic CI/CD is configured in `.github/workflows/ci.yml`:

1. Pull requests and pushes to `main` run automatic checks: high/critical npm audit, TypeScript, ESLint, Vitest, production build, and Playwright production E2E.
2. Only after those checks pass on `main`, GitHub Actions builds and pushes `ghcr.io/reedtrullz/innsats-appen:<12-char-sha>` plus `:latest`.
3. The deploy job then runs `deploy/playbook.yml` over SSH and verifies `https://innsats.reidar.tech/api/health` returns the exact pushed commit SHA.

The deploy workflow requires the repository secret `VPS_SSH_PRIVATE_KEY` containing the private key for the `deploy@198.23.137.16` user.

Manual local deploy is still available:

```bash
./deploy/publish-and-deploy.sh
```

See `deploy/README.md` for prerequisites, GHCR login notes, and VPS verification commands.

## MVP boundaries

See `docs/mvp-boundaries.md` for the full boundary policy. In short: no login, no live tracking, no push, no patient/persondata, no central incident database, no official command-system integration, and no private/skjermede tilfluktsrom data in the MVP.

## Content editing

See `docs/content-editing.md` for how to add cards, source documents, warnings/status, and generated-content verification.
