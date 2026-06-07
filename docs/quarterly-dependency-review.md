# Quarterly dependency review

## Kvartalsvis rutine

1. Kjør `npm audit --audit-level=high`.
2. Kontroller at package.json bruker eksakte versjoner, ikke carets.
3. Kontroller at GitHub Actions commit SHA pins fortsatt peker på ønskede upstream-versjoner før de oppdateres. Bruk upstream taggen kun til å slå opp ny SHA, aldri som workflow-pin.
4. Kontroller deploy-toolchain-pinner: `ansible==12.3.0`, `community.docker 5.2.1` i `deploy/requirements.yml`, og eksplisitt runner-image `ubuntu-24.04`.
5. Les teknisk gjeld for kjente moderate advisories.
6. Oppdater én avhengighet eller pin om gangen med `npm run check:ci`.

Dette er beslutningsstøtte for vedlikehold, ikke et offisielt endringssystem.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
