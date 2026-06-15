# SFK-demonstrasjonsvideoer — kildeoversikt og kobling mot appen

Kilde: Sivilforsvarets kompetansesenter (SFK) på Vimeo — https://vimeo.com/sivilforsvaret/videos (50 videoer).
Hentet 2026-06-14. **Merk:** kun *titler* er lest (videoinnholdet er ikke sett/transkribert). 49 av 50 titler er fanget; én kan mangle. Vimeo-IDer er **ikke** fylt inn — de må hentes per video fra kanalen (ikke gjett/syntetiser IDer).

## Hvorfor dette er viktig

Videoene er i hovedsak strukturerte «slik gjør du»-instruksjoner, ofte i nummererte deler. Det treffer appens svakeste punkt — «hva, ikke hvordan»-gapet som startet UX-gjennomgangen (`docs/ux-review-2026-06-13.md`). Særlig pumpe- og førstehjelpsvideoene er nøyaktig den demonstrasjonen `flom-pumpe-*`, `brann-vannforsyning-slange` og `akutt-113-livreddende-forstehjelp` mangler. Dette er en autoritativ kilde for **R2** (per-steg «hvordan») og **R4** (skaff hvordan/hvor-illustrasjoner) i `docs/ux-fix-plan-2026-06-13.md`.

Strukturen «Klar til innsats → Oppstart og drift → MBK/repetisjon» speiler dessuten Før→Under-progresjonen i fase-funksjonen: klargjøring = Før, drift = Under.

## Inventar (gruppert)

**Pumper / vannforsyning (lensing)**
- Honda lensepumpe — Del 1 «Klar til innsats», Del 2 «Oppstart og drift», Del 3 «MBK», + Repetisjon
- Ziegler — Del 1 «Klar til innsats», Del 2 «Start og drift», Del 3 «MBK», + Repetisjon
- Otterpumpe — Del 1 «Klar til innsats / MBK», Del 2 «Start og drift», Del 3 «Trykkforsterkning», + Repetisjon

**Førstehjelp**
- Tornique (tourniquet), Trykkbandasje, Pakking (sårpakking)

**Trafikkdirigering** — intro + Del 1–8 (9 videoer)

**Områdebelysning** — Full HD, Del 1 «Kassens innhold», Del 2 «Oppsett av lampen», Del 3 «Lys og justeringer», Del 4 «Eksempel ute»

**Rens / CBRN**
- Avkledningsdrill på improvisert renseplass (IRP)
- Makkersjekk (verneutstyr / buddysjekk)
- Brenning av CS-tabletter

**Ledelse / ordre**
- 5-punktsordre
- Sykkelhjulmodellen (×2 — sannsynlig beslutnings-/ledelsesmodell, **verifiser mot fagperson**)
- Guide til PLIS i felt — kortfilm for befal

**Annet utstyr / drift**
- Oppsett av VA-M 15 (telt) — Vimeo-ID 251796770
- Branntrekanten (brannteori)
- Fox 4 — MBK / Drift / KTI (**uidentifisert utstyr — avklar**)
- MHSFD_ATV-opplæring
- Avviksregistrering på avvik.dsb.no

**Ikke operativt (promo/rekruttering)** — Promovideo #1–3, Promo_Hovedvideo, «Dette er Sivilforsvarets kompetansesenter», LIA 10 Rekrutteringsfilm

## Kobling video → tiltakskort

| Videogruppe | Relaterte kort-slugs |
|-------------|----------------------|
| Pumper (Honda/Ziegler/Otter) | `flom-pumpe-start`, `flom-pumpe-vannforsyning`, `brann-vannforsyning-slange`, `pumpe-stromfare` |
| Førstehjelp (tourniquet/trykkbandasje/pakking) | `akutt-113-livreddende-forstehjelp`, `samleplass-skadde-start`, `samleplass-skadde-utvidet` |
| Trafikkdirigering | `rute-og-evakueringsvei`, `evakueringsstotte`, `kjoretoy-transportberedskap` (+ kandidat: eget trafikkdirigeringskort) |
| Rens/IRP/makkersjekk | `mre-rens-start`, `mre-ren-uren-side-grovrens`, `cbrne-verneutstyr-stoppkriterier`, `cbrne-soneinndeling` |
| 5-punktsordre / sykkelhjulmodellen / PLIS | 5-punktsordre-funksjonen, `ledelse-kommando-kontroll`, `obbo-beslutningssloyfe` |
| Områdebelysning | kandidat: eget oppsett-/under-innsats-kort |
| Branntrekanten | `skogbrann-startkort`, brann-kort (bakgrunn/teori) |
| Avviksregistrering | RUH/avvik-flyt i oppdrag |

## Hull i kortdekningen som videoene avdekker

- **Trafikkdirigering** har en stor egen serie hos SFK, men appen har ikke et dedikert tiltakskort. Kandidat til nytt, kildetro (fagperson-gatet) kort.
- **Områdebelysning** (oppsett under innsats) — ikke et tydelig eget kort i dag.

## Begrensninger (viktig før noe legges synlig i appen)

