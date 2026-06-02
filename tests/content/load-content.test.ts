import fs from 'node:fs';
import path from 'node:path';
import { loadJsonArray, parseActionCards } from '@/lib/content/load-content';

it('throws for missing generated JSON', () => {
  expect(() => loadJsonArray('/tmp/beredskapsboka-missing.json', 'missing')).toThrow(/missing/i);
});

it('parses valid generated action cards', () => {
  const dir = 'tests/.tmp/load-content';
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'action-cards.json');
  fs.writeFileSync(file, JSON.stringify([{ slug: 'fem-punktsordre', title: '5-punktsordre', phase: 'under', roles: ['lagforer'], scenarios: ['generelt'], priority: 'high', steps: ['Situasjon'], safety: [], reporting: [], sourceIds: ['src-5-punktsordre'], competenceRequired: ['FIG10'], warning: 'Kontroller mot ordre' }]));
  expect(parseActionCards(file)).toHaveLength(1);
});
