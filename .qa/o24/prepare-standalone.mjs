import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function fileBytes(root) {
  return Object.fromEntries(readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => { assert(!entry.isSymbolicLink(), 'Unexpected symlink in served static assets'); return entry.isFile(); })
    .map(entry => {
      const file = path.join(entry.parentPath, entry.name);
      return [path.relative(root, file), createHash('sha256').update(readFileSync(file)).digest('hex')];
    }).sort(([left], [right]) => left.localeCompare(right)));
}

export function prepareStandalone(root) {
  assert(path.isAbsolute(root));
  for (const [from, to] of [['public', '.next/standalone/public'], ['.next/static', '.next/standalone/.next/static']]) {
    const source = path.join(root, from), destination = path.join(root, to);
    if (existsSync(destination)) assert.deepEqual(fileBytes(destination), fileBytes(source), 'Existing standalone assets differ from actual source');
    else cpSync(source, destination, { recursive: true, errorOnExist: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) prepareStandalone(process.argv[2]);
