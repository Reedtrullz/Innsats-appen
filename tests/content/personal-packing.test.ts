import fs from 'node:fs';
import yaml from 'js-yaml';

it('keeps the personal packing checklist aligned with the three placement groups', () => {
  const checklists = yaml.load(fs.readFileSync('content/curated/checklists.yaml', 'utf8')) as Array<{
    slug: string;
    sourceIds: string[];
    items: Array<{ id: string; label: string }>;
  }>;
  const checklist = checklists.find((item) => item.slug === 'personlig-utstyr-for-utrykning');

  expect(checklist?.sourceIds).toContain('src-grunnsats-personlig-utrustning-april-2026');
  expect(checklist?.items.map((item) => item.id)).toEqual([
    'pa-kropp',
    'i-ryggsekk',
    'i-bag',
    'eget-behov',
    'utstyrskontroll',
    'mangler-meldt',
  ]);
  expect(checklist?.items.map((item) => item.label).join('\n')).toMatch(/På kropp/);
  expect(checklist?.items.map((item) => item.label).join('\n')).toMatch(/I ryggsekk/);
  expect(checklist?.items.map((item) => item.label).join('\n')).toMatch(/I bag/);
});
