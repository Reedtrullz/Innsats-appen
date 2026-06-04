# Stale content notifications

## Automatisk rapport

Task 412 bruker `npm run report:stale-content` for å skrive stale content rapport til stdout. Rapporten inneholder kilde-ID, tittel, eier, reviewer og dato, men ingen persondata og ingen kilde-body.

## Scheduled notification

`.github/workflows/monitoring.yml` kjører rapporten på schedule. Når rapporten har funn, opprettes en GitHub Issue med routing `content-maintenance`. Når rapporten sier `No stale or expired content`, sendes ingen issue.

## Lokal bruk

Kjør `npm run report:stale-content` før pilot/release for å se samme privacy-safe rapport lokalt. Bruk kilde-ID i repoet til å gjøre redaksjonell review; ikke kopier persondata eller skjermede opplysninger inn i saken.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
