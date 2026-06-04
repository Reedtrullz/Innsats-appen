import fs from 'node:fs';
import path from 'node:path';

const forbiddenIntegrationPackages = ['web-push', 'qrcode', 'html5-qrcode', '@zxing/browser'];
const forbiddenApiSegments = ['cim', 'nodnett', 'noednett', 'push', 'sync', 'incidents', 'audit-log', 'rbac'];

function readDoc(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function packageJson() {
  return JSON.parse(readDoc('package.json')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
}

function packageLockNames() {
  const lock = JSON.parse(readDoc('package-lock.json')) as { packages?: Record<string, unknown> };
  const names = new Set<string>();
  for (const entry of Object.keys(lock.packages ?? {})) {
    if (!entry.includes('node_modules/')) continue;
    const packagePath = entry.split('node_modules/').filter(Boolean).at(-1);
    if (!packagePath) continue;
    const parts = packagePath.split('/');
    names.add(packagePath.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0] ?? packagePath);
  }
  return names;
}

function walkFiles(relativeRoot: string): string[] {
  const root = path.join(process.cwd(), relativeRoot);
  if (!fs.existsSync(root)) return [];
  const results: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else results.push(path.relative(process.cwd(), absolute).replaceAll(path.sep, '/'));
    }
  };
  walk(root);
  return results;
}

function normalizeRouteSegment(segment: string) {
  return segment
    .replace(/\.(?:ts|tsx)$/, '')
    .replace(/^\[\[?\.\.\./, '')
    .replace(/^\[\[?/, '')
    .replace(/\]\]?$/, '')
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .replace(/^@/, '')
    .toLowerCase();
}

function apiPathsWithForbiddenSegments() {
  return walkFiles('app/api').filter((filePath) => {
    const segments = filePath.split('/').map(normalizeRouteSegment);
    return forbiddenApiSegments.some((segment) => segments.includes(segment));
  });
}

describe('post-MVP integration architecture guardrails', () => {
  it('documents CIM, order import, Nødnett and push constraints without adding runtime integrations', () => {
    const text = readDoc('docs/integration-architecture-guardrails.md');

    expect(text).toMatch(/CIM/i);
    expect(text).toMatch(/manual\/status exports/i);
    expect(text).toMatch(/no CIM write integration/i);
    expect(text).toMatch(/formal approval/i);
    expect(text).toMatch(/QR-code order import/i);
    expect(text).toMatch(/file import/i);
    expect(text).toMatch(/Nødnett/i);
    expect(text).toMatch(/real .*group lists must not ship/i);
    expect(text).toMatch(/push notification architecture/i);
    expect(text).toMatch(/backend\/auth\/governance/i);
    expect(text).toMatch(/MVP status: not implemented/i);

    const pkg = packageJson();
    const installed = { ...pkg.dependencies, ...pkg.devDependencies };
    const lockedPackageNames = packageLockNames();
    for (const forbidden of forbiddenIntegrationPackages) {
      expect(installed[forbidden], `${forbidden} must stay out until the post-MVP integration gate is approved`).toBeUndefined();
      expect(lockedPackageNames.has(forbidden), `${forbidden} must not be present transitively in package-lock before approval`).toBe(false);
    }

    expect(apiPathsWithForbiddenSegments(), 'MVP must not add CIM/Nødnett/push/sync runtime API routes').toEqual([]);

    const serviceWorker = readDoc('public/sw.js');
    expect(serviceWorker).not.toMatch(/addEventListener\s*\(\s*['"]push['"]/);
    expect(serviceWorker).not.toMatch(/\bonpush\s*=/);
  });

  it('documents backend sync architecture before any sync code exists', () => {
    const text = readDoc('docs/post-mvp-backend-sync-architecture.md');

    expect(text).toMatch(/MVP status: not implemented/i);
    expect(text).toMatch(/conflict resolution/i);
    expect(text).toMatch(/RBAC/i);
    expect(text).toMatch(/audit logging/i);
    expect(text).toMatch(/encryption-at-rest/i);
    expect(text).toMatch(/incident access model/i);
    expect(text).toMatch(/no backend sync code ships/i);
    expect(apiPathsWithForbiddenSegments(), 'backend sync routes must not exist before backend architecture approval').toEqual([]);
  });
});
