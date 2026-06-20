# Implementeringsplan — UI/UX-fikser (handoff til Claude Code)

Denne planen løser funnene i `docs/ux-review-2026-06-13.md`. Den er skrevet for å gis videre til Claude Code: hver arbeidspakke er selvstendig, med mål, filer, konkret endring, akseptansekriterier og verifisering. Ta dem i rekkefølge (P0 → P3); avhengigheter er merket.

> **Relasjon til `docs/ux-fix-plan.md`** (den eldre planen): to punkter overlapper og bør sees i sammenheng.
> - «Nå vs Arbeid» (P2-1 her) er en *forfining* av den bevisste samlingen i eldre plan, Fase 1 pkt. 1 («guided runbook = Nå, detailed runner = Arbeid»). P2-1 reverterer ikke den — den skjerper signaliseringen.
> - «Hvordan/hvor»-innhold (P1-1 og P2-2 her) hører sammen med eldre plan, Fase 1 pkt. 3 (utvid kort fra 3 til 7 kildetro steg, 26 kort gjenstår, **trenger fagperson**).

## Hvordan bruke planen

- Én arbeidspakke = én PR/commit. Ikke bland tema-fiks og innholdsendringer i samme commit.
- Følg `CLAUDE.md`: etter innholdsendringer kjør `npm run build:content` og commit regenererte filer.
- Verifiseringsregime per pakke står under «Verifiser». Full slusing før merge: `npm run check:ci`.
- **Testkjøring:** node_modules på macOS-mappen er ikke alltid kjørbar i sandboks — kjør tester fra en `/tmp`-klone av repoet hvis `vitest`/Playwright feiler på binær-/plattformfeil (ikke på selve testlogikken).
- Doktrineregelen gjelder: ingen prosedyre/innhold dikter opp. Innholdsendringer her er enten ren opprydding (avduplisering) eller å *vise* allerede godkjent innhold.

---

# P0 — Tema/kontrast (kritisk, må gjøres først)

Hovedfeilen: i mørk modus blir kritisk/høyt prioritert innhold usynlig. Root cause: `.dark`-temaet i global CSS (`app/.../globals.css`) overstyrer Tailwind-fargeutilities med `!important`, men **gradient-stopp** (`from-*`/`to-*`) og **opacity-suffiks-bakgrunner** (`bg-red-50/70`) treffes ikke, mens tekstfargen flippes til lys → lys tekst på lys flate.

## P0-1 · Fjern gradient- og opacity-bakgrunner fra kjerneflatene

**Mål:** ingen håndrullet gradient eller opacity-suffiks-fargebakgrunn i app-komponenter. Bruk solide palettklasser som `.dark`-overstyringen dekker (`bg-red-50`, `bg-amber-50`, `bg-emerald-50`, `bg-white`, `bg-slate-50/100`), eller designsystemets primitiver.

**Filer og konkrete endringer:**

- `components/tiltak-card.tsx`
  - L19–20 `priorityTreatment`: `bg-gradient-to-b from-red-50 to-white` → `bg-red-50`; `from-amber-50 to-white` → `bg-amber-50`. Behold `border-*`/`shadow-*`.
  - L69 `TiltakCardRow`: `bg-red-50/70` → `bg-red-50`.
- `components/search-box.tsx`
  - L105 `SearchResultRow`: `bg-red-50/60 hover:bg-red-50` → `bg-red-50 hover:bg-red-100`.
- `components/checklist-runner.tsx`
  - L145: `bg-amber-50/60` → `bg-amber-50`.
- `components/device-gate-panel.tsx`
  - L122: `bg-emerald-50/40` → `bg-emerald-50`; `bg-red-50/40` → `bg-red-50`.

**Akseptansekriterier:**
- Søk i `components/` og `app/` etter `bg-gradient` og etter regex `bg-(red|amber|emerald|sky|slate)-50/[0-9]` gir null treff i app-flater (release-verktøyet kan unntas, se P3-5).
- I mørk modus er kort-tittel (høy prio), søketreff-tittel (høy prio) og påkrevde sjekklistepunkt fullt lesbare.

**Verifiser:** `npm run lint` + `npm run typecheck`; visuell sjekk i mørk modus (P0-2 automatiserer).

## P0-2 · Lås kontrasten med regresjonstest (lys + mørk)

