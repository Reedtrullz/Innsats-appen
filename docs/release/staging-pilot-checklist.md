# Staging pilot checklist

## Formål

Task 390 legger staging deployment før broader pilot / bredere pilot. Staging skal være en verifisert bygg- og innholdsversjon som brukes av testgruppe før flere mannskaper inviteres.

## Gate før pilot

1. Bygg med `npm run check:ci` på Node 22.
2. Kjør produksjons-E2E på staging-URL og arkiver SHA, innholdsversjon og dato.
3. Kontroller offline installasjon, `/nytt`, `/release`, `/data-pa-enheten`, `/oppdrag`, `/feltmodus` og personvern-reset.
4. Staging kan bare brukes med trygge testdata.
5. Rollback: behold forrige godkjente container/image og dokumenter kommando/ansvar før pilot åpnes.

## Go/no-go

Go krever grønn CI, grønn staging smoke, ingen høy-risiko privacy funn og en navngitt pilotkontakt. No-go ved brudd på offline, reset, source-warning eller release-notater.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
