# Integration architecture guardrails

MVP status: not implemented.

This document covers the integration backlog tasks for CIM, order imports, Nødnett and push notifications. It is intentionally a guardrail/concept note, not an implementation plan. The current Beredskapsboka/Innsats app remains a public, offline-capable, local-browser PWA with no account, no backend sync, no push, no live tracking, no official command-system claim and no patient/persondata workflow.

## Source notes used for this review

- CIM/F24 describes CIM as an emergency preparedness, alerting, mobilisation, incident and crisis-management system. That makes it a formal crisis-management surface, not a casual export target.
- MDN describes the File API as browser-local access to files explicitly selected by the user.
- MDN describes the Barcode Detection API as experimental/limited availability and HTTPS-only; QR scanning cannot be treated as universally available.
- MDN describes Web Push as service-worker plus `PushManager.subscribe()` plus a server-side push sender. Push subscriptions contain endpoint URLs/keys that must be protected.
- Public Nødnett material describes Nødnett as a national secure emergency/preparedness radio network used by emergency services and preparedness actors. Public cross-border guidance contains operational radio concepts, which is exactly why this app must avoid publishing local group plans or identifiers.

## Non-negotiable MVP boundary

The app may generate local, manually reviewed exports. It may not directly integrate with operational command systems, emergency radio networks or notification backends during the MVP.

Do not add any of the following without a separate approved governance/security plan:

1. credentials for CIM, Nødnett, push providers or backend sync;
2. API routes such as `/api/cim`, `/api/nodnett`, `/api/push` or `/api/sync`;
3. automatic incident creation, status write-back, order acknowledgement or log write-back;
4. real Nødnett talkgroup plans, subscriber/terminal identifiers, district radio plans or group lists;
5. push subscriptions, notification scheduling, VAPID keys, subscription storage or alert fan-out;
6. QR/file imports that bypass local preview, schema validation, source warnings and operator confirmation;
7. patient/persondata, private/skjermede locations or official command/archive claims.

## Tasks 349-350: CIM concept note and write-integration prohibition

### Allowed MVP concept

Beredskapsboka may support local manual/status exports that a human can inspect and then copy into a formal system through approved routines. Examples:

- Markdown status summary from local mission state;
- PDF-ready text assembled from existing local export flows;
- JSON preview for local validation and handoff documentation;
- explicit labels saying “manual export only — not sent to CIM”.

The export must remain a local file/text artifact. The app must not know CIM credentials, incident IDs, organization IDs, endpoint URLs or write APIs. Any future CIM-facing schema mapping must be documented as a draft mapping only until approved by the relevant organization and data owner.

### Explicit prohibition

No CIM write integration may ship without formal approval. “Formal approval” means at minimum:

- named operational owner and data controller;
- signed-off security architecture and DPIA/personvern screening;
- official API contract and environment ownership;
- authentication/authorization model;
- audit logging and rollback/error-handling model;
- retention/deletion policy;
- test environment separated from production CIM;
- written release approval.

Until all items are complete, the only accepted CIM-related behavior is local manual export with no network call.

## Tasks 351-352: QR-code and file import research for orders

### QR-code order import research

QR import is a possible future convenience for transferring an already-approved order package from leadership to the local browser without backend sync. It is not implemented in MVP.

A future QR order package must be treated as untrusted input:

- detect QR support with feature detection, because browser support is limited;
- provide a non-camera fallback such as paste/file import;
- use a compact signed payload format or a pointer that does not expose sensitive data;
- validate schema version, payload size, content type, source label and expiration;
- preview all imported content before applying it;
- refuse patient/persondata, private locations and official identifiers;
- store accepted data locally only;
- show accuracy/source warnings and “not an official order system” language.

The app must not request camera access on startup. Camera/BarcodeDetector access would be opt-in only and must degrade gracefully when unavailable.

### File import research

The browser File API can read local files selected by the user. A future file import can support JSON/Markdown order packages if it stays local and explicitly user-triggered.

Guardrails for any future file import:

- accept only allowlisted MIME types/extensions and enforce a small size cap;
- parse in a strict schema, not through loose object spreading;
- reject unknown top-level keys for operational imports;
- preserve raw input only if it is safe and needed for local audit;
- preview before write;
- require destructive confirmation before replacing local mission/order state;
- never upload selected files;
- never infer official approval from a file existing locally.

## Tasks 353-354: Nødnett possibilities and static-content prohibition

### Integration reality

Nødnett is a secure operational radio network. A browser PWA cannot and should not integrate directly with radio terminals, talkgroup assignment, subscriber identities, encryption keys, dispatch consoles or operational network management.

The only acceptable MVP Nødnett content is generic, non-sensitive guidance such as:

- “use the approved sambandsplan from leadership”;
- generic role placeholders in sambandsplan templates;
- reminders to verify current group/channel assignments through official routines;
- warnings that the app does not contain live or authoritative radio plans.

### Why real group lists must not ship

Real Nødnett group lists must not ship in static public content because they can expose operational structure and may become stale or wrong at the moment they are needed. Static public content has no access control, no revocation, no per-district authorization and no guarantee of current operational validity.

The app must not publish:

- district-specific talkgroup lists;
- subscriber, terminal, ISSI/GSSI-style identifiers or aliases;
- radio fleet mappings;
- emergency group selection rules beyond generic public training language;
- local incident radio plans;
- cross-border operational group details;
- any material marked internal, restricted or received through non-public channels.

If a future secured backend ever handles radio-plan references, it must use role/incident-scoped access, source-of-truth freshness, audit logging and explicit approval from the owning radio/operational authority. That is outside the MVP.

## Tasks 355-356: Push notification research and prohibition

### Push notification architecture research summary

Web Push requires all of the following:

- a registered service worker;
- notification permission;
- `PushManager.subscribe()` in the browser;
- server-side storage of push subscriptions;
- a backend sender with VAPID/authorization material;
- abuse prevention, CSRF protection and rate limiting;
- subscription deletion and incident-response handling;
- careful wording so a notification is not mistaken for an official alarm/order.

Push subscriptions are sensitive because their endpoint and keys can be abused if leaked. Push also changes the product boundary from local/offline support to remote alerting.

### Explicit prohibition

Do not implement push until backend/auth/governance exists. A future push design must first answer:

- who is allowed to send notifications;
- how recipients are identified and authorized;
- what data is stored server-side;
- how subscriptions are revoked;
- how false/duplicate/late notifications are handled;
- whether notifications are informational only or operationally binding;
- what audit trail and retention period apply;
- how the app prevents confusion with official warning/command channels.

Until then, the service worker must only support offline/cache/update behavior and must not register a `push` event listener.

## Acceptance checklist for future proposals

Before any item in this document moves from research to implementation, create a separate plan that includes:

1. formal governance approval;
2. source/API contract and data classification;
3. threat model update;
4. DPIA/personvern screening;
5. local/offline fallback behavior;
6. strict import/export schemas;
7. user-facing “not official command system” language;
8. audit logging and retention model;
9. abuse prevention and rate limiting if any backend exists;
10. production verification that proves no unauthorized write path exists.
