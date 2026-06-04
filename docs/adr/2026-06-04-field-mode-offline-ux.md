# ADR: Feltmodus, offline-UX og lokal feltfeedback

Dato: 2026-06-04
Status: Akseptert for lokal/offline MVP

## Beslutning

Beredskapsboka får en dedikert `/feltmodus`-flate for feltbruk med:

- feltmodus-innstillinger lagret i lokal `localStorage`,
- hanskemodus med ekstra store berøringsmål,
- dag-, natt- og redusert-blått-lys-varianter,
- alltid synlig offline-status i app-skall og feltmodus,
- hurtighandlinger til lokal note/feltlogg, sjekkliste, 5-punktsordre, sambandsplan, statuseksport og søk,
- aktivt oppdrag-snarvei på hovedflater,
- stressvennlige tomtilstander,
- Web Speech API-vurdering og valgfri, fallback-basert diktering,
- lokal feltfeedback-prosess uten backend.

Dette er ikke et kommandosystem, ikke en offisiell logg, og ikke en datainnsamlingstjeneste.

## Avgrensning

MVP-en er lokal/offline/public:

- ingen backend-synk,
- ingen auth,
- ingen personregister,
- ingen pasientdata,
- ingen private lokasjoner,
- ingen opplasting av lyd, opptak eller feltfeedback,
- ingen påstand om offisiell ordre-/kommando-/journalsystemfunksjon.

## Feltmodus og hansker

Nye feltmodus-handlinger skal ha minst 48x48 px berøringsmål. Hanskemodus øker kritiske knapper til ca. 64 px høyde. UI-et prioriterer store kort, luft mellom handlinger og færre små lenker i operativ flate.

## Natt og redusert blått lys

Nattmodus er mørk og lokal. Redusert-blått-lys-modus er en separat varm variant fordi mørk modus alene ikke alltid er best ved nattvakt, vått utstyr eller skjerm med høy minimumslysstyrke. Begge må testes på faktisk enhet før feltbruk.

## Utendørs lesbarhet og scrolling

Review-punkter:

1. Lesbarhet i direkte dagslys og refleks.
2. Lesbarhet i nattmodus med lav lysstyrke.
3. Trykk med tørre og våte hansker.
4. Vertikal scrolling i regn uten krav om horisontal sveip.
5. Siste handling skal ikke skjules av bunnnavigasjon eller safe-area.

## Offline-indikator

Offline-status skal være persistent i app-skallet og synlig i feltmodus. Offline betyr at lokalt cachet innhold kan brukes, men ekstern kontekst kan være manglende eller stale. Brukeren må ikke tolke status som garanti for komplett oppdatert situasjonsbilde.

## Web Speech API

Web Speech API-støtte varierer mellom nettlesere. Chromium-baserte nettlesere har typisk mest støtte; Firefox/Safari kan mangle eller avvike. Diktering kan feiltolke fagord, tall, kanaler, stedsnavn og dialekter.

Beslutning:

- voice input er valgfritt,
- tekstfelt/manuell input er alltid fallback,
- bruker må se nøyaktighets- og personvernadvarsel,
- Beredskapsboka implementerer ingen skybasert talegjenkjenning,
- Beredskapsboka laster ikke opp opptak,
- det skal ikke dikteres persondata, pasientdata, private lokasjoner eller skjermet operativ informasjon.

## Feltprøving med mannskaper

Prosess:

1. Kjør kort scenario med regn/våte hender, hansker, natt/ute og offline.
2. Be mannskap finne feltmodus, oppdrag, sjekkliste, 5-punktsordre, sambandsplan, eksport og søk uten forklaring.
3. Observer feiltrykk, scroll-problemer og stresspunkter.
4. Fang kun anonym lokal UX-feedback i nettleseren.
5. Triager funn lokalt i backlogg før eventuell ny feltprøve.

Feedback skal ikke inneholde navn, ID, telefon, e-post, pasientdata, journalopplysninger, private lokasjoner eller skjermet operativ informasjon.
