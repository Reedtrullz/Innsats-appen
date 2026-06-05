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

function workflowStep(workflow: string, startName: string, nextName?: string) {
  const start = workflow.indexOf(`- name: ${startName}`);
  expect(start).toBeGreaterThan(-1);

  const end = nextName
    ? workflow.indexOf(`- name: ${nextName}`, start + startName.length)
    : workflow.length;

  if (nextName) {
    expect(end).toBeGreaterThan(start);
  }

  return workflow.slice(start, end > -1 ? end : workflow.length);
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
    const step = workflowStep(workflow, 'Configure staging SSH key', 'Write staging inventory');

    expect(step).toMatch(/STAGING_SSH_HOST_KEY/);
    expect(step).toMatch(/known_hosts/);
    expect(step).toMatch(/ssh-keygen -F/);
    expect(step).not.toMatch(/ssh-keyscan\b/);
  });

  it('verifies staging public health exposes the exact deployed SHA', () => {
    const workflow = readWorkflow('.github/workflows/staging.yml');
    const step = workflowStep(workflow, 'Verify staging public deployment version');

    expect(step).toMatch(/https:\/\/\$\{STAGING_DOMAIN\}\/api\/health/);
    expect(step).toMatch(/EXPECTED_SHA/);
    expect(step).toMatch(/github\.sha|\$\{\{ github\.sha \}\}/);
    expect(step).toMatch(/health\.version/);
    expect(step).toMatch(/process\.env\.EXPECTED_SHA/);
    expect(step).toMatch(/health\.version\s*===\s*process\.env\.EXPECTED_SHA/);
  });
});
