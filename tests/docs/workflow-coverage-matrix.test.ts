import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const matrixPath = 'docs/reviews/beredskapsappen-workflow-coverage-2026-06-18.md';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Beredskapsappen documented workflow coverage matrix', () => {
  it('documents major reviewed workflows, implemented app surfaces, and remaining non-claims', () => {
    const doc = read(matrixPath);

    expect(doc).toContain('# Beredskapsappen workflow coverage matrix — 2026-06-18');
    expect(doc).toContain('/Users/reidar/Projectos/Beredskapsboka/downloads/dokumenter');
    expect(doc).toMatch(/## Coverage Matrix/i);
    expect(doc).toMatch(/## Remaining Gaps/i);
    expect(doc).toMatch(/## Non-Claims/i);

    const expectedWorkflows: Array<[RegExp, RegExp, RegExp]> = [
      [/Skogbrann/i, /skogbrann-vannforsyningsplan/i, /Pumpe- og slangeplan/i],
      [/Flom/i, /flom-pumpe-under-innsats/i, /pumpe/i],
      [/Søk og redning|Sok og redning/i, /sok-og-redning-sektor-under|soketeig-sektor/i, /teig|sektor/i],
      [/MFE/i, /mfe-mottak-under|mfe-anmodning-mottak-oppfolging/i, /mottak|demobilisering/i],
      [/CBRN|MRE/i, /cbrn-mre-rens-under|mre-ren-uren-side-grovrens/i, /ren\/uren|rens/i],
      [/RADIAC/i, /radiac-maleplan-kart|radiac-maleoppdrag-under/i, /måleplan|målerute/i],
      [/Beredskapsvakt|ELS/i, /beredskapsvakt|ledelse-kommando-kontroll/i, /gap|partial/i],
      [/ATV|båt|logistikk/i, /atv-bat-transportlogistikk|ATV|BAT|kjøretøy|kjoretoy/i, /board|transportlogistikk|partial/i],
      [/Psykososial|MBK|etter/i, /psykologisk-forstehjelp|mbk/i, /etter|oppfølging/i],
      [/Tilfluktsrom|egenberedskap/i, /tilfluktsrom|jod|egenberedskap/i, /module|modul|FAQ/i],
    ];

    for (const [workflow, coverage, toolOrGap] of expectedWorkflows) {
      expect(doc, `workflow missing: ${workflow}`).toMatch(workflow);
      expect(doc, `coverage missing for ${workflow}`).toMatch(coverage);
      expect(doc, `tool/gap missing for ${workflow}`).toMatch(toolOrGap);
    }

    expect(doc).toMatch(/offline-first/i);
    expect(doc).toMatch(/persondata/i);
    expect(doc).toMatch(/ikke.*offisiell|not.*official/i);
    expect(doc).toMatch(/ingen.*doseberegning|no.*dose calculation/i);
    expect(doc).toMatch(/fagperson|fagmyndighet/i);
  });

  it('uses source ids that exist in the generated source graph', () => {
    const doc = read(matrixPath);
    const sources = JSON.parse(read('content/generated/source-documents.json')) as Array<{ id: string }>;
    const sourceIds = new Set(sources.map((source) => source.id));
    const referenced = [...doc.matchAll(/`(src-[^`]+)`/g)].map((match) => match[1]);

    expect(referenced.length).toBeGreaterThanOrEqual(16);
    for (const sourceId of referenced) {
      expect(sourceIds.has(sourceId), `unknown source id ${sourceId}`).toBe(true);
    }
  });
});
