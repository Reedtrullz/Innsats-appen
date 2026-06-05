import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readDockerfile() {
  return readFileSync('Dockerfile', 'utf8');
}

function readCiWorkflow() {
  return readFileSync('.github/workflows/ci.yml', 'utf8');
}

describe('Docker production image reproducibility', () => {
  it('pins Docker node version and carries VERSION into runner stage', () => {
    const dockerfile = readDockerfile();
    const runnerStage = dockerfile.slice(dockerfile.indexOf('FROM node:${NODE_VERSION}-slim AS runner'));

    expect(dockerfile).toMatch(/ARG NODE_VERSION=22\.22\.3/);
    expect(dockerfile).toMatch(/FROM node:\$\{NODE_VERSION\}-slim AS runner/);
    expect(runnerStage).toMatch(/ARG VERSION=local/);
    expect(runnerStage).toMatch(/ENV[\s\S]*VERSION=\$\{VERSION\}/);
  });

  it('passes the pinned Node version and git SHA into the production Docker build', () => {
    const workflow = readCiWorkflow();

    expect(workflow).toMatch(/NODE_VERSION=\$\{\{ env\.NODE_VERSION \}\}/);
    expect(workflow).toMatch(/VERSION=\$\{\{ github\.sha \}\}/);
  });

  it('keeps the Dockerfile default Node version in sync with CI', () => {
    const dockerfileNodeVersion = readDockerfile().match(/ARG NODE_VERSION=([^\n]+)/)?.[1];
    const ciNodeVersion = readCiWorkflow().match(/NODE_VERSION:\s*([^\n]+)/)?.[1];

    expect(dockerfileNodeVersion).toBe('22.22.3');
    expect(ciNodeVersion).toBe(dockerfileNodeVersion);
  });
});
