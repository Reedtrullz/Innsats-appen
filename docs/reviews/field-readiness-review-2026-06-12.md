# Field-readiness review — Beredskapsboka / Innsats-appen

**Generated:** 2026-06-12
**Scope:** Product concept + field UX + content + local-data robustness + pilot readiness, assessed against the intended users (FIG lagførere/ledere og mannskap i Sivilforsvaret) and their operating conditions (stress, regn, mørke, hansker, dårlig dekning, privat telefon).
**Method:** Code-level audit of `app/`, `components/`, `lib/`, generated content stats, docs/release state, and reconciliation against `docs/reviews/autonomous-deep-review-2026-06-07.md` and `docs/ux-fix-plan.md`. Key claims spot-verified against source files.

This review deliberately does **not** repeat the technical/security/deploy depth of the June 6–7 reviews. It answers two questions: *why does the app still feel messy and hard to use*, and *what is the full remaining path to field use*.

---

## 1. The idea, judged against its users

The concept is sound and unusually well-bounded: an offline-first, source-backed decision-support PWA with no backend and no persondata is the right shape for Sivilforsvaret field support. The MVP boundaries (`docs/mvp-boundaries.md`) are a genuine strength — they make the app deployable without governance approval cycles that a command-system integration would require.

But the implementation has drifted from the persona. The intended user is a **gloved, wet, cold, adrenaline-loaded lagfører reading a phone at arm's length** — and the app today is optimized for a *calm reviewer*: governance banners on every screen, a role-picker before action, multi-step gated wizards, nested `<details>` disclosures, and meta/privacy prose interleaved with operational content. The stated design principle ("instructions first, governance one tap away") is implemented on the card detail pages but violated by the shell, the mission dashboard, the order forms, and field mode itself.

The "messy and hard to use" feeling has four root causes:

1. **Mode-and-disclosure overload.** The core operational surface (`/oppdrag`) is a 3-mode tab view (Nå/Arbeid/Eksport) with nested `<details>` inside each mode, plus ~100 lines of hash-navigation DOM-walking to deep-link into it. Users lose their place. Logging an observation — the single most common field action — sits behind a disclosure in a non-default mode.
2. **The safety chrome competes with the work.** Red "Må leses" badge, amber DecisionSupportNotice, status pills, and 40-word prohibition sentences render on every screen, above or inside operational content.
3. **Field ergonomics are opt-in and hidden.** Glove sizing and night theme do nothing until the user finds `/feltmodus` — which is not in the bottom nav, and is itself cluttered with QA/research instrumentation (Web Speech evaluation, readability checkbox, feedback form).
4. **The content is too thin to carry the concept.** 39 of 42 action cards have only 3 steps, and those steps are often compound/abstract ("Avklar soneinndeling før mannskap går inn") rather than executable instructions. The delivery vehicle is increasingly polished; the payload is not yet field-grade.

---

## 2. What is working (do not redo)

- **Card detail pages** (`components/action-card-detail.tsx`) are correctly instruction-first: title → warning → "Ikke gjør" → numbered steps → collapsed governance. `TiltakCardRow` shows the first step inline in lists.
- **Cold start → first instruction is 2 taps** via "Kritisk nå". This beats the 30 s KPI on paper.
- **Privacy machinery is real**: sensitive-text scrubbing, geometry stripping, sanitized exports, allowlisted context proxies, regression-tested boundaries.
- **Offline plumbing is real**: PMTiles packages with Range-request SW handling, schematic fallback, generated-route asset precache (PWA-001 fixed), 704 test files, green CI/deploy with exact-SHA verification.
- **Prior-audit security items mostly closed**: SEC-001 (orphan map purge), SEC-002 (import referential integrity), SEC-003 (per-key localStorage schemas) are fixed. SEC-004 (PIN throttling) remains open.
- **Source governance pilot gate is clean.** The Batch A blocker packet (2026-06-06, "55 referenced blockers") is resolved: 54/61 sources verified, 0 pilot blockers per the strict gate. The June review's claim stands; treat the Batch A doc as historical.

---

## 3. Findings

### 3.1 Field UX (the "messy" core)

Ranked by field impact. File references verified 2026-06-12.