**Mål:** bug-klassen kan ikke komme tilbake ubemerket.

**Filer:** utvid `tests/e2e/theme.spec.ts` (finnes). Krever produksjonsbuild (`PLAYWRIGHT_PROD=1`, se `CLAUDE.md`).

**Konkret endring (minst én, helst begge):**
1. **Computed-style-assertion** (robust): for hurtigkort, søkeresultat og sjekkliste i `dark`-tema, hent `color` på tittel/label og `background-color` på nærmeste flate, og assert kontrastforhold ≥ 4.5:1 (WCAG AA). Legg en kontrast-helper i `tests/e2e/helpers.ts`.
2. **`toHaveScreenshot()`** for de samme tre flatene i begge tema (baseline committes).

**Akseptansekriterier:** testen feiler på dagens kode (verifiser ved å midlertidig reintrodusere `bg-red-50/70`), og passerer etter P0-1.

**Verifiser:** `npm run e2e:prod -- tests/e2e/theme.spec.ts` (`PLAYWRIGHT_PORT=3007` ved behov).

## P0-3 · (Strukturell, anbefalt) Forby mønsteret fremover

**Mål:** gjør feilen umulig å gjeninnføre uten å bli stoppet.

**Alternativer (velg det letteste):**
- ESLint-regel (`eslint.config.mjs`) som flagger `className`-strenger med `bg-gradient` eller `bg-<farge>-50/<tall>` i `components/**` og `app/**` (unntak: `release-readiness-tool.tsx`).
- Eller en grep-basert unit/content-test som feiler på mønsteret.

**Verifiser:** `npm run lint`.

---

# P1 — Innhold som finnes, men ikke vises / er feil modellert

## P1-1 · Vis godkjente illustrasjoner på tiltakskort

**Mål:** «hvordan/hvor»-bildene (f.eks. pumpeutlegg) som ligger godkjent i banken skal vises på kortet. Datakilden finnes: `getImageMetadata()` i `lib/content/load-content.ts` gir `ImageMetadata[]` med `usedByCardSlugs`, `approvedForPublication`, `publicPath`, `alt`, `caption`.

**Filer og endringer:**
- `app/(app)/kort/[slug]/page.tsx`: hent `getImageMetadata()`, filtrer (`approvedForPublication === true && usedByCardSlugs.includes(slug)`), send inn til `ActionCardDetail`.
- `components/action-card-detail.tsx`: ny seksjon «Illustrasjon / utlegg» under «Tiltak». `<figure>` med `alt` fra metadata og `caption` i `<figcaption>`. Bruk `<img>` hvis `next/image` er upraktisk under CSP/offline (sjekk `next.config.ts`). Tema-trygg ramme (`bg-white`/primitiv), ingen gradient.
- Valgfritt: miniatyr i `runbook-view` sitt åpne steg når steget har bilde (avhenger av P2-2).

**Akseptansekriterier:**
- `/kort/flom-pumpe-start` viser de 7 pumpeutleggsbildene med alt-tekst + bildetekst.
- Kort uten bilder rendrer ingen tom seksjon.
- Fungerer offline (bildene i `/content-assets/` — verifiser mot `lib/offline/static-app-shell.ts` at de er i app-shell-cachen).

**Verifiser:** `npm run typecheck`, `npm run lint`, manuell sjekk i begge tema + offline; legg en assertion i passende e2e-spec (f.eks. `core-mobile-journey`).

## P1-2 · Rydd `doNot` vs `safety`-duplisering (innhold)

**Mål:** «Ikke gjør»-boksen skal vise ekte forbud, ikke en positiv sikkerhetsinstruksjon kopiert fra `safety`.

**Filer:** `content/curated/action-cards.yaml` — gå gjennom alle 42 kort. Der `doNot` er ordrett lik en `safety`-linje (bekreftet i `flom-pumpe-start`, `oppdragsanalyse`): omformuler til ekte forbud («Ikke ta … i bruk før kontroll») eller fjern `doNot` hvis det ikke finnes et reelt forbud. Ikke dikt opp forbud — bruk bare det innholdet/kildene støtter; marker tvil i commit for fagleser.

**Akseptansekriterier:** ingen `doNot`-streng er identisk med en `safety`-streng på samme kort. Legg gjerne en content-test i `tests/content/` som håndhever dette.

