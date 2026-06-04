# Annual privacy impact assessment

## Omfang

Task 415 gjennomføres årlig eller før enhver funksjon som innfører konto, backend, synkronisering, innsending, pasient-/persondata eller offisiell integrasjon.

MVP har ingen tilsiktet persondata, ingen konto, ingen backend og ingen sentral behandling. Likevel kan lokal nettleserbehandling inneholde brukerinnskrevet sensitiv informasjon hvis retningslinjene brytes. Vurder derfor både appens design og faktisk pilotbruk.

## DPIA-sjekk

- Bekreft at eksport/import fortsatt er manuell, lokal og privacy-safe.
- Bekreft at appen fortsatt ikke samler inn private posisjoner, pasientdata eller identifiserbare opplysninger.
- Sjekk at `/personvern`, `/oppdrag` reset og browser/site-data-råd dekker sletting.
- Sjekk at nye integrasjoner ikke etablerer persondataflyt.
- Dokumenter beslutning: ingen DPIA nødvendig / DPIA nødvendig før endring / funksjon avvises.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
