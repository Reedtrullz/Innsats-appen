import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';
import { importObsidianSources, redactLocalPathReferences } from '@/scripts/import-obsidian';

it('imports source extracts with stable IDs and relative source references', async () => {
  const fixtureRoot = path.resolve('tests/fixtures/obsidian-mini');
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-import-mini-'));
  const result = await importObsidianSources(fixtureRoot, {
    generatedDir: path.join(outputRoot, 'generated'),
    publicAssetsDir: path.join(outputRoot, 'assets'),
    publicGeneratedDir: path.join(outputRoot, 'public-generated'),
    minRealSourceCount: 0,
  });
  expect(result.sources.map((s) => s.id)).toContain('src-5-punktsordre');
  expect(result.sources.map((s) => s.id)).toContain('src-deep-research-tilfluktsrom');
  expect(result.sources.map((s) => s.id)).toContain('src-kursplan-grunnkurs-fig10');
  expect(result.sources.every((source) => source.sourcePath.startsWith('source-extracts/'))).toBe(true);
  expect(result.sources.every((source) => source.status && source.verifiedAt && source.reviewAfter && source.owner && source.reviewer)).toBe(true);
  expect(result.sources.every((source) => source.reviewRisk === 'high')).toBe(true);
  expect(JSON.stringify(result.sources)).not.toContain('/Users/');
  expect(JSON.stringify(result.sources)).not.toContain(path.resolve('tests/fixtures/obsidian-mini'));
});

it('uses stable default review metadata independent of the build clock', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
  try {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-import-stable-review-'));
    await fs.mkdir(path.join(fixtureRoot, 'source-extracts'), { recursive: true });
    await fs.writeFile(path.join(fixtureRoot, 'source-extracts', 'SRC - Stable.md'), '# Stable\nKilde uten frontmatter.');

    const result = await importObsidianSources(fixtureRoot, {
      generatedDir: path.join(fixtureRoot, 'generated'),
      publicAssetsDir: path.join(fixtureRoot, 'assets'),
      publicGeneratedDir: path.join(fixtureRoot, 'public-generated'),
    });

    expect(result.sources[0].verifiedAt).toBe('2026-06-03');
    expect(result.sources[0].reviewAfter).toBe('2026-09-01');
  } finally {
    vi.useRealTimers();
  }
});

it('uses source review frontmatter when present and safe defaults when missing', async () => {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-import-metadata-'));
  await fs.mkdir(path.join(fixtureRoot, 'source-extracts'), { recursive: true });
  await fs.writeFile(
    path.join(fixtureRoot, 'source-extracts', 'SRC - Metadata.md'),
    [
      '---',
      'status: verified',
      'verifiedAt: 2026-01-10',
      'reviewAfter: 2026-07-10',
      'expiresAt: 2027-01-10',
      'owner: radiac-team',
      'reviewer: kari',
      'reviewRisk: high',
      'reviewNotes: Kontrollert mot offentlig prosedyre.',
      'pilotReviewStatus: approved-for-pilot',
      'publicationStatus: approved-public',
      '---',
      '# Metadata',
      'Kilde uten lokale stier.',
    ].join('\n'),
  );

  const result = await importObsidianSources(fixtureRoot, {
    generatedDir: path.join(fixtureRoot, 'generated'),
    publicAssetsDir: path.join(fixtureRoot, 'assets'),
    publicGeneratedDir: path.join(fixtureRoot, 'public-generated'),
  });

  expect(result.sources[0]).toMatchObject({
    status: 'verified',
    verifiedAt: '2026-01-10',
    reviewAfter: '2026-07-10',
    expiresAt: '2027-01-10',
    owner: 'radiac-team',
    reviewer: 'kari',
    reviewRisk: 'high',
    reviewNotes: 'Kontrollert mot offentlig prosedyre.',
    pilotReviewStatus: 'approved-for-pilot',
    publicationStatus: 'approved-public',
  });
});