**Verifiser:** `npm run build:content` → commit `content/generated/*` (+ `public/generated-content/*`) → `npm run check:generated` → `npm run test -- tests/content`.

## P1-3 · Slå opp kildetitler overalt (ingen rå `src-`-IDer i UI)

**Mål:** feltbruker skal aldri se «Kilder: src-sjekkliste-fig-og-figp».

**Filer (viser i dag `sourceIds.join(', ')`):** `components/checklist-runner.tsx` L153, L184 · `components/action-card-list.tsx` L69, L84 · `app/(app)/faq/page.tsx` L30 · `app/(app)/nytt/page.tsx` L48 · `app/(app)/ma-leses/page.tsx` L39.

**Endring:** bruk samme mønster som `runbook-view.tsx` (`sourceTitleById[id] ?? id.replace(/^src-/, '')`). Få inn et `sourceTitleById`-map fra `getSourceDocuments()` der det mangler. Vurder en delt helper `formatSourceList(ids, sourceTitleById)`.

**Akseptansekriterier:** ingen synlig tekst i app-flater matcher regex `\bsrc-[a-z0-9-]+` (rene tekniske metadata-paneler som bevisst viser `source.id` kan unntas).

**Verifiser:** `npm run typecheck`, `npm run lint`, evt. e2e-assertion.

---

# P2 — Struktur og informasjonsarkitektur

## P2-1 · Skjerp «Nå» vs «Arbeid» (retning A)

**Mål:** fjern opplevelsen av at samme jobb gjøres to ganger. «Nå» = neste ene grep; «Arbeid» = full tavle. Begge leser/skriver samme `ChecklistRun` — det er signaliseringen som endres, ikke datamodellen. (Forfiner eldre plan Fase 1 pkt. 1, reverterer den ikke.)

**Filer:**
- `components/mission/dashboard/mission-now-panel.tsx`: «Nå» viser **kun** aktivt steg + 1–2 neste fra `RunbookView`, kritiske varsler, hurtiglogg. Ikke hele lista.
- `components/runbook/runbook-view.tsx`: «kompakt» variant (prop) som kun rendrer aktivt + neste steg i «Nå».
- `components/mission/dashboard/mission-work-panel.tsx`: «Arbeid» beholder full `ChecklistRunner` + logg + kart, men dropper den guidede «neste grep»-rammen (unngå dobbel runbook).
- Logg: én loggkomponent i to varianter (mønsteret `variant="work"` finnes i `LocalMissionControls`). Komprimert i «Nå», full i «Arbeid».
- `components/mission/dashboard/mission-mode-control.tsx`: faner med undertekst — «Nå · neste grep» / «Arbeid · full tavle» / «Eksport».

**Akseptansekriterier:** «Nå» viser aldri hele sjekklista; «Arbeid» viser aldri den lineære «neste grep»-rammen; fremdrift er fortsatt delt (haking i «Nå» reflekteres i «Arbeid»). `mission-local`, `map-log-mission-flow` grønne.

**Verifiser:** `npm run test` + relevante `e2e:prod`-specs.

## P2-2 · Utvid stegmodellen til `{ action, how, imageIds }` (bakoverkompatibelt)

**Mål:** plass til «hvordan/hvor» uten å miste skanbarhet — `action` alltid synlig, `how`/bilde ett tapp unna. **Større jobb (skjema + pipeline + alle konsumenter); gjør bakoverkompatibelt.** Henger sammen med eldre plan Fase 1 pkt. 3 (kildetro stegutvidelse, trenger fagperson).

**Filer:**
- `lib/content/schemas.ts`: gjør `steps` til union for gradvis migrasjon:
  ```ts
  const StepSchema = z.union([
    z.string().min(1),
    z.object({
      action: z.string().min(1),
      how: z.string().optional(),
      imageIds: z.array(z.string()).default([]),
      sourceIds: z.array(z.string()).default([]),
    }),
  ]);
  // steps: z.array(StepSchema).min(1),
  ```
  Legg en normaliseringshjelper `string → { action, imageIds: [], sourceIds: [] }`, så konsumenter bare ser objektformen.
