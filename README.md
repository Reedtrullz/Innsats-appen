# Beredskapsboka / Innsats-appen

Mobile-first, offline-capable PWA for source-backed Sivilforsvaret decision support.

- Repository: https://github.com/Reedtrullz/Innsats-appen
- Production domain prepared for deploy: https://innsats.reidar.tech
- GHCR image namespace: `ghcr.io/reedtrullz/innsats-appen`

The app is a local MVP: generated content, mission notes, checklist runs, 5-punktsordre exports, and sambandsplan exports stay in the browser unless the user manually copies them out.

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

Curated MVP content lives in `content/curated/*.yaml`. Build scripts compile it to `content/generated/*` and mirror browser-readable JSON to `public/generated-content/*`.

## App commands

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm install
npm run dev              # local Next dev server
npm run build:content    # import Obsidian, compile curated YAML, build search index, validate graph/artifacts
npm run typecheck        # TypeScript gate
npm run test             # Vitest unit/component/integration/security/content tests
npm run build            # content build + production Next build
npm run e2e              # production-mode Playwright E2E (service worker/offline checks)
npm run e2e:prod         # same production-mode E2E alias
npm run check            # typecheck + lint + Vitest + production build
```

Useful targeted gates:

```bash
npm run test -- tests/content/coverage.test.ts
npm run test -- tests/security/privacy-boundaries.test.ts
npm run e2e:prod -- tests/e2e/core-mobile-journey.spec.ts
npm run e2e:prod -- tests/e2e/offline.spec.ts
```

## Runbook

1. Activate Node 22.
2. Build content with `npm run build:content` after any content edit.
3. Run `npm run test` and `npm run typecheck` before committing.
4. Run `npm run build` before production/mobile/offline verification.
5. Run `npm run e2e:prod` to prove the production shell, service worker, offline flow, local mission storage, privacy reset, and mobile journey.
6. Do not claim demo-ready until Task 44's full integrated gate passes and any changed files are committed deliberately.

## Deployment

An Ansible/GHCR deploy setup for `https://innsats.reidar.tech` lives in `deploy/`.

```bash
./deploy/publish-and-deploy.sh
```

See `deploy/README.md` for prerequisites, GHCR login notes, and VPS verification commands.

## MVP boundaries

See `docs/mvp-boundaries.md` for the full boundary policy. In short: no login, no live tracking, no push, no patient/persondata, no central incident database, no official command-system integration, and no private/skjermede tilfluktsrom data in the MVP.

## Content editing

See `docs/content-editing.md` for how to add cards, source documents, warnings/status, and generated-content verification.
