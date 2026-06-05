# Offline-use guide

## Installer og klargjør

1. Åpne appen på nett før avreise.
2. Installer/hjemskjerm der nettleseren støtter det.
3. Åpne `/offline`, `/feltmodus`, `/oppdrag`, `/kart`, `/hurtigkort` og relevante scenario-kort.
4. Opprett eller åpne aktivt lokalt oppdrag i `/oppdrag`.
5. Velg relevant lokal kartpakke på `/kart`, les attribusjon/proveniens, og lagre den lokalt hvis den er godkjent for øvelsen.
6. Gjør en kort test kartpakke og hurtiglogg offline før innsats: legg inn en ufarlig testmarkør, bruk `Logg herfra`, slå på flymodus, åpne `/oppdrag#hurtiglogg` fra Feltmodus og bekreft at loggen vises i `Loggoversikt`.
7. Bekreft at appen fungerer i flymodus.

## Kartpakker og fallback

MapLibre/PMTiles-kartpakker er valgfrie lokale assets. De skal lastes fra appens egne statiske `/map-packages/*`-filer, ikke fra Kartverket, OpenStreetMap, Statkart, Mapbox eller andre eksterne tile-providere under operativ bruk.

Hvis PMTiles ikke er tilgjengelig, ikke er cachet, mangler godkjent proveniens, eller enheten ikke klarer MapLibre-visning, bruk fallback til skjematisk kart. Skjematisk 0-100-kart er fortsatt støttet for markører, sektorer, `Logg herfra`, feltlogg, GeoJSON/SVG og Oppdragsmappe.

Kartet er beslutningsstøtte, ikke navigasjon, oppmåling, offisiell situasjonslogg eller kommandosystem.

## Operativ offlineflyt

- Før: cache appinnhold, velg aktivt oppdrag, klargjør kartpakke, test Feltmodus og hurtiglogg.
- Under: bruk `/kart` for lokale markører/sektorer, `Logg herfra` for kartkoblede observasjoner og `/oppdrag` for `Kart og logg`/`Loggoversikt`.
- Feltmodus: bruk store hurtighandlinger til `Kart`, `Hurtiglogg`, aktivt oppdrag, sjekkliste, 5-punktsordre, sambandsplan, statuseksport og søk.
- Etter: lag etteraksjonsrapport og Oppdragsmappe lokalt; kontroller at eksportene bare inneholder saniterte data og trygg kartpakke-proveniens.

## Viktig grense

Data synkroniseres ikke / ingen backend i MVP. Hvis enheten mistes eller nettleserdata slettes, forsvinner lokal arbeidskopi.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
