import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvedLocalMapPackages } from '@/lib/maps/offline-map-package-manifest';

const LOCAL_MAP_PACKAGE_PREFIX = '/map-packages/';

type PackageRef = { id: string; url: string; styleUrl: string };

type ValidateMapPackageFilesOptions = {
  rootDir?: string;
  packages?: readonly PackageRef[];
};

export type { PackageRef, ValidateMapPackageFilesOptions };

export function publicPath(rootDir: string, assetPath: string) {
  if (!assetPath.startsWith(LOCAL_MAP_PACKAGE_PREFIX)) {
    throw new Error(`Map package asset must be under ${LOCAL_MAP_PACKAGE_PREFIX}: ${assetPath}`);
  }

  if (assetPath.includes('?') || assetPath.includes('#')) {
    throw new Error(`Map package asset paths must not include query strings or hashes: ${assetPath}`);
  }

  if (assetPath.includes('\\')) {
    throw new Error(`Map package asset paths must use forward slashes: ${assetPath}`);
  }

  const relativePath = assetPath.slice(LOCAL_MAP_PACKAGE_PREFIX.length);
  const segments = relativePath.split('/');
  if (segments.length === 0 || segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new Error(`Map package asset paths must not contain dot-segment traversal: ${assetPath}`);
  }

  const mapPackagesDir = path.resolve(rootDir, 'public', 'map-packages');
  const filePath = path.resolve(mapPackagesDir, ...segments);
  const relativeToPackagesDir = path.relative(mapPackagesDir, filePath);

  if (relativeToPackagesDir === '' || relativeToPackagesDir.startsWith('..') || path.isAbsolute(relativeToPackagesDir)) {
    throw new Error(`Map package asset resolved outside public/map-packages: ${assetPath}`);
  }

  return filePath;
}

export function assertNoExternalUrls(value: unknown, currentPath = '$'): void {
  if (typeof value === 'string') {
    if (/https?:\/\//i.test(value)) {
      throw new Error(`Style JSON contains external tile URL at ${currentPath}: ${value}`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoExternalUrls(item, `${currentPath}[${index}]`));
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      assertNoExternalUrls(child, `${currentPath}.${key}`);
    }
  }
}

async function assertReadableFile(filePath: string, packageId: string, assetPath: string) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new Error('not a file');
    }
  } catch (error) {
    const cause = error instanceof Error ? ` (${error.message})` : '';
    throw new Error(`Map package ${packageId} references missing file ${assetPath}${cause}`);
  }
}

export async function validateMapPackageFiles({
  rootDir = process.cwd(),
  packages = approvedLocalMapPackages,
}: ValidateMapPackageFilesOptions = {}) {
  for (const mapPackage of packages) {
    const packageFile = publicPath(rootDir, mapPackage.url);
    const styleFile = publicPath(rootDir, mapPackage.styleUrl);

    await assertReadableFile(packageFile, mapPackage.id, mapPackage.url);
    await assertReadableFile(styleFile, mapPackage.id, mapPackage.styleUrl);

    let styleJson: unknown;
    try {
      styleJson = JSON.parse(await fs.readFile(styleFile, 'utf8'));
    } catch (error) {
      const cause = error instanceof Error ? ` (${error.message})` : '';
      throw new Error(`Map package ${mapPackage.id} references invalid style JSON ${mapPackage.styleUrl}${cause}`);
    }

    try {
      assertNoExternalUrls(styleJson);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Map package ${mapPackage.id} ${message}`);
    }
  }

  return { checked: packages.length };
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  validateMapPackageFiles()
    .then(({ checked }) => {
      console.log(`Map package validation OK: ${checked} package(s)`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