- `scripts/` (compile-curated / import-obsidian): slipp gjennom begge former; valider mot nytt skjema.
- Konsumenter: `components/action-card-detail.tsx` (render `action`; `how` bak «Vis hvordan»-`<details>`; evt. steg-bilder), `components/tiltak-card.tsx` (vis kun `action` i «Gjør først»), evt. `lib/mission/runbook.ts` hvis runbook leser kort-steg.
- Innhold: migrer kort med reelt «hvordan»-stoff (start med `flom-pumpe-start` + knytt `imageIds` til pumpebildene). Resten kan bli værende som strenger.

**Akseptansekriterier:** gamle string-steg fungerer uendret; minst ett kort bruker objektformen med `how` + `imageIds`; Zod-validering passerer; ingen runtime-feil ved blandede former.

**Verifiser:** `npm run build:content` (commit generert), `npm run check:generated`, `npm run typecheck`, `npm run test -- tests/content`, `npm run lint`.

---

# P3 — Polering og konsistens

## P3-1 · Font-vekt-skala
Gjenopprett hierarki — `font-black` er i dag default på alt. Definer regel (black = side-/seksjonstittel + kritisk varsel; bold = labels/pills; semibold = brødtekst) og rydd de mest brukte komponentene (`tiltak-card`, `action-card-detail`, `operational-primitives`, `home-role-content`). Vurder `@layer components`-klasser (`.t-title`, `.t-label`). **Verifiser:** `npm run lint` + visuell sjekk.

## P3-2 · Kollaps notat/status per sjekklistepunkt
`components/checklist-runner.tsx`: legg notat-`textarea` + materiell-`select` bak per-punkt «Legg til notat / status»-`<details>`. Checkbox + label alltid synlig. **Verifiser:** `npm run test`, sjekkliste-e2e grønn.

## P3-3 · Tema lyse «øyer» (indigo/rose/orange)
`components/action-card-detail.tsx` L189 (indigo), `components/checklist-runner.tsx` L179 + `components/offline-map-panel.tsx` L859 (rose feil), `offline-map-panel.tsx` L1029 (orange). Rut gjennom `CriticalNotice`/`SectionCard` (tema-trygge), eller legg palettene inn i `.dark`-overstyringen. **Verifiser:** utvid P0-2-testen til disse.

## P3-4 · IA-opprydding
- Slå sammen/avklar nesten-duplikate ruter: `begrensninger` vs `kjente-begrensninger`; `datakilder` vs `kilder` vs `kildegjennomgang`; `nytt` vs `endringer`. Behold redirects der ruter fjernes.
- «Kritisk nå» betyr to ting: snarvei-lenker (`home-role-content`) vs faktiske høyprio-kort (`hurtigkort`, oppdrag). Gi ulike navn («Snarveier» vs «Kritiske tiltak»).
- Aktivt oppdrag: la `Hjem` lene seg på oppdragsdashbordet i stedet for å duplisere «hva skjer nå».
**Verifiser:** oppdater berørte e2e (`role-adaptive-ui`, journeys), `npm run check:ci`.

## P3-5 · Lavprioritet / valgfritt
- `components/release-readiness-tool.tsx`: norsk/engelsk-blanding + egen palett. Intern tavle (ingen app-shell) — kosmetisk.
- Splitt `components/offline-map-panel.tsx` (1088 linjer) for testbarhet — offline-kritisk, gjør forsiktig med god e2e-dekning (`offline-map`, `map-log-mission-flow`).

---

# Valgfri strategisk fase — bytt temamotor

Dagens mørk-modus er `!important`-overstyring av Tailwind-utilities klasse for klasse (to fargesystemer å holde synkronisert; gradienter/nye paletter knekker stille). Strategisk fiks: la komponentene lese CSS-variabler direkte (`bg-[var(--surface)] text-[var(--text-primary)]`) eller bruk Tailwind `dark:`-varianter, basert på variablene som allerede finnes i `globals.css`. Stor refaktor — planlegg separat, **etter** at P0-regresjonstestene er på plass.

---

## Rekkefølge og avhengigheter

1. **P0-1 → P0-2 → P0-3** (tema-fiks + lås). Alt annet bygger på tema-trygge flater.
2. **P1-1, P1-2, P1-3** (uavhengige, kan parallelliseres).
3. **P2-1** (IA), deretter **P2-2** (skjema — størst, bakoverkompatibelt).
4. **P3** løpende.
5. Strategisk temamotor til slutt, kun etter P0-2.

