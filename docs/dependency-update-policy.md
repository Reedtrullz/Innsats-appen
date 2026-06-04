# Dependency update policy

Beredskapsboka is a privacy-preserving offline/PWA MVP. Dependency updates must protect that boundary first: no backend sync, auth, persondata, patient data, private-location handling, or official command-system claims may be introduced as part of routine dependency work.

## Cadence

- Review dependency updates at least monthly and before each planned production release.
- Apply security patches sooner when `npm audit --audit-level=high` reports high/critical issues or when a vendor advisory affects runtime PWA/offline behavior.
- Keep Node pinned to the CI/runtime major in `.github/workflows/ci.yml` and `package.json` engines. Current policy target: Node 22.

## Allowed routine updates

- Patch/minor updates for existing dependencies are acceptable when the lockfile diff is reviewed and the full CI gate passes.
- Dev-tool patch/minor updates are acceptable when they do not change generated production output or artifact retention semantics unexpectedly.
- Type-only package updates are acceptable when `npm run typecheck` and tests pass.

## Updates requiring explicit review

Require a short PR note/ADR-style justification before merging:

- Any major version update.
- Any new runtime dependency.
- Any dependency that can affect service-worker registration, cache semantics, offline generated content, local storage, encryption/hashing, maps, or external data fetching.
- Any package that materially increases client JavaScript. Run `npm run build:app && npm run perf:budget && npm run perf:lighthouse` and include the budget output.
- Any update that expands telemetry, analytics, network calls, cloud storage, auth, sync, or user-identifying behavior.

## Not allowed without product/security sign-off

- Unreviewed heavy dependencies for UI widgets or convenience helpers.
- Libraries that require server-side user accounts, centralized sync, or background upload of local app data.
- Dependencies that collect telemetry by default unless telemetry is disabled and documented.
- Updates that weaken the MVP privacy copy or imply official command-system authority.

## Required checks

For normal dependency PRs, run:

```sh
source ~/.nvm/nvm.sh && nvm use 22
npm ci
npm run audit:ci
npm run build:content
npm run typecheck
npm run lint
npm run test
npm run build:app
npm run perf:budget
npm run perf:lighthouse
```

For changes touching offline/PWA behavior, also run Playwright E2E (`npm run e2e:prod` or the targeted offline specs in production mode) and retain Playwright traces/screenshots on failure.

## Lockfile review checklist

- Confirm only expected packages changed in `package-lock.json`.
- Check for new transitive packages with telemetry, native install scripts, or broad network capabilities.
- Confirm package licenses remain compatible with the project.
- Confirm no package adds a backend, sync, auth, or persondata workflow.
- Confirm bundle/performance budget still passes on mobile thresholds.

## Emergency security patch process

1. Patch the minimum affected dependency range.
2. Run audit, typecheck, lint, unit tests, content build, production build, and performance budget.
3. If an E2E gate is blocked by the vulnerability itself or by upstream breakage, document the blocker and the manual verification performed.
4. Prefer temporary feature disablement over adding new backend/user-data behavior.
