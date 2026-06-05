import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readWorkflow(path: string) {
  return readFileSync(path, 'utf8');
}

function readCiWorkflow() {
  return readWorkflow('.github/workflows/ci.yml');
}

function configureSshStep(workflow: string) {
  const start = workflow.indexOf('- name: Configure SSH key');
  const end = workflow.indexOf('- name: Deploy immutable image tag');

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return workflow.slice(start, end);
}

describe('CI workflow checks', () => {
  it('runs map package validation in production CI before build', () => {
    const workflow = readCiWorkflow();

    expect(workflow).toMatch(/name:\s*Validate local map packages/i);
    expect(workflow).toMatch(/npm run validate:maps/);
    expect(workflow.indexOf('npm run validate:maps')).toBeLessThan(workflow.indexOf('npm run build:app'));
  });
});

describe('CI deploy SSH security', () => {
  it('compares scanned host key with a pinned expected host key before writing known_hosts', () => {
    const step = configureSshStep(readCiWorkflow());
    const mismatchCheckIndex = step.indexOf('VPS SSH host key mismatch');
    const writeKnownHostsIndex = step.indexOf('> ~/.ssh/known_hosts');

    expect(step).toMatch(/VPS_SSH_HOST_KEY/);
    expect(step).toMatch(/ssh-keyscan/);
    expect(step).toMatch(/scanned_host_key/);
    expect(step).toMatch(/expected_host_key/);
    expect(step).toMatch(/normalize_host_keys\(\)/);
    expect(step).toMatch(/\/\^\[\[:space:\]\]\*#\/d/);
    expect(mismatchCheckIndex).toBeGreaterThan(-1);
    expect(writeKnownHostsIndex).toBeGreaterThan(mismatchCheckIndex);
    expect(step).not.toMatch(/ssh-keyscan\s+-H\s+198\.23\.137\.16\s+>>\s+~\/\.ssh\/known_hosts/);
  });
});

describe('staging deploy verification', () => {
  it('pins staging SSH host key instead of trusting ssh-keyscan only', () => {
    const workflow = readWorkflow('.github/workflows/staging.yml');

    expect(workflow).toMatch(/STAGING_SSH_HOST_KEY/);
    expect(workflow).toMatch(/known_hosts/);
    expect(workflow).not.toMatch(/ssh-keyscan -H "\$\{STAGING_HOST\}" >> ~\/\.ssh\/known_hosts/);
  });

  it('verifies staging public health exposes the exact deployed SHA', () => {
    const workflow = readWorkflow('.github/workflows/staging.yml');

    expect(workflow).toMatch(/Verify staging public deployment version/);
    expect(workflow).toMatch(/https:\/\/\$\{STAGING_DOMAIN\}\/api\/health/);
    expect(workflow).toMatch(/github\.sha|GITHUB_SHA/);
    expect(workflow).toMatch(/version/);
  });
});
