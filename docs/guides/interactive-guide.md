# Interactive guide for key functions

## Når denne guiden brukes

Task 406 dekker en interaktiv guide etter UI stabiliseres / after UI stabilizes. Denne guiden kan kjøres som en manuell walkthrough i staging/pilot: ikke spill inn persondata, ikke spill inn ekte hendelsesdata, og bruk bare demooppdrag.

## Demo-oppsett

- Bruk bare demooppdrag: `Demo øvelse Trondheim sentrum`.
- Bruk offentlig sted eller `Testområde A`.
- Ikke bruk ekte hendelsesdetaljer, personnavn, telefonnummer, private posisjoner eller reelle Nødnettgrupper.
- Kjør mot staging eller lokal production build for opplæring; ikke presenter dette som offisiell ordre.

## Modul 1: Finn tiltakskort

1. Åpne `/hurtigkort`.
2. Søk etter `flom`, `tilfluktsrom` eller `førstehjelp`.
3. Åpne ett kort og pek ut kilde-/varselstatus.
4. Forklar: lokal ordre og offisielle kilder gjelder alltid.

Forventet resultat: deltaker kan finne et relevant kort og forklare hvorfor kildestatus må sjekkes.

## Modul 2: Opprett lokal øvelse

1. Åpne `/oppdrag/ny`.
2. Tittel: `Demo øvelse Trondheim sentrum`.
3. Rolle/fase/scenario velges med demoverdier.
4. Lagre oppdraget.
5. Vis at data ligger lokalt og ikke synkes til backend.

Forventet resultat: oppdraget vises lokalt, og deltakeren kan forklare lokal-only grensen.

## Modul 3: Kjør sjekkliste

1. Åpne et relevant tiltakskort eller sjekkliste.
2. Marker ett ufarlig demo-steg.
3. Pek ut `påkrevd`/varseltekst og stoppkriterier.
4. Ikke legg inn pasientdata eller reelle operasjonsdetaljer.

Forventet resultat: deltaker forstår at sjekklisten er støtte, ikke journal eller ordre.

## Modul 4: Eksporter anonym status

1. Åpne `/data-pa-enheten`.
2. Eksporter bare hvis demooppdraget ikke inneholder sensitiv informasjon.
3. Forklar at eksportfil kan inneholde lokalt skrevet operativ informasjon og må håndteres som sensitiv hvis brukeren har skrevet sensitivt innhold.
4. Ikke del filen uten kontroll.

Forventet resultat: deltaker kan eksportere demo-data og forklare risikoen.

## Modul 5: Offline-smoke

1. Åpne `/hurtigkort`, `/oppdrag`, `/nytt` og `/release` mens online.
2. Slå av nettverk.
3. Last sidene på nytt.
4. Kontroller at app-skallet og offentlig generert innhold fortsatt er tilgjengelig eller viser tydelig fallback/stale-status.

Forventet resultat: deltaker ser offline-grensen og vet at live varsling/sync ikke finnes i MVP.

## Stoppsignaler

Avbryt guidet gjennomgang hvis noen begynner å skrive persondata, private posisjoner, ekte pasient-/hendelsesdetaljer, reelle Nødnettgrupper eller skjermet informasjon. Slett demooppdrag og browser/site data etter opplæring ved behov.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
