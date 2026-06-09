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
- Light, dark, and system theme choices work locally and dark-mode operational surfaces are covered by regression tests.
- Source-backed content checks and generated artifact guards pass.
- Local-only storage, privacy guards, export flows, checklist flows, and hash navigation remain intact.
- Offline/PWA behavior is smoke-tested by the production E2E suite.

## Dark Mode Verification

Theme can be changed from `Mer` under `Fargemodus`:

- `System` follows the device color-scheme preference.
- `Lys` forces light mode.
- `Mørk` forces dark mode for low-light field use.

The choice is stored only in `localStorage` under `innsats-theme`. It does not use login, server persistence, personal data, or mission data.

Automated coverage should verify:

- theme switching and local persistence;
- `<html>` dark class and resolved theme metadata;
- Home, bottom navigation, Oppdrag Nå, Oppdrag export hash routing, ExportReview, locked 5-punktsordre steps, and privacy blocking alerts in dark mode.

Manual visual review before pilot:

- Home in light and dark mode;
- Oppdrag Nå, Arbeid, and Eksport in light and dark mode;
- Hurtigkort in light and dark mode;
- Mer/settings in light and dark mode;
- ExportReview in dark mode;
- ContextNotice/privacy blocking alert variants in dark mode;
- map/log controls and generated export previews in dark mode.

Known limitations:

- Dark mode themes the application UI, not copied/exported Markdown or plain-text content formats.
- Print output should remain light/readable unless a future release explicitly adds dark print previews.

## Known Non-Goals

- Not an official command system.
- Local-only MVP; no central incident database.
- No personal data or patient/persondata handling.
- Not field-certified.
- No login or official command-system integration.
