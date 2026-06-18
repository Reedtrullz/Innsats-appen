# Beredskapsappen workflow coverage matrix — 2026-06-18

This is the durable review artifact for the June 18 documentation-backed workflow expansion in `/Users/reidar/Projectos/Beredskapsboka`.

Base document folder: `/Users/reidar/Projectos/Beredskapsboka/downloads/dokumenter`

The matrix records which documented Civil Defence workflows were reviewed, what app surfaces now cover them, and where the remaining gaps are. It is product evidence, not field approval. The app remains offline-first, local-only, mission-scoped decision support.

## Scope

- Reviewed against the downloaded/local document set, generated source graph, existing content model, mission dashboard, search, local map, local log, and offline PWA workflows.
- Source references below use generated source IDs from `content/generated/source-documents.json`.
- "Implemented" means there is current app content/tooling with tests. "Partial" means useful local support exists but the workflow still lacks a full runbook, official integration, or field-review closure. "Gap" means the area is identified but should remain future work until sourced and reviewed.

## Coverage Matrix

| Workflow | Status | Source anchors | App coverage now | Tooling / gap |
| --- | --- | --- | --- | --- |
| Skogbrann water supply, pumps, hoses | Implemented | `src-tiltakskort-under-innsats`, `src-eksempler-pa-utlegg-fra-pumpe`, `src-kursplan-grunnkurs-fig10` | `skogbrann-vannforsyningsplan`, expanded `skogbrann-startkort`, `brann-vannforsyning-slange`, `skogbrann-under-innsats`, `slangeutlegg` search/glossary coverage | `/kart` has Pumpe- og slangeplan for schematic water source, pump location, delivery point, and hose line. No capacity formula or field hydraulics validation. |
| Flom pumping and water damage support | Implemented | `src-eksempler-pa-utlegg-fra-pumpe`, `src-tiltakskort-under-innsats`, `src-sjekkliste-fig-og-figp` | `flom-pumpe-vannforsyning`, `flom-pumpe-under-innsats`, pump/slange search coverage | Uses the shared pump/slange mental model. Remaining gap: no dedicated flom-specific discharge/route planner; keep pump capacity decisions with leader/fagressurs. |
| Søk og redning sector/teig work | Implemented | `src-vedlegg-c-operative-forhold`, `src-tiltakskort-under-innsats`, `src-kursplan-grunnkurs-fig10`, `src-kommunikasjons-og-sambandsdiagram` | `sok-og-redning-startkort`, `soketeig-sektor`, `soketeig-plan-kart`, `sok-og-redning-sektor-under`, search terms for sector/teig/dekningsgrad | `/kart` has Søketeig plan for a local schematic sector boundary, start marker, and return marker. No persondata, real coordinates, live tracking, or automatic position sharing. |
| MFE request, reception, follow-up, demobilization | Implemented | `src-tiltakskort-05-stotte-av-mfe`, `src-tiltakskort-06-oppsettende-mfe-distrikt`, `src-sjekkliste-mobil-forsterkningsenhet-mfe`, `src-mobile-forsterkningsenheter-mfe` | `mfe-anmodning-mottak-oppfolging`, `mfe-mottak-under`, `mfe-mottaksboard-lokal`, checklists indexed in local search, mission dashboard `Relevante kontroller` and Work-tab MFE mottaksboard | Mission Work tab has local MFE mottaksboard using mission tasks/resource needs for contact point, arrival/first order, liaison/follow-up, sustainment/MBK, and demobilization. No official anmodning, utkalling, shared dispatch, or resource registry is sent from the app. |
| CBRN/MRE rens, ren/uren side, grovrens | Implemented | `src-veileder-for-sivilforsvarets-renseenheter-cbrn`, `src-samvirke-pa-forurenset-skadested-cbrne-sps41`, `src-sjekkliste-mobil-renseenhet-mre`, `src-opplaering-mannskap-mre10`, `src-opplaering-lagforer-og-leder-mre30` | `mre-rens-start`, `cbrne-soneinndeling`, `cbrne-verneutstyr-stoppkriterier`, `mre-ren-uren-side-grovrens`, `mre-soneplan-kart`, `cbrn-mre-rens-under` | `/kart` has MRE soneplan for schematic ren side, uren side, renselinje, innpassering, utpassering and avfallspunkt. Keep all substance, zone, PPE/vernenivå, and stop decisions with fagmyndighet/innsatsleder; the app does not define CBRN tactics. |
| RADIAC måleoppdrag, målepunkter, målerute | Implemented | `src-bestemmelse-radiacmaletjeneste-del-i`, `src-veileder-radiacmaletjeneste-del-ii`, `src-sjekkliste-radiaclag-rad`, `src-opplaering-lagforer-radiac-rad30`, `src-kommunikasjons-og-sambandsdiagram`, `src-sentrale-stralebegreper` | `radiac-malepunkt`, `radiac-dosekontroll`, `radiac-oppholdstid-rullering`, `radiac-maleoppdrag-under`, `radiac-maleplan-kart`, `radiac-måleplan` search synonyms | `/kart` has RADIAC måleplan for local schematic observation markers and a line route. No dose calculation, no real coordinates, no official report. |
| Beredskapsvakt, ELS, command/support intake | Partial | `src-opplaeringsplan-for-beredskapsvakt`, `src-enhetlig-ledelsessystem-els`, `src-opplaering-lagforer-fig-figp-fig20`, `src-opplaering-leder-fig-figp-fig30`, `src-videregaende-kurs-ledere-og-nestledere-fig31` | `ledelse-kommando-kontroll`, `oppdragsanalyse`, `obbo-beslutningssloyfe`, mission phase dashboard, local field log/export | Partial: app supports local decision rhythm but not a full ELS/stab board. Gap: role/resource/task board needs careful boundary work so it does not become an official command system. |
| ATV, båt, transport, logistics, materiel handling | Partial | `src-opplaering-forer-av-atb`, `src-opplaering-forer-av-bat`, `src-opplaering-materiellansvarlig-fig`, `src-opplaering-bruker-av-sikringsutstyr`, `src-sjekkliste-fig-og-figp`, `src-tiltakskort-for-innsats` | `atv-bat-transportlogistikk`, `kjoretoy-transportberedskap`, ATV/BAT/lett-lastebil training links, Equipment taxonomy, MBK checklists, Work-tab Transportlogistikk board, general map/log support | Mission Work tab has local Transportlogistikk board using mission tasks/resource needs for oppdrag/last/mottak, førerkompetanse, route/weather/framkommelighet, readiness/sikring, drivstoff/avløsning and return/MBK. No official dispatch, route approval, live tracking, vehicle identifier store, or official resource registry. |
| Psykososial oppfølging, kollegastøtte, MBK, etter innsats | Partial | `src-psykososial-oppfolging-og-kollegastotte`, `src-renhold-etter-branninnsats`, `src-sjekkliste-fig-og-figp` | `psykologisk-forstehjelp-sekvens`, etter-phase checklists, MBK equipment checklists, local export review | Partial: app has local prompts and checklists. Gap: stronger after-action package could connect defuse, MBK, avvik, and demobilization without storing sensitive personnel details. |
| Tilfluktsrom, atomberedskap, public preparedness, jod | Implemented | `src-deep-research-tilfluktsrom`, `src-atomberedskap-i-norge-og-sivilforsvarets-rolle`, `src-jodtabletter-i-sivilforsvaret`, `src-livreddende-tiltak-ved-rn-hendelse` | Tilfluktsrom module, RADIAC/jod FAQ, glossary/search support, source warning surfaces | Module/FAQ support only. No private shelter locations, no public-location publishing, and no dose or medical advice. |