it('uses pregenerated source documents when explicitly allowed and source extracts are unavailable', async () => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-pregenerated-'));
  const generatedDir = path.join(outputRoot, 'generated');
  const publicGeneratedDir = path.join(outputRoot, 'public-generated');
  const publicAssetsDir = path.join(outputRoot, 'assets');
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.mkdir(publicAssetsDir, { recursive: true });
  await fs.writeFile(path.join(publicAssetsDir, 'diagram.png'), 'fake image');
  await fs.writeFile(path.join(generatedDir, 'source-documents.json'), JSON.stringify([
    {
      id: 'src-known',
      title: 'SRC - Known',
      sourcePath: 'source-extracts/SRC - Known.md',
      sourceType: 'source-extract',
      status: 'verified',
      body: 'Known source body',
      warnings: [],
    },
  ]));
  await fs.writeFile(path.join(generatedDir, 'manifest.json'), JSON.stringify({
    contentVersion: '2026-06-04T22:25:38.764Z',
    generatedAt: '2026-06-04T22:25:38.764Z',
    sourceSnapshotGeneratedAt: '2026-06-04T22:25:38.764Z',
    usedPregeneratedFallback: false,
    sourceCount: 1,
    actionCardCount: 0,
    checklistCount: 0,
    trainingPathCount: 0,
    protectionMeasureCount: 0,
    glossaryCount: 0,
    faqCount: 0,
    copiedAssetCount: 0,
  }));

  const previous = process.env.ALLOW_PREGENERATED_CONTENT;
  process.env.ALLOW_PREGENERATED_CONTENT = '1';
  try {
    const result = await importObsidianSources(path.join(outputRoot, 'missing-vault'), {
      generatedDir,
      publicAssetsDir,
      publicGeneratedDir,
      minRealSourceCount: 0,
    });
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].id).toBe('src-known');
    expect(result.copiedAssets).toEqual(['diagram.png']);
    await expect(fs.readFile(path.join(publicGeneratedDir, 'source-documents.json'), 'utf8')).resolves.toContain('Known source body');
  } finally {
    if (previous === undefined) delete process.env.ALLOW_PREGENERATED_CONTENT;
    else process.env.ALLOW_PREGENERATED_CONTENT = previous;
  }
});

it('does not rewrite source snapshot generatedAt when using pregenerated fallback', async () => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-pregenerated-freshness-'));
  const generatedDir = path.join(outputRoot, 'generated');
  const publicGeneratedDir = path.join(outputRoot, 'public-generated');
  const publicAssetsDir = path.join(outputRoot, 'assets');
  const originalSnapshotGeneratedAt = '2026-06-04T22:25:38.764Z';
  const fallbackBuildTime = '2030-01-01T00:00:00.000Z';

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.mkdir(publicAssetsDir, { recursive: true });
  await fs.writeFile(path.join(generatedDir, 'source-documents.json'), JSON.stringify([
    {
      id: 'src-known',
      title: 'SRC - Known',
      sourcePath: 'source-extracts/SRC - Known.md',
      sourceType: 'source-extract',
      status: 'verified',
      body: 'Known source body',
      warnings: [],
    },
  ]));
  await fs.writeFile(path.join(generatedDir, 'manifest.json'), JSON.stringify({
    contentVersion: originalSnapshotGeneratedAt,
    generatedAt: originalSnapshotGeneratedAt,
    sourceSnapshotGeneratedAt: originalSnapshotGeneratedAt,
    usedPregeneratedFallback: false,
    sourceCount: 1,
    actionCardCount: 0,
    checklistCount: 0,
    trainingPathCount: 0,
    protectionMeasureCount: 0,
    glossaryCount: 0,
    faqCount: 0,
    copiedAssetCount: 0,
  }));

  const result = await importObsidianSources(path.join(outputRoot, 'missing-vault'), {
    generatedDir,
    publicAssetsDir,
    publicGeneratedDir,
    allowPregenerated: true,
    now: fallbackBuildTime,
  });

  expect(result.manifest.generatedAt).toBe(fallbackBuildTime);
  expect(result.manifest.sourceSnapshotGeneratedAt).toBe(originalSnapshotGeneratedAt);
  expect(result.manifest.sourceSnapshotGeneratedAt).not.toBe(fallbackBuildTime);
  expect(result.manifest.sourceSnapshotHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(result.manifest.usedPregeneratedFallback).toBe(true);
});

