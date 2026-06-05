# Field testing guide

## Mål

Felt test skal dokumentere evidence / bevis for at appen fungerer under realistisk lys, stress, hansker, lav dekning og offline. Bruk testscenario, ikke ekte hendelse.

## Test map/log/Feltmodus-flyten

Kjør minst én tørrtest med ufarlige testdata før en øvelse eller pilot:

1. Åpne appen online, installer/hjemskjerm hvis relevant, og vent til offline-status/service worker er klar.
2. Opprett et lokalt testoppdrag og velg aktivt oppdrag.
3. Åpne `/kart`, velg en godkjent lokal kartpakke eller dokumenter fallback til skjematisk kart, og bekreft at ingen eksterne tile-provider-kall skjer.
4. Legg inn en testmarkør og en testsektor med skjematiske 0-100-koordinater.
5. Bruk `Logg herfra` fra markøren/sektoren og kontroller at feltloggen vises i `/oppdrag` under `Kart og logg` og `Loggoversikt`.
6. Gå til Feltmodus med hanskemodus, bruk hurtighandling til `Hurtiglogg`, lagre en kort testlogg, og bekreft at den er synlig i aktivt oppdrag.
7. Slå på flymodus/lav dekning etter at appen er lastet, åpne `/kart`, `/oppdrag` og `/feltmodus`, og kontroller at arbeidskopien fortsatt er tilgjengelig.
8. Generer etteraksjonsrapport og Oppdragsmappe med bare saniterte testdata; kontroller at map package-metadata viser trygg `packageId`, tittel, attribusjon, versjon og proveniens uten tile-URL-er.

## Evidence som skal samles

Registrer enhet, nettleser, OS-versjon, innholdsversjon, app-SHA hvis tilgjengelig, nettverksstatus, kartpakke/fallback, pass/fail, observasjoner om lys/hansker/stress og skjermbilder uten persondata. Noter om MapLibre/PMTiles var brukt eller om fallback til skjematisk kart ble brukt.

Avvik legges i teknisk gjeld eller roadmap med reproduksjonssteg, forventet resultat, faktisk resultat og om det blokkerer feltbruk.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
