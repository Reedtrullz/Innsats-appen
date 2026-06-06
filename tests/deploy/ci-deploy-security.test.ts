import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readWorkflow(path: string) {
  return readFileSync(path, 'utf8');
}

function readCiWorkflow() {
  return readWorkflow('.github/workflows/ci.yml');
}

function manualPublishScript() {
  return readWorkflow('deploy/publish-and-deploy.sh');
}

function extractCiRunSelectionScript(script: string) {
  const match = /node <<'NODE'\n([\s\S]*?)\nNODE/.exec(script);
  const body = match?.[1] ?? '';

  expect(body).not.toBe('');

  return body;
}

function selectCiRunId(runs: unknown[], sha: string) {
  return execFileSync('node', ['-e', extractCiRunSelectionScript(manualPublishScript())], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CI_RUNS_JSON: JSON.stringify(runs),
      SHA: sha,
    },
  });
}

function configureSshStep(workflow: string) {
  const start = workflow.indexOf('- name: Configure SSH key');
  const end = workflow.indexOf('- name: Deploy immutable image tag');

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return workflow.slice(start, end);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function workflowStep(workflow: string, startName: string, nextName?: string) {
  const startPattern = new RegExp(`^([ \\t]*)- name: ${escapeRegExp(startName)}\\s*$`, 'm');
  const startMatch = startPattern.exec(workflow);
  const start = startMatch?.index ?? -1;
  expect(start).toBeGreaterThan(-1);

  if (!startMatch) {
    return '';
  }

  const sameIndent = escapeRegExp(startMatch[1]);
  const afterStartOffset = start + startMatch[0].length;
  const remainder = workflow.slice(afterStartOffset);
  const endPattern = nextName
    ? new RegExp(`^${sameIndent}- name: ${escapeRegExp(nextName)}\\s*$`, 'm')
    : new RegExp(`^${sameIndent}- name: `, 'm');
  const endMatch = endPattern.exec(remainder);
  const end = endMatch ? afterStartOffset + endMatch.index : workflow.length;

  if (nextName) {
    expect(endMatch).not.toBeNull();
    expect(end).toBeGreaterThan(start);
  }

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
    const step = workflowStep(workflow, 'Configure staging SSH key', 'Write staging inventory');

    expect(step).toMatch(/STAGING_SSH_HOST_KEY/);
    expect(step).toMatch(/printf\s+'%s\\n'\s+"\$\{STAGING_SSH_HOST_KEY\}"\s*>\s*~\/\.ssh\/known_hosts/);
    expect(step).toMatch(/ssh-keygen\s+-F\s+"\$\{STAGING_HOST\}"\s+-f\s+~\/\.ssh\/known_hosts/);
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

describe('manual production publish script safety', () => {
  it('requires origin/main parity and the full local CI gate before deploy', () => {
    const script = manualPublishScript();

    expect(script).toMatch(/git fetch origin main/);
    expect(script).toMatch(/git rev-parse origin\/main/);
    expect(script).toMatch(/HEAD is not origin\/main/);
    expect(script).toMatch(/npm run check:ci/);
    expect(script).toMatch(/gh run list --commit "\$SHA"/);
    expect(script).toMatch(/--limit 50/);
    expect(script).toMatch(/--json databaseId,status,conclusion,headSha,workflowName,event,headBranch/);
    expect(script).toMatch(/candidate\.workflowName === 'CI \/ Deploy'/);
    expect(script).toMatch(/candidate\.headSha === process\.env\.SHA/);
    expect(script).toMatch(/candidate\.headBranch === 'main'/);
    expect(script).toMatch(/candidate\.event === 'push'/);
    expect(script).toMatch(/candidate\.event === 'workflow_dispatch'/);
    expect(script).toMatch(/candidate\.status === 'completed'/);
    expect(script).toMatch(/candidate\.conclusion === 'success'/);
    expect(script.indexOf('npm run check:ci')).toBeLessThan(script.indexOf('docker buildx build'));
    expect(script.indexOf('gh run list --commit "$SHA"')).toBeLessThan(script.indexOf('docker buildx build'));
  });

  it('selects only a completed successful main-branch CI run for the exact SHA', () => {
    const sha = 'd76ef9974ae12b2add5b061143704b701a6cf21a';
    const selectedRunId = selectCiRunId(
      [
        {
          databaseId: 101,
          workflowName: 'CI / Deploy',
          headSha: sha,
          headBranch: 'feature/manual-publish',
          event: 'pull_request',
          status: 'completed',
          conclusion: 'success',
        },
        {
          databaseId: 202,
          workflowName: 'CI / Deploy',
          headSha: sha,
          headBranch: 'main',
          event: 'push',
          status: 'completed',
          conclusion: 'failure',
        },
        {
          databaseId: 303,
          workflowName: 'CI / Deploy',
          headSha: sha,
          headBranch: 'main',
          event: 'push',
          status: 'in_progress',
          conclusion: '',
        },
        {
          databaseId: 404,
          workflowName: 'CI / Deploy',
          headSha: sha,
          headBranch: 'main',
          event: 'push',
          status: 'completed',
          conclusion: 'success',
        },
      ],
      sha,
    );

    expect(selectedRunId).toBe('404');
  });

  it('requires proof that the deploy job completed successfully in the selected CI run', () => {
    const script = manualPublishScript();

    expect(script).toMatch(/gh run view "\$CI_RUN_ID" --json jobs/);
    expect(script).toMatch(/select\(\.name == "Deploy to VPS with Ansible" and \.conclusion == "success"\)/);
    expect(script).toMatch(/DEPLOY_JOB_ID=/);
    expect(script).toMatch(/did not include a successful Deploy to VPS with Ansible job/);
    expect(script.indexOf('gh run view "$CI_RUN_ID" --json jobs')).toBeLessThan(
      script.indexOf('docker buildx build'),
    );
  });
});
