import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const requiredDocs: Array<[string, string, RegExp[]]> = [
  ['390', 'docs/release/staging-pilot-checklist.md', [/staging/i, /broader pilot|bredere pilot/i, /rollback/i, /STAGING_SSH_PRIVATE_KEY|staging\.yml/i]],
  ['391', 'docs/release/uptime-monitoring-privacy.md', [/uptime/i, /ingen persondata|no personal data/i, /synthetic/i]],
  ['395', 'docs/guides/quick-start-mannskaper.md', [/hurtigstart/i, /mannskaper/i, /offline/i]],
  ['396', 'docs/guides/lagforer-leder.md', [/lagfører|lagforer/i, /5-punktsordre/i, /sambandsplan/i]],
  ['397', 'docs/guides/offline-use.md', [/offline/i, /installer|hjemskjerm/i, /synkroniseres ikke|ingen backend/i]],
  ['398', 'docs/guides/privacy-reset.md', [/personvern/i, /tilbakestill|Slett lokale data/i, /\/oppdrag/i, /\/personvern/i, /lokal/i]],
  ['399', 'docs/guides/expanded-5-punktsordre.md', [/5-punktsordre/i, /situasjon/i, /utførelse/i]],
  ['400', 'docs/guides/expanded-sambandsplan.md', [/sambandsplan/i, /kanal/i, /ikke legg inn reelle nødnettgrupper/i]],
  ['401', 'docs/guides/checklist-runner.md', [/sjekkliste/i, /påkrevd/i, /lokalt/i]],
  ['402', 'docs/guides/export-guide.md', [/eksport/i, /JSON|Markdown/i, /persondata/i]],
  ['403', 'docs/guides/source-warning-interpretation.md', [/kilde/i, /varsel/i, /beslutningsstøtte/i]],
  ['404', 'docs/guides/field-testing.md', [/felt/i, /test/i, /evidence|bevis/i]],
  ['405', 'docs/guides/district-content-contribution.md', [/distriktsleder/i, /godkjent innhold/i, /kilde/i]],
  ['406', 'docs/guides/interactive-guide.md', [/kort video|interactive guide|interaktiv guide/i, /etter UI stabiliseres|after UI stabilizes/i, /ikke spill inn persondata/i]],
  ['407', 'docs/release/pilot-rollout-plan.md', [/ett distrikt|one district/i, /pilot/i, /go\/no-go|go-no-go/i]],
  ['408', 'docs/release/pilot-support-channel.md', [/support/i, /kontakt/i, /ikke persondata/i, /GitHub Issues/i, /pilot-support/i]],
  ['409', 'docs/roadmap.md', [/roadmap/i, /Group 14/i, /post-MVP/i]],
  ['410', 'docs/technical-debt-register.md', [/technical debt|teknisk gjeld/i, /owner|eier/i, /review/i]],
  ['411', 'docs/content-maintenance-process.md', [/content update|innholdsoppdatering/i, /Beredskapsboka/i, /npm run build:content/i]],
  ['412', 'docs/stale-content-notifications.md', [/stale content/i, /npm run report:stale-content/i, /ingen persondata/i, /ingen.*eier.*reviewer/i]],
  ['413', 'docs/quarterly-dependency-review.md', [/quarterly|kvartalsvis/i, /npm audit/i, /eksakte versjoner/i]],
  ['414', 'docs/annual-security-review.md', [/annual|årlig/i, /security|sikkerhet/i, /offline/i]],
  ['415', 'docs/annual-privacy-impact-assessment.md', [/privacy impact|personvernkonsekvens/i, /DPIA/i, /ingen backend/i]],
  ['416', 'docs/language-support-evaluation.md', [/Nynorsk/i, /Bokmål/i, /etter.*stabiliser/i]],
  ['417', 'docs/language-support-evaluation.md', [/English/i, /operationally useful|operativt nyttig/i, /ikke automatisk oversettelse/i]],
];

