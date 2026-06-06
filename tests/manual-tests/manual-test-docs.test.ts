import fs from 'node:fs';
import path from 'node:path';

const manualDocs = [
  ['377', 'docs/manual-tests/task-377-flom-pumpe.md', /flom|pumpe/i],
  ['378', 'docs/manual-tests/task-378-sar-ettersokning.md', /SAR|ettersøkning|søk/i],
  ['379', 'docs/manual-tests/task-379-cbrne.md', /CBRNE|sone|verneutstyr/i],
  ['380', 'docs/manual-tests/task-380-radiac-nedfall.md', /RADIAC|nedfall|dose/i],
  ['381', 'docs/manual-tests/task-381-alvorlig-ulykke-psykologisk-forstehjelp.md', /alvorlig ulykke|psykologisk førstehjelp|113/i],
  ['382', 'docs/manual-tests/task-382-etter-innsats-mbk.md', /Etter innsats|MBK|materiellberedskap/i],
  ['383', 'docs/manual-tests/task-383-offline-use.md', /offline|service worker|cache/i],
  ['384', 'docs/manual-tests/task-384-rain-gloves-darkness-stress.md', /regn|hansker|mørke|stress/i],
  ['385', 'docs/manual-tests/task-385-iphone-safari-real-device.md', /iPhone|Safari|real device/i],
  ['386', 'docs/manual-tests/task-386-android-chrome-real-device.md', /Android|Chrome|real device/i],
  ['387', 'docs/manual-tests/task-387-install-to-home-screen.md', /Home Screen|installer|PWA/i],
  ['388', 'docs/manual-tests/task-388-low-connectivity.md', /low-connectivity|lav båndbredde|packet loss|svak/i],
  ['389', 'docs/manual-tests/task-389-update-after-offline.md', /update-after-offline|Ny offline-versjon|cache/i],
] as const;

const realDeviceEvidenceDocs = manualDocs.filter(([task]) => ['385', '386', '387', '388', '389'].includes(task));

const requiredRealDeviceEvidenceFields = [
  '- Tested URL:',
  '- Expected `/api/health.version`:',
  '- Observed `/api/health.version`:',
  '- Device/browser/OS:',
  '- Network condition:',
  '- Sanitized screenshot/log path:',
  '- Result: blocked | pass | fail',
  '- Privacy note: no persondata/patientdata/private location entered.',
] as const;

const requiredTask389UpdateEvidenceFields = [
  '- Build A tested URL:',
  '- Build A expected `/api/health.version`:',
  '- Build A observed `/api/health.version`:',
  '- Build B tested URL:',
  '- Build B expected `/api/health.version`:',
  '- Build B observed `/api/health.version`:',
  '- Update/cache observation:',
] as const;

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Group 13 manual and real-device test scripts', () => {
  it('documents shared manual test conventions and evidence templates', () => {
    const readme = read('docs/manual-tests/README.md');
    expect(readme).toMatch(/safe test data/i);
    expect(readme).toMatch(/no persondata|ingen persondata/i);
    expect(readme).toMatch(/build SHA|content version/i);
    expect(readme).toMatch(/physical device|real-device/i);

    const matrix = read('docs/manual-tests/group-13-coverage-matrix.md');
    for (const [task] of manualDocs) expect(matrix).toMatch(new RegExp(`Task ${task}`));
    expect(matrix).toMatch(/cannot be completed by Chromium emulation/i);
    expect(matrix).toMatch(/Task 376 is automated import\/export roundtrip coverage/i);
    expect(matrix).toMatch(/browser-compatibility-smoke-matrix\.md/i);
    expect(matrix).toMatch(/requires physical/i);

    const browserMatrix = read('docs/manual-tests/browser-compatibility-smoke-matrix.md');
    expect(browserMatrix).toMatch(/browser compatibility|Chromium|Firefox|WebKit|Safari/i);

    const template = read('docs/manual-tests/result-log-template.md');
    expect(template).toMatch(/Device model/i);
    expect(template).toMatch(/Execution environment/i);
    expect(template).toMatch(/no names, initials, emails or phone numbers/i);
    expect(template).toMatch(/Pass\/Fail/i);
    expect(template).toMatch(/Privacy notes/i);
  });

  it('has one scenario or real-device script for every Group 13 manual task', () => {
    for (const [task, docPath, taskPattern] of manualDocs) {
      const content = read(docPath);
      expect(content, `Task ${task} script must mention its scenario`).toMatch(taskPattern);
      expect(content, `Task ${task} script must include prerequisites`).toMatch(/Prerequisites|Forutsetninger/i);
      expect(content, `Task ${task} script must include steps`).toMatch(/Steps|Steg/i);
      expect(content, `Task ${task} script must include expected results`).toMatch(/Expected result|Forventet resultat/i);
      expect(content, `Task ${task} script must include privacy boundary`).toMatch(/persondata|pasientdata|privacy|personvern/i);
      expect(content, `Task ${task} script must include evidence requirements`).toMatch(/Evidence|Bevis|Dokumentasjon/i);
    }
  });

  it('keeps real-device evidence packets ready but blocked until physical or lab evidence exists', () => {
    for (const [task, docPath] of realDeviceEvidenceDocs) {
      const content = read(docPath);
      for (const field of requiredRealDeviceEvidenceFields) {
        expect(content, `Task ${task} missing evidence field ${field}`).toContain(field);
      }
      expect(content, `Task ${task} must remain blocked until real-device evidence exists`).toMatch(/Result: blocked/i);
      expect(content, `Task ${task} must reject Chromium\/Playwright pass evidence`).toMatch(/Chromium|Playwright|emulation/i);
    }

    const updateAfterOffline = read('docs/manual-tests/task-389-update-after-offline.md');
    for (const field of requiredTask389UpdateEvidenceFields) {
      expect(updateAfterOffline, `Task 389 missing update evidence field ${field}`).toContain(field);
    }
  });
});