it('refuses pregenerated fallback when source snapshot metadata is unavailable', async () => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-pregenerated-no-manifest-'));
  const generatedDir = path.join(outputRoot, 'generated');
  const publicGeneratedDir = path.join(outputRoot, 'public-generated');
  const publicAssetsDir = path.join(outputRoot, 'assets');
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(path.join(generatedDir, 'source-documents.json'), JSON.stringify([
    {
      id: 'src-known',
      title: 'SRC - Known',
      sourcePath: 'source-extracts/SRC - Known.md',
      sourceType: 'source-extract',
      status: 'verified',
      body: 'Known source body',
      warnings: [],
    },
  ]));

  await expect(importObsidianSources(path.join(outputRoot, 'missing-vault'), {
    generatedDir,
    publicAssetsDir,
    publicGeneratedDir,
    allowPregenerated: true,
    now: '2030-01-01T00:00:00.000Z',
  })).rejects.toThrow(/source snapshot metadata/);
});

it('uses tracked source snapshot metadata when pregenerated fallback has no manifest', async () => {
  const fixtureRoot = path.resolve('tests/fixtures/obsidian-mini');
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-pregenerated-sidecar-'));
  const generatedDir = path.join(outputRoot, 'generated');
  const publicGeneratedDir = path.join(outputRoot, 'public-generated');
  const publicAssetsDir = path.join(outputRoot, 'assets');
  const sourceSnapshotGeneratedAt = '2026-06-04T22:25:38.764Z';
  const fallbackBuildTime = '2030-01-01T00:00:00.000Z';

  await importObsidianSources(fixtureRoot, {
    generatedDir,
    publicAssetsDir,
    publicGeneratedDir,
    minRealSourceCount: 0,
    now: sourceSnapshotGeneratedAt,
  });
  await fs.rm(path.join(generatedDir, 'manifest.json'));

  const result = await importObsidianSources(path.join(outputRoot, 'missing-vault'), {
    generatedDir,
    publicAssetsDir,
    publicGeneratedDir,
    allowPregenerated: true,
    now: fallbackBuildTime,
  });

  expect(result.manifest.generatedAt).toBe(fallbackBuildTime);
  expect(result.manifest.sourceSnapshotGeneratedAt).toBe(sourceSnapshotGeneratedAt);
  expect(result.manifest.sourceSnapshotHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(result.manifest.usedPregeneratedFallback).toBe(true);
});

it('refuses pregenerated fallback when source documents do not match the manifest hash', async () => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-pregenerated-hash-mismatch-'));
  const generatedDir = path.join(outputRoot, 'generated');
  const publicGeneratedDir = path.join(outputRoot, 'public-generated');
  const publicAssetsDir = path.join(outputRoot, 'assets');
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(path.join(generatedDir, 'source-documents.json'), JSON.stringify([
    {
      id: 'src-known',
      title: 'SRC - Known changed',
      sourcePath: 'source-extracts/SRC - Known.md',
      sourceType: 'source-extract',
      status: 'verified',
      body: 'Changed source body',
      warnings: [],
    },
  ]));
  await fs.writeFile(path.join(generatedDir, 'manifest.json'), JSON.stringify({
    contentVersion: '2026-06-04T22:25:38.764Z',
    generatedAt: '2026-06-04T22:25:38.764Z',
    sourceSnapshotGeneratedAt: '2026-06-04T22:25:38.764Z',
    sourceSnapshotHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    usedPregeneratedFallback: false,
    sourceCount: 1,
    actionCardCount: 0,
    checklistCount: 0,
    trainingPathCount: 0,
    protectionMeasureCount: 0,
    glossaryCount: 0,
    faqCount: 0,
    copiedAssetCount: 0,
  }));

  await expect(importObsidianSources(path.join(outputRoot, 'missing-vault'), {
    generatedDir,
    publicAssetsDir,
    publicGeneratedDir,
    allowPregenerated: true,
    now: '2030-01-01T00:00:00.000Z',
  })).rejects.toThrow(/source snapshot metadata/);
});

