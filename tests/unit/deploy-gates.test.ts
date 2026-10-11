import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import path from 'node:path';

const revision = 'a'.repeat(40);
const repository = 'arnautxu/Neska-Agent';
function candidate() {
  const common = { head_sha: revision, head_branch: 'main', conclusion: 'success', status: 'completed', repository: { full_name: repository }, head_repository: { full_name: repository } };
  return { revision, repository,
    ci: { ...common, id: 123456, name: 'Backend CI', event: 'push', path: '.github/workflows/backend-ci.yml' },
    publish: { ...common, id: 123457, name: 'Publish GHCR images', event: 'workflow_run', path: '.github/workflows/publish-ghcr.yml' },
    release: { schemaVersion: 1, revision, architecture: 'arm64', image: `ghcr.io/arnautxu/neska-agent@sha256:${'b'.repeat(64)}`, egressImage: `ghcr.io/arnautxu/neska-agent-egress@sha256:${'c'.repeat(64)}` },
  };
}
function validate(value: ReturnType<typeof candidate>) {
  return execFileSync(process.execPath, ['--input-type=module', '-e',
    `import { validateDeployGates } from ${JSON.stringify(path.join(process.cwd(), 'scripts/validate-deploy-gates.mjs'))};
     import { readFileSync } from 'node:fs';
     process.stdout.write(JSON.stringify(validateDeployGates(JSON.parse(readFileSync(0,'utf8')))));`,
  ], { input: JSON.stringify(value), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

describe('manual ARM deployment gates', () => {
  it('accepts only separately verified CI and publication for immutable ARM images', () => {
    expect(JSON.parse(validate(candidate()))).toEqual({ appDigest: `sha256:${'b'.repeat(64)}`, gatewayDigest: `sha256:${'c'.repeat(64)}` });
  });
  it.each(['branch', 'revision', 'fork', 'ci-failed', 'publish-skipped', 'pr-event', 'workflow', 'same-run', 'amd64', 'mutable-image', 'foreign-image'])('rejects %s before any SSH access', mode => {
    const value = candidate();
    if (mode === 'branch') value.ci.head_branch = 'feature';
    if (mode === 'revision') value.publish.head_sha = 'd'.repeat(40);
    if (mode === 'fork') value.ci.head_repository.full_name = 'other/repo';
    if (mode === 'ci-failed') value.ci.conclusion = 'failure';
    if (mode === 'publish-skipped') value.publish.conclusion = 'skipped';
    if (mode === 'pr-event') value.ci.event = 'pull_request';
    if (mode === 'workflow') value.publish.path = '.github/workflows/other.yml';
    if (mode === 'same-run') value.publish.id = value.ci.id;
    if (mode === 'amd64') value.release.architecture = 'amd64';
    if (mode === 'mutable-image') value.release.image = 'ghcr.io/arnautxu/neska-agent:latest';
    if (mode === 'foreign-image') value.release.image = value.release.image.replace('arnautxu', 'other');
    expect(() => validate(value)).toThrow();
  });
});
