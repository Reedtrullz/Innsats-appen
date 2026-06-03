# Threat model: browser-offline operational support

## Scope

This threat model covers the MVP as a static/offline-capable browser app. It assumes no backend, no auth, no sync, no push notifications, no live tracking, and no server-side storage of missions or logs.

## Assets

- Public generated preparedness content and source references.
- Local mission context, checklist state, notes and generated Markdown exports.
- Cached external context signals and static assets.

## Main threats

1. A user enters persondata or patient details into free-text fields.
2. A device is lost or shared while local IndexedDB/localStorage data remains available.
3. Exported Markdown is copied to an insecure channel and reveals operationally sensitive information.
4. Generated content accidentally includes private/skjermede tilfluktsrom data or source-only restricted fields.
5. Cached offline content becomes stale and is treated as authoritative.
6. Browser or dependency compromise changes rendered content.

## Controls in MVP

Visible decision-support/local-only warnings are shown on app surfaces. Schemas are strict and regression tests block patient-identifying fields. Content validation blocks sensitive structured keys and restricted shelter location patterns. External context is marked stale when reused. No backend exists, so there is no server breach path in MVP.

## Residual risk

The app cannot enforce device encryption, endpoint hygiene, user copy/paste behavior or official command discipline. Users must follow local security routines and primary-source verification.