it('refuses pregenerated fallback when source documents do not match the sidecar hash', async () => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-pregenerated-sidecar-hash-mismatch-'));
  const generatedDir = path.join(outputRoot, 'generated');
  const publicGeneratedDir = path.join(outputRoot, 'public-generated');
  const publicAssetsDir = path.join(outputRoot, 'assets');
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(path.join(generatedDir, 'source-documents.json'), JSON.stringify([
    {
      id: 'src-known',
      title: 'SRC - Known changed',
      sourcePath: 'source-extracts/SRC - Known.md',
      sourceType: 'source-extract',
      status: 'verified',
      body: 'Changed source body',
      warnings: [],
    },
  ]));
  await fs.writeFile(path.join(generatedDir, 'source-snapshot-metadata.json'), JSON.stringify({
    sourceSnapshotGeneratedAt: '2026-06-04T22:25:38.764Z',
    sourceSnapshotHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    sourceCount: 1,
  }));

  await expect(importObsidianSources(path.join(outputRoot, 'missing-vault'), {
    generatedDir,
    publicAssetsDir,
    publicGeneratedDir,
    allowPregenerated: true,
    now: '2030-01-01T00:00:00.000Z',
  })).rejects.toThrow(/source snapshot metadata/);
});

it('redacts common local path forms without touching URLs', () => {
  const redacted = redactLocalPathReferences([
    String.raw`Windows C:\Users\Reidar\secret.docx`,
    '`/Users/reidar/private.docx`',
    '`/home/reidar/private.docx`',
    '`/tmp/private.docx`',
    'https://example.com/tmp/not-local.md',
  ].join('\n'));

  expect(redacted).not.toContain(String.raw`C:\Users\Reidar`);
  expect(redacted).not.toContain('/Users/reidar');
  expect(redacted).not.toContain('/home/reidar');
  expect(redacted).not.toContain('/tmp/private.docx');
  expect(redacted).toContain('https://example.com/tmp/not-local.md');
});

it('redacts absolute local paths from imported source bodies', async () => {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-import-'));
  await fs.mkdir(path.join(fixtureRoot, 'source-extracts'), { recursive: true });
  await fs.writeFile(
    path.join(fixtureRoot, 'source-extracts', 'SRC - Local path.md'),
    [
      '---',
      'source_status: new',
      '---',
      '# Local path',
      '',
      '> Kildeuttrekk fra `/Users/reidar/Projectos/Beredskapsboka`.',
      '- Kilde: `/Users/reidar/Projectos/Beredskapsboka/private.docx`',
      '- Windows: `C:\\Users\\Reidar\\secret.docx`',
      '- Linux: `/home/reidar/secret.docx`',
      '- Temp: `/tmp/beredskapsboka/private.txt`',
    ].join('\n'),
  );

  const result = await importObsidianSources(fixtureRoot, {
    generatedDir: path.join(fixtureRoot, 'generated'),
    publicAssetsDir: path.join(fixtureRoot, 'assets'),
    publicGeneratedDir: path.join(fixtureRoot, 'public-generated'),
  });

  const serialized = JSON.stringify(result.sources);
  expect(result.sources[0].sourcePath).toBe('source-extracts/SRC - Local path.md');
  expect(serialized).not.toContain('/Users/');
  expect(serialized).not.toContain('C:\\Users');
  expect(serialized).not.toContain('/home/reidar');
  expect(serialized).not.toContain('/tmp/beredskapsboka');
  expect(serialized).toContain('[redigert lokal sti]');
});