| # | Finding | Evidence |
|---|---------|----------|
| U1 | **5-punktsordre is a forced 4-step wizard**: all 5 textareas required, mandatory readback checkbox, locked step progression, edits clear the generated preview. No quick/partial order, no draft save. Reached via fragile hash-nav (`/oppdrag#5-punktsordre`) that must switch mode + auto-open nested details. | `components/forms/five-point-order-form.tsx:98,114,244`; `mission-command-dashboard.tsx:85-180` |
| U2 | **Glove/night ergonomics are off by default and hidden.** Field-mode runtime returns `null` unless enabled; `/feltmodus` is not in the bottom nav (only via `/mer` and a home toggle). Font sizes are never increased — only hit areas. Nav labels are ~10.5px (`text-[0.66rem]`). | `components/field-mode-runtime.tsx:39,51-57`; `components/bottom-nav.tsx:16,35` |
| U3 | **`/oppdrag` is three modes deep with nested disclosures.** Quick log is duplicated in three places (CompactQuickLog in Nå, QuickFieldLogComposer + FieldLogControls behind `<details>` in Arbeid). Logging an observation: ~4–8 taps. | `components/mission/dashboard/mission-work-panel.tsx:43-65` |
| U4 | **`/feltmodus` mixes field tools with QA instrumentation**: Web Speech "evaluation" with consent checkbox, "outdoor readability reviewed" checkbox, and a field-test feedback form sit on the screen meant for big buttons and night theme. | `components/field-mode-panel.tsx:177-335,415-418` |
| U5 | **Governance chrome on every screen**: red "Må leses N" badge (always alarm-red), amber DecisionSupportNotice in `<main>`, status row — before any content. The mission page also carries a 40-word prohibition sentence and a destructive "Slett lokale data" section. | `components/app-shell.tsx:27-43`; `mission-context-panel.tsx:257,282-283` |
| U6 | **Two-"kort" IA confusion**: the nav tab "Kort" goes to `/hurtigkort`, but cards live at `/kort/[slug]`. `/hurtigkort` duplicates `/sok` (same SearchBox + full index) plus a "Vis alle" accordion of every card. | `bottom-nav.tsx:16`; `app/(app)/hurtigkort/page.tsx:11-58` |
| U7 | **Overlapping meta pages**: `/begrensninger`, `/kjente-begrensninger`, `/personvern`, `/data-pa-enheten` are four near-duplicate limits/privacy surfaces; the first two are both linked from the persistent boundary notice. `/for`, `/under`, `/etter`, `/faq`, `/nytt`, `/moduler/*` are effectively orphaned (reachable only via home disclosure or not linked from `/mer`). | `components/decision-support-notice.tsx:26-33`; `app/(app)/mer/page.tsx` |
| U8 | **Night theme is brittle and dangerous to semantics**: `[class*="bg-white"] !important` substring overrides flatten red "Ikke gjør" / amber warning colors; `reduced-blue` is a page-wide sepia filter that dims warning contrast. | `field-mode-runtime.tsx:70-89` |
| U9 | **Card detail is a dead end**: no back/"tilbake til oppdrag" affordance, no "logg observasjon herfra". | `action-card-detail.tsx:171-216` |
| U10 | **Home cold-start overload**: dual headings, 4-option role-lens radiogroup, field toggle, 2 disclaimers — ~11–13 interactive targets before the first action. The role lens only reshuffles 2–3 shortcuts. | `components/home-role-content.tsx:130-150,212-220` |
| U11 | **Sensitive-text detection hard-blocks** order export, log save, and mission save with no override. A false positive (e.g. a place name) strands a user mid-incident. | `five-point-order-form.tsx`; `quick-field-log-composer.tsx:56`; `mission-context-panel.tsx:94` |
| U12 | **`OfflineMapPanel` is 1088 lines / 23 useState** doing ~6 jobs (package cache, MapLibre, schematic SVG, marker CRUD, drawing CRUD, import/QR/BFT copy). High cognitive and failure load; also flagged as ARCH-004 in the June review and still open. | `components/offline-map-panel.tsx` |
| U13 | **Copy inconsistencies and English leaks**: "Notes" labels in both order and samband forms (also release tool), "Sjekkliste/workflow", oppdrag vs innsats, tiltak vs tiltakskort vs kort vs hurtigkort, grenser vs begrensninger. | `forms/five-point-order-form.tsx:244`; `forms/comms-plan-form.tsx:130`; `action-card-list.tsx:57` |

### 3.2 Content (the biggest field-readiness gap)

