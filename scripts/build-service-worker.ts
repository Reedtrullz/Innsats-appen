import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATIC_APP_SHELL_ROUTES } from '../lib/offline/static-app-shell';
import { GENERATED_CONTENT_STALE_MS, SW_CACHE_VERSION, SW_MESSAGE_TYPES } from '../lib/offline/service-worker-metadata';

const SW_PATH = path.join(process.cwd(), 'public', 'sw.js');
const GENERATED_START = '// BEGIN GENERATED SERVICE WORKER METADATA';
const GENERATED_END = '// END GENERATED SERVICE WORKER METADATA';

function jsLiteral(value: unknown) {
  return JSON.stringify(value, null, 2).replace(/"/g, "'");
}

export function renderGeneratedServiceWorkerMetadata() {
  return `${GENERATED_START}
const SW_CACHE_VERSION = ${jsLiteral(SW_CACHE_VERSION)};
const CACHE_NAME = \`beredskapsboka-\${SW_CACHE_VERSION}\`;
const MAP_PACKAGE_CACHE_NAME = 'beredskapsboka-map-packages';
const GENERATED_CONTENT_STALE_MS = ${GENERATED_CONTENT_STALE_MS};
const MESSAGE_TYPES = ${jsLiteral(SW_MESSAGE_TYPES)};

self.__BEREDSKAPSBOKA_SW_META__ = {
  cacheName: CACHE_NAME,
  cacheVersion: SW_CACHE_VERSION,
  staleThresholdMs: GENERATED_CONTENT_STALE_MS,
};

const STATIC_APP_SHELL = ${jsLiteral([...STATIC_APP_SHELL_ROUTES])};
${GENERATED_END}`;
}

export function buildServiceWorkerSource(source: string) {
  const generated = renderGeneratedServiceWorkerMetadata();
  if (source.includes(GENERATED_START) && source.includes(GENERATED_END)) {
    const pattern = new RegExp(`${GENERATED_START}[\\s\\S]*?${GENERATED_END}`);
    return source.replace(pattern, generated);
  }

  const legacyPattern = /const SW_CACHE_VERSION[\s\S]*?const STATIC_APP_SHELL = \[[\s\S]*?\];/;
  if (!legacyPattern.test(source)) {
    throw new Error('Could not locate service-worker metadata block.');
  }
  return source.replace(legacyPattern, generated);
}

export function readServiceWorkerSource() {
  return fs.readFileSync(SW_PATH, 'utf8');
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const current = readServiceWorkerSource();
  const next = buildServiceWorkerSource(current);

  if (checkOnly) {
    if (current !== next) {
      console.error('public/sw.js is not generated from typed service-worker metadata. Run npm run build:sw.');
      process.exitCode = 1;
    }
    return;
  }

  if (current !== next) fs.writeFileSync(SW_PATH, next);
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entrypoint && fileURLToPath(import.meta.url) === entrypoint) main();
