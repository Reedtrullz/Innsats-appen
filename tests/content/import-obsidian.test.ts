import { importObsidianSources } from '@/scripts/import-obsidian';

it('imports source extracts with stable IDs', async () => {
  const result = await importObsidianSources('tests/fixtures/obsidian-mini');
  expect(result.sources.map((s) => s.id)).toContain('src-5-punktsordre');
  expect(result.sources.map((s) => s.id)).toContain('src-deep-research-tilfluktsrom');
  expect(result.sources.map((s) => s.id)).toContain('src-kursplan-grunnkurs-fig10');
});
