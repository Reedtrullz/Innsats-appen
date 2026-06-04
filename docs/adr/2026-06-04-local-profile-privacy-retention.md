# ADR: Valgfri lokal profil, personvern, PIN, audit og retention

Dato: 2026-06-04
Status: Implementert for lokal/offline MVP

## Kontekst

Group 10 krever en valgfri lokal profilmodell uten backend, konto, innlogging eller offisielle kommandosystem-påstander. Samtidig skal sensitive utvidelser (kompetanseregister, personlig utstyr, tilgjengelighet, kalender og flere profiler) ikke implementeres før personverngjennomgang.

## Beslutning

- Profil er valgfri, lokal og nettleserbundet. Den lagrer bare sanitert visningsetikett, kallesignal og foretrukket lokal rolle.
- Lokal rolle er eksplisitt adskilt fra konto, innlogging og autentisering.
- PIN-lås er kun lokal personvernfriksjon. Rå PIN lagres aldri; bare salt, PBKDF2/SHA-256-hash og iterasjonstall lagres.
- Web Crypto er krav for PIN og fremtidig kryptert sensitiv payload. Hvis Web Crypto ikke finnes, skal sensitiv payload forbli deaktivert/utsatt.
- AES-GCM hjelpefunksjoner finnes for fremtidig sensitiv payload, men MVP lagrer ingen sensitive felt som standard og inneholder ingen hemmeligheter.
- Biometrisk opplåsing er vurdert som post-MVP/utsatt via eventuell WebAuthn-plattformautentisering etter egen gjennomgang.
- Kompetanseregister, personlig utstyr, tilgjengelighet, kalenderintegrasjon og flere lokale profiler er personvern-gatede/deferrede funksjoner uten dataregistrering i MVP.
- Sanitert kompetanseutløp-påminnelse er tillatt lokalt med generisk etikett og dato, personvernkopi og retention-vakt. Det er ikke et sertifiseringsregister.
- Lokal auditlogg registrerer sanitert hendelsestype for ordreopprettelse, statusendring, eksport og reset/sletting. Den er ikke offisiell logg og synkroniseres ikke.
- Retention-innstillinger lagres lokalt for oppdrag, arkiv, profil og audit. De sletter ikke automatisk uten eksplisitt brukerhandling og UI-dekning.

## Lagring

- `localStorage`: lokal profil, retention-innstillinger, auditlogg og sanitert kompetanseutløp-påminnelse.
- `IndexedDB`: eksisterende lokale oppdrag/sjekklister beholdes uendret.
- Ingen backend sync, auth/account/login, person-/pasientdata, private/skjermede lokasjoner eller offisielle kommando-/arkivpåstander.

## Konsekvenser

- Bruker kan slette lokal profil separat fra oppdragsdata.
- Audit eksport er lokal JSON med sanitert metadata og cap på antall hendelser.
- PIN og AES-GCM testes med Node 22 Web Crypto, men PIN beskrives ikke som sterk autentisering.
- Fremtidige sensitive funksjoner må ha egen personvernvurdering, dataminimering, retention, eksplisitt sletting og tydelig språk før de kan aktiveres.
