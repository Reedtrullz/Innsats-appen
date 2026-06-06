# Staging / pre-pilot checklist

## Staging deployment path

Task 390 uses `.github/workflows/staging.yml` as the pre-pilot staging deployment path. It deploys an immutable `staging-<sha>` GHCR image to a separate staging container/app directory and verifies the staging `/api/health` endpoint.

Required GitHub environment/secret configuration before the workflow can run:

- `STAGING_SSH_PRIVATE_KEY` secret for the staging deploy user.
- `STAGING_SSH_HOST_KEY` variable containing the pinned SSH known_hosts entry for `STAGING_HOST`.
- `STAGING_HOST` variable, defaulting to `198.23.137.16` only if the repo environment does not override it.
- `STAGING_USER` variable, defaulting to `deploy`.
- `STAGING_DOMAIN` variable or workflow input, default `staging.innsats.reidar.tech`.
- `STAGING_PORT` variable or workflow input, default `3007`.

Staging was executed for SHA `d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f` at `2026-06-06T00:40:47Z`.

Successful staging evidence:

- Run: `27047348898` — https://github.com/Reedtrullz/Innsats-appen/actions/runs/27047348898
- Trigger: `workflow_dispatch` on `staging`.
- Public staging hostname used: `https://staging.198.23.137.16.nip.io`.
- Result: `status=completed`, `conclusion=success`.
- Jobs: `Staging checks`, `Build and push staging image`, and `Deploy staging with Ansible` all completed successfully.
- Health: `https://staging.198.23.137.16.nip.io/api/health` returned `status=healthy`, `nodeEnv=production`, and `version=d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f`.
- Route smoke returned HTTP 200 for `/`, `/nytt`, `/release`, `/data-pa-enheten`, `/oppdrag`, `/feltmodus`, `/kart`, and `/manifest.webmanifest`.
- Browser smoke rendered `/`, `/kart`, and `/release` with no captured console messages or JavaScript errors. `/kart` showed the intended split state: schematic selector visible and no approved PMTiles cache controls.

Staging caveats found during execution:

- `staging.innsats.reidar.tech` does not currently resolve in public DNS. Earlier staging runs therefore failed public verification with `Name or service not known` after the VPS-local container was healthy.
- Until DNS is created for `staging.innsats.reidar.tech`, use workflow input `staging_domain=staging.198.23.137.16.nip.io` for public staging verification, or create the intended DNS record and rerun the same workflow against `staging.innsats.reidar.tech`.
- `STAGING_SSH_PRIVATE_KEY` was updated to the VPS Actions deploy key accepted by `deploy@198.23.137.16`; the accepted public fingerprint is `SHA256:CNW/GT2ZuBVAjFC2WArkx49ZlWyHb/Lpyj+DESObU4w`.

Current production comparison point: verify the live SHA with `https://innsats.reidar.tech/api/health` before comparing staging. The last audited application-code baseline is SHA `1a26acbfc6f72152e14906d3ecc04d424275aee4`; the last documented deployed snapshot before this docs refresh is SHA `1750a377362c44734dd802be8095ad317957f1c9`, verified by GitHub Actions run `27030600338`. See `docs/release/current-deployment-status.md`.

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
