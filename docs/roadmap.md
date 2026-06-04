# Roadmap

## Current production posture

Per 2026-06-04 er Beredskapsboka/Innsats-appen deploy-verifisert i produksjon. Repo-dokumenter hardkoder ikke permanent "current live SHA" fordi docs-only commits også deployes som nye immutable images.

- Current live SHA: verifiser med `curl -fsS https://innsats.reidar.tech/api/health` og match mot `git rev-parse origin/main` / GitHub Actions run for samme SHA.
- Last audited application-code baseline: `e259b39692b48601a7069fe3fbefad5fe74989c5`.
- Baseline health endpoint verified exact SHA and `nodeEnv=production`.
- GitHub Actions run `26943809255` completed successfully for automatic checks, GHCR image build/push and Ansible deploy.
- Full status/verification note: `docs/release/current-deployment-status.md`

Dette betyr at teknisk CI/CD/deploy baseline er grønn. Release board skal likevel vise fem blokkerte real-device/staging evidence-oppgaver.

## Group 14

Group 14 lukker staging, release notes, guider, pilot og vedlikehold. Post-MVP arbeid holdes bak governance: backend sync, auth, push, CIM/Nødnett-integrasjon og persondata krever egen plan.

## Neste beslutninger

- Kjøre staging workflow for exact SHA og lagre completed/successful run URL.
- Skaffe fysisk enhet eller real-device cloud-lab for Tasks 385–389: iPhone Safari, Android Chrome, install-to-home-screen, low-connectivity og update-after-offline.
- Velge pilotdistrikt og supportkanal.
- Avklare staging/rollback ansvar.
- Fortsette teknisk gjeld og innholdsvedlikehold uten å åpne for backend/persondata før separat governance-plan.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
