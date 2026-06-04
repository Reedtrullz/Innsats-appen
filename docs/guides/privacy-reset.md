# Privacy reset guide

## Hva kan slettes i appen

Beredskapsboka har flere lokale datatyper. Det finnes ikke én knapp som garantert fjerner hele browserprofilen, service-worker cache og alle lokale innstillinger. Bruk riktig reset etter hva du vil fjerne:

1. `/oppdrag` → trykk `Slett lokale data` for å fjerne lokale oppdrag, arkiv og sjekklistekjøringer fra IndexedDB.
2. `/personvern` → bruk panelene der for å slette lokal profil, auditlogg, kompetansepåminnelser og retention-innstillinger.
3. Nettleser/PWA-innstillinger → bruk nettleserens “Clear site data” eller avinstaller PWA-en hvis også service-worker cache, cache storage og andre browserlag må fjernes.
4. `/data-pa-enheten` → brukes til eksport/import og lagringsoversikt, ikke som full reset-knapp.

## Før sletting

Eksporter bare hvis du har lov til å lagre lokal JSON for dette test-/demooppdraget. Ikke eksporter persondata, private posisjoner eller reelle skjermede opplysninger.

## Etter sletting

Last siden på nytt og kontroller at lokale oppdrag/profilfelt ikke vises. Hvis enheten skal lånes ut eller brukes i pilot, kontroller også browserens site data.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
