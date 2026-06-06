#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGE="${IMAGE:-ghcr.io/reedtrullz/innsats-appen}"
INVENTORY="${INVENTORY:-deploy/inventory/hosts.yml}"
PLAYBOOK="${PLAYBOOK:-deploy/playbook.yml}"
PLATFORM="${PLATFORM:-linux/amd64}"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
  nvm use 22 >/dev/null
fi

for cmd in git npm ansible-playbook ansible-galaxy gh docker; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
done

SHA="$(git rev-parse HEAD)"
SHORT_SHA="$(git rev-parse --short=12 HEAD)"
TAGGED_IMAGE="${IMAGE}:${SHORT_SHA}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty. Commit or stash changes before publishing a production image." >&2
  git status --short >&2
  exit 1
fi

echo "Verifying local HEAD matches origin/main before manual production publish..."
git fetch origin main >/dev/null
ORIGIN_MAIN_SHA="$(git rev-parse origin/main)"
if [[ "$SHA" != "$ORIGIN_MAIN_SHA" ]]; then
  echo "HEAD is not origin/main. Push the candidate, wait for exact-SHA CI/deploy, or use the GitHub Actions deploy path instead." >&2
  echo "HEAD:        $SHA" >&2
  echo "origin/main: $ORIGIN_MAIN_SHA" >&2
  exit 1
fi

echo "Running full local release gate before manual production publish..."
npm run check:ci

echo "Verifying exact-SHA GitHub Actions success before manual production publish..."
CI_RUN_FILTER='.[] | select(.workflowName == "CI / Deploy" and .headSha == "'"$SHA"'" and .status == "completed" and .conclusion == "success") | .databaseId'
CI_RUN_ID="$(gh run list --commit "$SHA" --limit 10 --json databaseId,status,conclusion,headSha,workflowName --jq "$CI_RUN_FILTER" | head -n1)"
if [[ -z "$CI_RUN_ID" ]]; then
  echo "No completed successful CI / Deploy run found for $SHA. Do not manually deploy unverified code." >&2
  exit 1
fi
echo "Verified CI / Deploy run ${CI_RUN_ID} for ${SHA}."

echo "Installing Ansible collection requirements..."
ansible-galaxy collection install -r deploy/requirements.yml

echo "Logging Docker into GHCR with gh auth token..."
gh auth token | docker login ghcr.io -u Reedtrullz --password-stdin >/dev/null

echo "Building and pushing ${TAGGED_IMAGE} and ${IMAGE}:latest for ${PLATFORM}..."
docker buildx build \
  --platform "$PLATFORM" \
  --build-arg "VERSION=$SHA" \
  --tag "$TAGGED_IMAGE" \
  --tag "${IMAGE}:latest" \
  --push \
  .

echo "Deploying ${TAGGED_IMAGE} to innsats.reidar.tech..."
APP_VERSION="$SHA" ansible-playbook -i "$INVENTORY" "$PLAYBOOK" -e "docker_image=$TAGGED_IMAGE"
