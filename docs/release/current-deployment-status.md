# Deployment status and verification notes

Updated: 2026-06-04T10:10:00Z

## How to verify the current production SHA

Do not treat this markdown file as the source of the current live SHA. Every docs-only status commit also creates a new Git commit, runs CI/CD, and deploys a new immutable image. The source of truth for what is live is the public health endpoint plus the completed GitHub Actions run for that exact SHA.

Use:

```bash
git rev-parse origin/main
curl -fsS https://innsats.reidar.tech/api/health
gh run list --commit "$(git rev-parse origin/main)" --limit 5 \
  --json databaseId,status,conclusion,headSha,url
```

The health response must return `status=healthy`, `nodeEnv=production`, and `version` equal to the SHA being claimed.

## Last audited application-code baseline

The last non-doc audit/remediation baseline was:

- Application-code SHA: `e259b39692b48601a7069fe3fbefad5fe74989c5`
- GitHub Actions run: https://github.com/Reedtrullz/Innsats-appen/actions/runs/26943809255
- GHCR image tag: `ghcr.io/reedtrullz/innsats-appen:e259b39692b4`
- Live health at 2026-06-04T09:58:17Z returned `status=healthy`, `nodeEnv=production`, and `version=e259b39692b48601a7069fe3fbefad5fe74989c5`.

That run completed with conclusion `success` for all deploy-chain jobs:

- `Automatic checks`: high/critical npm audit, content build, TypeScript, ESLint, Vitest, production build, Playwright Chromium install, mobile JavaScript performance budget, Lighthouse mobile budget, and Playwright production smoke/E2E.
- `Build and push GHCR image`: published immutable SHA image and `latest`.
- `Deploy to VPS with Ansible`: deployed the immutable image and verified the public health endpoint returned the exact SHA.

A later docs/status commit `fb82f34c6769d116004fc380bea8e4b5cb039646` also completed CI/CD successfully in run `26945029772`. Future docs-only commits may supersede that SHA while leaving the application-code baseline above unchanged.

## Local validation performed for the docs/status update

Before committing the docs/status update, this local gate passed:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npm run check:ci
```

The local gate included `build:content`, `typecheck`, `lint`, 64 Vitest files / 353 tests, production Next build, 27 Playwright production E2E tests, route JS budget, and Lighthouse mobile budget.

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

The production app can be healthy while broader pilot/go decision remains blocked until staging or physical/real-device evidence exists for these five tasks.

## Boundary reminders

- MVP remains local-browser/offline-first: no auth, backend sync, push, live tracking, central incident database, patient/persondata workflow, or official command-system integration.
- Public stale-content reports and manual-test evidence must not expose owner/reviewer names, real incidents, private positions, patient data, secrets, or API keys.
- Do not use `latest` as release evidence; use immutable SHA tags and exact health/version checks.
