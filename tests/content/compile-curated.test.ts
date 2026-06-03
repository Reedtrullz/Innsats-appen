import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compileCuratedContent } from '@/scripts/compile-curated';

it('compiles all curated content groups without writing repo generated artifacts', async () => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-curated-'));
  const result = await compileCuratedContent({
    curatedDir: 'content/curated',
    generatedDir: path.join(outputRoot, 'generated'),
    publicGeneratedDir: path.join(outputRoot, 'public-generated'),
  });
  expect(result.actionCards.length).toBeGreaterThan(0);
  expect(result.checklists.length).toBeGreaterThan(0);
  expect(result.trainingPaths.map((p) => p.slug)).toContain('fig10-grunnkurs');
  expect(result.protectionMeasures.map((p) => p.slug)).toContain('offentlig-tilfluktsrom');
});

it('keeps draft and retired FAQ out of the public generated artifact and manifest count', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-curated-faq-'));
  const tempCurated = path.join(tempRoot, 'curated');
  await fs.cp('content/curated', tempCurated, { recursive: true });
  await fs.writeFile(
    path.join(tempCurated, 'faq.yaml'),
    `- id: approved-faq\n  question: Approved?\n  answer: Public answer.\n  category: Test\n  sourceIds: [src-5-punktsordre]\n  updatedAt: 2026-06-03\n  status: approved\n- id: draft-faq\n  question: Draft?\n  answer: Not public.\n  category: Test\n  sourceIds: [src-5-punktsordre]\n  updatedAt: 2026-06-03\n  status: draft\n- id: retired-faq\n  question: Retired?\n  answer: Not public.\n  category: Test\n  sourceIds: [src-5-punktsordre]\n  updatedAt: 2026-06-03\n  status: retired\n`,
    'utf8',
  );

  const result = await compileCuratedContent({
    curatedDir: tempCurated,
    generatedDir: path.join(tempRoot, 'generated'),
    publicGeneratedDir: path.join(tempRoot, 'public-generated'),
  });
  const generatedFaq = JSON.parse(await fs.readFile(path.join(tempRoot, 'generated', 'faq.json'), 'utf8'));
  const publicFaq = JSON.parse(await fs.readFile(path.join(tempRoot, 'public-generated', 'faq.json'), 'utf8'));

  expect(result.faq.map((entry) => entry.id)).toEqual(['approved-faq', 'draft-faq', 'retired-faq']);
  expect(result.manifest.faqCount).toBe(1);
  expect(generatedFaq.map((entry: { id: string }) => entry.id)).toEqual(['approved-faq', 'draft-faq', 'retired-faq']);
  expect(publicFaq.map((entry: { id: string }) => entry.id)).toEqual(['approved-faq']);
});
