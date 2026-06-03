import {
  FIVE_POINT_ORDER_ROLE_TEMPLATES,
  exportCommsPlanMarkdown,
  exportFivePointOrderJson,
  exportFivePointOrderMarkdown,
  exportFivePointOrderPdfReadyHtml,
} from '@/lib/mission/order-export';

it('exports a 5-punktsordre with warning and source references', () => {
  const markdown = exportFivePointOrderMarkdown({
    templateId: 'lagleder-lagforer',
    situasjon: 'Flom truer infrastruktur',
    oppdrag: 'Støtt kommune med sperring',
    utforelse: 'Lag 1 etablerer sperring',
    administrasjonForsyning: 'Mat, drivstoff og hvile avklares',
    ledelseSamband: 'Lagleder på talegruppe T-01',
    notes: 'Kort lokal note',
    readbackConfirmed: true,
    generatedAt: '2026-06-03T12:00:00.000Z',
    contentVersion: 'test-content-v1',
  });
  for (const text of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband']) {
    expect(markdown).toContain(`## ${text}`);
  }
  expect(markdown).toContain('Flom truer infrastruktur');
  expect(markdown).toContain('Beslutningsstøtte');
  expect(markdown).toContain('Eksporterte filer kan inneholde operasjonelt sensitiv informasjon');
  expect(markdown).toContain('Lagres bare lokalt');
  expect(markdown).toContain('src-5-punktsordre');
  expect(markdown).toContain('Mal: Lagleder/lagfører');
  expect(markdown).toContain('Tilbakelesing/forstått: Bekreftet');
  expect(markdown).toContain('Skjemaversjon: five-point-order.v1');
  expect(markdown).toContain('Innholdsversjon: test-content-v1');
  expect(markdown).toContain('Generert: 2026-06-03T12:00:00.000Z');
  expect(markdown).not.toContain('personnummer');
});

it('defines generic role templates for all requested 5-punktsordre roles', () => {
  expect(FIVE_POINT_ORDER_ROLE_TEMPLATES.map((template) => template.id)).toEqual([
    'lagleder-lagforer',
    'fig-leder',
    'mfe',
    'lia-liaison',
    'beredskapsvakt',
  ]);
  expect(FIVE_POINT_ORDER_ROLE_TEMPLATES.map((template) => template.label)).toEqual([
    'Lagleder/lagfører',
    'FIG-leder',
    'MFE',
    'LIA/liaison',
    'Beredskapsvakt',
  ]);
  for (const template of FIVE_POINT_ORDER_ROLE_TEMPLATES) {
    expect(template.guidance.situasjon).toMatch(/lokal|overordnet|status|rammer|avklart/i);
    expect(template.sourceIds).toEqual(['src-5-punktsordre']);
    expect(JSON.stringify(template)).not.toMatch(/nødnett|hemmelig|gradert/i);
  }
});

it('exports stable structured JSON with readback and metadata', () => {
  const json = exportFivePointOrderJson({
    templateId: 'fig-leder',
    situasjon: 'Status fra innsatsområde',
    oppdrag: 'Koordiner FIG-støtte',
    utforelse: 'Fordel lag etter avklarte rammer',
    administrasjonForsyning: 'Logistikk avklares lokalt',
    ledelseSamband: 'Kontaktvei etter lokal plan',
    readbackConfirmed: true,
    generatedAt: '2026-06-03T13:00:00.000Z',
    contentVersion: 'test-content-v2',
  });
  const parsed = JSON.parse(json);
  expect(parsed.template).toMatchObject({ id: 'fig-leder', label: 'FIG-leder' });
  expect(parsed.readback).toEqual({ confirmed: true, label: 'Tilbakelesing/forstått bekreftet' });
  expect(parsed.metadata).toEqual({
    schemaVersion: 'five-point-order.v1',
    contentVersion: 'test-content-v2',
    generatedAt: '2026-06-03T13:00:00.000Z',
    sourceIds: ['src-5-punktsordre'],
  });
  expect(parsed.points.situasjon).toBe('Status fra innsatsområde');
});

it('exports PDF-ready HTML that escapes order text and labels browser print-to-PDF', () => {
  const html = exportFivePointOrderPdfReadyHtml({
    templateId: 'lia-liaison',
    situasjon: '<script>alert("x")</script> & lokal status',
    oppdrag: 'Avklar kontaktpunkt',
    utforelse: 'Del åpne avklaringer',
    administrasjonForsyning: 'Ingen persondata',
    ledelseSamband: 'Kontaktvei etter lokal plan',
    notes: 'Skriv ut ved behov',
    readbackConfirmed: true,
    generatedAt: '2026-06-03T14:00:00.000Z',
  });
  expect(html).toContain('PDF-klar HTML');
  expect(html).toContain('Skriv ut &gt; Lagre som PDF');
  expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; lokal status');
  expect(html).not.toContain('<script>alert');
  expect(html).toContain('LIA/liaison');
  expect(html).toContain('Tilbakelesing/forstått: Bekreftet');
});

it('refuses 5-punktsordre exports when readback is missing or false', () => {
  const input = {
    templateId: 'lagleder-lagforer' as const,
    situasjon: 'Status',
    oppdrag: 'Oppdrag',
    utforelse: 'Utførelse',
    administrasjonForsyning: 'Administrasjon',
    ledelseSamband: 'Ledelse',
    generatedAt: '2026-06-03T15:00:00.000Z',
    contentVersion: 'test-content-v3',
  };

  for (const exporter of [exportFivePointOrderMarkdown, exportFivePointOrderJson, exportFivePointOrderPdfReadyHtml]) {
    expect(() => exporter(input)).toThrow(/readbackConfirmed must be true/i);
    expect(() => exporter({ ...input, readbackConfirmed: false })).toThrow(/readbackConfirmed must be true/i);
  }
});

it('exports a samband plan with local-only fields and source references', () => {
  const markdown = exportCommsPlanMarkdown({
    kanalTalegruppe: 'Talegruppe Innsats-1',
    kallesignal: 'FIG Trondheim 01',
    telefonIssi: 'ISSI etter lokal plan',
    notes: 'Fallback avtales lokalt',
  });
  expect(markdown).toContain('Kanal/talegruppe');
  expect(markdown).toContain('Kallesignal');
  expect(markdown).toContain('Telefon/ISSI');
  expect(markdown).toContain('Talegruppe Innsats-1');
  expect(markdown).toContain('src-kommunikasjons-og-sambandsdiagram');
  expect(markdown).toContain('Kontroller mot lokal sambandsplan');
  expect(markdown).toContain('Eksporterte filer kan inneholde operasjonelt sensitiv informasjon');
  expect(markdown).toContain('Lagres bare lokalt');
});
