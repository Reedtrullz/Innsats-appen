# Retiring deprecated cards or sources

Retirement is an editorial change. Do it deliberately and keep public generated artifacts free of restricted data.

## Retire or replace a source

1. Create a source-update issue and list linked content from `content/generated/content-coverage-report.json`.
2. If the source is superseded, add or import the replacement source first.
3. Mark the old source `status: historical` or `status: expired` and set `expiresAt` or `reviewAfter` plus `owner`, `reviewer`, `verifiedAt`, and `reviewRisk`.
4. Move dependent cards/checklists/training/protection/glossary records to the replacement source where appropriate.
5. If no generated content should reference the old source, verify it appears only in the report as an orphaned/retired source or remove it from generation if safe.
6. Run `npm run build:content` and check `/kildegjennomgang`.

## Retire an action card or curated item

1. Confirm the item is truly deprecated, duplicated, unsafe, or outside MVP boundaries.
2. Remove or replace references from phase pages, mission recommendations, training links, and search content by editing curated YAML surgically.
3. If the item covers a role/phase/scenario gap, add the replacement before removal.
4. If the item is high-risk, keep warnings and competence rationale until it is removed from generated artifacts.
5. Run content validation and targeted tests.

## Do not publish

Never use retirement notes to reveal local filesystem paths, patient data, private or skjermede tilfluktsrom locations, live incident details, or restricted local plans. Use short public-safe `reviewNotes` only.