- **39 of 42 cards have exactly 3 steps** (1×4, 1×5, 1×7). The ux-fix-plan's "26 high-priority cards" understates it; only `alvorlig-ulykke-dod-eget-personell` (7) and `flom-pumpe-vannforsyning` (5) have been expanded.
- Shallow steps are compound and abstract. Example, `cbrne-startkort` in full: "Avklar soneinndeling før mannskap går inn. / Bruk riktig verneutstyr og rullering. / Etabler renselogikk og rapportering før eksponert personell flyttes videre." Each line hides 5–10 real decisions; none is executable read-aloud under stress. Compare the expanded alvorlig-ulykke card, which is imperative and concrete.
- **Coverage imbalance**: CBRN/radiac ~9 cards (nearly all shallow), søk/redning only 2, psykososial cards are advisory rather than tactical. No combined-scenario cards (flom + evakuering, brann + samleplass).
- **No fagperson sign-off tracking.** The one expanded card is marked "needs fagperson review" in a markdown checkbox; there is no review/approval field in the content schema, so reviewed/unreviewed states cannot be queried or gated.
- Search is good (MiniSearch, fuzzy 0.2, 14 Norwegian synonym groups, field/role/scenario filters).

### 3.3 Local-data robustness (new findings beyond June 7)

| # | Finding | Impact |
|---|---------|--------|
| D1 | IndexedDB open failure has no fallback or user-visible message (private browsing / storage-restricted Safari). | App silently loses its core capability |
| D2 | localStorage quota exceeded during import gives no user feedback — silent partial data loss possible. | Data loss |
| D3 | Map package download has no retry/resume; a network hiccup restarts a 16–69 MB download. | Field frustration on weak networks |
| D4 | SEC-004 still open: no PIN attempt throttling/cooldown. | Local brute-force |
| D5 | Concurrent-tab mission writes are not serialized; retention settings are reminder-only (known, SEC-012). | Confusion |
| D6 | Stale offline content is labelled but with weak salience; no purge of very old generated caches (SEC-008 partial). | Trust |

### 3.4 Pilot readiness (state as of 2026-06-12)

Done: staging deploy verified (June 6), rollback drill on staging, support channel defined (GitHub Issues `[pilot-support]`), 704 test files / 23 e2e specs green, exact-SHA production healthy.

Open, and **only you can close them**:

1. Physical-device evidence: Task 384 (regn/hansker/mørke/stress), 385 final iPhone Safari interactions, 386 Android, 387 install-to-home-screen, 388 low-connectivity, 389 update-after-offline. Tasks 377–383 have templates but no recorded executions.
2. Pilot district selection and a named support owner.
3. Production rollback acceptance (drill done on staging only).
4. GitHub governance decisions (branch protection, environment protection, secret scoping).
5. Fagperson review of expanded card content — this becomes the critical path once card expansion starts.

---

## 4. The path to field-ready: prioritized plan

Ordering principle: **a field test with 2–3 real users is the gate for everything else.** P0 is what must change before that test is worth running; P1 is what the test will likely confirm; P2 is hardening that can follow.

### P0 — Before the next field test (1–2 weeks of focused work)

| ID | Action | Acceptance |
|----|--------|-----------|
| P0-1 | **Expand the ~12 most life-safety-critical cards** source-faithfully to 5–8 imperative steps (start: cbrne-startkort, samleplass-skadde-start, akutt-113, sok-og-redning-startkort, skogbrann-startkort, radiac-dosekontroll, mre-rens-start, psykologisk-forstehjelp-sekvens, evakueringsstotte, cbrne-soneinndeling, cbrne-verneutstyr-stoppkriterier, skred-sikkerhet-samvirke). Add a `reviewStatus`/`reviewedBy` field to the card schema so fagperson sign-off is data, not a checkbox in a plan doc. | Each step executable read-aloud; schema gate fails on unreviewed expansion at release |
| P0-2 | **Make field ergonomics default-on**: apply ≥44–48px touch targets and larger base font on small touch screens without requiring feltmodus; feltmodus then only adds glove/night extras. Put "Felt" in the bottom nav or auto-prompt on first run. | Glove-tappable nav and forms with feltmodus off |
| P0-3 | **Un-gate the 5-punktsordre**: one-screen form, copy enabled with empty fields (marked "—"), readback optional (recommended-checkbox, not gate), draft persisted. Keep the wizard as optional "full" mode if desired. | Gloved order draft + copy < 1 min |
| P0-4 | **Promote quick log to one tap**: persistent log button on the mission dashboard default view (and/or shell when a mission is active); remove the duplicate log surfaces. | Observation logged in ≤2 taps from /oppdrag |
| P0-5 | **Soften sensitive-text blocking to a warn-with-override** for field log and order text (keep hard-block for export of structured identifiers). Log overrides locally. | False positive never strands a user |
| P0-6 | **Chrome diet, round 2**: boundary notice collapses permanently per device after first "Forstått" everywhere; "Må leses" badge neutral unless severity=critical; move "Slett lokale data" off /oppdrag to /personvern. | One governance line max above the fold on operational screens |
| P0-7 | **Strip QA instrumentation out of /feltmodus** (speech evaluation, readability checkbox, feedback form → /mer or behind a dev flag). | /feltmodus = big controls only |
| P0-8 | **Fix copy leaks**: Notes→Notater (×3), workflow→arbeidsflyt; pick one term pair (oppdrag, tiltakskort) and enforce via a lint wordlist test. | Grep gate green |

