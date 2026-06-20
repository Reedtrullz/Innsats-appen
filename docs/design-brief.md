# Design-brief — Beredskapsboka / Innsats-appen (full redesign)

Brief til bruk med Claude Design. Baserte beslutninger: «Personlig»-modus er for Sivilforsvarets eget mannskap (privat beredskap), hardt skille mellom modusene, og full app i første runde.

## Hva appen er

Offline-først mobil PWA for norsk Sivilforsvar. Lokal, kildebelagt BESLUTNINGSSTØTTE (ikke offisiell ordre/kommando). Ingen pålogging, ingen backend, ingen persondata — alt ligger lokalt på enheten. Brukes av FIG/FIGP-mannskap, lagførere, ledere og instruktører.

## Brukskontekst (styrer alt designet)

Felt: regn, mørke, hansker, stress, tidspress, ofte uten nett. Derfor:

- Store treffmål (min 44px; egen hanske-/feltmodus med enda større), enhåndsbruk.
- Mørk modus er FØRSTEKLASSES (nattbruk), ikke en ettertanke. WCAG AA-kontrast må holde i BÅDE lyst og mørkt tema. (Vis alltid begge.)
- Lite tekst, høyt skanbart under stress. Tydelig visuelt hierarki — ikke alt i tyngste skriftvekt.

## To moduser ved oppstart — HARDT SKILLE

En landingsskjerm velger modus. Hver modus har sitt eget visuelle uttrykk, men deler samme designsystem-grunnmur (tokens/komponenter) for vedlikehold. Bytte er sjeldent, men det skal alltid finnes en tydelig vei tilbake til modusvalget.

1. **PERSONLIG** — for Sivilforsvarets eget mannskap, deres private beredskap. Roligere, forberedende tone (ikke tidskritisk). Innhold:
   - Pakk sekken/baggen som en RUNBOOK (steg for steg, kryss av, «hvorfor»/tips per punkt), tilpasset tjenestens utstyrskrav.
   - Egenberedskap-tips, klargjøring før vakt/utkalling, personlig verneutstyr, helse/søvn/utholdenhet, hva du gjør ved varsling.

2. **INNSATS** — operative verktøy (det appen gjør i dag). Stramt, funksjonelt, tidskritisk, kildebelagt. Må romme:
   - Oppdrag med faser Før → Under → Etter (se runbook-flyt under).
   - Tiltakskort: tittel, prioritet, rolle/fase/scenario, «Ikke gjør», sikkerhet, nummererte steg med VALGFRI «vis hvordan»-utvidelse + illustrasjon per steg, kilder/kildestatus.
   - Sjekklister (avkryssing + valgfritt notat/materiellstatus per punkt).
   - 5-punktsordre og sambandsplan (med eksport), feltlogg, etterrapport.
   - Kart (offline + skjematisk fallback), søk, kompetanse-gating, rollelinse (mannskap/lagfører/leder), spesialistmoduler (RADIAC/CBRN/MFE/tilfluktsrom).
   - Scenarioer: brann/skogbrann, flom, søk og redning, CBRNE, RADIAC, MFE, tilfluktsrom, generelt.

## Runbook-flyt (kjerneønske — gjelder begge moduser)

Mer guidet «gjør dette NÅ → neste» enn dagens app. Led alltid med det aktive steget; governance/kilder ligger ett tapp unna og skal aldri skyve instruksjonen ut av skjermen.

- Innsats: oppdraget glir gjennom Før→Under→Etter. Hver fase er en runbook med ett aktivt steg av gangen («Gjort · neste», «Hopp over», kildehenvisning, «vis hvordan»). Når fasens påkrevde steg er gjort, vises en tydelig ETT-TAPPS «Gå til neste fase»-knapp (ikke automatisk). En alltid-synlig fase-stepper (Før·Under·Etter) lar deg bevege deg fritt; fremdrift bevares per fase.
- Personlig: pakking/egenberedskap som samme type runbook.

## Harde rammer (må respekteres i forslaget)

- Offline-først: må fungere uten nett og med skjematisk kart-fallback.
- Streng CSP: INGEN innebygd video/eksterne iframes. Eksterne lenker åpner nett og merkes tydelig «krever nett».
- Personvern: ingen persondata/pasientdata; eksport saniseres; alt lokalt.
- Språk/tone: norsk, profesjonelt for Sivilforsvaret. Rolig, presis, operativ, ingen hype. UI må ALDRI fremstå som offisiell ordre/kommando eller fasit — det er støtte.
- Tilgjengelighet: kontrast AA i begge tema, hanskevennlige mål, «prefers-reduced-motion».

## Lever dette (i denne rekkefølgen, men dekk hele appen)

1. Informasjonsarkitektur for begge moduser + landingsvalget (sitemap/flytkart).
2. Felles designsystem: fargetokens (lyst+mørkt), typografi-skala med tydelig hierarki, og kjernekomponenter — runbook-steg, tiltakskort, sjekklistepunkt, statuspiller, varsler («Ikke gjør»/sikkerhet), fase-stepper, bunnnav, modusbryter. Vis hvordan Personlig og Innsats skiller seg visuelt men deler grunnmuren.
3. Nøkkelskjermer i høy kvalitet:
   - Landing/modusvalg.
   - Personlig: pakk sekken-runbook, egenberedskap-oversikt.
   - Innsats: hjem/oppdrag, runbook Før→Under→Etter, tiltakskort-detalj med «vis hvordan», sjekkliste, 5-punktsordre, kart/logg, etterrapport, søk.
4. Vis HVER nøkkelskjerm i både lyst og mørkt tema, pluss én felt-/hanskevariant.
5. Tomme tilstander, lastetilstander, offline-tilstand og feiltilstander.
6. Interaksjonsbeskrivelse for runbook-glidingen og ett-tapps faseovergangen.
7. Korte begrunnelser for de viktigste valgene.

Mål: et forslag en kompetent innsatsleder/lagfører faktisk kan bruke i felt, og som en mannskapsperson kan bruke hjemme til å gjøre seg klar. Tillitsvekkende og myndighetsnært — uten å late som det er offisiell ordre.

## Prosesstips

Selv om omfanget er «hele appen», be Claude Design levere i rekkefølgen over (designsystem + IA først, så skjermer). Be eksplisitt om begge temaer på hver skjerm — dagens app fikk en alvorlig mørk-modus-kontrastbug fordi mørkt tema var en ettertanke. Last opp et par skjermbilder av dagens app som «før».

## Scenario-spesifikke kartverktøy

Egne, kartdrevne planleggingsverktøy (skogbrann pumpe/slange, søk-og-redning IPP) har egen brief — se `docs/design-brief-scenario-map-tools.md`.
