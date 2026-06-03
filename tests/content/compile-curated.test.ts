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
