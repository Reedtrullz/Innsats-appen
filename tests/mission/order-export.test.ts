import { exportCommsPlanMarkdown, exportFivePointOrderMarkdown } from '@/lib/mission/order-export';

it('exports a 5-punktsordre with warning and source references', () => {
  const markdown = exportFivePointOrderMarkdown({
    situasjon: 'Flom truer infrastruktur',
    oppdrag: 'Støtt kommune med sperring',
    utforelse: 'Lag 1 etablerer sperring',
    administrasjonForsyning: 'Mat, drivstoff og hvile avklares',
    ledelseSamband: 'Lagleder på talegruppe T-01',
    notes: 'Kort lokal note',
  });
  for (const text of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband']) {
    expect(markdown).toContain(`## ${text}`);
  }
  expect(markdown).toContain('Flom truer infrastruktur');
  expect(markdown).toContain('Beslutningsstøtte');
  expect(markdown).toContain('src-5-punktsordre');
  expect(markdown).not.toContain('personnummer');
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
});
