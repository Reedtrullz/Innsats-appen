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