Hver pakke avsluttes med `npm run check:ci` grønt før merge.

---

# Statusoppdatering — gjennomgang av committet arbeid (2026-06-13)

Gjennomgått mot faktisk kode, ikke commit-meldinger. Hovedinntrykk: **solid, og P0 overgår spec.** Tema-fiksen er låst med *to* tester — en ekte WCAG-kontrast-e2e (`tests/e2e/theme.spec.ts`, «regression lock for P0-1», måler kontrastforhold ≥ 4.5:1 på høyprio-kort, søketreff og påkrevd sjekklistepunkt i mørk modus) og en statisk vakt (`tests/theme/no-untheme-safe-backgrounds.test.ts`) som forbyr gradient/opacity-bakgrunner *og* krever `.dark`-dekning for indigo/rose/orange. Det er bedre enn det planen ba om.

| Pakke | Status | Vurdering |
|-------|--------|-----------|
| P0-1 fjern gradient/opacity-bg | ✅ | Null treff i app-flater. |
| P0-2 kontrast-regresjonstest | ✅✅ | Ekte WCAG-måling på de tre flatene. |
| P0-3 forby mønster | ✅✅ | Statisk vakt-test dekker også palett-øyer (P3-3). |
| P1-1 vis godkjente bilder | ✅ | `getImageMetadata()` → `ActionCardDetail`, `<figure>` med alt/caption. Se R3. |
| P1-3 kildetitler (ingen rå `src-`) | ✅ | Med test. |
| P2-1 skjerp Nå vs Arbeid | ✅ | Committet. |
| P3-1 font-vekt-hierarki | ✅ | |
| P3-2 kollaps notat/status | ✅ | |
| P3-3 palett-øyer i mørk modus | ✅ | `.dark`-overrides + vakt-test. |
| P3-4 IA: «Kritisk nå»-disambiguering | ✅ | Snarveier vs Kritiske tiltak. |
| P3-5 release-norsk + split kartpanel | ✅ | SchematicMap + import-privacy ekstrahert. |
| P1-2 doNot vs safety | ✅ (R1) | 0/42 duplikater. Permanent vakt: `tests/content/donot-safety.test.ts`. |
| **P2-2 strukturert stegmodell** | ⛔ **åpen** | `steps` er fremdeles `z.array(z.string())`. «Hvordan»-feltet finnes ikke ennå. |

Bygg/tester er ikke kjørt i denne gjennomgangen — kjør `npm run check:ci` før merge (og fra `/tmp`-klone hvis sandboks-node_modules feiler, jf. notat øverst).

---

# Gjenstående arbeid

## R1 · P1-2 — avklar og rydd `doNot` vs `safety`

**Funn:** den tidligere «positiv instruksjon i rød boks»-feilen er delvis bedret (mange `doNot` er nå «Ikke …»-formulert), men **38/42 kort viser fortsatt nøyaktig samme setning i både «Sikkerhet»-boksen og «Ikke gjør»-boksen.** Det er redundant støy på nesten alle kort.

**Dette er en innholdsbeslutning før koding — velg én:**
- **(a) Dedupliser (anbefalt):** hver linje står ett sted — ekte forbud under `doNot`, risiko/stopp-kriterier under `safety`. Fjern den dupliserte linjen fra det minst passende feltet.
- **(b) Behold speilingen bevisst:** hvis det er ønsket å fremheve én kritisk linje begge steder, dokumentér det og **fjern P1-2 fra planen** — men da bør UI-et vise den visuelt som «samme punkt», ikke som to uavhengige punkter.

**Hvis (a):**
- Filer: `content/curated/action-cards.yaml` (gå gjennom de 38 kortene fra rapporten).
- Ikke dikt opp nye forbud; flytt/behold bare eksisterende kildetro tekst. Marker tvil for fagleser i commit.
- Legg en content-test i `tests/content/` som feiler hvis en `doNot`-linje er identisk med en `safety`-linje på samme kort (gjør regelen permanent).

**Verifiser:** `npm run build:content` → commit `content/generated/*` + `public/generated-content/*` → `npm run check:generated` → `npm run test -- tests/content`.

## R2 · P2-2 — strukturert stegmodell `{ action, how, imageIds }`

