import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const requiredDocs: Array<[string, string, RegExp[]]> = [
  ['390', 'docs/release/staging-pilot-checklist.md', [/staging/i, /broader pilot|bredere pilot/i, /rollback/i]],
  ['391', 'docs/release/uptime-monitoring-privacy.md', [/uptime/i, /ingen persondata|no personal data/i, /synthetic/i]],
  ['395', 'docs/guides/quick-start-mannskaper.md', [/hurtigstart/i, /mannskaper/i, /offline/i]],
  ['396', 'docs/guides/lagforer-leder.md', [/lagfører|lagforer/i, /5-punktsordre/i, /sambandsplan/i]],
  ['397', 'docs/guides/offline-use.md', [/offline/i, /installer|hjemskjerm/i, /synkroniseres ikke|ingen backend/i]],
  ['398', 'docs/guides/privacy-reset.md', [/personvern/i, /tilbakestill/i, /lokal/i]],
  ['399', 'docs/guides/expanded-5-punktsordre.md', [/5-punktsordre/i, /situasjon/i, /utførelse/i]],
  ['400', 'docs/guides/expanded-sambandsplan.md', [/sambandsplan/i, /kanal/i, /ikke legg inn reelle nødnettgrupper/i]],
  ['401', 'docs/guides/checklist-runner.md', [/sjekkliste/i, /påkrevd/i, /lokalt/i]],
  ['402', 'docs/guides/export-guide.md', [/eksport/i, /JSON|Markdown/i, /persondata/i]],
  ['403', 'docs/guides/source-warning-interpretation.md', [/kilde/i, /varsel/i, /beslutningsstøtte/i]],
  ['404', 'docs/guides/field-testing.md', [/felt/i, /test/i, /evidence|bevis/i]],
  ['405', 'docs/guides/district-content-contribution.md', [/distriktsleder/i, /godkjent innhold/i, /kilde/i]],
  ['406', 'docs/guides/interactive-guide-plan.md', [/kort video|interactive guide|interaktiv guide/i, /etter UI stabiliseres|after UI stabilizes/i, /ikke spill inn persondata/i]],
  ['407', 'docs/release/pilot-rollout-plan.md', [/ett distrikt|one district/i, /pilot/i, /go\/no-go|go-no-go/i]],
  ['408', 'docs/release/pilot-support-channel.md', [/support/i, /kontakt/i, /ikke persondata/i, /GitHub Issues/i, /pilot-support/i]],
  ['409', 'docs/roadmap.md', [/roadmap/i, /Group 14/i, /post-MVP/i]],
  ['410', 'docs/technical-debt-register.md', [/technical debt|teknisk gjeld/i, /owner|eier/i, /review/i]],
  ['411', 'docs/content-maintenance-process.md', [/content update|innholdsoppdatering/i, /Beredskapsboka/i, /npm run build:content/i]],
  ['412', 'docs/stale-content-notifications.md', [/stale content/i, /npm run report:stale-content/i, /ingen persondata/i]],
  ['413', 'docs/quarterly-dependency-review.md', [/quarterly|kvartalsvis/i, /npm audit/i, /eksakte versjoner/i]],
  ['414', 'docs/annual-security-review.md', [/annual|årlig/i, /security|sikkerhet/i, /offline/i]],
  ['415', 'docs/annual-privacy-impact-assessment.md', [/privacy impact|personvernkonsekvens/i, /DPIA/i, /ingen backend/i]],
  ['416', 'docs/language-support-evaluation.md', [/Nynorsk/i, /Bokmål/i, /etter.*stabiliser/i]],
  ['417', 'docs/language-support-evaluation.md', [/English/i, /operationally useful|operativt nyttig/i, /ikke automatisk oversettelse/i]],
];

describe('Group 14 rollout and maintenance documentation', () => {
  it.each(requiredDocs)('covers task %s in %s', (_task, relativePath, matchers) => {
    const doc = read(relativePath);
    for (const matcher of matchers) expect(doc).toMatch(matcher);
    expect(doc).toMatch(/ikke et offisielt|not an official|beslutningsstøtte/i);
  });

  it('adds release/stale notification scripts without adding backend sync or push services', () => {
    const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    expect(packageJson.scripts['release:notes']).toBe('tsx scripts/generate-release-notes.ts');
    expect(packageJson.scripts['report:stale-content']).toBe('tsx scripts/report-stale-content.ts');
    const allPackageNames = Object.keys({ ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) });
    expect(allPackageNames).not.toContain('web-push');
  });

  it('adds scheduled privacy-safe monitoring and stale-content notification automation', () => {
    const workflow = read('.github/workflows/monitoring.yml');
    expect(workflow).toMatch(/schedule:/);
    expect(workflow).toMatch(/https:\/\/innsats\.reidar\.tech\/api\/health/);
    expect(workflow).toMatch(/https:\/\/innsats\.reidar\.tech\/generated-content\/manifest\.json/);
    expect(workflow).toMatch(/npm run(?: --silent)? report:stale-content/);
    expect(workflow).toMatch(/issues: write/);
    expect(workflow).toMatch(/pilot-support|content-maintenance/);
    expect(workflow).not.toMatch(/web-push|PushManager|cookie|localStorage|IndexedDB/);
  });
});
