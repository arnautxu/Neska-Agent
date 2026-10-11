import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function validateDeployGates({ revision, repository, ci, publish, release }) {
  if (!/^[0-9a-f]{40}$/.test(revision) || repository !== 'arnautxu/Neska-Agent') throw new Error('Unexpected deployment identity');
  for (const [run, name, event, workflow] of [
    [ci, 'Backend CI', 'push', '.github/workflows/backend-ci.yml'],
    [publish, 'Publish GHCR images', 'workflow_run', '.github/workflows/publish-ghcr.yml'],
  ]) {
    if (run.name !== name || run.path !== workflow || run.event !== event || run.head_sha !== revision
      || run.head_branch !== 'main' || run.conclusion !== 'success' || run.status !== 'completed'
      || run.repository?.full_name !== repository || run.head_repository?.full_name !== repository
      || !Number.isSafeInteger(run.id) || run.id <= 0) throw new Error('Deployment requires successful same-repository main gates for this exact SHA');
  }
  if (ci.id === publish.id) throw new Error('CI and publication must be separate runs');
  if (release.schemaVersion !== 1 || release.revision !== revision || release.architecture !== 'arm64'
    || !/^ghcr\.io\/arnautxu\/neska-agent@sha256:[0-9a-f]{64}$/.test(release.image)
    || !/^ghcr\.io\/arnautxu\/neska-agent-egress@sha256:[0-9a-f]{64}$/.test(release.egressImage)) throw new Error('Invalid immutable ARM release');
  return { appDigest: release.image.split('@')[1], gatewayDigest: release.egressImage.split('@')[1] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const read = file => JSON.parse(readFileSync(file, 'utf8'));
  const result = validateDeployGates({ revision: process.env.GITHUB_SHA, repository: process.env.GITHUB_REPOSITORY,
    ci: read('ci-run.json'), publish: read('publish-run.json'), release: read('release/release.json') });
  for (const [key, value] of Object.entries(result)) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}