it('omits source body from public generated docs until publication is approved', async () => {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-public-redaction-'));
  await fs.mkdir(path.join(fixtureRoot, 'source-extracts'), { recursive: true });
  await fs.writeFile(path.join(fixtureRoot, 'source-extracts', 'SRC - Needs Permission.md'), [
    '---',
    'status: verified',
    'pilotReviewStatus: approved-for-pilot',
    'publicationStatus: needs-permission',
    '---',
    '# Needs Permission',
    'Sensitive-ish source body that has not been approved for public publication.',
  ].join('\n'));
  await fs.writeFile(path.join(fixtureRoot, 'source-extracts', 'SRC - Approved Public.md'), [
    '---',
    'status: verified',
    'pilotReviewStatus: approved-for-pilot',
    'publicationStatus: approved-public',
    '---',
    '# Approved Public',
    'Approved public excerpt.',
  ].join('\n'));

  await importObsidianSources(fixtureRoot, {
    generatedDir: path.join(fixtureRoot, 'generated'),
    publicAssetsDir: path.join(fixtureRoot, 'assets'),
    publicGeneratedDir: path.join(fixtureRoot, 'public-generated'),
  });

  const privateSources = JSON.parse(await fs.readFile(path.join(fixtureRoot, 'generated/source-documents.json'), 'utf8'));
  const publicSources = JSON.parse(await fs.readFile(path.join(fixtureRoot, 'public-generated/source-documents.json'), 'utf8'));

  expect(privateSources.find((source: any) => source.id === 'src-needs-permission')?.body).toContain('not been approved');
  expect(publicSources.find((source: any) => source.id === 'src-needs-permission')?.body).toBe('');
  expect(publicSources.find((source: any) => source.id === 'src-approved-public')?.body).toContain('Approved public excerpt');
});

it('omits source body from pregenerated public fallback when publication is not approved', async () => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-pregenerated-redaction-'));
  const generatedDir = path.join(outputRoot, 'generated');
  const publicGeneratedDir = path.join(outputRoot, 'public-generated');
  const publicAssetsDir = path.join(outputRoot, 'assets');
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.mkdir(publicAssetsDir, { recursive: true });
  await fs.writeFile(path.join(generatedDir, 'source-documents.json'), JSON.stringify([
    {
      id: 'src-known',
      title: 'SRC - Known',
      sourcePath: 'source-extracts/SRC - Known.md',
      sourceType: 'source-extract',
      status: 'verified',
      pilotReviewStatus: 'approved-for-pilot',
      publicationStatus: 'needs-permission',
      body: 'Known source body must stay private to generated content.',
      warnings: [],
    },
  ]));
  await fs.writeFile(path.join(generatedDir, 'manifest.json'), JSON.stringify({
    contentVersion: '2026-06-04T22:25:38.764Z',
    generatedAt: '2026-06-04T22:25:38.764Z',
    sourceSnapshotGeneratedAt: '2026-06-04T22:25:38.764Z',
    usedPregeneratedFallback: false,
    sourceCount: 1,
    actionCardCount: 0,
    checklistCount: 0,
    trainingPathCount: 0,
    protectionMeasureCount: 0,
    glossaryCount: 0,
    faqCount: 0,
    copiedAssetCount: 0,
  }));

  await importObsidianSources(path.join(outputRoot, 'missing-vault'), {
    generatedDir,
    publicAssetsDir,
    publicGeneratedDir,
    allowPregenerated: true,
  });

  const publicSources = JSON.parse(await fs.readFile(path.join(publicGeneratedDir, 'source-documents.json'), 'utf8'));
  expect(publicSources[0].body).toBe('');
});
