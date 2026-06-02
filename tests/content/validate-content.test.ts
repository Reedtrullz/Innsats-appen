import { validateContentGraph } from '@/scripts/validate-content';

it('reports missing source references', async () => {
  const errors = await validateContentGraph({
    sources: [{ id: 'src-known' }],
    actionCards: [{ slug: 'bad-card', sourceIds: ['src-missing'] }],
  } as any);
  expect(errors.join('\n')).toContain('src-missing');
});
