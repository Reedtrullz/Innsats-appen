# Uptime monitoring compatible with privacy boundary

## Formål

Task 391 definerer uptime monitoring uten persondata. Monitoren skal bare hente syntetiske offentlige endepunkt og statiske sider: `/`, `/nytt`, `/release`, `/generated-content/manifest.json` og service-worker asset.

## Tillatt

- Synthetic GET/HEAD fra ekstern monitor.
- Statuskode, responstid, TLS-utløp og innholdsversjon.
- Varsel til pilot support når offentlig side er nede.

## Ikke tillatt

- Ingen persondata, cookies, lokale oppdrag, eksportfiler eller brukeridentifikatorer.
- Ingen push notification eller klientsporing.
- Ingen backend-sync eller live incident status.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
