import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readDeployPlaybook() {
  return readFileSync('deploy/playbook.yml', 'utf8');
}

function readComposeTemplate() {
  return readFileSync('deploy/templates/compose.production.yml.j2', 'utf8');
}

function immutableImageRegexFrom(playbook: string) {
  const match = playbook.match(/allow_mutable_tag \| bool or docker_image is match\('([^']+)'\)/);
  if (!match) {
    throw new Error('Missing immutable docker_image assertion in deploy/playbook.yml');
  }
  return new RegExp(match[1]);
}

describe('deploy playbook safety', () => {
  it('has rollback or blue-green candidate verification before promotion', () => {
    const playbook = readDeployPlaybook();

    expect(playbook).toMatch(/rescue:|candidate|blue|green|previous image/i);
    expect(playbook).toMatch(/Verify public deployment version/i);
  });

  it('captures the previous running image before pulling and can restore it on failure', () => {
    const playbook = readDeployPlaybook();
    const previousCaptureIndex = playbook.indexOf('Capture current Beredskapsboka container before deploy');
    const pullIndex = playbook.indexOf('Pull requested GHCR image');
    const rescueIndex = playbook.indexOf('rescue:');

    expect(previousCaptureIndex).toBeGreaterThan(-1);
    expect(pullIndex).toBeGreaterThan(previousCaptureIndex);
    expect(rescueIndex).toBeGreaterThan(pullIndex);
    expect(playbook).toMatch(/previous_image_id/);
    expect(playbook).toMatch(/rollback_image/);
    expect(playbook).toMatch(/argv:\s*\n\s*- docker\s*\n\s*- tag\s*\n\s*- "\{\{ previous_image_id \}\}"\s*\n\s*- "\{\{ rollback_image \}\}"/);
    expect(playbook).toMatch(/Restore previous Beredskapsboka container/);
  });

  it('does not hide Docker inspection failures when capturing rollback state', () => {
    const playbook = readDeployPlaybook();
    const captureBlock = playbook.slice(
      playbook.indexOf('Capture current Beredskapsboka container before deploy'),
      playbook.indexOf('Remember previous deployment for rollback'),
    );

    expect(captureBlock).toMatch(/community\.docker\.docker_container_info/);
    expect(captureBlock).not.toMatch(/failed_when:\s*false/);
  });

  it('renders rollback compose with the previous image and version', () => {
    const playbook = readDeployPlaybook();
    const template = readComposeTemplate();

    expect(template).toContain('image: "{{ compose_image | default(docker_image) }}"');
    expect(template).toContain('VERSION: "{{ compose_app_version | default(app_version) }}"');
    expect(playbook).toMatch(/compose_image:\s*"\{\{ rollback_image \}\}"/);
    expect(playbook).toMatch(/compose_app_version:\s*"\{\{ previous_app_version \}\}"/);
  });

  it('verifies rollback health but still fails the deploy after restoring production', () => {
    const playbook = readDeployPlaybook();

    expect(playbook).toMatch(/Wait for local rollback health endpoint/);
    expect(playbook).toMatch(/Verify public deployment version after rollback/);
    expect(playbook).toMatch(/previous_app_version != 'unknown'/);
    expect(playbook).toMatch(/Fail deployment after successful rollback/);
    expect(playbook).toMatch(/Candidate deployment failed and Beredskapsboka was rolled back/);
  });

  it('defaults mutable production deploy overrides off and rejects latest tags unless explicit', () => {
    const playbook = readDeployPlaybook();

    expect(playbook).toMatch(/allow_mutable_tag:\s*false/);
    expect(playbook).toMatch(/allow_mutable_tag \| bool/);
    expect(playbook).toMatch(/docker_image is match\('/);
    expect(playbook).toMatch(/Set allow_mutable_tag=true\s+only for an intentional mutable-tag deploy/);
  });

  it('keeps production and staging immutable tags valid while rejecting latest by default', () => {
    const immutableImageRegex = immutableImageRegexFrom(readDeployPlaybook());

    expect(immutableImageRegex.test('ghcr.io/reedtrullz/innsats-appen:abcdef123456')).toBe(true);
    expect(immutableImageRegex.test('ghcr.io/reedtrullz/innsats-appen:staging-abcdef123456')).toBe(true);
    expect(immutableImageRegex.test('ghcr.io/reedtrullz/innsats-appen:latest')).toBe(false);
    expect(immutableImageRegex.test('ghcr.io/reedtrullz/innsats-appen:staging-latest')).toBe(false);
  });

  it('requires exact 40-character app versions unless mutable deploy override is explicit', () => {
    const playbook = readDeployPlaybook();

    expect(playbook).toMatch(/allow_mutable_tag \| bool or app_version is match\('\^\[0-9a-f\]\{40\}\$'\)/);
    expect(playbook).toMatch(/app_version must be the full\s+40-character git SHA/);
  });
});
