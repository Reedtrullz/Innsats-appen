# Source and warning interpretation guide

## Hva kildevarsel betyr

Task 403 forklarer kilde- og varselstatus for mannskaper og ledere. Bruk appens labels slik:

- `Kilde fersk` / verified/current: kan brukes som beslutningsstøtte, men lokal ordre og offisielle kilder gjelder.
- `Ikke verifisert`: les som bakgrunn; ikke bruk som eneste grunnlag for tiltak.
- `Gjennomgang forfalt`: kilden har passert `reviewAfter`; fagansvarlig må revalidere før pilot/release.
- `Utløpt kilde`: innholdet er utgått eller passert `expiresAt`; ikke bruk som operativt grunnlag.
- `Høy kilde-risiko`: krever ekstra kontroll mot original kilde og lokal fagansvarlig.
- Draft/historical: forklarer kontekst, ikke gjeldende ordre.

## Kildegjennomgang versus publisering

Kildefelt har tre ulike betydninger og skal ikke tolkes som samme godkjenning:

- `status=verified` betyr at kildeinnholdet er strukturelt/kildefaglig gjennomgått: uttrekk, sti, eier/reviewer og revisjonsplan er gyldige for kilderekorden.
- `pilotReviewStatus=approved-for-pilot` betyr at kilden kan støtte operative kort og sjekklister i pilot. Manglende `pilotReviewStatus` får konservativ standardverdi `not-reviewed`.
- `publicationStatus=approved-public` betyr at genererte offentlige kildedokumenter kan vise kildebody eller utdrag. Manglende `publicationStatus` får konservativ standardverdi `needs-permission`.

Standardverdiene gjør gamle importer kompatible, men godkjenner ikke kilder. `npm run report:source-governance:strict` er derfor fortsatt forventet å feile til faktiske kildegodkjenninger er registrert eksplisitt.

## Eksterne varsler

MET/NVE/Kartverket/kommune-signaler er kontekst. De blir ikke offisiell ordre i appen, og appen er ikke koblet til Nødvarsel, CIM eller Nødnett.

## Handling

Ved gult/oransje/rødt, utløpt, høy-risiko eller forfalt innhold: åpne kilde, kontroller dato/status, og bruk lokal kommandolinje før beslutning.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
