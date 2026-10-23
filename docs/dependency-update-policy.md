# Dependency update policy

Beredskapsboka is a privacy-preserving offline/PWA MVP. Dependency updates must protect that boundary first: no backend sync, auth, persondata, patient data, private-location handling, or official command-system claims may be introduced as part of routine dependency work.

## Cadence

- Review dependency updates at least monthly and before each planned production release.
- Apply security patches sooner when `pnpm audit --audit-level high` reports high/critical issues or when a vendor advisory affects runtime PWA/offline behavior.
- Track non-release-blocking moderate advisories explicitly instead of hiding them. Current snapshot: `docs/release/dependency-advisory-snapshot.md` records GHSA-qx2v-qp2m-jg93 through Next/PostCSS with no fix available; revisit when Next publishes a patched dependency tree.
- Keep Node pinned to the CI/runtime major in `.github/workflows/ci.yml` and `package.json` engines. Current policy target: Node 22.

## Allowed routine updates

- Patch/minor updates for existing dependencies are acceptable when the lockfile diff is reviewed and the full CI gate passes.
- Dev-tool patch/minor updates are acceptable when they do not change generated production output or artifact retention semantics unexpectedly.
- Type-only package updates are acceptable when `pnpm run typecheck` and tests pass.

## Updates requiring explicit review

Require a short PR note/ADR-style justification before merging:

- Any major version update.
- Any new runtime dependency.
- Any dependency that can affect service-worker registration, cache semantics, offline generated content, local storage, encryption/hashing, maps, or external data fetching.
- Any package that materially increases client JavaScript. Run `pnpm run build:app && pnpm run perf:budget && pnpm run perf:lighthouse` and include the budget output.
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
pnpm install --frozen-lockfile
pnpm run audit:ci
pnpm run build:content
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build:app
pnpm run perf:budget
pnpm run perf:lighthouse
```

For changes touching offline/PWA behavior, also run Playwright E2E (`pnpm run e2e:prod` or the targeted offline specs in production mode) and retain Playwright traces/screenshots on failure.

## Lockfile review checklist

- Confirm only expected packages changed in `pnpm-lock.yaml`.
- Check for new transitive packages with telemetry, native install scripts, or broad network capabilities.
- Confirm package licenses remain compatible with the project.
- Confirm no package adds a backend, sync, auth, or persondata workflow.
- Confirm bundle/performance budget still passes on mobile thresholds.

## Emergency security patch process

1. Patch the minimum affected dependency range.
2. Run audit, typecheck, lint, unit tests, content build, production build, and performance budget.
3. If an E2E gate is blocked by the vulnerability itself or by upstream breakage, document the blocker and the manual verification performed.
4. Prefer temporary feature disablement over adding new backend/user-data behavior.
