# Design-brief — scenario-spesifikke kartverktøy (Claude Design)

Utvider `docs/design-brief.md`. Gjelder Innsats-modus. Samme harde rammer (offline-først, streng CSP, ingen persondata, mørk modus + feltmodus førsteklasses, beslutningsstøtte — ikke ordre). To kartdrevne planleggingsverktøy: skogbrann-vannforsyning og søk-og-redning.

Prompten under er klar til å limes inn i Claude Design.

```
DESIGN-BRIEF — Scenario-kartverktøy (Innsats-modus)

Dette utvider hoved-briefen for Beredskapsboka/Innsats-appen. Samme rammer gjelder:
offline-først (MapLibre + lokale PMTiles-kartpakker, med skjematisk kart-fallback når
data mangler), streng CSP (ingen eksterne kall i drift), ingen persondata, norsk,
mørk modus + feltmodus/hansker førsteklasses, WCAG AA i begge tema. ALT som
foreslås er BESLUTNINGSSTØTTE — rådgivende anslag, aldri ordre eller fasit.
Innsatsleder/lagfører beslutter; appen viser forslag + begrunnelse + usikkerhet.

Felles for begge verktøy
- Kjerneinteraksjon: trykk på kartet for å plassere/justere punkter; flyttbare
  markører; lag-bryter (kartlag, forslagslag, søkte/dekkede områder). Fungerer med
  skjematisk fallback når kartdata er tynt.
- Hvert forslag vises som et "rådgivende resultatkort": forslaget + KORT begrunnelse
  ("hvorfor") + forutsetninger + et usikkerhets-/konfidensnivå + en tydelig
  "overstyr / juster manuelt"-vei. Aldri presenter som autoritativt.
- Auto-forslag krever kartdata (vann, høyde, stier) som den offline pakken kanskje
  IKKE har. Design derfor to nivåer side om side: (1) "Foreslått (fra kartdata)" når
  data finnes, og (2) "Assistert/manuell" der brukeren markerer selv og appen regner
  ut avstander/behov fra det markerte + innskrevne parametre. Begge skal være
  fullverdige; manuell modus er normaltilfellet offline.
- Knytt verktøyene til oppdraget: resultater kan logges i feltlogg og mates inn i
  5-punktsordre/sambandsplan-eksport. Lenk til relevante tiltakskort og "vis hvordan".
- Foregrunn sikkerhet/usikkerhet: relevante farer alltid synlige (brannspredning, vær/
  vind, terreng, strøm-/vannfare, utmattelse). Algoritmen designes ikke her — design
  hvilke inndata brukeren gir, hvordan forslag og usikkerhet vises, og overstyring.

VERKTØY 1 — Skogbrann: vannforsyning og pumpeplan
Inndata brukeren gir på kartet:
- Markér hvor det brenner / brannfront (punkt eller linje). Valgfritt: vindretning,
  spredningsretning, terreng.
- Bekreft/markér vannkilde(r) (åpent vann, dam, hydrant). App kan foreslå nærmeste
  egnede kilde HVIS kartdata finnes; ellers markerer brukeren.
- Parametre: slangelengde/diameter tilgjengelig, pumpetype/kapasitet (gjerne forhåndsvalg
  fra materiell), antatt sugehøyde.
Forslag/visualisering (rådgivende):
- Rangerte vannkilder (avstand, antatt sugehøyde/gjennomførbarhet, kapasitet).
- Slangeutlegg-trasé fra kilde mot brann, med avstandsmarkører.
- HVOR det trengs trykkforsterkning (relé-/seriepumpe) — basert på avstand, høydestigning
  og friksjonstap — vist som punkter langs traséen, med antatt restkapasitet.
- Retrettvei og faresoner (strømfare, undergraving, ukjent forurensning).
Hvert forslag: begrunnelse + forutsetninger + usikkerhet + overstyr. Lenk til
pumpe-tiltakskortet og "vis hvordan" (offisielle SFK-demovideoer som referanse).

VERKTØY 2 — Søk og redning: søkeplanlegging
Inndata brukeren gir på kartet:
- Plassér IPP (Initial Planning Point), evt. PLS (Point Last Seen) / LKP (Last Known
  Position).
- Savnet-KATEGORI (f.eks. barn, person med demens, turgåer, despondent) — KUN
  ikke-identifiserende planattributter. INGEN persondata/navn (personvern).
- Tid siden savnet (start/varighet). Terreng/ledelinjer (vassdrag, stier, rygger).
- Markér FUNN av gjenstander/spor med type og tidspunkt.
Forslag/visualisering (rådgivende, kildebelagt):
- Sannsynlighetsringer/-soner basert på statistikk om savnetatferd for valgt kategori
  (teoretisk søkeradius). Tall/avstander MÅ være kildebelagt — ikke oppdiktet — og
  merkes som planleggingsstøtte med usikkerhet.
- Prioriterte søkesegmenter (sannsynlighet for område), oppdatert når funn legges inn
  (vekt forskyves mot funnsted).
- Råd til neste skritt basert på kategori + forløpt tid + topografi (f.eks. sjekk
  vassdrag/drenering, stier, bygninger). Spor søkte/dekkede segmenter.
Foregrunn: dette er planleggingsstøtte, ikke en fasit; innsatsleder beslutter. Vis
kilder/forutsetninger og usikkerhet tydelig.

Tilstander å designe (begge verktøy)
- Tomt (ingen punkter plassert ennå) med tydelig "start her".
- Offline / lite kartdata → assistert/manuell modus.
- Beregner / oppdaterer etter nye inndata.
- Ingen/utilstrekkelig grunnlag for forslag (si det ærlig, tilby manuell vei).
- Motstridende/usikre inndata.

Lever
1) Kartskjermene for begge verktøy: plasser-inndata, forslagslag, resultatkort.
2) "Rådgivende resultatkort"-komponenten (forslag + hvorfor + forutsetninger +
   konfidens + overstyr) — gjenbrukbar for begge.
3) Interaksjonsflyt: plasser → få forslag → juster/overstyr → logg/eksporter.
4) Hver nøkkelskjerm i lyst OG mørkt tema + en felt-/hanskevariant.
5) Tomme/offline/beregner/ingen-resultat-tilstandene over.
6) Hvordan verktøyet kobles inn i oppdrag/runbook, feltlogg og ordre-/sambandseksport.

Rammer (gjenta): offline-først + skjematisk fallback; streng CSP (ingen eksterne kall);
ingen persondata (SAR: kun kategori/tid, aldri identitet); beslutningsstøtte, ikke
ordre; norsk; mørk modus + feltmodus; AA-kontrast i begge tema.
```
