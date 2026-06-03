# Release Readiness Redesign QA

final result: passed

Reference: user-provided launch readiness dashboard screenshot with large product title, circular readiness score, horizontal launch timeline, workstream table, right-side attention panel, and launch materials list.

Prototype checked: `/release` at desktop viewport.

Result:
- Standalone `/release` page no longer uses the operational app shell.
- Hero, score ring, phase row, timeline, milestones, workstream table, attention rail, launch materials, and completed-work panel are present.
- Existing release-task interactions remain available through the add-work and active-work controls.
- Local persistence and export remain intact.

Known P3 differences:
- Workstream and stage icons use the existing Beredskapsboka asset plus letter badges instead of a separate icon library.
- Content is tailored to the Innsats-app release process rather than the Petal Launch copy in the reference.

## Follow-up repo review 2026-06-03

- Local review found one mission-context bug: newly created non-tilfluktsrom missions still stored the tilfluktsrom checklist id. Fixed by assigning the checklist that matches selected scenario/phase and adding a regression test.
- Playwright production E2E can now use `PLAYWRIGHT_PORT=<port>` so a local dev server on port 3000 does not block production-mode verification.
- Verification: `npm run check` passed locally after the release/mission commits; `npm run e2e:prod` initially hit an existing local dev server on port 3000, then `PLAYWRIGHT_PORT=3007 npm run e2e:prod` passed 8/8.
