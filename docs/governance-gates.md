# Governance gates for features beyond MVP

Every future feature proposal must include a short governance note before design or implementation if it introduces auth, sync, push, live tracking or backend storage. The note must be reviewed with the MVP boundary in mind: no persondata, no patientdata, no private/skjermede tilfluktsrom data and no official command-system claim unless formally approved.

## Required governance note

For each affected feature, document:

- Purpose, user group and operational value.
- New data categories, including whether any personal data, patient data, location traces or restricted operational information is involved.
- Whether the feature requires auth, synchronization, push notifications, live tracking, backend storage, APIs or administrator access.
- Legal basis, retention period, deletion flow, audit/logging needs and data processor responsibilities.
- Security controls: authentication, authorization, encryption, secrets handling, monitoring, backup, incident response and abuse prevention.
- Operational boundary: why the feature is or is not an official command/order/incident system.

## Decision gate

If any item touches auth, sync, push, live tracking or backend storage, it is post-MVP. It needs security architecture, DPIA screening, source-publication review and explicit release approval before code ships.

## Required architecture references

Before designing integration or sync behavior, read and update these docs:

- `docs/integration-architecture-guardrails.md` for CIM manual/status exports, QR/file order-import research, Nødnett boundaries and push prohibition.
- `docs/post-mvp-backend-sync-architecture.md` for conflict resolution, RBAC, audit logging, encryption-at-rest and incident access.

These references are guardrails only. Their existence does not approve implementation.