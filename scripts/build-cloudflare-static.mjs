import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, renameSync, rmSync } from 'node:fs';

const config = 'wrangler.jsonc';
const parkedConfig = 'wrangler.jsonc.static-build';
const staticClient = 'dist-static-client';

function run(binary, args, env = process.env) {
  const result = spawnSync(`node_modules/.bin/${binary}`, args, { stdio: 'inherit', env });
  if (result.status !== 0) throw new Error(`${binary} ${args.join(' ')} failed (${result.status ?? result.signal})`);
}

if (existsSync(parkedConfig) || existsSync(staticClient)) {
  throw new Error('Previous static build artifacts remain; inspect and remove them before retrying.');
}

try {
  renameSync(config, parkedConfig);
  run('vinext', ['build'], { ...process.env, CF_STATIC_EXPORT: '1' });
  renameSync(parkedConfig, config);
  renameSync('dist/client', staticClient);

  run('vite', ['build']);
  rmSync('dist/client', { recursive: true, force: true });
  renameSync(staticClient, 'dist/client');
  for (const name of ['trondheim-osm', 'trondelag-osm']) {
    rmSync(`dist/client/map-packages/${name}.pmtiles`, { force: true });
  }
  for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
    copyFileSync(`node_modules/maplibre-gl/dist/${name}`, `dist/client/_next/static/chunks/${name}`);
  }
  run('next', ['typegen']);
} finally {
  if (existsSync(parkedConfig)) renameSync(parkedConfig, config);
  rmSync(staticClient, { recursive: true, force: true });
}
