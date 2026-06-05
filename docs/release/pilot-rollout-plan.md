# Pilot rollout plan

## Omfang

Task 407 ruller ut med ett distrikt / one district først. Målet er å teste nytte, offline robusthet og forståelse av grenser før bredere pilot.

## Current baseline

Produksjon er deploy-verifisert. Repo-dokumenter hardkoder ikke permanent "current live SHA" fordi hver docs-only statusoppdatering også deployes som ny immutable image.

- Current live SHA: verifiser med `curl -fsS https://innsats.reidar.tech/api/health` og match mot GitHub Actions run for samme SHA.
- Last audited application-code baseline: `1a26acbfc6f72152e14906d3ecc04d424275aee4`; last documented deployed snapshot before this docs refresh: `1750a377362c44734dd802be8095ad317957f1c9` via GitHub Actions run `27030600338`.
- Live: https://innsats.reidar.tech
- Status/verification note: `docs/release/current-deployment-status.md`

Dette er en teknisk deploy-/CI-godkjent baseline, ikke en bredere pilot-go.

## Go/no-go

Go/no-go holdes etter staging smoke, manual device evidence, supportkanal og personvernkontroll. Go krever at pilotdistrikt har avtalt team-/kanalalias for kontakt og at feil kan rapporteres uten persondata.

Må fortsatt være blokkert før bredere pilot dersom evidence mangler:

- Task 385: iPhone Safari real-device.
- Task 386: Android Chrome real-device.
- Task 387: install-to-home-screen.
- Task 388: low-connectivity.
- Task 389: update-after-offline.

## Faser

1. Intern staging med exact-SHA health verification.
2. 3–5 superbrukere med demo-/øvingsdata.
3. Avgrenset øvelse med real-device evidence og supportkanal.
4. Debrief og beslutning før bredere pilot.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
