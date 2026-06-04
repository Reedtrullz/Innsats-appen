# Pilot rollout plan

## Omfang

Task 407 ruller ut med ett distrikt / one district først. Målet er å teste nytte, offline robusthet og forståelse av grenser før bredere pilot.

## Current baseline

Produksjon er deploy-verifisert på SHA `e259b39692b48601a7069fe3fbefad5fe74989c5` via GitHub Actions run `26943809255`.

- Live: https://innsats.reidar.tech
- Health: https://innsats.reidar.tech/api/health returned `status=healthy`, `nodeEnv=production`, and exact SHA at 2026-06-04T09:58:17Z.
- Status record: `docs/release/current-deployment-status.md`

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
