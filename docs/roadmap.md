# Roadmap

## Current production posture

Per 2026-06-05 er Beredskapsboka/Innsats-appen deploy-verifisert i produksjon med den operative Kart → Logg → Oppdrag → Etterrapport → Oppdragsmappe-iterasjonen lukket. Repo-dokumenter hardkoder ikke permanent "current live SHA" fordi docs-only commits også deployes som nye immutable images.

- Current live SHA: verifiser med `curl -fsS https://innsats.reidar.tech/api/health` og match mot `git rev-parse origin/main` / GitHub Actions run for samme SHA.
- Last audited application-code baseline: `1a26acbfc6f72152e14906d3ecc04d424275aee4`.
- Last documented deployed snapshot before this docs refresh: `1750a377362c44734dd802be8095ad317957f1c9` via GitHub Actions run `27030600338`.
- Baseline health endpoint verified exact SHA and `nodeEnv=production`.
- Full status/verification note: `docs/release/current-deployment-status.md`.

Dette betyr at teknisk CI/CD/deploy baseline er grønn for production. Bredere pilot/go krever fortsatt staging-/rollbackavklaring, supportkanal og fysisk/real-device evidence.

## Operational command surface

Den feltvendte UI-modellen er Hjem → Søk → Oppdrag → Kort → Mer. Primærflyten er Situation → Phase → Next action → Checklist → Export → Source: brukeren skal først forstå situasjon/fase, deretter finne neste lokale handling, sjekkliste, eksport og kildegrunnlag. `/release` holdes utenfor operational shell og forblir admin/release-readiness.

Kart/logg/Feltmodus-iterasjonen er nå en del av production baseline:

- `/kart` støtter lokale kartpakker, skjematisk fallback, mission-scoped markører/sektorer og `Logg herfra`.
- `/oppdrag` viser aktivt oppdrag med kart/logg-sammendrag, feltlogg, kritiske observasjoner, etterrapport og Oppdragsmappe.
- `/feltmodus` prioriterer store, raske feltkontroller for kart, hurtiglogg, aktivt oppdrag, sjekkliste, ordre, samband, status og søk.
- Eksportløpet saniterer kartpakke-metadata og filtrerer feltlogg/RUH/sjekklister mot aktivt oppdrag.

Dette er fortsatt MVP uten login, sentral hendelsesdatabase, backend mission sync, patient/persondata, offisiell kommando-systemintegrasjon, live tracking, push notifications eller private/skjermede tilfluktsromdata. Se `docs/ui-operational-command-surface.md` og `docs/mvp-boundaries.md`.

## Group 14 / Task 409 status

Group 14 går videre fra grunnleggende release-dokumentasjon til pre-pilot evidence: public GitHub metadata, staging, supportkanal, real-device testing, vedlikehold og governance for post-MVP arbeid.

## Current focus before broader pilot

1. Holde GitHub About/README/docs synlig og oppdatert for public repo-discovery.
2. Kjøre staging workflow for exact SHA og lagre completed/successful run URL.
3. Skaffe fysisk enhet eller real-device cloud-lab for iPhone Safari, Android Chrome, install-to-home-screen, low-connectivity og update-after-offline.
4. Velge pilotdistrikt og supportkanal.
5. Avklare staging/rollback ansvar.
6. Fortsette teknisk gjeld og innholdsvedlikehold uten å åpne for backend/persondata før separat governance-plan.

## Post-MVP candidates behind governance

Disse skal ikke snike seg inn i MVP:

- Auth/RBAC og bruker-/rollemodell.
- Backend mission sync eller sentral hendelsesdatabase.
- Push/geofencing/live tracking/blue-force tracking.
- CIM/Nødnett/offisiell kommando-systemintegrasjon.
- Persondata, pasientdata eller private/skjermede lokasjonsregistre.
- Eksterne runtime tile providers eller åpne proxy-ruter.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
