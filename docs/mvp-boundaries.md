# MVP boundaries

Beredskapsboka is an offline/local decision-support MVP. It is not an official command system, patient journal, live tracking system, or restricted-data registry.

## Explicitly out of scope

- Login/account system.
- Push notifications.
- Central incident database.
- Official command-system integration.
- Live personnel/team/vehicle tracking.
- Patient data, patient journal fields, medical record numbers, personnummer/fødselsnummer/national ID fields, or equivalent identifiers.
- Private or skjermede tilfluktsrom location lists.
- Open upstream proxying through public API routes.

## Why private tilfluktsrom data is excluded

The MVP may explain public protection concepts and operational readiness steps, but it must not import or publish private/skjermede tilfluktsrom locations or restricted lists. The app is browser-delivered and offline-cacheable; anything published can be copied, indexed, or retained. Therefore tilfluktsrom content is limited to public/godkjent information, readiness workflows, warnings, and source references.

## Privacy/security guardrails

- Mission context, checklist runs, order exports, sambandsplan exports, and release-readiness board state are local browser state/output only.
- Privacy reset on the mission dashboard deletes local IndexedDB mission/checklist state in the current browser; the `/release` board has its own reset because it is stored under a separate `localStorage` key.
- Sensitive structured fields are blocked by `lib/content/source-policy.ts` and regression-tested in `tests/security/privacy-boundaries.test.ts`.
- Context API routes use allowlisted parameters and reject generic proxy keys such as `url`, `upstream`, `proxy`, `target`, and `href` before adapter fetches.
- MET/Kartverket/NVE context signals are separate public decision-support signals. They are not promoted to operational truth or checklist procedure steps.

## Content warning/status model

- Source `status` records provenance/confidence.
- Source warnings and card warnings must remain visible in card/source pages.
- Research-backed or unverified material must carry explicit caveats.
- External context signals must show fetched/stale/failure state.
- A failed public upstream request must not erase useful cached local mission/checklist context.

## Regression gates

Run these before relaxing or extending the MVP boundary:

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm run test -- tests/security/privacy-boundaries.test.ts
npm run test -- tests/content/coverage.test.ts
npm run e2e:prod -- tests/e2e/core-mobile-journey.spec.ts tests/e2e/privacy-reset.spec.ts
```

If a future feature needs sensitive data, create a separate security plan first. Do not add it as an incidental MVP field.
