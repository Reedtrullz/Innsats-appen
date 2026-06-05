# Source publication policy for static and generated content

Beredskapsboka is published as static/generated content. Everything compiled into the app, `content/generated` or `public/generated-content` must be safe to distribute publicly with the MVP.

## May be compiled

- Public preparedness guidance, public source metadata and short excerpts that are allowed by source policy.
- General checklists, glossary terms, training references and protection measures that do not reveal restricted locations or personal data.
- Warnings that clarify uncertainty, source status and operational boundaries.

## Must not be compiled

- Persondata, patientdata, national identity numbers, phone numbers tied to private persons, medical records or incident logs about identifiable people.
- Private/skjermede tilfluktsrom lists, addresses, coordinates, access details, capacity tables or other restricted location patterns.
- Secrets, API keys, local file paths, unpublished vault names, sensitive subscriber lists, live tracking identifiers or backend credentials.

## Gate

Import, compile and validation scripts must reject sensitive structured keys and restricted shelter location patterns. Editors must keep source-only restricted details outside public generated artifacts. Any exception requires governance approval and a post-MVP security/privacy review before publication.

## Source governance metadata

Source validity, pilot use and public publication approval are separate gates:

- `status=verified` means the source content has been structurally/source reviewed: the extracted content, path, owner/reviewer metadata and review scheduling are valid for the source record.
- `pilotReviewStatus=approved-for-pilot` means the source may support pilot operational cards and checklists. Missing `pilotReviewStatus` is parsed as `not-reviewed`.
- `publicationStatus=approved-public` means generated public source documents may expose the source body or excerpts. Missing `publicationStatus` is parsed as `needs-permission`.

The conservative defaults keep existing imports compatible, but they do not grant approval. `npm run report:source-governance:strict` is therefore still expected to fail until actual source approvals are recorded explicitly.

## Pilot governance snapshot — 2026-06-05

Deep-research source notes are explicitly `rejected-for-pilot` for operational cards/checklists until each claim is replaced or backed by primary authority source extracts. They may remain as editorial background, but they do not count as approved pilot evidence and must not be used to claim content-governance completion.

This pass did not grant pilot/public approval to any source. Official/local source extracts that still lack `pilotReviewStatus=approved-for-pilot` and `publicationStatus=approved-public` remain blockers in `npm run report:source-governance:strict` until a real source review records explicit approval.
