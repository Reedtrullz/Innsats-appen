# Staging / pre-pilot checklist

## Staging deployment path

Task 390 uses `.github/workflows/staging.yml` as the pre-pilot staging deployment path. It deploys an immutable `staging-<sha>` GHCR image to a separate staging container/app directory and verifies the staging `/api/health` endpoint.

Required GitHub environment/secret configuration before the workflow can run:

- `STAGING_SSH_PRIVATE_KEY` secret for the staging deploy user.
- `STAGING_HOST` variable, defaulting to `198.23.137.16` only if the repo environment does not override it.
- `STAGING_USER` variable, defaulting to `deploy`.
- `STAGING_DOMAIN` variable or workflow input, default `staging.innsats.reidar.tech`.
- `STAGING_PORT` variable or workflow input, default `3007`.

This file does not claim staging has been executed. Before broader pilot, run the staging workflow for the exact SHA and save its completed/successful run URL.

Current production baseline for staging comparison: SHA `e259b39692b48601a7069fe3fbefad5fe74989c5`, verified by GitHub Actions run `26943809255` and `https://innsats.reidar.tech/api/health`. See `docs/release/current-deployment-status.md`.

## Gates before broader pilot

- `npm run check:ci` passes locally and in workflow, including production Playwright E2E.
- Staging health endpoint returns the exact SHA from the staging deploy run.
- Manual smoke on staging covers `/nytt`, `/release`, `/data-pa-enheten`, `/oppdrag`, `/feltmodus` and privacy reset.
- Rollback command/owner is documented for the staging and production targets.
- Real-device evidence for iPhone Safari, Android Chrome, install-to-home-screen, low-connectivity and update-after-offline is attached before final pilot pass.

## Rollback

Rollback is redeploying the previous known-good immutable GHCR SHA through the same staging workflow or production playbook. Do not use `latest` as release evidence.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
