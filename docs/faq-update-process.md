# FAQ Update Process

Beredskapsboka FAQ entries are public, source-backed decision support. They are not official orders, complete source documents, or a place for personal/sensitive operational data.

## When to update FAQ

Use this process when:
- field feedback shows repeated confusion;
- a source-backed procedure changes;
- a must-read notice needs a short explanatory answer;
- a glossary alias/synonym should surface in search.

## Required evidence

Every FAQ update must include:
- exact question and answer text;
- source IDs already present in generated source documents;
- affected role/scenario/competence/equipment taxonomy values;
- whether the answer is must-read;
- confirmation that no patient data, private shelter locations, local-only addresses, phone lists, or backend-only operational details are included.

## Implementation path

1. Add or update `content/curated/faq.yaml`.
2. Add glossary aliases in `content/curated/glossary.yaml` only when they improve search.
3. Run `npm run build:content`.
4. Run targeted content and component tests.
5. Verify `/faq`, `/ma-leses`, and `/endringer` show the intended decision-support wording.

## Retirement

If an FAQ answer is stale, mark it `status: retired` or remove it from curated content after recording the reason in the changelog. Do not leave obsolete operational advice visible to users.
