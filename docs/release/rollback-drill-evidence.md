# Rollback drill evidence

Status: pass-staging-drill

## Staging drill — 2026-06-06

- Environment: staging (`https://staging.198.23.137.16.nip.io`, VPS host port `3007`, container `beredskapsboka-staging`).
- Starting SHA: `d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f`.
- Candidate SHA: `0000000000000000000000000000000000000000` (intentionally nonexistent immutable-style GHCR tag used to force the playbook rescue path).
- Candidate image: `ghcr.io/reedtrullz/innsats-appen:0000000000000000000000000000000000000000`.
- Rollback target image/tag: `beredskapsboka-staging:rollback` created from the pre-drill container image by `deploy/playbook.yml`.
- Operator: Hermes Agent, local controller Mac, via `deploy/playbook.yml` and `/tmp/innsats-staging-inventory.yml`.
- Started at: `2026-06-06T16:26:39Z`.
- Completed at: `2026-06-06T16:27:14Z`.
- GitHub Actions run or Ansible command: local Ansible staging drill; log retained outside repo at `/tmp/innsats-staging-rollback-drill-20260606T162640Z.log`.
- Expected Ansible exit: nonzero (`2`) because the playbook intentionally ends with `Fail deployment after successful rollback` after restoring the previous image.
- Public health before rollback: `status=healthy`, `nodeEnv=production`, `version=d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f`.
- Public health after rollback: `status=healthy`, `nodeEnv=production`, `version=d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f`.
- Routes smoke-tested after rollback: `/`, `/release`, `/data-pa-enheten`, `/oppdrag`, `/feltmodus`, `/kart`, `/manifest.webmanifest` all returned HTTP `200`.
- Decision: pass for staging rollback mechanism. The drill proves the candidate-failure rescue path on staging; it does not by itself change production governance or approve broader pilot.

## Log markers

The Ansible output included the expected rollback path:

```text
Candidate deployment failed; restoring previous image beredskapsboka-staging:rollback.
Candidate deployment failed and Beredskapsboka was rolled back to previous image beredskapsboka-staging:rollback with version d3ac6b46658bbbe0d737364e5e5f3a1683aa2d3f.
PLAY RECAP: staging ok=13 changed=3 unreachable=0 failed=1 skipped=3 rescued=1 ignored=0
```

## Remaining caveats

- Production rollback was not drilled; the proven drill target was staging only.
- GitHub environment/branch-protection owner decisions remain tracked in `docs/release/deployment-governance-checklist.md`.
- Do not use this staging rollback drill as evidence for physical-device tasks 385-389.
