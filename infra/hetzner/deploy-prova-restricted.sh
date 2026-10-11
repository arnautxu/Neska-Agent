#!/bin/bash
# Install root-owned, mode 0700, behind a restrict,command= SSH authorized key.
# The operator stages and approves this exact release before manual dispatch.
set -euo pipefail
set +x
export PATH=/usr/local/bin:/usr/bin:/bin
umask 077
read -r command revision app_digest gateway_digest actor extra <<< "${SSH_ORIGINAL_COMMAND:-}"
[[ "$command" == deploy && -z "$extra" && "$revision" =~ ^[0-9a-f]{40}$ ]]
[[ "$app_digest" =~ ^sha256:[0-9a-f]{64}$ && "$gateway_digest" =~ ^sha256:[0-9a-f]{64}$ ]]
[[ "$actor" =~ ^[A-Za-z0-9-]+$ && $(id -u) == 0 && $(uname -m) == aarch64 ]]
config=/etc/neska/prova
release=/opt/neska-prova/releases/$revision
[[ $(realpath "$release") == "$release" && ! -L "$config" ]]
[[ $(cat "$release/.prepared-revision") == "$revision" ]]
[[ ! -e "$config/release.json" && ! -e "$config/release.json.transaction" ]]
# An operator-owned approval binds the source, immutable images and installation.
jq -e --arg revision "$revision" --arg app "ghcr.io/arnautxu/neska-agent@$app_digest" \
  --arg gateway "ghcr.io/arnautxu/neska-agent-egress@$gateway_digest" \
  '.revision == $revision and .architecture == "arm64" and .image == $app and .egressImage == $gateway' \
  "$config/deployment-approved.json" >/dev/null
exec 9>"$config/deployment.lock"
flock -n 9
[[ ! -e "$config/release.json" ]]
read -r registry_token
[[ -n "$registry_token" && ${#registry_token} -le 4096 ]]
export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d /run/neska-pull.XXXXXXXX)
trap 'docker logout ghcr.io >/dev/null 2>&1 || true; rm -rf -- "$DOCKER_CONFIG"' EXIT
printf '%s\n' "$registry_token" | docker login ghcr.io -u "$actor" --password-stdin >/dev/null 2>&1
unset registry_token
app="ghcr.io/arnautxu/neska-agent@$app_digest"
gateway="ghcr.io/arnautxu/neska-agent-egress@$gateway_digest"
for image in "$app" "$gateway"; do
  docker pull "$image" >&2
  [[ $(docker image inspect --format '{{.Architecture}}' "$image") == arm64 ]]
  [[ $(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image") == "$revision" ]]
done
[[ $(trivy --version | head -1) == 'Version: 0.75.0' ]]
install -d -m 0700 "$config/image-evidence/$revision"
for component in app gateway; do
  image="$app"
  [[ "$component" == app ]] || image="$gateway"
  trivy image --scanners vuln --severity CRITICAL --exit-code 1 --format json \
    --output "$config/image-evidence/$revision/$component-critical.json" "$image" >&2
  trivy image --format cyclonedx --output "$config/image-evidence/$revision/$component-sbom.json" "$image" >&2
done
docker logout ghcr.io >/dev/null 2>&1
cd "$release"
export NESKA_DEPLOY_REVISION="$revision" NESKA_DEPLOY_APP="$app" NESKA_DEPLOY_GATEWAY="$gateway"
export NESKA_CHROMIUM_VERSION
NESKA_CHROMIUM_VERSION=$(docker run --rm --entrypoint /usr/bin/chromium "$app" --version | sed -n 's/^[^0-9]*\([0-9][0-9.]*\).*$/\1/p')
[[ "$NESKA_CHROMIUM_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]
node --input-type=module <<'JS'
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
const root = '/etc/neska/prova';
for (const [file, changes] of [
  ['compose.env', { AIBRAIN_IMAGE: process.env.NESKA_DEPLOY_APP, AIBRAIN_EGRESS_IMAGE: process.env.NESKA_DEPLOY_GATEWAY, AIBRAIN_REVISION: process.env.NESKA_DEPLOY_REVISION }],
  ['runtime.env', { AIBRAIN_CHROME_EXPECTED_VERSION: process.env.NESKA_CHROMIUM_VERSION }],
]) {
  let data = readFileSync(`${root}/${file}`, 'utf8');
  for (const [key, value] of Object.entries(changes)) {
    const pattern = new RegExp(`^${key}=.*$`, 'gm');
    if ((data.match(pattern) ?? []).length !== 1) throw new Error('Missing or repeated configuration key');
    data = data.replace(pattern, `${key}=${value}`);
  }
  writeFileSync(`${root}/${file}.deploy`, data, { mode: 0o600, flag: 'wx' });
  renameSync(`${root}/${file}.deploy`, `${root}/${file}`);
}
JS
node scripts/validate-host-preflight.mjs --env-file "$config/compose.env" --installation neska-prova >&2
apparmor_parser -r infra/hetzner/apparmor/aibrain-container
docker compose --env-file "$config/compose.env" -f infra/hetzner/compose.yaml config --quiet
docker compose --env-file "$config/compose.env" -f infra/hetzner/compose.yaml \
  up -d --wait --wait-timeout 300 egress-gateway automation-worker app ingress-gateway alert-dispatcher >&2
node scripts/manage-release.mjs bootstrap --installation-id neska-prova \
  --env-file "$config/compose.env" --current-compose-file "$release/infra/hetzner/compose.yaml" \
  --state-file "$config/release.json" --health-timeout-ms 300000 > "$config/bootstrap-readback.json"
jq '{schemaVersion:1,installationId,current:{revision:.current.revision,image:.current.image,egressImage:.current.egressImage},previous:.previous}' \
  "$config/bootstrap-readback.json"
