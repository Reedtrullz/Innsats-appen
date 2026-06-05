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
