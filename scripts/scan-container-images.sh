#!/bin/bash
# Ephemeral native CI scanner. Deployment scans the published digests again.
set -euo pipefail
revision=${1:?exact revision required}
evidence=${2:?evidence directory required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
case "$(uname -m)" in
  aarch64) archive=trivy_0.75.0_Linux-ARM64.tar.gz; digest=a1ee9f6ffb7d112b64ff726a2a0717c21175c1114361391f4a132956751a13b3; architecture=arm64 ;;
  x86_64) archive=trivy_0.75.0_Linux-64bit.tar.gz; digest=c6e65abddb348e25f10549df887045629cf28cc72453cd1c63acb717316b3f3f; architecture=amd64 ;;
  *) echo 'Unsupported native scanner architecture' >&2; exit 1 ;;
esac
temporary=$(mktemp -d)
trap 'rm -rf -- "$temporary"' EXIT
curl --fail --location --retry 3 --max-time 180 \
  "https://github.com/aquasecurity/trivy/releases/download/v0.75.0/$archive" -o "$temporary/$archive"
printf '%s  %s\n' "$digest" "$temporary/$archive" | sha256sum --check --strict
tar -xzf "$temporary/$archive" -C "$temporary" trivy
[[ $("$temporary/trivy" --version | head -1) == 'Version: 0.75.0' ]]
mkdir -p "$evidence"
result=0
for component in app gateway; do
  image="aibrain-ci:$revision"
  [[ "$component" == app ]] || image="aibrain-egress-ci:$revision"
  [[ $(docker image inspect --format '{{.Architecture}}' "$image") == "$architecture" ]]
  [[ $(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image") == "$revision" ]]
  # Never filter unfixed findings or load an ignore/VEX file. A scanner failure
  # blocks the gate too; retain its report and continue to assess both images.
  "$temporary/trivy" image --scanners vuln --ignorefile /dev/null --severity CRITICAL --exit-code 1 \
    --format json --output "$evidence/$component-critical.json" "$image" || result=1
  "$temporary/trivy" image --format cyclonedx \
    --output "$evidence/$component-sbom.json" "$image" || result=1
done
exit "$result"
