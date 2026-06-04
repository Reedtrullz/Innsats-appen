import fs from 'node:fs';
import path from 'node:path';

const manualDocs = [
  ['376', 'docs/manual-tests/task-376-browser-compatibility-matrix.md', /browser compatibility|Chromium|Firefox|WebKit|Safari/i],
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
    expect(matrix).toMatch(/requires physical/i);

    const template = read('docs/manual-tests/result-log-template.md');
    expect(template).toMatch(/Device model/i);
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
});
