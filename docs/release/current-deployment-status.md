# Current deployment status

Updated: 2026-06-04T09:58:17Z

## Production

- Public URL: https://innsats.reidar.tech
- Health endpoint: https://innsats.reidar.tech/api/health
- GitHub repository: https://github.com/Reedtrullz/Innsats-appen
- Current verified production SHA: `e259b39692b48601a7069fe3fbefad5fe74989c5`
- GitHub Actions run: https://github.com/Reedtrullz/Innsats-appen/actions/runs/26943809255
- GHCR image tag: `ghcr.io/reedtrullz/innsats-appen:e259b39692b4`

Live health check at 2026-06-04T09:58:17Z returned:

```json
{"status":"healthy","app":"beredskapsboka","version":"e259b39692b48601a7069fe3fbefad5fe74989c5","nodeEnv":"production","timestamp":"2026-06-04T09:58:17.953Z"}
```

## Verified gates for this SHA

GitHub Actions run `26943809255` completed with conclusion `success` for all deploy-chain jobs:

- `Automatic checks`: high/critical npm audit, content build, TypeScript, ESLint, Vitest, production build, Playwright Chromium install, mobile JavaScript performance budget, Lighthouse mobile budget, and Playwright production smoke/E2E.
- `Build and push GHCR image`: published immutable SHA image and `latest`.
- `Deploy to VPS with Ansible`: deployed the immutable image and verified the public health endpoint returned the exact SHA.

Local pre-push gate for the final header-overflow fix also passed:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npm run check:ci
```

The local gate included `build:content`, `typecheck`, `lint`, 64 Vitest files / 352 tests, production Next build, 27 Playwright production E2E tests, route JS budget, and Lighthouse mobile budget.

## Workplan / release-board truthfulness

The release workplan ledger is intentionally not all green:

- Total backlog tasks: 417
- Completed: 412
- Blocked: 5

Blocked tasks requiring evidence that cannot be produced by local Chromium emulation alone:

- Task 385: Run real-device testing on iPhone Safari.
- Task 386: Run real-device testing on Android Chrome.
- Task 387: Run install-to-home-screen testing.
- Task 388: Run low-connectivity testing.
- Task 389: Run update-after-offline testing.

The production app is deployed and healthy, but broader pilot/go decision still requires staging or physical/real-device evidence for the five blocked tasks.

## Boundary reminders

- MVP remains local-browser/offline-first: no auth, backend sync, push, live tracking, central incident database, patient/persondata workflow, or official command-system integration.
- Public stale-content reports and manual-test evidence must not expose owner/reviewer names, real incidents, private positions, patient data, secrets, or API keys.
- Do not use `latest` as release evidence; use immutable SHA tags and exact health/version checks.