### P1 — Structural fixes the field test will confirm (2–4 weeks)

| ID | Action |
|----|--------|
| P1-1 | **Flatten /oppdrag**: collapse Nå/Arbeid/Eksport into one scrollable mission view with sticky section nav (Nå-steg, Logg, Eksport); delete the hash-nav DOM-walking. Most nested `<details>` become plain sections. |
| P1-2 | **Resolve the kort IA**: rename tab to match route (move quick cards to `/kort`, make `/hurtigkort` redirect), and fold its search into `/sok` (one search surface). |
| P1-3 | **Merge meta pages**: `/begrensninger` + `/kjente-begrensninger` → one page; `/personvern` + `/data-pa-enheten` → one page; link `/for|/under|/etter`, `/faq`, `/laering` coherently from `/mer` or retire them into card/module content. Target ≤16 routes. |
| P1-4 | **Replace the night-theme CSS substring hack** with a proper dark theme (CSS variables/Tailwind dark variant) that preserves red/amber semantics; drop the sepia filter for a warm-temperature token set. |
| P1-5 | **Split OfflineMapPanel** (ARCH-004): package manager, map view, annotation tools, import as separate components; map screen shows only view+annotate by default. |
| P1-6 | **Card detail affordances**: back-to-context link, "logg herfra" action. |
| P1-7 | **Home simplification**: one heading, role lens collapsed behind a chip, "Kritisk nå" as the single action cluster (remove the hurtigkort duplicate or make them one component). |
| P1-8 | **Robustness**: IndexedDB-unavailable banner with degraded read-only mode (D1); quota-exceeded feedback on import (D2); map download resume via Range/partial re-fetch (D3); PIN throttling (D4/SEC-004). |
| P1-9 | **Run the ux-fix-plan field test script** (cold-start-to-card < 30 s; gloved order < 3 min) with 2–3 real users and record mistaps/confusion verbatim. This produces the P2 list. |

### P2 — Hardening and pilot close-out

- Remaining card expansions to full depth (the rest of the 39), combined-scenario cards, søk/redning depth.
- Physical-device evidence tasks 384–389; pilot district + support owner; production rollback acceptance; GitHub governance sign-off.
- Concurrent-tab serialization, stale-cache purge, retention enforcement decision (SEC-012), coordinate-precision decision (SEC-011).
- June-7 backlog batches still open: architecture registry items (ARCH-001/002/003), deploy pinning (DPL-001/002), coverage ratchets.
- Labelled map styles (vendored glyphs) and the Kartverket topo package (Geovekst permission).

---

## 5. Corrections to existing docs

- `docs/ux-fix-plan.md` Phase 1 item 3: the shallow-card count is **39/42**, not 26; only one of the 26 listed has been expanded (flom-pumpe-vannforsyning, to 5 steps).
- `docs/source-governance-batch-a-owner-review.md`: outcome (resolved 2026-06-06→07, strict gate clean) should be recorded at the top so it is not read as a current blocker.
- `docs/technical-debt-register.md` (2 rows) is far behind reality; fold the open June-7 items and this review's P1/P2 into it or retire it in favour of the review backlogs.

## 6. Bottom line

The platform is field-ready before the product is. Deployment, offline, privacy, and testing infrastructure are unusually mature for an MVP; what stands between today and field use is (1) card content depth — the actual payload, (2) a default-on, one-handed, gloved UX for the three core actions (find card, log observation, produce order), and (3) physical-device and real-user evidence. The fastest credible path is the P0 list followed immediately by the two-scenario field test already scripted in `docs/ux-fix-plan.md` — measured, not assumed.
