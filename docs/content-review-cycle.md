# Content review cycle

Beredskapsboka content is reviewed as local decision support, not as an official command system. Reviews must preserve the MVP boundaries: no backend, auth, sync, live tracking, patient data, private shelter data, or restricted local plans in generated artifacts.

## Required metadata

Every generated source document must include:

- `status`: `verified`, `unverified`, `historical`, `draft`, or `expired`.
- `verifiedAt`: date of last editorial/source review, `YYYY-MM-DD`.
- `reviewAfter` or `expiresAt` for high-risk, unverified, historical, draft, or expired sources.
- `owner` and `reviewer` for accountability.
- `reviewRisk`: `low`, `medium`, or `high`.
- Optional `reviewNotes` for short public-safe notes.

Imported source extracts get safe defaults when frontmatter is missing. Curated or manually maintained sources should set the fields explicitly.

## Review cadence

1. Run `npm run build:content` before review. This regenerates sources, search, workplans, validation, and `content-coverage-report.json`.
2. Open `/kildegjennomgang` and prioritize expired, stale, unreviewed, and high-risk sources.
3. Check dependent cards, checklists, training paths, protection measures, and glossary terms using the generated coverage report.
4. Confirm high-risk cards have visible warnings and either competence requirements or an explicit rationale.
5. Update source metadata and curated content in the smallest possible diff.
6. Run `npm run validate:content`, targeted tests, typecheck, and lint before release.

## Issue flow

Use the content-review template for editorial/fag review, field-feedback for sanitized user observations, and source-update for verification, expiry, replacement, or retirement work.