- **Offline-først + streng CSP** (`connect-src 'self'`): videoene kan **ikke** embed-es eller streames i appen. Kun som **utlenke** som åpner nettleser (fungerer ikke offline — må merkes tydelig).
- **Opphavsrett:** dette er SFKs filmer. Utlenking og særlig reproduksjon av stillbilder krever **SFK-tillatelse**. Følg samme kildedisiplin som ellers (`approvedForPublication` / `publicationStatus`). Ikke vis i appen før tillatelse er bekreftet.
- **Innhold ikke verifisert:** kun titler er lest. Noen må se hver film før den blir til app-innhold/«hvordan»-steg.
- **Verifiser:** «MBK», «Fox 4», «Sykkelhjulmodellen» bør avklares med fagperson.

## Slik legges de inn i appen (riktig måte)

Ikke press videoene inn i `SourceDocument`-skjemaet — det krever `body`-tekst og en `source-extracts/...md`-sti, og en video har ingen av delene. Bruk en **egen, liten innholdstype** (data finnes i `content/curated/reference-videos.yaml`). Wiring (for Claude Code):

```
Funksjon: Wire inn eksterne demonstrasjonsvideoer (SFK/Vimeo) som en egen
kildetype i innholds-pipelinen, og vis dem i appen — offline-trygt, CSP-trygt og
med opphavsretts-gating. Dataen finnes allerede i
content/curated/reference-videos.yaml. Bakgrunn: docs/sfk-video-sources.md.

Kontekst (verifisert):
- compile-curated.ts (scripts/) leser en EKSPLISITT liste curated-YAML-filer ved
  navn og skriver speilet JSON via writeMirroredJson til content/generated/ +
  public/generated-content/. reference-videos.yaml er ennå ikke i den lista, så den
  er i dag inert.
- load-content.ts validerer hver generert fil mot Zod (tom/ugyldig fil kaster).
- Appen er offline-først med streng CSP (connect-src 'self'): ingen eksterne
  runtime-fetches, ingen iframe/embed. Kun brukerinitierte utlenker er greit.

Implementer:

1) Skjema i lib/content/schemas.ts:
   export const ReferenceVideoSchema = z.object({
     id: <lowercase kebab-case slug-mønster som de andre>,
     title: z.string().min(1),
     publisher: z.string().min(1),
     channelUrl: z.string().url(),
     vimeoId: z.string().regex(/^\d+$/).nullish(),   // null/utelatt tillatt
     topic: z.string().min(1),
     relatedCardSlugs: z.array(z.string()).default([]),
     permissionStatus: z.enum(['needs-permission','approved','denied']).default('needs-permission'),
     note: z.string().optional(),
   });
   Eksporter type ReferenceVideo.

2) Pipeline:
   - I scripts/compile-curated.ts: les content/curated/reference-videos.yaml med
     readYamlArray(..., ReferenceVideoSchema.parse) og skriv
     reference-videos.json via writeMirroredJson (samme mønster som image-metadata).
   - I lib/content/load-content.ts: getReferenceVideos(): ReferenceVideo[] som
     leser reference-videos.json (samme loadArray-mønster som getImageMetadata).
   - Kjør npm run build:content og npm run check:generated.

3) Integritets-/innholdstest (tests/content/):
   - Hver relatedCardSlug må peke på et eksisterende action card.
   - En video som er 'approved' må ha vimeoId ELLER channelUrl (en lenkbar URL).
   - permissionStatus default 'needs-permission'.

4) UI — vis KUN entries med permissionStatus === 'approved':
   a) En seksjon "Demonstrasjonsvideoer (eksterne)" på /kilder
      (app/(app)/kilder/page.tsx): liste med tittel, publisher og én lenke.
      URL: vimeoId ? `https://vimeo.com/${vimeoId}` : channelUrl.
   b) På tiltakskort-detaljen (components/action-card-detail.tsx): hvis en approved
      video har card.slug i relatedCardSlugs, vis en tydelig sekundær lenke
      "Se offisiell demonstrasjon (åpner nett)".
   - ALLE lenker: <a href target="_blank" rel="noopener noreferrer">. ALDRI iframe/
     embed (bryter CSP). Merk synlig at det krever nett / ikke virker offline
     (f.eks. liten "åpner nett"-etikett).
   - Tema-trygt: solide palettklasser / operational-primitives, ingen gradient/
     opacity-suffiks-bg (vakt-testen tests/theme/no-untheme-safe-backgrounds håndhever).

Akseptansekriterier:
- Ingen video vises med mindre permissionStatus === 'approved' (alle er
  'needs-permission' nå, så UI-en er tom inntil noen godkjennes — det er meningen).
- Ingen iframe/embed; kun target=_blank-utlenker; offline-merking synlig.
- relatedCardSlugs valideres mot eksisterende kort (test).
- npm run build:content + check:generated grønt; npm run check:ci grønt.

Begrensninger: følg CLAUDE.md. Opphavsrett: dette er SFKs filmer — ikke vis/lenke
før permissionStatus settes 'approved' (krever bekreftet tillatelse). Ikke fyll inn
vimeoId du ikke har verifisert. Behold offline-først, CSP og personvern-grensene.
```
