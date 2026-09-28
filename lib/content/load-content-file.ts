import fs from 'node:fs';
import { ActionCardSchema, type ActionCard } from './schemas';

export function loadJsonArray(filePath: string, label: string): unknown[] {
  if (!fs.existsSync(filePath)) throw new Error(`Missing generated ${label}: ${filePath}`);
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`Generated ${label} is empty or not an array`);
  return parsed;
}

export function parseActionCards(filePath: string): ActionCard[] {
  return loadJsonArray(filePath, 'action cards').map((value) => ActionCardSchema.parse(value));
}
