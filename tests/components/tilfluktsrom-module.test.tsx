import { render, screen } from '@testing-library/react';
import { TilfluktsromModuleContent } from '@/app/(app)/moduler/tilfluktsrom/page';
import type { ActionCard, OperationalChecklist, ProtectionMeasure } from '@/lib/content/schemas';

const cards = [
  {
    slug: 'tilfluktsrom-klargjoring',
    title: 'Klargjør offentlig tilfluktsrom',
    phase: 'for',
    roles: ['leder'],
    scenarios: ['tilfluktsrom'],
    priority: 'high',
    steps: ['Klargjøring', 'Drift', 'Rapportering', 'Avslutning'],
    safety: ['Bruk bare godkjent informasjon'],
    reporting: ['Rapporter status'],
    sourceIds: ['src-operativt-konsept-for-sivilforsvaret'],
    competenceRequired: [],
    warning: 'bruk bare godkjent informasjon',
  },
  {
    slug: 'cbrn-start',
    title: 'CBRN startkort',
    phase: 'under',
    roles: ['leder'],
    scenarios: ['cbrn-cbrne'],
    priority: 'high',
    steps: ['Sperr av'],
    safety: [],
    reporting: [],
    sourceIds: ['src-cbrn'],
    competenceRequired: [],
  },
] satisfies ActionCard[];

const checklists = [
  {
    slug: 'tilfluktsrom-teknisk-status',
    title: 'Tilfluktsrom teknisk status',
    phase: 'for',
    roles: ['leder'],
    scenarios: ['tilfluktsrom'],
    items: [{ id: 'ventilasjon', label: 'Kontroller ventilasjon', required: true, sourceIds: ['src-operativt-konsept-for-sivilforsvaret'] }],
    sourceIds: ['src-operativt-konsept-for-sivilforsvaret'],
    warning: 'Ingen private/skjermede lokasjonslister.',
  },
  {
    slug: 'generell-logg',
    title: 'Generell loggføring',
    phase: 'under',
    roles: ['leder'],
    scenarios: ['generelt'],
    items: [{ id: 'logg', label: 'Før logg', required: true, sourceIds: ['src-logg'] }],
    sourceIds: ['src-logg'],
  },
] satisfies OperationalChecklist[];

const measures = [
  {
    slug: 'offentlig-tilfluktsrom',
    title: 'Offentlig tilfluktsrom',
    kind: 'tilfluktsrom',
    publicOrRestricted: 'public',
    responsibleAuthority: 'Kommune/eier/DSB etter godkjent planverk',
    readinessChecks: ['ventilasjon', 'nødstrøm', 'vann'],
    operationalSteps: ['avklar ansvar', 'klargjør rom', 'drift', 'rapporter status', 'avslutt'],
    dataWarnings: ['Bruk bare godkjent informasjon.'],
    sourceIds: ['src-operativt-konsept-for-sivilforsvaret'],
  },
  {
    slug: 'skjermet-tilfluktsromliste',
    title: 'Skjermet tilfluktsromliste',
    kind: 'tilfluktsrom',
    publicOrRestricted: 'restricted',
    responsibleAuthority: 'Ikke publiser',
    readinessChecks: [],
    operationalSteps: [],
    dataWarnings: ['Skjermet data'],
    sourceIds: ['src-restricted'],
  },
  {
    slug: 'evakuering',
    title: 'Evakueringstiltak',
    kind: 'evakuering',
    publicOrRestricted: 'public',
    responsibleAuthority: 'Kommune',
    readinessChecks: [],
    operationalSteps: [],
    dataWarnings: [],
    sourceIds: ['src-evakuering'],
  },
] satisfies ProtectionMeasure[];

it('shows tilfluktsrom module without leaking private or unrelated data', () => {
  render(<TilfluktsromModuleContent cards={cards} checklists={checklists} protectionMeasures={measures} />);
  expect(screen.getByRole('heading', { name: /Tilfluktsrom/i, level: 1 })).toBeInTheDocument();
  expect(screen.getAllByText(/bruk bare godkjent informasjon/i).length).toBeGreaterThan(0);
  for (const text of ['Klargjøring', 'Drift', 'Teknisk status', 'Rapportering', 'Avslutning']) {
    expect(screen.getAllByText(new RegExp(text, 'i')).length).toBeGreaterThan(0);
  }
  expect(screen.getByText(/Klargjør offentlig tilfluktsrom/i)).toBeInTheDocument();
  expect(screen.getByText(/Tilfluktsrom teknisk status/i)).toBeInTheDocument();
  expect(screen.queryByText(/Skjermet tilfluktsromliste/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/CBRN startkort/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Generell loggføring/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Evakueringstiltak/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/privateTilfluktsromLocations/i)).not.toBeInTheDocument();
});
