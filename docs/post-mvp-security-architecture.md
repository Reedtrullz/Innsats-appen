# Post-MVP security architecture before shared backend

This document is a placeholder gate that must be completed before delt backend or shared storage is introduced. The MVP intentionally avoids a server, accounts and synchronization; adding them changes the risk model.

## Architecture decisions required

- Identity and access: authentication method, MFA need, authorization model, roles, tenant separation and emergency access process.
- Data model: exact fields stored server-side, classification, retention, deletion and export controls.
- Transport and storage security: TLS, encryption at rest, key management, backup protection and secret rotation.
- Audit and logging: what is logged, who can inspect logs, tamper resistance, retention and privacy limits.
- Client security: offline cache behavior, token storage, logout/reset, device compromise assumptions and CSP.
- Operations: vulnerability management, dependency updates, monitoring, alerting, incident response and restore testing.
- Integrations: upstream API allowlists, rate limits, provenance, stale-data markers and failure modes.

## Mandatory outputs

Before implementation, publish a security architecture review, threat model update, DPIA/personvernkonsekvensvurdering screening, data processing overview and rollback plan. The design must clearly state whether the product remains decision support or becomes an official command/incident system requiring separate approval.