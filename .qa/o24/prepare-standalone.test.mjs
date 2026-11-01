import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'vitest';
import { prepareStandalone } from './prepare-standalone.mjs';

test('accepts existing E2E assets only when their bytes equal the actual source', () => {
  // Given the production server's setup directories, with authored local files only.
  const parent = path.resolve('.qa/portfolio/.omo/t05-run-tmp');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(path.join(parent, 'standalone-pure-'));
  try {
    for (const directory of ['public', '.next/static', '.next/standalone/.next']) mkdirSync(path.join(root, directory), { recursive: true });
    writeFileSync(path.join(root, 'public/asset.png'), 'authored PNG fixture');
    writeFileSync(path.join(root, '.next/static/route.js'), 'authored JS fixture');
    prepareStandalone(root);
    // When the already prepared E2E runtime is reused, Then no absent-directory assumption is made.
    prepareStandalone(root);
    assert.equal(readFileSync(path.join(root, '.next/standalone/public/asset.png'), 'utf8'), 'authored PNG fixture');
    // A different existing artifact is rejected and preserved for diagnosis, never overwritten.
    writeFileSync(path.join(root, '.next/standalone/public/asset.png'), 'drift');
    assert.throws(() => prepareStandalone(root), /Existing standalone assets differ/);
    assert.equal(readFileSync(path.join(root, '.next/standalone/public/asset.png'), 'utf8'), 'drift');
  } finally { rmSync(root, { recursive: true }); }
});
