import { compileCuratedContent } from '@/scripts/compile-curated';

it('compiles all curated content groups', async () => {
  const result = await compileCuratedContent({ curatedDir: 'content/curated', generatedDir: 'content/generated' });
  expect(result.actionCards.length).toBeGreaterThan(0);
  expect(result.checklists.length).toBeGreaterThan(0);
  expect(result.trainingPaths.map((p) => p.slug)).toContain('fig10-grunnkurs');
  expect(result.protectionMeasures.map((p) => p.slug)).toContain('offentlig-tilfluktsrom');
});
