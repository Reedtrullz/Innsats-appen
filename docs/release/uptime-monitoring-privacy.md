# Uptime monitoring compatible with privacy boundary

## Public synthetic checks only

Task 391 bruker `.github/workflows/monitoring.yml` til syntetiske offentlige GET-sjekker. Workflowen sjekker bare disse offentlige URL-ene:

- `/api/health` — offentlig helsestatus og versjon, uten brukerdata.
- `/` — appskall.
- `/nytt` — release notes fra generert offentlig innhold.
- `/release` — release board.
- `/generated-content/manifest.json` — offentlig generert manifest.
- `/sw.js` — service-worker asset.

Ingen persondata, ingen cookies, ingen localStorage, ingen IndexedDB, ingen private posisjoner, ingen push-varsling og ingen browserprofildata hentes. Responsbody kastes for uptime-sjekken.

## Varsling ved stale innhold

Samme workflow kjører `npm run report:stale-content`. Hvis rapporten har funn, opprettes eller oppdateres én åpen GitHub Issue med privacy-safe innhold.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
