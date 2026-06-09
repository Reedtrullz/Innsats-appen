# Release Checklist

This checklist captures the MVP pilot release gates for Beredskapsboka.

## Local Verification Commands

Run these before tagging or handing off a pilot build:

```bash
npm run typecheck
npm run lint
npm run test
npm run build:app
npm run e2e:prod:no-build
```

## Expected CI Workflow

GitHub Actions should run `.github/workflows/ci.yml` on:

- `push` to `main`
- `pull_request` targeting `main`
- manual `workflow_dispatch`

The release-confidence job is `Automatic checks`. It is expected to run repository audits, workplan checks, content/source checks, generated artifact guards, typecheck, lint, tests, app build, perf checks, and production E2E smoke tests.

## Pilot Ready Means

- The app builds and passes local typecheck, lint, unit/component tests, and production E2E tests.
- Oppdrag guided workflows and export review behavior are covered by regression tests.
- Source-backed content checks and generated artifact guards pass.
- Local-only storage, privacy guards, export flows, checklist flows, and hash navigation remain intact.
- Offline/PWA behavior is smoke-tested by the production E2E suite.

## Known Non-Goals

- Not an official command system.
- Local-only MVP; no central incident database.
- No personal data or patient/persondata handling.
- Not field-certified.
- No login or official command-system integration.
