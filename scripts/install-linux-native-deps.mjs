#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const nativePackages = [
  'lightningcss-linux-x64-gnu',
  '@tailwindcss/oxide-linux-x64-gnu',
  '@rolldown/binding-linux-x64-gnu',
  '@unrs/resolver-binding-linux-x64-gnu',
  '@img/sharp-linux-x64',
  '@img/sharp-libvips-linux-x64',
  '@next/swc-linux-x64-gnu',
];

if (process.platform !== 'linux' || process.arch !== 'x64') {
  console.log(`Skipping linux-x64 native dependency install on ${process.platform}-${process.arch}.`);
  process.exit(0);
}

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const packages = nativePackages
  .map((name) => {
    const locked = lock.packages?.[`node_modules/${name}`];
    return locked?.version ? `${name}@${locked.version}` : null;
  })
  .filter(Boolean);

if (packages.length === 0) {
  console.log('No linux-x64 native packages found in package-lock.json.');
  process.exit(0);
}

console.log(`Installing linux-x64 native packages pinned to package-lock.json: ${packages.join(', ')}`);
const result = spawnSync(
  'npm',
  ['install', '--no-save', '--no-package-lock', ...packages],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
