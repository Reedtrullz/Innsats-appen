import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// P0-3 — forbid the dark-mode contrast bug class going forward.
//
// The `.dark` theme overrides Tailwind color utilities with `!important`, but it
// does NOT reach gradient stops (`from-*`/`to-*`) or opacity-suffix backgrounds
// (`bg-red-50/70`). When the text color flips light and the surface does not,
// critical content becomes invisible. Solid palette classes are the only safe
// surfaces until the theme engine is replaced (see ux-fix-plan-2026-06-13.md).

const SCAN_ROOTS = ['app', 'components'];
// The release board is a standalone, app-shell-less internal tool with its own
// palette (see plan P3-5). It is intentionally exempt.
const EXEMPT_FILES = new Set(['components/release-readiness-tool.tsx']);

const FORBIDDEN_PATTERNS: ReadonlyArray<{ label: string; regex: RegExp }> = [
  { label: 'bg-gradient utility', regex: /\bbg-gradient-[a-z-]+/ },
  // Opacity-suffix palette backgrounds, e.g. bg-red-50/70, bg-amber-50/60.
  { label: 'opacity-suffix palette background', regex: /\bbg-(?:red|amber|emerald|sky|slate|rose|orange|indigo)-\d{1,3}\/\d{1,3}/ },
];

function collectTsxFiles(root: string): string[] {
  const absoluteRoot = path.resolve(root);
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue;
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        files.push(path.relative(process.cwd(), fullPath));
      }
    }
  };
  walk(absoluteRoot);
  return files;
}

describe('theme-safe backgrounds', () => {
  const files = SCAN_ROOTS.flatMap(collectTsxFiles).filter((file) => !EXEMPT_FILES.has(file));

  it('finds tsx files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN_PATTERNS)('has no $label in app/components surfaces', ({ regex }) => {
    const offenders: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          offenders.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders, `Use solid palette classes the .dark override covers.\n${offenders.join('\n')}`).toEqual([]);
  });
});