Uendret fra P2-2 over (ikke påbegynt). Dette er den siste biten av din opprinnelige «hva, ikke hvordan»-klage: per-steg «hvordan/hvor»-tekst, ikke bare et bilde nederst på kortet.

**Filer:** `lib/content/schemas.ts` (union `string | { action, how?, imageIds[], sourceIds[] }` + normaliseringshjelper), `scripts/` (compile-curated/import — slipp gjennom begge former), `components/action-card-detail.tsx` (render `action`; `how` bak «Vis hvordan»-`<details>`; knytt steg-`imageIds` til riktig bilde fra R-bildebanken), `components/tiltak-card.tsx` (vis kun `action` i «Gjør først»), evt. `lib/mission/runbook.ts`.

**Bakoverkompatibelt:** gamle string-steg skal fungere uendret. Migrer kun kort med reelt «hvordan»-stoff, start med `flom-pumpe-start` (knytt steg til pumpebildene).

**Akseptanse/verifiser:** som P2-2 — Zod passerer for blandede former, minst ett kort med `how`+`imageIds`, `npm run build:content` + `check:generated` + `typecheck` + `test -- tests/content` + `lint`.

## R3 · Gjør kortbildene feltbrukbare (oppfølging av P1-1)

**Funn:** bildene rendres nå inline (`<img class="block h-auto w-full">`). Et detaljert pumpeutleggs-diagram på en telefonskjerm i felt er for lite til å lese. «Hvor legger jeg slangene» krever at man kan **forstørre**.

**Endring:** gjør figurene trykkbare → åpne i en enkel, tema-trygg, offline lightbox/zoom (pinch-zoom eller fullskjerm-overlay). Ingen eksterne avhengigheter; respekter `prefers-reduced-motion`; lukkbar med stort treffmål (hansker).

**Filer:** `components/action-card-detail.tsx` (+ evt. liten `components/ui/image-zoom.tsx`).

**Akseptanse:** bilde kan åpnes i fullskjerm og zoomes på mobil, fungerer offline, lukkes med tydelig knapp. **Verifiser:** e2e-assertion i `core-mobile-journey` + manuell mobil/offline-sjekk.

## R4 · Skaff flere «hvordan/hvor»-illustrasjoner (innhold)

**Funn:** kun pumpeutlegg og sambandsdiagram har godkjente bilder i `image-metadata.yaml`. R2/R3 hjelper bare der det finnes bilder.

**Arbeid:** identifiser kort der et diagram er det raskeste svaret (utlegg, soneinndeling CBRNE, ren/uren-side MRE, samleplass, søkesektor), hent illustrasjoner fra de offentlige kildeutdragene, kjør personvern-/publiseringsgodkjenning (`approvedForPublication`, `usedByCardSlugs`), og legg dem i banken. Ren innholds-/kildejobb — **krever fagperson-/publiseringsgodkjenning**, ikke kode.

## R5 · (Carryover fra `docs/ux-fix-plan.md`, Fase 1 pkt. 3) Kildetro stegutvidelse + fagperson

Den eldre planen har fortsatt ~25 høyprio-kort med bare 3 steg som skal utvides kildetro (listen står der), og `alvorlig-ulykke-dod-eget-personell` er utvidet men **venter på fagperson-review**. Dette henger tett sammen med R2 (utvid og strukturer i samme runde der det er naturlig). Hold `reviewStatus`-gaten (`pending-fagperson`) til en fagperson har sett innholdet — ikke marker som `reviewed` uten navngitt fagleser.

## R6 · (Strategisk, valgfri) Bytt temamotor

Uendret fra «Valgfri strategisk fase» over. Nå **tryggere å gjøre**, fordi P0-2 (WCAG-e2e) + P0-3 (statisk vakt) fanger regresjoner. Anbefalt rekkefølge når det tas: migrer komponentene til CSS-variabler / `dark:`-varianter, behold begge testene som sikkerhetsnett, fjern `!important`-overstyringene til slutt.

---

## Oppdatert rekkefølge for gjenstående

1. **R1** (innholdsbeslutning + rydd — lav risiko, rask gevinst).
2. **R2 + R5** sammen (strukturer og utvid steg kildetro), **R3** parallelt (zoom på bilder).
3. **R4** løpende innholdsarbeid med fagperson.
4. **R6** når det er kapasitet til en større, men nå testdekket, refaktor.

