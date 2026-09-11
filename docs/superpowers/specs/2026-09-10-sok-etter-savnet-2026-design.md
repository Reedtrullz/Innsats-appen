# Design: kunnskapsdatabase for søk etter savnet på land 2026

**Status:** Draft for user review
**Dato:** 2026-09-10
**Kilde:** *Nasjonal veileder for redningstjenesten ved søk etter savnet person på land*, nivå 3, 2026

## Mål

Integrere den nye veilederen i Beredskapsboka som kildebelagt, søkbar og offline-tilgjengelig operativ kunnskap. I tillegg skal det finnes en egen studieflate som gjør det tydelig hva som er nytt eller særlig fremhevet i 2026-veilederen før neste søk- og redningsaksjon.

Løsningen skal støtte læring og feltforberedelse. Den skal ikke være et offisielt aksjons-, samband-, journal- eller sporingssystem.

## Kilde- og publiseringsgrense

PDF-en beholdes utenfor kodebasen. Det opprettes et kort, strukturert kildeuttrekk i Beredskapsboka-kunnskapsbanken med:

- tittel, utgave, utgiver og sidetall
- lokal kildefil og SHA-256 `104283948169d7b5f257f553446d23f9803d89182425870cb302fc0ed244cd34`
- tematiske sammendrag og sidereferanser
- eksplisitt merking av at innholdet må faglig gjennomgås før det brukes som gjeldende operativ fasit

Kildeuttrekket er en parafrase og arbeidskilde, ikke en gjengivelse av hele veilederen. Det skal ikke inneholde ekte sambandstalegrupper, tilgangskoder, personopplysninger, pasientopplysninger, private koordinater eller andre aksjonssensitive detaljer.

Den nye kilden registreres som `unverified`/høy gjennomgangsrisiko inntil fagperson har vurdert den. Nye og endrede operative kort merkes `pending-fagperson`. Formuleringen «nytt i 2026» avgrenses til veilederens egne fremhevede endringer, særlig kapitlene 5, 6, 7 og 12; løsningen påstår ikke å være en komplett linje-for-linje-sammenligning med tidligere utgaver.

## Brukerutfall

En bruker skal kunne:

1. finne søk- og redningskunnskap via eksisterende kort, sjekklister, begreper og fritekstsøk
2. åpne `/nytt/sok-og-redning` fra «Hva er nytt» og «Må leses»
3. skumme en kort studiepakke med tydelig prioritering før neste aksjon
4. gå fra hvert læringspunkt til relevant operativt kort eller sjekkliste
5. bruke innholdet uten nett etter at appinnholdet er bygget og lastet lokalt
6. se kilde- og gjennomgangsstatus uten at en lokal avkryssing tolkes som sertifisering eller ordre

## Valgte arkitekturbeslutninger

### Én ny innholdstype for studiepakken

Det opprettes én minimal `StudyGuide`-type i den eksisterende YAML → generert JSON → loader → side-pipelinen. `TrainingPath` gjenbrukes ikke, fordi den eksisterende typen beskriver kurs- og kompetanseløp, mens dette er en kildeorientert, kortvarig studiepakke.

Studieguiden inneholder:

- `slug`, tittel, sammendrag, målroller og anslått tidsbruk
- `mustStudyBeforeNextSearch: true`
- `sourceIds`
- `provenanceNote` med utgave, kildeidentifikasjon og SHA-256 for visning i kildekortet
- ordnede seksjoner med tittel, sammendrag, nøkkelpunkter, `linkedCardSlugs` og `linkedChecklistSlugs`
- `updatedAt`

Det bygges ikke quiz, poeng, sertifikat, progresjonsmotor eller ny brukerprofil. «Jeg har lest» bruker eksisterende lokale må-leses-acknowledgementer.

### Direkte kobling fra må-leses

`MustReadNotice` utvides med en valgfri liste `linkedStudyGuideSlugs`. Dermed kan må-leses-siden lenke direkte til studiepakken uten hardkodet kunnskap om en bestemt URL. Eksisterende varsler får tom standardliste.

`ContentRef` utvides med typen `study-guide`, slik at endringsloggen kan referere til studiepakken og den genererte innholdsmanifesten fortsatt kan valideres samlet.

### Eksisterende innholdsflater beholdes

Operativ kunnskap legges i eksisterende `ActionCard`, `OperationalChecklist`, `GlossaryTerm` og `FAQEntry` der formatet passer. Studiepakken er navigasjon og komprimert læring, ikke en parallell kopi av alle kort.

## Innholdspakke

### Operative kort og sjekklister

Eksisterende søk- og redningskort oppdateres med kildebelegg og 2026-relevante presiseringer. Det legges til eller oppdateres bare det minste settet som dekker disse arbeidsområdene:

- sikker situasjonsvurdering, egenberedskap og dynamisk risikovurdering
- førsteinnsats, IPP, ledelinjer, punkter og rask ressursutnyttelse
- IL-KO, fagleder søk, søksplanlegger, ressurskontroller og organisasjonsledere
- etterretning, hypoteser, observasjonskvalitet og beslutningsgrunnlag
- sykkelhjulmodellen og når den ikke er tilstrekkelig
- analysebasert og formell planlegging med POA, POD og POS
- søksfaser, kvalitetssikring, SEAO og avslutning
- ledeline-, punkt- og områdesøk, samt begrensningene ved hund, kjøretøy, drone og luftressurser
- uorganiserte frivillige, funn, førstehjelp, uttransport og håndtering ved mulig dødsfall
- FAKS, analogt KO, dokumentasjon og sambandsprinsipper uten virkelige aksjonsdetaljer

