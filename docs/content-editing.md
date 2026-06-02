# Content editing guide

Beredskapsboka content is source-backed and generated. Do not edit `content/generated/*` or `public/generated-content/*` by hand; those are build artifacts.

## Source locations

- Obsidian knowledge bank: `/Users/reidar/Obsidian/Hvelvet/01_Projects/Beredskapsboka`
- Curated YAML: `content/curated/*.yaml`
- Generated Node/server JSON: `content/generated/*`
- Generated browser/offline JSON: `public/generated-content/*`
- Copied approved assets: `public/content-assets/*`

## Build pipeline

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm run import:obsidian
npm run compile:curated
npm run validate:content
npm run build:search
# or all at once:
npm run build:content
```

`validate:content` enforces schema validity, source references, warning/status constraints, and sensitive structured key policy.

## Add a card

1. Edit `content/curated/action-cards.yaml`.
2. Include at minimum:
   - `slug`
   - `title`
   - `phase`
   - `roles`
   - `scenarios`
   - `priority`
   - `steps`
   - `safety`
   - `reporting`
   - `sourceIds`
   - `competenceRequired`
   - `warning` when the content is unverified, restricted, or easy to misuse.
3. Use a stable slug; card routes are `/kort/<slug>`.
4. Reference only existing `sourceIds` from `content/curated/source-documents.yaml` or imported source extracts.
5. Run:
   ```bash
   npm run build:content
   npm run test -- tests/content/coverage.test.ts tests/content/validate-content.test.ts
   ```

## Add a source

1. Prefer importing source extracts from the Obsidian source path.
2. If adding a curated source manually, edit `content/curated/source-documents.yaml`.
3. Include:
   - `id`
   - `title`
   - `sourcePath`
   - `sourceType`
   - `status` (`unverified`, `verified`, or other schema-approved status)
   - `body`
   - `warnings`
4. Warnings must be visible user-facing caveats, not hidden metadata.
5. Run `npm run build:content` and verify the source appears under `/kilder` and source badges on linked cards.

## Warning/status model

- `status` describes source confidence/provenance.
- Card `warning` and source `warnings` must be visible in UI.
- Public upstream context signals are separate decision support, not action-card/procedure truth.
- External context should show fresh/stale/failure state and must never erase cached local mission/checklist data.

## Search/offline expectations

The search index must continue to find stress terms used in the regression tests: `jod`, `rens`, `MFE`, `samband`, `dose`, `tilfluktsrom`, and `FIG10`.

After content edits, run:

```bash
npm run build:content
npm run test
npm run build
npm run e2e:prod -- tests/e2e/offline.spec.ts tests/e2e/core-mobile-journey.spec.ts
```