## Remaining Gaps

1. Beredskapsvakt/ELS scratchpad: current mission/log/export surfaces help, but a full support-room board needs explicit MVP boundaries and source review.
2. ATV/BAT/logistics field closure: local card and board now exist, but route approval, vessel/vehicle-specific procedures, official dispatch and exact capacity/availability remain outside the app.

## Non-Claims

- This matrix is not a fagperson approval, district approval, official procedure, or official tactical authority.
- The app is not an official order, dispatch, reporting, or command system.
- Map planners use schematic 0-100 coordinates only; they must not store real addresses, private locations, live positions, persondata, patient data, vehicle identifiers, depot details, or shielded operational positions.
- There is no dose calculation, no field hydraulics calculation, no pump-capacity formula, no search-probability calculation, and no CBRN zone authority in the app.
- Generated content and tests prove local app behavior and source-link consistency, not live incident readiness.

## Verification Hooks

- Content/source graph validation: `npm run compile:curated && npm run build:search && npm run validate:content`
- Workflow matrix regression: `npm run test -- tests/docs/workflow-coverage-matrix.test.ts`
- Map planner regression: `npm run test -- tests/maps/water-supply-plan.test.ts tests/maps/radiac-measurement-plan.test.ts tests/maps/search-sector-plan.test.ts tests/maps/mre-zone-plan.test.ts tests/components/offline-map-panel.test.tsx`
- Browser map planner check: `PLAYWRIGHT_PROD=1 PLAYWRIGHT_PORT=3107 npx playwright test tests/e2e/offline-map.spec.ts`