Minimum én eksisterende startkort- og én sektorrelatert sjekkliste skal oppdateres. Nye kort skal ha korte, handlingsrettede steg og tydelig sikkerhets-/gjennomgangsvarsel. «Søkeområde», «ledelinje» og «sporlogg» skal ikke omtales slik at en ledeline eller teknisk sensor automatisk betyr at et område er fullstendig gjennomsøkt.

### Begreper, spørsmål og søk

Kildepakken suppleres med de viktigste nye eller presiserte begrepene: IPP, LKP, POI, POA, POD, POS, ledeline, sykkelhjulmodellen, FAKS, SEAO og søksfaser. Det legges til korte FAQ-er for de vanligste overgangene fra veileder til praksis, særlig:

- når refleksbasert, analysebasert og formell tilnærming brukes
- hvordan sykkelhjulmodellen skal forstås
- forskjellen mellom POA, POD og POS
- hvordan funn, frivillige og analog drift håndteres

Søkesynonymer utvides med forkortelser og norske varianter som faktisk finnes i veilederen, slik at «IPP», «siste sikre observasjon», «FAKS», «POD» og «sykkelhjul» finner riktig innhold.

### Separat studieflate

`/nytt/sok-og-redning` skal være en enkel, mobil først-side med:

- tydelig varsel: studer før neste søk- og redningsaksjon; ikke offisiell ordre
- kort «hva er nytt/fremhevet»-sammendrag
- anbefalt leserekkefølge fra sikkerhet og førsteinnsats til planlegging, metoder, redning og kvalitetssikring
- nøkkelpunkter per seksjon
- lenker til de operative kortene og sjekklistene
- kildekort med utgave, hash, gjennomgangsstatus og lenke til registrert kildeinformasjon
- eksisterende lokale acknowledgement for må-leses

Siden skal være nyttig uten å late som om den erstatter lokal opplæring, gjeldende innsatsplan eller beslutningene til innsatsledelsen.

## Dataflyt og tekniske endringer

Implementasjonen følger eksisterende content-pipeline:

1. kildeuttrekk i Obsidian importeres som `SourceDocument`
2. `content/curated/study-guides.yaml` valideres sammen med eksisterende kuratert YAML
3. compiler skriver `study-guides.json` til både generated- og public-speilet og oppdaterer manifesttellingen
4. loader og søkeindeks eksponerer studieguiden
5. appen viser studiepakken og lenker til eksisterende innhold

Følgende berøringspunkter er forventet: schemas, compiler, content loader, søkedokumentbygger/-indeks, innholdsvalidering, studieguide-side, «Hva er nytt», «Må leses» og offline app shell. Ingen ny database, ekstern API, bakgrunnssynkronisering eller runtime-avhengighet skal innføres.

Søkeresultatet får en egen dokumenttype for studieguide, men bruker eksisterende indeks- og navigasjonsmønster. Offline-rutene inkluderer den nye siden og generert studieguideinnhold.

## Personvern, sikkerhet og operativ styring

- Ingen skjemaer for savnet-person-data, helseopplysninger, spor, aksjonslogg eller live-posisjon legges til.
- Eksempler og innhold skal bruke generiske plassholdere; reelle talegrupper, koder og koordinater skal ikke publiseres.
- FAKS omtales som verktøy og arbeidsform. Det bygges ingen FAKS-integrasjon eller påstand om at appen har tilgang til FAKS.
- Varsler om kilde- og faglig gjennomgang vises i både studieflaten og relevante operative kort.
- Lokale acknowledgement-data inneholder bare brukerens lokale lesestatus og sendes ikke ut.
- Kilde- og innholdsendringer skal kunne spores i changelog med dato og review-status.

## Verifikasjon og akseptanse

Automatisert verifikasjon skal minst dekke:

- schema-validering av studieguide, ny må-leses-kobling og changelogreferanse
- full `build:content`, inkludert source-linkage, manifest og generated/public-paritet
- at studieguide og nøkkelbegreper finnes i søkeindeksen
- at nye lenker og den nye ruten passerer typecheck, lint og produksjonsbuild
- at ingen kilde- eller kuratert tekst introduserer forbudte person-/sambands-/posisjonsdetaljer
- at offline-ruteoppsettet inkluderer `/nytt/sok-og-redning`

Manuell kontroll skal bekrefte mobil lesbarhet, tydelig varsel, fungerende lenker, tilbake/navigasjon, keyboard-fokus og at acknowledgement ikke ser ut som sertifisering. Det skal skilles mellom lokal deterministisk verifikasjon og fagpersonens godkjenning; kodekontroller kan ikke erklære veilederen operativt godkjent.

## Ikke med i denne leveransen

- automatisk innlesing eller synkronisering mot FAKS
- live-sporing, personkart, aksjonsjournal eller sambandstilkobling
- komplett historisk diff mot 2022-utgaven
- gjengivelse av veilederens skjemaer eller bilder
- formell sertifisering, kursbevis eller kompetanseregister
- pushvarsling eller ekstern distribusjon av må-leses-status

Dette kan vurderes senere etter faglig eieravklaring, men skal ikke skjules bak en lokal studieguide i denne endringen.

## Beslutningspunkt

Denne spesifikasjonen må godkjennes før implementeringsplan og kodeendringer. Etter godkjenning lages en kort implementeringsplan med testrekkefølge og konkrete filendringer.
