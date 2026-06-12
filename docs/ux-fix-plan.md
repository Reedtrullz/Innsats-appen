# UX fix plan (June 2026)

Design principle from field feedback: **instructions first, governance one tap away.**
The app's job is delivering instructions; meta/trust chrome must never push them off screen.

Status legend: [x] done · [ ] open · [~] prepared/blocked on external step

## Shipped before this plan
- [x] Chrome diet: one-line shell status (pills behind "Detaljer"), boundary notice collapses after "Forstått", duplicate pills/mission indicators removed, chrome-budget e2e guardrail.
- [x] Export copy feedback (ExportReview owns the clipboard, success/failure visible), archive confirmation, prefers-reduced-motion.
- [x] Privacy errors name the matched category and the fix, anchored at the offending field, on every input surface.
- [x] Stable bottom nav for all roles; home role lens is the single global picker; action cards are instruction-first.

## Phase 1 — Instructions first in core flows
- [x] 1. Unify checklist/runbook: guided runbook is the default "Nå" experience in /oppdrag; detailed runner stays as the "Arbeid" view; /na and the beta flag retired.
- [x] 2. /oppdrag Nå leads with the guided steps; mission context follows.
- [~] 3. Content depth pass: `alvorlig-ulykke-dod-eget-personell` expanded from 3 to 7 steps derived strictly from its two source extracts (tiltakskort + tiltakskort 04) — **needs fagperson review**. 26 more high-priority cards still have only 3 steps; expand them the same source-faithful way (list: sambandsplan-start, cbrne-startkort, radiac-dosekontroll, psykososial-forstehjelp, samleplass-skadde-start, mre-rens-start, oppdragsanalyse, obbo-beslutningssloyfe, ledelse-kommando-kontroll, akutt-113-livreddende-forstehjelp, psykologisk-forstehjelp-sekvens, psykososial-ikke-tvungen-debrief, skogbrann-startkort, sok-og-redning-startkort, flom-pumpe-vannforsyning, skred-sikkerhet-samvirke, evakueringsstotte, samleplass-skadde-utvidet, tilfluktsrom-offentlig-beredskap, cbrne-soneinndeling, cbrne-verneutstyr-stoppkriterier, mre-ren-uren-side-grovrens, radiac-malepunkt, radiac-oppholdstid-rullering, pumpe-stromfare, kontaminert-utstyr-handtering).

## Phase 2 — Field usability
- [x] 4. Feltmodus quick toggle on home with visible "Feltmodus aktiv" state.
- [x] 5. Focus moves into map marker/drawing edit forms on edit (glove sizing already applied globally by field mode).
- [x] 6. "Sist brukt" row on /hurtigkort (slugs only, localStorage).
- [x] 7. Home "Samband / ordre" lands on the actual forms via /oppdrag#5-punktsordre.

## Phase 3 — Offline and map robustness
- [x] 8. Map package downloads stream with percent/MB progress in the status line.
- [x] 9. Schematic map labels stack vertically when anchors are close (lib/maps/schematic-labels.ts).
- [x] 10. Stale-content warning includes age ("N dager gammelt") from the manifest's generatedAt.
- [~] 11. iOS storage verification: needs a physical device. Test protocol: install as PWA from Safari, cache the Trondheim package, force-quit, airplane mode, relaunch — verify the package and IndexedDB missions survive; check `navigator.storage.estimate()` returns sane numbers in standalone mode. Code already try/catches quota detection.

## Phase 4 — Adoption and polish
- [x] 12. Install prompt card on /mer (beforeinstallprompt; renders nothing on iOS/installed).
- [x] 13. Module switcher pill row on all /moduler/* pages (nested layout).
- [x] 14. Dev-only CSP unsafe-eval carve-out; production CSP unchanged and test-pinned in both branches.

## Measurement
- [~] 15. Field test script (run with 2–3 real users on their own phones):
  1. **Cold-start to card** — phone locked, app installed: "En i laget ditt er alvorlig skadet. Finn riktig tiltakskort." Stop the clock at the first instruction read aloud. Target: < 30 s.
  2. **Gloved order export** — work gloves on, feltmodus + hanskemodus active: "Logg en kritisk observasjon og lag en 5-punktsordre for sektoren din, kopier den." Stop at "Kopiert til utklippstavlen." Target: < 3 min.
  Record times, mistaps, and verbal confusion points. These two numbers are the app's KPIs.
