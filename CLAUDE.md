# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Beredskapsboka / Innsats-appen is an **offline-first, mobile field-support PWA** for Norwegian Civil Defence (Sivilforsvaret) decision support before/during/after incidents. It compiles a curated Obsidian knowledge bank into source-backed action cards, local missions, checklists, and a map/log/after-action workflow. Next.js 16 (App Router) + React 19 + TypeScript, deployed as a standalone Docker image to a VPS via GHCR.

The app is **decision support only** — no login, no backend, no patient/persondata. All user data lives in the browser (IndexedDB) and never leaves the device unless manually exported. See `docs/mvp-boundaries.md`.

## Setup

Node 22.x required. On Reidar's machine: `source ~/.nvm/nvm.sh && nvm use 22` before any npm command. Path alias `@/*` maps to repo root.

## Commands

```bash
npm run dev                 # Next dev server
npm run build:content       # REQUIRED after any content edit — see Content pipeline below
npm run build               # build:content + build:sw + production Next build
npm run typecheck           # tsc --noEmit
npm run lint                # eslint, zero-warnings gate
npm run test                # Vitest (unit/component/integration/security/content)
npm run e2e:prod            # build + production-mode Playwright (service worker/offline checks)
npm run e2e:prod:no-build   # Playwright against an existing production build
npm run check:ci            # full release gate (audit, content, typecheck, lint, test, build, e2e, perf budgets)
```

Run a single test:
```bash
npm run test -- tests/security/privacy-boundaries.test.ts        # one Vitest file
npm run e2e:prod -- tests/e2e/offline.spec.ts                    # one Playwright spec (needs prod build)
```
E2E **requires a production build** (`PLAYWRIGHT_PROD=1`); set `PLAYWRIGHT_PORT=3007` if port 3000 is busy. `e2e:prod:no-build` reuses the existing `.next` build to iterate faster.

## Content pipeline (critical)

Content is **generated, not hand-edited at runtime**. The flow:

1. Source of truth: a private Obsidian vault (`OBSIDIAN_BEREDSKAPSBOKA_PATH`) + curated YAML in `content/curated/*.yaml`.
2. `npm run build:content` runs: `import-obsidian` → `compile-curated` → `build-search-index` (minisearch) → `sync-workplans` → `validate-content`.
3. Output lands in `content/generated/*` and is mirrored to `public/generated-content/*` for the browser.
4. `lib/content/load-content.ts` reads `content/generated/*` at build/server time and **validates every record against Zod schemas** (`lib/content/schemas.ts`) — an empty or malformed generated file throws.

The sanitized `content/generated/source-documents.json` + its `source-snapshot-metadata.json` sidecar are **committed** so clean CI/Docker runners can build without the private vault. `npm run check:generated` fails if these drift. After content edits: run `build:content`, then commit the regenerated files.

## Architecture

**Routing.** `app/(app)/` is the operational shell (wrapped by `components/app-shell.tsx`); routes are Norwegian (`/for`, `/under`, `/etter`, `/oppdrag`, `/kart`, `/hurtigkort`, `/moduler/*`, `/mer`). `/release` is a **standalone** release-readiness board that deliberately avoids the app shell and has no backend sync. `app/api/context/*` are the only server routes — read-only proxies for external context (weather/hazards/geocode) that strip geometry before returning.

**`lib/` is the domain core, split by concern:**
- `lib/content/` — load/validate generated content, search, taxonomy, source governance.
- `lib/mission/` — local mission state. `local-store.ts` is the **IndexedDB layer** (`idb`, DB `beredskapsboka-local`); missions/checklist runs are sanitized (geometry stripped) on read/write. Plus after-action reports, field log, order/comms export.
- `lib/maps/` — MapLibre + PMTiles offline map packages, with a schematic fallback. **Never fetch external tile-provider URLs at runtime** — CSP `connect-src 'self'` enforces this.
- `lib/offline/` — service-worker metadata + static app-shell route list. `scripts/build-service-worker.ts` injects a generated metadata block into `public/sw.js`; `npm run check:sw` verifies it matches. The CSP in `next.config.ts` is strict and intentional.
- `lib/privacy/` — local profile + sensitive-text scrubbing. `lib/integrations/` — external context source contracts, rate limiting, route guards.

**Data flow:** generated JSON (server, Zod-validated) → React Server Components → client components hydrate and read/write IndexedDB via `lib/mission`. There is no shared server state between users.

## Constraints that drive the design

These are enforced by tests (`tests/security/`, `tests/privacy/`) and CI — respect them:
- **Privacy boundary:** no persondata leaves the device; exports are sanitized; geometry is stripped from stored signals.
- **Offline-first:** the app must work with the schematic map fallback and no network; service worker caches the app shell.
- **No external runtime fetches** beyond the `app/api/context/*` proxies; strict CSP.
- **MVP boundaries** (`docs/mvp-boundaries.md`): no login, backend sync, live tracking, push, or real Nødnett/samband identifiers.

## Release & deploy

CI (`.github/workflows/ci.yml`) runs `check:ci` on PRs and `main`; only on green `main` does it build/push `ghcr.io/reedtrullz/innsats-appen:<sha>` and deploy via Ansible (`deploy/`) over SSH, verifying `https://innsats.reidar.tech/api/health` returns the exact SHA. The live SHA — not any markdown file — is the source of truth for what is deployed. See `RELEASE_CHECKLIST.md` and `docs/release/`.
