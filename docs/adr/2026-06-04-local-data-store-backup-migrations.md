# ADR: Lokal database, schema/migrering og manuell lokal backup

Dato: 2026-06-04
Status: accepted for public offline MVP

## Kontekst

Group 11B-1 krever at Beredskapsboka dokumenterer lokal databasevalg, schema-versjonering, migrering, lagringskvote-håndtering og lokal backup/import. MVP-grensen er fortsatt offentlig/offline og lokal nettleserlagring: ingen konto, autentisering, backend sync, skybackup, pasientdata, persondata, private lokasjoner eller påstand om offisiell kommandosystem-integrasjon.

Eksisterende app bruker `idb` over IndexedDB for `beredskapsboka-local` med object stores `missions` og `checklistRuns`, og bruker allowlistede `localStorage`-nøkler for små lokale innstillinger. Dette er tilstrekkelig for MVP-ens lokale oppdragstavle, sjekklistekjøringer, feltmodus, kartmetadata, personvernprofil/retention/audit og datakildeinnstillinger.

## Alternativer vurdert

### Raw `idb` over IndexedDB

Beslutning: valgt.

Begrunnelse:
- Allerede installert og brukt i `lib/mission/local-store.ts`.
- Liten avhengighet og lav pakkestørrelse.
- IndexedDB fungerer offline i nettleseren og passer object-store-modellen for lokale oppdrag og sjekklistekjøringer.
- Schema/migrering holdes eksplisitt i appkode og testes bakoverkompatibelt.
- Enklere å holde MVP-grensen: ingen innebygd sync, ingen konto, ingen backend.

Ulemper:
- Mer boilerplate enn Dexie.
- Ingen relasjonsmodell eller query builder.
- Migrations må være tydelige og testet manuelt.

### Dexie.js

Beslutning: utsatt.

Begrunnelse:
- Dexie gir bedre ergonomi for IndexedDB, versjonert schema-API og enklere queries.
- MVP-en har bare to IndexedDB-stores og få queries; eksisterende raw `idb` dekker behovet.
- Ny abstraksjon ville øke migreringsflate og avhengigheter før behovet er bevist.

Dexie kan vurderes post-MVP hvis lokal datamodell vokser betydelig, men må da ha egen migreringsplan og regression-tester for eksisterende exports.

### SQLite WASM/OPFS

Beslutning: ikke valgt for MVP.

Begrunnelse:
- Kraftig lokal relasjonslagring, men større payload og mer kompleks browser-/OPFS-kompatibilitet.
- Mer komplisert backup/import, migrering og feilhåndtering for offline PWA.
- For høy størrelse/kompleksitet for en offentlig lokal MVP med enkle object stores.

SQLite WASM/OPFS kan bare vurderes post-MVP hvis appen trenger tung lokal relasjonslogikk og etter ny arkitektur-/personverngjennomgang.

## Beslutning

- Fortsett med raw `idb` for IndexedDB og eksisterende localStorage-hjelpere for små innstillinger.
- Eksponer eksplisitte lokale schema-/export-versjoner:
  - `LOCAL_DATA_SCHEMA_VERSION = 1`
  - `LOCAL_DATA_EXPORT_VERSION = 1`
  - `LOCAL_MISSION_DB_VERSION = 1`
  - `LOCAL_MISSION_RECORD_SCHEMA_VERSION = 1`
- Legg migreringshjelpere for lagrede mission/checklist-records og eksporterte lokale appdata.
- Støtt import av legacy/v0-shape der export/schema-version mangler eller er `0`, ved å normalisere til v1.
- Avvis fremtidige/ustøttede export/schema-versjoner.
- Backup/import er manuell lokal JSON med allowlistede localStorage-nøkler og IndexedDB-snapshot av oppdrag/sjekklistekjøringer.
- Backupfilen kan inneholde lokale profilfelt, auditlogg og PIN-hash/salt fra nettleseren. Den må behandles som sensitiv lokal operatørfil, ikke deles ukritisk, og skal ikke brukes til persondata, pasientdata eller private lokasjoner.
- Ukjente localStorage-nøkler strippes. Farlige felt som auth/backend sync/cloud upload/patient/persondata/private locations avvises.
- Storage quota vises via `navigator.storage.estimate()` når nettleseren støtter det, med trygg fallback når kvote er ukjent.

## Backup/import-grenser

Backup/import skal:
- kun skje etter eksplisitt brukerhandling,
- bare bruke lokal JSON i nettleseren,
- ikke laste opp, synkronisere eller sende data til backend,
- være schema-versjonert,
- bare inkludere allowlistede localStorage-nøkler,
- validere oppdrag/sjekklistekjøringer mot eksisterende strict schema,
- ikke hevde at eksport er offisiell rapport eller kommandosystemdata.

Backup/import skal ikke:
- opprette konto, autentisering, tilgangsstyring eller remote sync,
- støtte skybackup eller opplasting,
- importere patient/persondata/private locations eller ukjente farlige felt,
- importere fremtidige schema-versjoner uten eksplisitt migrering.

## Konsekvenser

- MVP får en enkel, testbar og lokal-only backup/import-flyt uten nye tunge avhengigheter.
- Datatap ved nettlesersletting kan reduseres med manuell JSON-backup, men brukeren må selv lagre filen forsvarlig.
- Import erstatter lokale mission/checklist-data etter eksplisitt lokal bekreftelse og skriver bare allowlistede localStorage-nøkler.
- Fremtidig utvidelse av lokale data må oppdatere allowlist, schema-versjon, migrering og bakoverkompatibilitetstester før release.
