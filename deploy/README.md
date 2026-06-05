# Beredskapsboka VPS deploy

This deploys Beredskapsboka to the Racknerd VPS at:

- Public URL: https://innsats.reidar.tech
- GitHub repository: https://github.com/Reedtrullz/Innsats-appen
- VPS: 198.23.137.16 (`Racknerd-Deploy`, user `deploy`)
- Container image: `ghcr.io/reedtrullz/innsats-appen:<git-sha>`
- Container: `beredskapsboka`
- Host port: `127.0.0.1:3006 -> container:3000`
- Remote app dir: `/opt/apps/beredskapsboka`

The VPS never clones this source repository. The intended flow is:

```text
local build with generated content -> GHCR image -> Ansible pulls image on VPS -> Caddy reverse proxy
```

The GitHub Actions version of the flow is:

```text
push/PR -> automatic checks -> main-only Docker build/push -> main-only Ansible deploy -> exact-SHA public health verification
```

## Deployment verification status

Repo docs cannot hard-code the current live SHA as a permanent fact because every docs-only status commit also creates and deploys a newer immutable image. Verify the current live SHA with:

```bash
git rev-parse origin/main
curl -fsS https://innsats.reidar.tech/api/health
gh run list --commit "$(git rev-parse origin/main)" --limit 5 --json databaseId,status,conclusion,headSha,url
```

The last audited application-code baseline was SHA `e259b39692b48601a7069fe3fbefad5fe74989c5`, verified by GitHub Actions run `26943809255`; see `docs/release/current-deployment-status.md` for details and release-board caveats.

## One-time prerequisites

### GitHub Actions secret and host key pin

The automatic deploy job requires this repository secret and public host-key pin:

```text
VPS_SSH_PRIVATE_KEY = private SSH key for deploy@198.23.137.16
VPS_SSH_HOST_KEY = exact public host key line for 198.23.137.16 (repository variable preferred; secret also supported)
```

Set `VPS_SSH_HOST_KEY` from a trusted local network/path, review it once, then store the exact line in GitHub Actions variables:

```bash
ssh-keyscan -T 10 -t ed25519 198.23.137.16
```

The workflow compares fresh `ssh-keyscan` output to `VPS_SSH_HOST_KEY` before writing `~/.ssh/known_hosts`; it fails the deploy on mismatch instead of trusting whatever key appears during that CI run. The workflow writes the private key to `~/.ssh/id_rsa_racknerd` on the runner, matching `deploy/inventory/hosts.yml`. Do not commit the key or copy it into inventory.

### Local/VPS prerequisites

Install the collection locally:

```bash
ansible-galaxy collection install -r deploy/requirements.yml
```

If the GHCR package is private, log the VPS into GHCR once with a token that has `read:packages`:

```bash
ssh Racknerd-Deploy 'docker login ghcr.io -u Reedtrullz'
```

Do not commit GHCR tokens or put them in inventory. The playbook deliberately does not run `docker_login`; Docker auth persists on the VPS after the one-time login.

## Publish and deploy from local machine

The local machine needs Docker/buildx, `gh`, Ansible, and access to the Obsidian source extracts used by `npm run build:content`.

```bash
source ~/.nvm/nvm.sh && nvm use 22
./deploy/publish-and-deploy.sh
```

The script:

1. Requires a clean working tree.
2. Runs `npm run build:content` locally.
3. Logs Docker into GHCR with `gh auth token`.
4. Builds a linux/amd64 Docker image tagged with the current full/short SHA.
5. Pushes both `<short-sha>` and `latest` tags to GHCR.
6. Runs `ansible-playbook` with the immutable SHA tag.

If `gh auth token` lacks package write permissions, refresh it or use a token with package write access before running the script.

## Deploy an already-published image

```bash
APP_VERSION=$(git rev-parse HEAD) \
ansible-playbook -i deploy/inventory/hosts.yml deploy/playbook.yml \
  -e "docker_image=ghcr.io/reedtrullz/innsats-appen:$(git rev-parse --short=12 HEAD)"
```

For a manual mutable-tag recovery deploy, make the override explicit and understand that this bypasses the immutable SHA guard:

```bash
APP_VERSION=latest ansible-playbook -i deploy/inventory/hosts.yml deploy/playbook.yml \
  -e "docker_image=ghcr.io/reedtrullz/innsats-appen:latest" \
  -e "allow_mutable_tag=true"
```

Do not use the mutable override for normal production deploys. Standard production deploys must pass a SHA-like image tag and a full 40-character `APP_VERSION`; `/api/health.version` must match that full SHA before the playbook reports success.

The playbook uses `force_source: true` when pulling, so a mutable `:latest` tag is rechecked instead of silently reusing a stale local image.

## Rollback behavior

Before pulling a candidate image, the playbook inspects the currently running `beredskapsboka` container and tags its image ID as a local rollback image (`beredskapsboka:rollback`). Candidate deployment, local health verification, Caddy validation/reload, and exact public `/api/health.version` verification run inside an Ansible `block`.

If any candidate verification step fails, the `rescue` path re-renders `compose.production.yml` with the rollback image and the previous `VERSION` value, recreates the container from that previous image, verifies local and public health again, and then fails the Ansible run with an explicit rollback message. That means production should keep serving the previous healthy version, while CI/local deploy automation still reports the candidate deploy as failed.

First-time deploys do not have a previous image to restore. If the first candidate fails, the playbook fails without pretending rollback was possible.

Run production deploys with the full playbook command shown above. Tag-filtered runs such as `--tags deploy` are for diagnostics only; they can skip public verification and rollback tasks, so they do not carry the rollback-safety guarantee.

Rollback restores the previous image/version for the current configured domain and port. Treat intentional changes to `app_domain`, `app_host_port`, `app_bind_address`, or `caddy_marker_name` as a separate routing migration and verify the Caddy rollback story explicitly.

## Verification performed by the playbook

- Docker CLI exists on VPS.
- Docker Compose exists on VPS.
- Caddy exists on VPS.
- GHCR image is pulled.
- Compose starts/recreates the container and waits for Docker health.
- Local health endpoint answers healthy and exposes the exact `APP_VERSION` SHA:
  `http://127.0.0.1:3006/api/health`
- Caddy config validates before reload.
- Public HTTPS health endpoint answers healthy and exposes the exact `APP_VERSION` SHA:
  `https://innsats.reidar.tech/api/health`

## Useful manual checks

```bash
ssh Racknerd-Deploy 'docker ps --filter name=beredskapsboka'
ssh Racknerd-Deploy 'docker logs --tail 80 beredskapsboka'
curl -fsS https://innsats.reidar.tech/api/health
curl -fsS https://innsats.reidar.tech/ | head
```

## Notes

- `next.config.ts` must keep `output: 'standalone'` for Docker runtime.
- Docker builds set `ALLOW_PREGENERATED_CONTENT=1` so the container build can use the committed sanitized `content/generated/source-documents.json` snapshot instead of requiring the private Obsidian vault inside GitHub Actions or the image.
- `content/generated/*.json` and `public/generated-content/` are build outputs and stay out of git, except the committed sanitized fallback snapshot described above.
- `public/content-assets/*.png` is intentionally un-ignored and committed when generated public content references DOCX-extracted images; clean GitHub Actions runners must have those assets for content validation and production E2E.
