# Post-MVP backend sync architecture

MVP status: not implemented.

This document is the required architecture note before any backend sync work starts. It deliberately does not add backend code, auth, API routes, shared incident storage, push notifications or official command-system behavior. It records the minimum architecture that must exist before such work is planned.

## Current boundary

The current app is a static/offline browser PWA. Mission state, checklist runs, field logs, map sketches, local profile data and exports are stored locally in the browser. There is no server-side mission database and no authenticated user identity. That is a product and privacy boundary, not a temporary implementation detail.

No backend sync code ships until the governance gate is approved. The first backend implementation plan must start from this document and from `docs/integration-architecture-guardrails.md`, `docs/governance-gates.md`, `docs/dpia-checklist.md` and `docs/threat-model-browser-offline.md`.

## Preconditions before any sync implementation

A backend sync plan must have:

1. named data controller and operating organization;
2. DPIA/personvern screening for mission, profile, location and log data;
3. security architecture for auth, authorization, secrets, audit and incident response;
4. source/API contract for every shared data type;
5. explicit decision on whether the system is still decision-support only or becomes an official operational system;
6. deployment/hosting ownership and backup/restore responsibilities;
7. retention/deletion policy;
8. test environment separated from production;
9. migration plan for existing local-only browser data;
10. user-facing copy that explains what becomes shared and what remains local.

## System shape if approved

A future backend would need separate layers:

- identity provider and session/token validation;
- incident/organization tenancy;
- synchronization API with version checks;
- server-side schema validation;
- append-only audit log;
- encrypted database and backups;
- administrative incident-access management;
- export/reporting surface;
- health/source status for sync reliability;
- local offline queue in the browser for pending writes.

The browser must remain safe when offline. It should never delete or overwrite local operational notes merely because the backend is unavailable.

## Task 358: conflict resolution

Conflict resolution must be designed before syncing any mission data.

Minimum model:

- every shared object has a stable ID, schema version, server version and updated timestamp;
- every write carries the last known server version;
- the server rejects stale writes instead of silently overwriting newer data;
- the client keeps a local pending queue with explicit retry status;
- conflicts are shown to the user as reviewable differences, not auto-merged when safety-relevant;
- low-risk fields can use deterministic last-writer-wins only if documented field by field;
- safety/log/order fields require manual resolution or append-only history;
- local deleted/archived state must not erase server records without a separate confirmation and authority check;
- rejected writes remain locally recoverable/exportable.

Recommended data categories:

| Data type | Conflict model |
| --- | --- |
| Checklist checked-item state | field-level merge if same checklist version and no contradictory note |
| Free-text operational notes | append-only entries or manual diff review |
| 5-punktsordre / sambandsplan exports | immutable revisions with superseded markers |
| RUH/welfare/log entries | append-only, never destructive merge |
| Map sketches | revisioned geometries with manual conflict review |
| Local profile/competence data | do not sync until separate privacy approval |

## Task 359: RBAC

RBAC must be incident-scoped and least-privilege. It must not be a single global “logged in user can see everything” model.

Candidate roles for future design:

- viewer: read assigned incident/public support content only;
- contributor: add local/shared notes and checklist progress for assigned incident;
- lagfører/unit lead: approve status summaries and exports for assigned unit/incident;
- innsatsleder/incident lead: manage incident-level shared context and closeout;
- administrator: manage users, incidents and retention under operational policy;
- auditor: read audit trail without changing operational data;
- break-glass operator: temporary emergency access with mandatory reason and post-review.

RBAC decisions must be made server-side. Client-side hiding is not authorization. API responses must be filtered by incident membership, role and purpose. Every privileged action needs an audit event.

## Task 360: audit logging

Audit logging must exist before shared operational writes are allowed.

Minimum audit events:

- login/session creation and failed access attempts;
- incident membership changes;
- object creation/update/archive/delete;
- export/download of operational summaries;
- conflict resolution decisions;
- role changes and break-glass access;
- retention/deletion jobs;
- backend errors that affect sync reliability.

Audit events must include actor ID, incident ID, object type, object ID, action, timestamp, client/device context where appropriate, previous/new version identifiers and correlation/request ID. Sensitive free text should not be copied wholesale into audit logs unless necessary and approved.

Audit storage should be append-only/tamper-evident, queryable by authorized auditors and retained according to the approved policy.

## Task 361: encryption-at-rest

Encryption-at-rest is mandatory for any backend that stores incident data.

Minimum controls:

- managed encrypted database volumes/backups;
- envelope encryption or field-level encryption for high-risk note/profile/location data when justified;
- central key management, rotation and revocation plan;
- secrets kept out of source code and CI logs;
- backup encryption and restore testing;
- separation between production and test keys;
- access logs for key use where the platform supports it;
- incident-response procedure for key compromise.

Local browser encryption remains a separate issue. Sync must not weaken existing local-only safeguards or encourage users to enter patient/persondata.

## Task 362: incident access model

Incident access must be explicit, scoped and time-bound.

Minimum rules:

- users see only incidents they are assigned to;
- assignment has a role, purpose and expiry/review date;
- closed incidents become read-only except for authorized archive/report actions;
- temporary access requires reason, approver and audit event;
- break-glass access is visible to auditors and reviewed after use;
- users leaving an organization/unit are removed from active incidents;
- exported files retain warnings about operational sensitivity;
- public/offline content remains separated from private incident data.

The incident model must support “no access” as the default. Shared backend data must never be served to anonymous/public pages or static generated content.

## API and schema guardrails

If sync is approved later, route handlers must be narrow and explicit:

- no catch-all upstream proxy;
- no arbitrary URL/query forwarding;
- strict method allowlists;
- typed request/response schemas;
- size limits;
- idempotency keys for writes;
- optimistic concurrency version checks;
- rate limiting and abuse monitoring;
- JSON error responses that do not leak secrets or other incidents.

## Migration from local-only data

A future migration must be opt-in. The user must be able to preview exactly what will be shared and cancel without losing local data. Local exports/imports should remain available as fallback. The first sync must not automatically upload archived missions, local profile data or private map sketches.

## Verification gates before shipping backend sync

A backend sync implementation cannot be marked complete until these pass:

1. unit tests for schemas, RBAC, conflict rejection and audit events;
2. integration tests against a real test database;
3. E2E tests for offline queue, stale write conflict and reconnect recovery;
4. security review for auth/session/token handling;
5. audit-log review proving privileged actions are recorded;
6. encryption/backup restore smoke test;
7. production-like deploy in a non-production environment;
8. explicit verification that public generated content does not contain private incident data;
9. governance sign-off recorded in the workplan.

Until those gates exist, backend sync remains a documented future architecture only.
