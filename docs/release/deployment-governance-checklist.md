# Deployment governance checklist

Status: manual-owner-decision-required
Last checked: 2026-06-06T04:14:34Z with `gh api` and `gh secret list`.

## Current status

- Branch protection is enabled on `main` with strict required status check `Automatic checks`.
- Admin enforcement is disabled (`enforce_admins.enabled=false`). This is an owner-managed direct-push exception and must be accepted explicitly before pilot-go, or tightened by the repo owner.
- Pull-request review requirements are not configured (`required_pull_request_reviews=null`). The repo owner must decide whether pilot-go requires mandatory PR reviews.
- GitHub environments `staging` and `production` exist, but both currently have empty `protection_rules`; required reviewers / wait timers / deployment-branch rules remain an owner decision.
- Repository-level secrets by name include `STAGING_SSH_PRIVATE_KEY` and `VPS_SSH_PRIVATE_KEY`; no secret values were read or recorded.
- Environment-level secret lists for `staging` and `production` are currently empty. The current staging workflow uses `secrets.STAGING_SSH_PRIVATE_KEY`, so the repo-level secret can satisfy the workflow, but environment-scoped private keys require an explicit owner governance decision.
- Deploy SSH private keys are secret material; do not paste them into chat, docs, issues, logs, or release evidence.

## Safe to automate

- Environment creation / existence checks.
- Non-secret repository and environment variables.
- Workflow `environment:` bindings.
- Documentation and verification commands.
- Secret-name checks with `gh secret list`.

## Manual secret/material gates

- Move deploy private keys to environment-scoped secrets only if the repo owner decides to enforce environment separation.
- Verify by secret name with `gh secret list --repo Reedtrullz/Innsats-appen --env <environment>`; never record secret values.
- If environment-scoped secrets become required, update workflows and docs in the same change so `staging` and `production` jobs reference the intended scopes.
- Do not mark governance complete merely because a deploy succeeds with repo-scoped secrets; the acceptance of repo-scoped versus environment-scoped key material is a governance decision.

## Verification commands used

```bash
gh api repos/Reedtrullz/Innsats-appen/branches/main/protection --jq '{required_status_checks, enforce_admins, required_pull_request_reviews}'
gh api repos/Reedtrullz/Innsats-appen/environments --jq '.environments[] | {name, protection_rules}'
gh secret list --repo Reedtrullz/Innsats-appen
gh secret list --repo Reedtrullz/Innsats-appen --env staging
gh secret list --repo Reedtrullz/Innsats-appen --env production
```

Observed output summary:

- `required_status_checks.strict=true`; contexts/checks include `Automatic checks`.
- `enforce_admins.enabled=false`.
- `required_pull_request_reviews=null`.
- Environments: `production` and `staging`; both returned `protection_rules=[]`.
- Repo secrets listed by name: `STAGING_SSH_PRIVATE_KEY`, `VPS_SSH_PRIVATE_KEY`.
- Environment secret lists for `staging` and `production`: empty output with successful command status.

## Pilot go/no-go requirement

Before pilot-go, record whether the owner accepts the current governance posture or has enabled stricter branch/environment protections. At minimum, the decision record must state:

- Whether admin direct pushes remain allowed.
- Whether PR reviews are required before merge/deploy.
- Whether staging/production environments need required reviewers or wait timers.
- Whether deploy SSH keys may remain repo-scoped or must move to environment-scoped secrets.
- Which exact CI/deploy run and `/api/health.version` SHA verifies the candidate after any governance change.
