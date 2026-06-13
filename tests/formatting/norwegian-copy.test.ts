import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards against English copy leaking into the Norwegian field UI.
 * Add new forbidden patterns here when copy reviews find leaks.
 * Patterns are matched against user-facing source files (components/, app/).
 */
const FORBIDDEN_COPY_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: />Notes</, reason: 'Use "Notater", not "Notes", in user-facing labels.' },
  { pattern: /\bNotes<textarea/, reason: 'Use "Notater", not "Notes", in user-facing labels.' },
  { pattern: /Sjekkliste\/workflow/, reason: 'Use "arbeidsflyt", not "workflow", in user-facing copy.' },
  { pattern: /'## Notes'/, reason: 'Use "## Notater" in exported Markdown headings.' },
];

const SCAN_ROOTS = ['components', 'app', 'lib/mission'];
const SCAN_EXTENSIONS = ['.ts', '.tsx'];

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (SCAN_EXTENSIONS.some((extension) => entry.endsWith(extension))) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('norwegian copy guard', () => {
  it('keeps forbidden English copy out of user-facing source', () => {
    const violations: string[] = [];
    for (const root of SCAN_ROOTS) {
      for (const file of collectFiles(root)) {
        const content = readFileSync(file, 'utf8');
        for (const { pattern, reason } of FORBIDDEN_COPY_PATTERNS) {
          if (pattern.test(content)) {
            violations.push(`${file}: matches ${pattern} — ${reason}`);
          }
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });
});
