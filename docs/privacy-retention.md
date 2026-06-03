# Privacy and retention policy for local browser data

Beredskapsboka MVP has no account, no backend, no sync, no push service and no central incident database. Operational working data is stored only in the browser profile on the current device.

## Local storage used

- IndexedDB stores local mission boards, selected checklist identifiers, checklist runs, item notes and cached context signals used by the operational workspace.
- localStorage stores the release-readiness board and small browser-only preferences.
- Service worker/cache storage stores static application assets and generated public content so the app can open offline.

## Data that must not be entered

Do not enter patient data, national identity numbers, phone numbers tied to private persons, medical records, sensitive subscriber lists, or private/skjermede tilfluktsrom locations. Use approved official systems for incident logs and personal data.

## Retention and reset

Local data remains until the user deletes it in the app, clears browser data, removes the PWA, or the browser evicts storage. The mission screen reset deletes local mission/checklist data in this browser only. It does not delete exported files the user has copied elsewhere.

## Export handling

Markdown exports are generated locally. Exported files may contain operationally sensitive information typed by the user. Store, transmit and delete exports according to local procedures.