---

# Statusoppdatering 2 (2026-06-13) — R1 ferdig

**R1/P1-2 er fullført og verifisert i kode:** 0 av 42 kort har en `doNot`-linje identisk med en `safety`-linje (var 38), og regelen er låst permanent med `tests/content/donot-safety.test.ts`. Generert `action-cards.json` er gitignored og bygges i CI (`check:generated`), som er i tråd med pipelinen — ingen manglende commit.

Da gjenstår, i kode: **R2** (strukturert stegmodell) og **R3** (zoombare bilder). Resten er innhold (R4, R5) eller valgfri strategi (R6).

## R2 — forfinet, sekvensert delplan (hovedjobben som gjenstår)

Dette er siste biten av din opprinnelige «hva, ikke hvordan»-klage. Ta den i denne rekkefølgen — hvert steg holder appen grønn:

1. **Skjema + normalisering (ingen innholdsendring ennå).**
   `lib/content/schemas.ts`: gjør `steps` til `z.array(z.union([StepStringSchema, StepObjectSchema]))`. Legg `normalizeStep(step) → { action, how?, imageIds[], sourceIds[] }` i samme modul (eller `lib/content/steps.ts`). Eksporter en `NormalizedStep`-type.
   *Verifiser:* `npm run typecheck` + `npm run test -- tests/content`. Alt grønt fordi alle kort fortsatt er strenger.

2. **Konsumenter leser normalisert form (fortsatt ingen innholdsendring).**
   `components/action-card-detail.tsx`: kjør stegene gjennom `normalizeStep`, render `action` som i dag. `components/tiltak-card.tsx`: vis `normalizeStep(step).action` i «Gjør først». `lib/mission/runbook.ts`: hvis runbook leser kort-steg, normaliser der også.
   *Verifiser:* `typecheck`, `lint`, eksisterende kort-e2e grønne.

3. **UI for `how` + steg-bilde.**
   `action-card-detail.tsx`: når `how` finnes, vis «Vis hvordan»-`<details>` under steget (tema-trygt, ingen gradient/opacity-bg — vakt-testen håndhever). Når `imageIds` finnes, vis miniatyr som åpner R3-zoom.
   *Verifiser:* manuell sjekk i lys/mørk; legg e2e-assertion.

4. **Migrer ett kort som pilot.**
   `content/curated/action-cards.yaml`: gjør `flom-pumpe-start` om til objekt-steg med `how` (sugehøyde, plassering, retrettvei — kun det kildene støtter) og knytt `imageIds` til pumpebildene. La de andre 41 stå som strenger.
   *Verifiser:* `npm run build:content` → `check:generated` → `test -- tests/content`.

5. **Lås formen.** Content-test som tillater begge former men krever at objekt-steg har ikke-tom `action`, og at `imageIds` peker på eksisterende, `approvedForPublication`-bilder.

Akseptanse for hele R2: gamle string-steg uendret; `flom-pumpe-start` viser `how` + bilde; Zod + alle tester grønne; `npm run check:ci` grønt.

## R7 — helhetlig visuell QA etter alle endringene (ny, lav innsats)

Mange flater er endret (font-hierarki P3-1, bilder P1-1, Nå/Arbeid P2-1, kollaps P3-2, palett-øyer P3-3). Kjør én strukturert gjennomgang i **lys, mørk og feltmodus** av: hjem, hurtigkort, kortdetalj, /oppdrag (Nå/Arbeid/Eksport), søk, kart. Se etter ny layout-skift, avkuttet tekst, eller hierarki som ble for flatt/for tungt etter font-endringen.
*Verifiser:* utvid gjerne kontrast-e2e til også å dekke faggjennomgang-banneret (indigo) og feilboksen (rose), så palett-øyene har en kontrast-assertion og ikke bare eksistens-vakt.

## Oppdatert rekkefølge (etter R1)

1. **R2** (sekvensen over) + **R5** der stegutvidelse og strukturering kan gjøres i samme kort-runde.
2. **R3** parallelt (zoom), siden R2 steg 3 lener seg på den.
3. **R7** som avsluttende QA før neste release.
4. **R4** løpende med fagperson; **R6** når det er kapasitet.
