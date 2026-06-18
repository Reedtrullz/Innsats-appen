import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function cleanNextBuild(root = process.cwd()) {
  const nextBuildDir = path.resolve(root, '.next');

  rmSync(nextBuildDir, {
    recursive: true,
    force: true,
    maxRetries: 20,
    retryDelay: 200,
  });
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  try {
    cleanNextBuild();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
