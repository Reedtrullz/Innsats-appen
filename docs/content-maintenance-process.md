# Content maintenance process

## Regular content update process from Beredskapsboka

1. Importer godkjente offentlige endringer fra Beredskapsboka/source extracts.
2. Oppdater curated YAML/Markdown kirurgisk.
3. Kjør `source ~/.nvm/nvm.sh && nvm use 22 && npm run build:content`.
4. Les `/nytt`, `/ma-leses`, warnings og coverage report.
5. Kjør stale-content rapport og planlegg redaksjonell review.

Ingen backend eller persondata inngår i innholdsprosessen.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
