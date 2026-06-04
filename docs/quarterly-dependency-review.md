# Quarterly dependency review

## Kvartalsvis rutine

1. Kjør `npm audit --audit-level=high`.
2. Kontroller at package.json bruker eksakte versjoner, ikke carets.
3. Les teknisk gjeld for kjente moderate advisories.
4. Oppdater én avhengighet om gangen med `npm run check:ci`.

Dette er beslutningsstøtte for vedlikehold, ikke et offisielt endringssystem.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
