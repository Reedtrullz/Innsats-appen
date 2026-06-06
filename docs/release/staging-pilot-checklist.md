# Staging / pre-pilot checklist

## Staging deployment path

Task 390 uses `.github/workflows/staging.yml` as the pre-pilot staging deployment path. It deploys an immutable `staging-<sha>` GHCR image to a separate staging container/app directory and verifies the staging `/api/health` endpoint.

Required GitHub environment/secret configuration before the workflow can run:

- `STAGING_SSH_PRIVATE_KEY` secret for the staging deploy user.
- `STAGING_SSH_HOST_KEY` variable containing the pinned SSH known_hosts entry for `STAGING_HOST`.
- `STAGING_HOST` variable, defaulting to `198.23.137.16` only if the repo environment does not override it.
- `STAGING_USER` variable, defaulting to `deploy`.
- `STAGING_DOMAIN` variable or workflow input, default `staging.198.23.137.16.nip.io`.
- `STAGING_PORT` variable or workflow input, default `3007`.

Current canonical staging verification host is `https://staging.198.23.137.16.nip.io` until `staging.innsats.reidar.tech` has public DNS/TLS pointing at the staging app. Any evidence using another host must state the host and exact `/api/health.version` SHA.

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

- `staging.innsats.reidar.tech` does not currently have working public DNS/TLS for staging verification. Earlier staging runs therefore failed public verification after the VPS-local container was healthy.
- Until DNS/TLS is fixed for `staging.innsats.reidar.tech`, use workflow input `staging_domain=staging.198.23.137.16.nip.io` for public staging verification, or fix the intended hostname and rerun the same workflow against `staging.innsats.reidar.tech`.
- `STAGING_SSH_PRIVATE_KEY` was updated to the VPS Actions deploy key accepted by `deploy@198.23.137.16`; the accepted public fingerprint is `SHA256:CNW/GT2ZuBVAjFC2WArkx49ZlWyHb/Lpyj+DESObU4w`.

Current production comparison point: verify the live SHA with `https://innsats.reidar.tech/api/health` before comparing staging. At the latest controller check (`2026-06-06T16:40:28Z`), production health returned SHA `8f85c01ddd08e0714b97644f4e5537f23a29c403`; the local source-governance commit `e2017a94ba8a933c5be972969bfd2cdd7e1dbacb` was still local/ahead of `origin/main` and not deployed. See `docs/release/current-deployment-status.md` for the exact-SHA verification procedure and older deployment history.

## Gates before broader pilot

- `npm run check:ci` passes locally and in workflow, including production Playwright E2E.
- Staging health endpoint returns the exact SHA from the staging deploy run.
- Manual smoke on staging covers `/nytt`, `/release`, `/data-pa-enheten`, `/oppdrag`, `/feltmodus` and privacy reset.
- Rollback command/owner is documented for the staging and production targets.
- Rollback drill evidence is tracked in `docs/release/rollback-drill-evidence.md`; current `Status: pass-staging-drill` proves the staging rescue path only. Production rollback and owner governance decisions remain pilot caveats until explicitly accepted or separately proven.
- Real-device evidence for iPhone Safari, Android Chrome, install-to-home-screen, low-connectivity and update-after-offline is attached before final pilot pass.

## Rollback

Rollback is redeploying the previous known-good immutable GHCR SHA through the same staging workflow or production playbook. Do not use `latest` as release evidence.

## Felles grense

Beredskapsboka er beslutningsstøtte, ikke et offisielt kommando-, journal- eller varslingssystem. Ikke skriv inn persondata, private posisjoner, reelle Nødnettgrupper eller annen skjermet informasjon. Appen har ingen backend-sync i MVP; lokal ordre, samband og offisielle kilder gjelder alltid.
