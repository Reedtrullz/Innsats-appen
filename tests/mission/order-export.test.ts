import {
  COMMS_PLAN_ROLE_TEMPLATES,
  FIVE_POINT_ORDER_ROLE_TEMPLATES,
  exportCommsPlanJson,
  exportCommsPlanMarkdown,
  exportCommsPlanPdfReadyHtml,
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

it('defines generic role templates for sambandsplan without sensitive Nødnett details', () => {
  expect(COMMS_PLAN_ROLE_TEMPLATES.map((template) => template.id)).toEqual([
    'lagleder-lagforer',
    'fig-leder',
    'mfe',
    'lia-liaison',
    'beredskapsvakt',
  ]);
  expect(COMMS_PLAN_ROLE_TEMPLATES.map((template) => template.label)).toEqual([
    'Lagleder/lagfører',
    'FIG-leder',
    'MFE',
    'LIA/liaison',
    'Beredskapsvakt',
  ]);
  for (const template of COMMS_PLAN_ROLE_TEMPLATES) {
    expect(template.sourceIds).toEqual(['src-kommunikasjons-og-sambandsdiagram']);
    expect(template.guidance.primaryChannel).toMatch(/lokal|plan|avklar/i);
    expect(JSON.stringify(template)).not.toMatch(/hemmelig|gradert|subscriber|abonnentliste|issi/i);
  }
});

it('exports a samband plan with expanded local-only fields, warnings and metadata', () => {
  const markdown = exportCommsPlanMarkdown({
    templateId: 'lagleder-lagforer',
    primaryChannel: 'Talegruppe etter lokal plan',
    fallbackChannel: 'Avtalt telefonvakt/radio reserve etter lokal plan',
    kallesignal: 'FIG Trondheim 01',
    ilKoContact: 'IL-KO kontaktpunkt fra ordre',
    districtContact: 'Distrikt/beredskapsvakt via lokal vaktordning',
    checkInInterval: 'Hver 30. minutt eller ved endring',
    lostCommsProcedure: 'Stans, forsøk fallback, returner til avtalt møtepunkt',
    batteryStatus: 'Fulladet radio, reservebatteri og lader kontrollert',
    notes: 'Ingen abonnentlister i eksporten',
    generatedAt: '2026-06-03T16:00:00.000Z',
    contentVersion: 'test-content-comms',
  });
  expect(markdown).toContain('Primær kanal/talegruppe');
  expect(markdown).toContain('Fallback kanal/kontaktmetode');
  expect(markdown).toContain('Kallesignal');
  expect(markdown).toContain('IL-KO kontakt');
  expect(markdown).toContain('Distrikt/beredskapsvakt kontakt');
  expect(markdown).toContain('Innsjekkingsintervall');
  expect(markdown).toContain('Prosedyre ved bortfall av samband');
  expect(markdown).toContain('Batteri-/ladestatus');
  expect(markdown).toContain('Talegruppe etter lokal plan');
  expect(markdown).toContain('Stans, forsøk fallback');
  expect(markdown).toContain('Mal: Lagleder/lagfører');
  expect(markdown).toContain('Skjemaversjon: sambandsplan.v1');
  expect(markdown).toContain('Innholdsversjon: test-content-comms');
  expect(markdown).toContain('Generert: 2026-06-03T16:00:00.000Z');
  expect(markdown).toContain('src-kommunikasjons-og-sambandsdiagram');
  expect(markdown).toContain('Kontroller mot lokal sambandsplan');
  expect(markdown).toContain('Eksporterte filer kan inneholde operasjonelt sensitiv informasjon');
  expect(markdown).toContain('Lagres bare lokalt');
  expect(markdown).toMatch(/ikke legg inn sensitive sambandstabeller, abonnentlister, ISSI-lister eller persondata/i);
  expect(markdown).not.toMatch(/hemmelig|gradert|subscriber list/i);
});

it('exports stable sambandsplan JSON with metadata and fields', () => {
  const json = exportCommsPlanJson({
    templateId: 'fig-leder',
    primaryChannel: 'Primær etter lokal plan',
    fallbackChannel: 'Fallback kontaktmetode etter lokal plan',
    kallesignal: 'FIG Leder',
    ilKoContact: 'IL-KO kontaktpunkt',
    districtContact: 'Beredskapsvakt kontaktpunkt',
    checkInInterval: '15 min',
    lostCommsProcedure: 'Bruk fallback og meld når reetablert',
    batteryStatus: 'Reservebatterier medfølger',
    generatedAt: '2026-06-03T17:00:00.000Z',
    contentVersion: 'test-content-comms-json',
  });
  const parsed = JSON.parse(json);
  expect(parsed.template).toMatchObject({ id: 'fig-leder', label: 'FIG-leder' });
  expect(parsed.metadata).toEqual({
    schemaVersion: 'sambandsplan.v1',
    contentVersion: 'test-content-comms-json',
    generatedAt: '2026-06-03T17:00:00.000Z',
    sourceIds: ['src-kommunikasjons-og-sambandsdiagram'],
  });
  expect(parsed.fields).toMatchObject({
    primaryChannel: 'Primær etter lokal plan',
    fallbackChannel: 'Fallback kontaktmetode etter lokal plan',
    kallesignal: 'FIG Leder',
    ilKoContact: 'IL-KO kontaktpunkt',
    districtContact: 'Beredskapsvakt kontaktpunkt',
    checkInInterval: '15 min',
    lostCommsProcedure: 'Bruk fallback og meld når reetablert',
    batteryStatus: 'Reservebatterier medfølger',
  });
  expect(parsed.localOnly).toBe(true);
  expect(JSON.stringify(parsed)).not.toMatch(/subscriber|hemmelig|gradert/i);
});

it('exports PDF-ready sambandsplan HTML that escapes text and labels browser print-to-PDF', () => {
  const html = exportCommsPlanPdfReadyHtml({
    templateId: 'lia-liaison',
    primaryChannel: '<script>alert("x")</script> & lokal kanal',
    fallbackChannel: 'Fallback <b>kontakt</b>',
    kallesignal: 'LIA 01',
    ilKoContact: 'IL-KO',
    districtContact: 'Distrikt',
    checkInInterval: '30 min',
    lostCommsProcedure: 'Meld via fallback',
    batteryStatus: 'Fulladet',
    generatedAt: '2026-06-03T18:00:00.000Z',
  });
  expect(html).toContain('PDF-klar HTML');
  expect(html).toContain('Skriv ut &gt; Lagre som PDF');
  expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; lokal kanal');
  expect(html).toContain('Fallback &lt;b&gt;kontakt&lt;/b&gt;');
  expect(html).not.toContain('<script>alert');
  expect(html).not.toContain('<b>kontakt</b>');
  expect(html).toContain('LIA/liaison');
});
