import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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
  expect(JSON.stringify(result.sources)).not.toContain('/Users/');
  expect(JSON.stringify(result.sources)).not.toContain(path.resolve('tests/fixtures/obsidian-mini'));
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
