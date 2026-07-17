import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cleanNextBuild } from '../../scripts/clean-next-build';

function readWorkflow(path: string) {
  return readFileSync(path, 'utf8');
}

function readCiWorkflow() {
  return readWorkflow('.github/workflows/ci.yml');
}

function readStagingWorkflow() {
  return readWorkflow('.github/workflows/staging.yml');
}

function readPackageJson() {
  return JSON.parse(readWorkflow('package.json')) as {
    scripts: Record<string, string>;
  };
}

const generatedArtifactPaths = [
  'content/generated/source-documents.json',
  'content/generated/source-snapshot-metadata.json',
  'content/workplans/workplans.json',
] as const;
const pinnedRunnerImage = 'ubuntu-24.04';
const pinnedAnsibleVersion = '12.3.0';
const pinnedCommunityDockerVersion = '5.2.1';
const fullShaPattern = /^[a-f0-9]{40}$/;

function workflowPaths() {
  return readdirSync('.github/workflows')
    .filter((fileName) => fileName.endsWith('.yml') || fileName.endsWith('.yaml'))
    .sort()
    .map((fileName) => `.github/workflows/${fileName}`);
}

function externalActionUses(workflowPath: string) {
  return readWorkflow(workflowPath)
    .split('\n')
    .map((line, index) => ({
      lineNumber: index + 1,
      ref: /^\s*uses:\s*([^\s#]+)/.exec(line)?.[1],
    }))
    .filter((entry): entry is { lineNumber: number; ref: string } => Boolean(entry.ref))
    .filter((entry) => !entry.ref.startsWith('./') && !entry.ref.startsWith('../'));
}

function actionRefUsesFullSha(ref: string) {
  const refIndex = ref.lastIndexOf('@');
  if (refIndex <= 0) return false;
  return fullShaPattern.test(ref.slice(refIndex + 1));
}

describe('GitHub Actions supply-chain pinning', () => {
  it('pins every third-party workflow action to a full commit SHA', () => {
    const mutableActionRefs = workflowPaths().flatMap((workflowPath) => externalActionUses(workflowPath)
      .filter((entry) => !actionRefUsesFullSha(entry.ref))
      .map((entry) => `${workflowPath}:${entry.lineNumber}: ${entry.ref}`));

    expect(mutableActionRefs).toEqual([]);
  });

  it('uses explicit GitHub-hosted runner images instead of ubuntu-latest', () => {
    const mutableRunners = workflowPaths().flatMap((workflowPath) => readWorkflow(workflowPath)
      .split('\n')
      .map((line, index) => ({ lineNumber: index + 1, line }))
      .filter(({ line }) => /^\s*runs-on:\s*ubuntu-latest\s*$/.test(line))
      .map(({ lineNumber }) => `${workflowPath}:${lineNumber}`));

    expect(mutableRunners).toEqual([]);
    for (const workflowPath of workflowPaths()) {
      expect(readWorkflow(workflowPath)).toContain(`runs-on: ${pinnedRunnerImage}`);
    }
  });

  it('pins Ansible deploy toolchain versions and documents the update cadence', () => {
    for (const workflowPath of ['.github/workflows/ci.yml', '.github/workflows/staging.yml']) {
      const workflow = readWorkflow(workflowPath);
      expect(workflow).toContain('python3 -m venv .ansible-venv');
      expect(workflow).toContain(`python -m pip install ansible==${pinnedAnsibleVersion}`);
      expect(workflow).toContain('echo "$PWD/.ansible-venv/bin" >> "$GITHUB_PATH"');
      expect(workflow).not.toMatch(/python3 -m pip install ansible\s*$/m);
    }

    const requirements = readWorkflow('deploy/requirements.yml');
    expect(requirements).toContain(`version: "${pinnedCommunityDockerVersion}"`);
    expect(requirements).not.toMatch(/version:\s*["']?>=/);

    const dependencyPolicy = readWorkflow('docs/quarterly-dependency-review.md');
    expect(dependencyPolicy).toContain(`ansible==${pinnedAnsibleVersion}`);
    expect(dependencyPolicy).toContain(`community.docker ${pinnedCommunityDockerVersion}`);
    expect(dependencyPolicy).toContain('GitHub Actions commit SHA pins');
  });
});

describe('production Next build cleanup', () => {
  it('removes a stale .next/server tree before a production build', () => {
    const root = mkdtempSync(join(tmpdir(), 'beredskapsboka-next-clean-'));

    try {
      writeFixtureFile(root, '.next/server/app/kort/page.js', 'stale app route artifact\n');
      writeFixtureFile(root, '.next/server/chunks/deep/stale.js', 'stale server chunk\n');
      writeFixtureFile(root, '.next/cache/previous-build', 'stale build cache\n');
      writeFixtureFile(root, '.next/standalone/.next/.DS_Store', 'macOS metadata\n');

      expect(existsSync(join(root, '.next/server/app/kort/page.js'))).toBe(true);

      cleanNextBuild(root);

      expect(existsSync(join(root, '.next/server'))).toBe(false);
      expect(existsSync(join(root, '.next/standalone/.next/.DS_Store'))).toBe(false);
      expect(existsSync(join(root, '.next'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('tolerates a missing .next directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'beredskapsboka-next-clean-missing-'));

    try {
      expect(() => cleanNextBuild(root)).not.toThrow();
      expect(existsSync(join(root, '.next'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('requires package production builds to clean .next before next build', () => {
    const { scripts } = readPackageJson();
    const cleanNext = scripts['clean:next'];
    const buildApp = scripts['build:app'];
    const checkCi = scripts['check:ci'];

    expect(cleanNext).toBe('tsx scripts/clean-next-build.ts');
    expect(buildApp).toContain('npm run clean:next');
    expect(buildApp).toContain('next build');
    expect(buildApp.indexOf('npm run clean:next')).toBeLessThan(buildApp.indexOf('next build'));
    expect(checkCi).toContain('npm run build:app');
    expect(checkCi).not.toContain('next build');
  });
});

function writeFixtureFile(root: string, relativePath: string, content: string) {
  const filePath = join(root, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function createGeneratedArtifactGitFixture() {
  const root = mkdtempSync(join(tmpdir(), 'beredskapsboka-generated-gate-'));
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'ci-test@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'CI Test'], { cwd: root });

  for (const artifactPath of generatedArtifactPaths) {
    writeFixtureFile(root, artifactPath, `clean fixture for ${artifactPath}\n`);
  }
  execFileSync('git', ['add', ...generatedArtifactPaths], { cwd: root });
  execFileSync('git', ['commit', '-m', 'seed generated artifacts'], { cwd: root, stdio: 'ignore' });

  return root;
}

function runGeneratedGate(command: string, root: string) {
  return execFileSync('bash', ['-lc', command], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
}

function resetGeneratedFixture(root: string) {
  execFileSync('git', ['reset', '--hard', 'HEAD'], { cwd: root, stdio: 'ignore' });
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
  it('keeps package CI checks in parity with the CI audit gate', () => {
    const workflow = readCiWorkflow();
    const { scripts } = readPackageJson();
    const checkCi = scripts['check:ci'];

    expect(scripts['audit:ci']).toContain('npm audit --audit-level=high');
    expect(checkCi).toContain('npm run audit:ci');
    expect(checkCi.indexOf('npm run audit:ci')).toBeLessThan(checkCi.indexOf('npm run build:content'));
    expect(checkCi.indexOf('npm run audit:ci')).toBeLessThan(checkCi.indexOf('npm run build:app'));
    expect(workflow).toMatch(/run:\s*npm run audit:ci/);
  });

  it('runs map package validation in production CI before build', () => {
    const workflow = readCiWorkflow();

    expect(workflow).toMatch(/name:\s*Validate local map packages/i);
    expect(workflow).toMatch(/npm run validate:maps/);
    expect(workflow.indexOf('npm run validate:maps')).toBeLessThan(workflow.indexOf('npm run build:app'));
  });

  it('fetches release map packages before staging checks and image build', () => {
    const workflow = readStagingWorkflow();
    const fetchMatches = workflow.match(/run:\s*npm run map:fetch/g) ?? [];
    const stagingChecks = workflow.slice(
      workflow.indexOf('staging-checks:'),
      workflow.indexOf('build-staging-image:'),
    );
    const stagingImageBuild = workflow.slice(
      workflow.indexOf('build-staging-image:'),
      workflow.indexOf('deploy-staging:'),
    );

    expect(fetchMatches).toHaveLength(2);
    expect(stagingChecks.indexOf('npm run map:fetch')).toBeLessThan(
      stagingChecks.indexOf('npm run check:ci'),
    );
    expect(stagingImageBuild).toContain('npm run map:fetch');
    expect(stagingImageBuild.indexOf('npm run map:fetch')).toBeLessThan(
      stagingImageBuild.indexOf('docker/build-push-action@'),
    );
    expect(stagingImageBuild).toContain('NODE_VERSION=${{ env.NODE_VERSION }}');
  });

  it('checks tracked generated artifact freshness after content build in package CI', () => {
    const { scripts } = readPackageJson();
    const checkGenerated = scripts['check:generated'];
    const checkCi = scripts['check:ci'];
    const trackedGeneratedArtifacts = execFileSync(
      'git',
      ['ls-files', 'content/generated', 'public/generated-content', 'content/workplans'],
      { encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean);

    expect(trackedGeneratedArtifacts).toEqual([...generatedArtifactPaths]);
    expect(checkGenerated).toBe(
      `git diff --cached --exit-code -- ${generatedArtifactPaths.join(' ')} && git diff --exit-code -- ${generatedArtifactPaths.join(' ')}`,
    );
    expect(checkCi).toContain('npm run check:generated');
    expect(checkCi.indexOf('npm run build:content')).toBeLessThan(
      checkCi.indexOf('npm run check:generated'),
    );
    expect(checkCi.indexOf('npm run check:generated')).toBeLessThan(
      checkCi.indexOf('npm run validate:maps'),
    );
    expect(checkCi.indexOf('npm run check:generated')).toBeLessThan(
      checkCi.indexOf('npm run typecheck'),
    );
    expect(checkCi.indexOf('npm run check:generated')).toBeLessThan(checkCi.indexOf('npm run lint'));
    expect(checkCi.indexOf('npm run check:generated')).toBeLessThan(checkCi.indexOf('npm run test'));
    expect(checkCi.indexOf('npm run check:generated')).toBeLessThan(
      checkCi.indexOf('npm run build:app'),
    );
  });

  it('fails generated artifact gate for staged and unstaged generated drift only', () => {
    const { scripts } = readPackageJson();
    const command = scripts['check:generated'];
    const root = createGeneratedArtifactGitFixture();

    try {
      writeFixtureFile(root, 'docs/manual-tests/unrelated-evidence.md', 'unrelated dirty docs evidence\n');
      expect(() => runGeneratedGate(command, root)).not.toThrow();

      writeFixtureFile(root, generatedArtifactPaths[0], 'unstaged generated drift\n');
      expect(() => runGeneratedGate(command, root)).toThrow();
      resetGeneratedFixture(root);

      writeFixtureFile(root, generatedArtifactPaths[1], 'staged generated drift\n');
      execFileSync('git', ['add', generatedArtifactPaths[1]], { cwd: root });
      expect(() => runGeneratedGate(command, root)).toThrow();
      resetGeneratedFixture(root);

      const indexOnlyPath = generatedArtifactPaths[2];
      writeFixtureFile(root, indexOnlyPath, 'index-only generated drift\n');
      execFileSync('git', ['add', indexOnlyPath], { cwd: root });
      writeFixtureFile(root, indexOnlyPath, `clean fixture for ${indexOnlyPath}\n`);
      expect(() => runGeneratedGate(command, root)).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
    // Spawns ~10 synchronous git subprocesses against a tmp fixture; under full
    // parallel-suite load this exceeds the 5s default. Isolated it runs in ~1.3s.
  }, 30_000);

  it('checks generated artifact freshness after content build in GitHub Actions CI', () => {
    const workflow = readCiWorkflow();
    const checkStep = workflowStep(
      workflow,
      'Check generated artifact freshness',
      'Validate local map packages',
    );

    expect(checkStep).toMatch(/run:\s*npm run check:generated/);
    expect(workflow.indexOf('- name: Build content artifacts')).toBeLessThan(
      workflow.indexOf('- name: Check generated artifact freshness'),
    );
    expect(workflow.indexOf('- name: Check generated artifact freshness')).toBeLessThan(
      workflow.indexOf('- name: Validate local map packages'),
    );
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
