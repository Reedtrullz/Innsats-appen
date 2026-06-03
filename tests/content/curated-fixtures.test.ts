import fs from 'node:fs';
import yaml from 'js-yaml';

const readYaml = (path: string) => yaml.load(fs.readFileSync(path, 'utf8')) as any[];

it('curated YAML includes required starter slugs', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const training = readYaml('content/curated/training-paths.yaml');
  const cardSlugs = cards.map((card) => card.slug);
  expect(cardSlugs).toContain('fem-punktsordre');
  expect(cardSlugs).toContain('sambandsplan-start');
  expect(cardSlugs).toContain('tilfluktsrom-klargjoring');
  expect(cardSlugs).toContain('cbrne-startkort');
  expect(cardSlugs).toContain('radiac-dosekontroll');
  expect(cardSlugs).toContain('mfe-anmodning');
  expect(training.map((path) => path.slug)).toContain('fig10-grunnkurs');
});

it('curated Group 2A/2B checklists cover før utrykning, expanded under innsats and first etter innsats workflow steps', () => {
  const checklists = readYaml('content/curated/checklists.yaml');
  const bySlug = new Map(checklists.map((checklist) => [checklist.slug, checklist]));

  const forInnsats = bySlug.get('fig-for-innsats');
  expect(forInnsats?.items.map((item: any) => item.id)).toEqual([
    'kontakt-beredskapsvakt',
    'fremmoteliste',
    'personell-skikkethet-sikkerhet-helse',
    'personlig-utstyr',
    'fellesutstyr',
    'kjoretoy-klar',
    'drivstoff-beredskap',
    'vaer-og-farevurdering',
    'forelopig-plan',
    'ordre-tilbakelesing',
    'logg-startet',
    'klar-til-distrikt',
  ]);

  expect(bySlug.get('for-utrykning-samlet')?.items.map((item: any) => item.id)).toEqual([
    'kontakt-og-mottak',
    'personell-og-sikkerhet',
    'utstyr-kjoretoy-drivstoff',
    'vaer-farer-og-plan',
    'ordre-logg-og-klar',
  ]);

  const personalEquipment = bySlug.get('personlig-utstyr-for-utrykning');
  expect(personalEquipment?.warning).toMatch(/ingen sentral personlig inventarliste/i);
  expect(personalEquipment?.warning).toMatch(/ikke persondata/i);

  const teamEquipment = bySlug.get('lagsutstyr-for-utrykning');
  expect(teamEquipment?.warning).toMatch(/lokal oppdragseksport/i);
  expect(teamEquipment?.items.map((item: any) => item.id)).toEqual(expect.arrayContaining(['fellesutstyr-komplett', 'mangler-notert-lokalt']));

  expect(bySlug.get('fig-under-innsats')?.items.map((item: any) => item.id)).toEqual([
    'ankomst-og-egen-sikkerhet',
    'oppmarsjomrade-plassering',
    'kontakt-innsatsleder',
    'overtakelse-fra-annen-enhet',
    'ressurs-og-utstyr-revurdert',
    'anmod-ekstra-ressurser',
    'kontinuerlig-personellkontroll',
    'kontinuerlig-risikovurdering',
    'lopende-dialog-innsatsleder',
    'ny-analyse-ved-endring',
    'mat-vann-hvile',
    'avlosning-planlagt',
    'psykososial-efok-trigger',
    'overlevering-avmarsj',
  ]);

  const underInnsats = bySlug.get('fig-under-innsats');
  expect(underInnsats?.warning).toMatch(/ikke legg inn navn/i);
  expect(underInnsats?.items.find((item: any) => item.id === 'psykososial-efok-trigger')?.sourceIds).toContain('src-psykososial-oppfolging-og-kollegastotte');
  expect(underInnsats?.items.find((item: any) => item.id === 'lopende-dialog-innsatsleder')?.sourceIds).toContain('src-kommunikasjons-og-sambandsdiagram');

  expect(bySlug.get('fig-etter-innsats')?.items.map((item: any) => item.id)).toEqual([
    'personellkontroll-etter',
    'skade-eller-personellskade-eskalering',
    'teknisk-gjennomgang',
    'utstyr-retur',
    'vask',
    'oppfolging',
  ]);
});
