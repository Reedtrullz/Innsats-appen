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
- [ ] 1. Unify checklist/runbook: guided runbook is the default "Nå" experience in /oppdrag; detailed runner stays as the "Arbeid" view; retire /na and the beta flag.
- [ ] 2. /oppdrag Nå leads with the next action; mission context compacts to one line.
- [ ] 3. Content depth pass on high-priority cards (source-backed only; fagperson review before publish).

## Phase 2 — Field usability
- [ ] 4. Feltmodus toggle surfaced on home with a visible active state.
- [ ] 5. Glove-target sizing and focus trap in map marker/drawing edit forms.
- [ ] 6. "Sist brukt" row on /hurtigkort (localStorage).
- [ ] 7. Direct path to 5-punktsordre/sambandsplan from home.

## Phase 3 — Offline and map robustness
- [ ] 8. Map package download progress (streamed percentage).
- [ ] 9. Schematic map label collision handling (3+ nearby markers).
- [ ] 10. Stale-content age ("sist oppdatert for N dager siden").
- [ ] 11. iOS storage behavior verification (needs a physical device).

## Phase 4 — Adoption and polish
- [ ] 12. Install prompt (beforeinstallprompt + install card).
- [ ] 13. Module switcher pill row on /moduler/*.
- [ ] 14. Dev-only CSP unsafe-eval carve-out (kills dev-overlay noise; production CSP unchanged).

## Measurement
- [ ] 15. Field test script: time "find the right card from cold" and "log + export a 5-point order, gloved" with 2–3 real users. These are the app's KPIs.