describe('Group 14 rollout and maintenance documentation', () => {
  it('keeps source-governance release truth in sync with the strict-clean local gate', () => {
    const rollout = read('docs/release/pilot-rollout-plan.md');
    const status = read('docs/release/current-deployment-status.md');
    const workplans = JSON.parse(read('content/workplans/workplans.json')) as {
      workplans: Array<{ id: string; tasks: Array<{ id: string; status: string; evidence?: string[] }> }>;
    };
    const pilotPlan = workplans.workplans.find((plan) => plan.id === '2026-06-05_184316-pilot-readiness-remediation-plan');
    const task10 = pilotPlan?.tasks.find((task) => task.id === '2026-06-05_184316-pilot-readiness-remediation-plan-task-10');
    const sourceGovernanceTruth = [rollout, status, JSON.stringify(task10)].join('\n');

    expect(task10, 'pilot readiness task 10 must exist in generated workplans').toBeTruthy();
    expect(task10?.status).toBe('completed');
    expect(sourceGovernanceTruth).not.toMatch(/55 referenced source blockers|55 pilot blockers/i);
    expect(sourceGovernanceTruth).not.toMatch(/strict[^\n.]*source-governance[^\n.]*expected to fail/i);
    expect(sourceGovernanceTruth).not.toMatch(/strict source-governance report currently lists 55/i);
    expect(sourceGovernanceTruth).toMatch(/sourceCount=61|61 sources/i);
    expect(sourceGovernanceTruth).toMatch(/referencedSourceCount=53|53 referenced/i);
    expect(sourceGovernanceTruth).toMatch(/pilotApprovedReferencedSourceCount=53|53 pilot-approved|53 approved/i);
    expect(sourceGovernanceTruth).toMatch(/pilotBlockingReferencedSourceCount=0|0 (?:pilot )?(?:referenced )?blockers/i);
    expect(sourceGovernanceTruth).toMatch(/strict (?:source-governance )?gate (?:PASS|pass)/i);
  });

  it('documents resilient production verification invariants and separate pilot-go blockers', () => {
    const status = read('docs/release/current-deployment-status.md');

    expect(status).toMatch(/Do not treat this markdown file as the source of the current live SHA/i);
    expect(status).toContain('curl -fsS https://innsats.reidar.tech/api/health');
    expect(status).toContain('gh run list --commit');
    expect(status).toMatch(/health response[\s\S]*status=healthy[\s\S]*version[\s\S]*SHA being claimed/i);
    expect(status).toMatch(/GitHub Actions run[\s\S]*completed\/success[\s\S]*same `headSha`/i);
    expect(status).toMatch(/Broader pilot\/go evidence remains separate from deployment health/i);
    expect(status).toMatch(/A healthy deployed app is not the same as field pilot approval/i);
    expect(status).toMatch(/iPhone Safari real-device/i);
    expect(status).toMatch(/Android Chrome real-device/i);
    expect(status).toMatch(/Install-to-home-screen|standalone PWA launch/i);
    expect(status).toMatch(/Low-connectivity/i);
    expect(status).toMatch(/offline-update behavior/i);
  });

  it.each(requiredDocs)('covers task %s in %s', (_task, relativePath, matchers) => {
    const doc = read(relativePath);
    for (const matcher of matchers) expect(doc).toMatch(matcher);
    expect(doc).toMatch(/ikke et offisielt|not an official|beslutningsstøtte/i);
  });

  it('documents the operational command-surface UI without expanding MVP boundaries', () => {
    const doc = read('docs/ui-operational-command-surface.md');
    expect(doc).toContain('Situation → Phase → Next action → Checklist → Export → Source');
    expect(doc).toContain('/release stays outside the operational shell');
    expect(doc).toContain('no login');
    expect(doc).toContain('no central incident database');
    expect(doc).toContain('no patient/persondata');
    expect(doc).toContain('generated local workplan artifact');
    expect(doc).toContain('/generated-content/workplans.json');
    expect(doc).toContain('ingen backend-synk');
  });

  it('documents release workplans as generated local artifacts, not backend sync', () => {
    const readme = read('README.md');
    expect(readme).toContain('generated local workplan artifact');
    expect(readme).toContain('/generated-content/workplans.json');
    expect(readme).toContain('ingen backend-synk');
    expect(readme).not.toMatch(/synced workplans|sync workplans into Obsidian/i);
  });

  it('documents content-editing workplans as generated local artifacts', () => {
    const doc = read('docs/content-editing.md');
    expect(doc).toContain('Workplan artifact generation');
    expect(doc).toContain('generated local workplan artifact');
    expect(doc).toContain('/generated-content/workplans.json');
    expect(doc).toContain('ingen backend-synk');
    expect(doc).not.toMatch(/displays the synced workplans/i);
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
    expect(workflow).toMatch(/https:\/\/innsats\.reidar\.tech\/sw\.js/);
    expect(workflow).toMatch(/npm run(?: --silent)? report:stale-content/);
    expect(workflow).toMatch(/issues: write/);
    expect(workflow).toMatch(/title="Stale content report"/);
    expect(workflow).toMatch(/gh issue comment/);
    expect(workflow).toMatch(/pilot-support|content-maintenance/);
    expect(workflow).toMatch(/Verify health JSON/i);
    expect(workflow).toMatch(/nodeEnv/);
    expect(workflow).toMatch(/production/);
    expect(workflow).toMatch(/status[\s\S]*healthy|healthy[\s\S]*status/);
    expect(workflow).not.toMatch(/web-push|PushManager|cookie|localStorage|IndexedDB/);
  });

  it('adds staging deployment and recurring maintenance review workflows', () => {
    const staging = read('.github/workflows/staging.yml');
    expect(staging).toMatch(/name: Staging Deploy/);
    expect(staging).toMatch(/STAGING_SSH_PRIVATE_KEY/);
    expect(staging).toMatch(/beredskapsboka-staging/);
    expect(staging).toMatch(/npm run check:ci/);
    expect(staging).toMatch(/npx playwright install --with-deps chromium/);
    expect(staging).toMatch(/packages: write/);
    expect(staging).toMatch(/caddy_marker_name=Beredskapsboka-staging/);

    const maintenance = read('.github/workflows/maintenance-review.yml');
    expect(maintenance).toMatch(/Quarterly dependency review/);
    expect(maintenance).toMatch(/Annual security\/privacy impact review/);
    expect(maintenance).toMatch(/GH_REPO/);
    expect(maintenance).toMatch(/EVENT_SCHEDULE/);
    expect(maintenance).toMatch(/issues: write/);
  });

  it('requires governed local tile packages before MapLibre or Kartverket map use', () => {
    const architecture = read('docs/adr/2026-06-04-offline-map-architecture.md');
    const overlays = read('docs/adr/2026-06-04-offline-map-operational-overlays.md');

    expect(architecture).toContain('Governed local tile-package iteration');
    expect(architecture).toContain('PMTiles is the browser runtime package format');
    expect(architecture).toContain('MBTiles is build-time/source input only');
    expect(architecture).toContain('No runtime tile URL may point to Kartverket, OpenStreetMap or any external provider');
    expect(architecture).toContain('©Kartverket');
    expect(architecture).toContain('Geovekst zoom levels 12-20 require explicit permission before copying or packaging');
    expect(overlays).toContain('mission-scoped overlays remain the source of operational annotations');
  });

  it('keeps governed local tile-package runtime local-only', () => {
    const architecture = read('docs/adr/2026-06-04-offline-map-architecture.md');
    const overlays = read('docs/adr/2026-06-04-offline-map-operational-overlays.md');
    const packageJson = JSON.parse(read('package.json')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    expect(architecture).toContain('Governed local tile-package iteration');
    expect(architecture).toContain('PMTiles is the browser runtime package format');
    expect(architecture).toContain('No runtime tile URL may point to Kartverket, OpenStreetMap or any external provider');
    expect(architecture).toContain('optional browser-only MapLibre/PMTiles is allowed for approved app-local packages');
    expect(architecture).not.toContain('The current app has no map dependencies');
    expect(architecture).not.toContain('No MapLibre, Leaflet, MBTiles or Kartverket tile runtime is added');
    expect(overlays).toContain('mission-scoped overlays remain the source of operational annotations');
    expect(Object.keys(allDependencies)).toContain('maplibre-gl');
    expect(Object.keys(allDependencies)).toContain('pmtiles');
    const forbiddenMapDependencies = ['leaflet', '@maplibre/maplibre-gl-js-amplify', 'mbtiles'];
    for (const dependency of forbiddenMapDependencies) {
      expect(Object.keys(allDependencies)).not.toContain(dependency);
    }
  });

  it('documents the map-log-fieldmode workflow without adding backend or live tracking claims', () => {
    const doc = read('docs/map-log-fieldmode-workflow.md');
    expect(doc).toContain('Kart → Logg → Oppdrag → Etterrapport → Oppdragsmappe');
    expect(doc).toContain('schematic 0-100');
    expect(doc).toContain('local-only');
    expect(doc).toContain('No backend sync, no login, no live tracking');
    expect(doc).toContain('Optional browser-only MapLibre/PMTiles support is limited to approved local assets');
    expect(doc).toContain('Leaflet runtime, MBTiles browser runtime, external map source, coordinate conversion or broader MapLibre expansion requires a separate governed package plan');
    expect(doc).toContain('Do not enter patient/persondata');
  });

  it('documents the operational map log and field-mode workflow', () => {
    const workflow = read('docs/map-log-fieldmode-workflow.md');
    const offlineGuide = read('docs/guides/offline-use.md');
    const readme = read('README.md');

    expect(workflow).toContain('Logg herfra');
    expect(workflow).toContain('Oppdragsmappe');
    expect(workflow).toContain('Feltmodus');
    expect(workflow).toContain('PMTiles');
    expect(workflow).toContain('fallback til skjematisk kart');
    expect(offlineGuide).toContain('test kartpakke og hurtiglogg offline før innsats');
    expect(readme).toContain('MapLibre/PMTiles packages are optional local assets');
  });
});
