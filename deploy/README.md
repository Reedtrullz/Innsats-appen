# Beredskapsboka VPS deploy

This deploys Beredskapsboka to the Racknerd VPS at:

- Public URL: https://innsats.reidar.tech
- VPS: 198.23.137.16 (`Racknerd-Deploy`, user `deploy`)
- Container image: `ghcr.io/reedtrullz/beredskapsboka:<git-sha>`
- Container: `beredskapsboka`
- Host port: `127.0.0.1:3006 -> container:3000`
- Remote app dir: `/opt/apps/beredskapsboka`

The VPS never clones this source repository. The intended flow is:

```text
local build with generated content -> GHCR image -> Ansible pulls image on VPS -> Caddy reverse proxy
```

## One-time prerequisites

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
  -e "docker_image=ghcr.io/reedtrullz/beredskapsboka:$(git rev-parse --short=12 HEAD)"
```

For a manual latest-tag deploy:

```bash
APP_VERSION=latest ansible-playbook -i deploy/inventory/hosts.yml deploy/playbook.yml
```

The playbook uses `force_source: true` when pulling, so a mutable `:latest` tag is rechecked instead of silently reusing a stale local image.

## Verification performed by the playbook

- Docker CLI exists on VPS.
- Docker Compose exists on VPS.
- Caddy exists on VPS.
- GHCR image is pulled.
- Compose starts/recreates the container and waits for Docker health.
- Local health endpoint answers healthy:
  `http://127.0.0.1:3006/api/health`
- Caddy config validates before reload.
- Public HTTPS health endpoint answers healthy:
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
- Docker builds set `ALLOW_PREGENERATED_CONTENT=1` so the container build can use pregenerated source documents copied from the local build context instead of requiring the private Obsidian vault inside the image.
- Keep `content/generated/*.json`, `public/generated-content/`, and `public/content-assets/` out of git, but present in the local Docker build context after `npm run build:content`.
