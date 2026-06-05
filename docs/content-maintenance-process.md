# Content maintenance process

## Regular content update process from Beredskapsboka

1. Importer godkjente offentlige endringer fra Beredskapsboka/source extracts.
2. Oppdater curated YAML/Markdown kirurgisk.
3. Kjør `source ~/.nvm/nvm.sh && nvm use 22 && npm run build:content`.
4. Kjør `npm run report:source-governance` før pilotgodkjenning og løs hver refererte uverifiserte, draft, historiske eller utløpte kilde. `npm run report:source-governance:strict` er med vilje forventet å feile til pilot-scope-kildene er verifisert.
5. Les `/nytt`, `/ma-leses`, warnings og coverage report.
6. Kjør stale-content rapport og planlegg redaksjonell review.

Ingen backend eller persondata inngår i innholdsprosessen.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
