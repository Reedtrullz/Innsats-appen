# Guide for distriktsledere to contribute approved content

## Godkjent innhold

Distriktsleder kan foreslå offentlig, godkjent innhold med kilde, eier, reviewer, verifiedAt og reviewAfter. Bidrag skal ikke inneholde persondata, private lokasjoner eller reelle operative grupper.

## Prosess

1. Finn offentlig kilde i Beredskapsboka eller godkjent distriktstekst.
2. Foreslå endring i Markdown/YAML med kilde-ID.
3. Kjør `npm run build:content` og kontroller warnings.
4. Fagansvarlig godkjenner før publisering.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
