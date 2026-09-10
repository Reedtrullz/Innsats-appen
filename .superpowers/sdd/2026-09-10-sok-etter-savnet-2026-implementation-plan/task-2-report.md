# Task 2 report — HRS 2026 source-backed operational content

## Implementation

- Updated the four existing SAR cards with HRS 2026 traceability, IPP, rapid relevant lines/points, risk reassessment, team control, reporting, coverage boundaries, map-layer distinctions, and public-safe leadership roles.
- Added `sok-og-redning-planlegging`, `sok-og-redning-funn-og-redning`, and `sok-og-redning-faks-og-analogt-ko` with 5–7 steps each, warnings, competence context, source IDs, and prohibitions.
- Updated `sok-og-redning-sektor-under` and added `sok-og-redning-kvalitetssikring` with HRS source references and the requested operational checks.
- Added the eleven glossary terms, four public-safe FAQs, five HRS synonym groups, the HRS changelog entry, and the critical must-read notice linked to the Task 1 study guide.
- Added the focused fixture contract assertions and materialized the Task 1 HRS source in generated source artifacts through the existing importer; no StudyGuide YAML or source extract was edited.

## Verification

- `source ~/.nvm/nvm.sh && nvm use 22` selected Node `v22.22.3`; the local `~/.local/bin/node`/`npm` shim is malformed, so commands used the explicit Node 22.22.3 bin directory after selection.
- Focused tests: `25 passed` across `tests/content/curated-fixtures.test.ts` and `tests/content/donot-safety.test.ts`.
- `npm run compile:curated`: passed.
- `npm run build:search`: passed.
- `npm run validate:content`: passed; content graph valid with 2 release-board gaps.
- `git diff --check`: passed.

## Self-review and concerns

- All changed/new SAR cards are `pending-fagperson` with visible warnings and the HRS source ID. The HRS source remains `unverified`, high-risk, `not-reviewed`, and `needs-permission` by design.
- No person/health data, real names/photos/coordinates, real talkgroups, access codes, live tracking, FAKS integration, or technical-presence-as-coverage claim was added.
- Generated source artifacts changed because the existing import/compile pipeline had not yet materialized the Task 1 source ID; they are required for source-reference validation and search-index traceability.
- No full CI, deployment, live-route, or field acceptance claim is made.

## Fix round 1 — review findings

- Added exact fixture assertions for FAQ IDs and content, all HRS synonym aliases/card bindings, the changelog fields and complete content references, and the must-read title, severity, body, source, guide/card links, and changelog link.
- Added HRS-specific safety/doNot visibility coverage in `tests/content/donot-safety.test.ts`.
- Quoted comma-containing changed checklist labels and warnings in `content/curated/checklists.yaml`.

### Covering test command and output

```text
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && env PATH=/Users/reidar/.nvm/versions/node/v22.22.3/bin:/usr/bin:/bin /Users/reidar/.nvm/versions/node/v22.22.3/bin/npm test -- tests/content/curated-fixtures.test.ts tests/content/donot-safety.test.ts

Test Files  2 passed (2)
Tests       26 passed (26)
```

`git diff --check` also passed. Self-review found no scope expansion; the HRS source and all operational cards remain unverified/high-risk and pending-fagperson.
