import { render, screen } from '@testing-library/react';
import { SpecialistModuleContent, specialistModuleConfigs } from '@/components/specialist-module-page';
import type { ActionCard } from '@/lib/content/schemas';

const cards = [
  {
    slug: 'cbrne-startkort',
    title: 'Startkort CBRN/CBRNE',
    phase: 'under',
    roles: ['leder', 'mre'],
    scenarios: ['cbrn-cbrne'],
    priority: 'high',
    steps: ['Avklar soneinndeling', 'Sett opp rens'],
    safety: ['Stopp ved ukjent stoff'],
    reporting: ['Rapporter sone og ressursbehov'],
    sourceIds: ['src-tiltakskort-cbrne', 'src-veileder-for-sivilforsvarets-renseenheter-cbrn'],
    competenceRequired: ['MRE10'],
    warning: 'Faglig støtte, ikke erstatning for innsatsleders ordre.',
  },
  {
    slug: 'radiac-dosekontroll',
    title: 'RADIAC dosekontroll',
    phase: 'under',
    roles: ['rad', 'leder'],
    scenarios: ['radiac-nedfall'],
    priority: 'high',
    steps: ['Kontroller dosimeter', 'Rapporter måleverdier'],
    safety: ['Avbryt ved ukjent målesituasjon'],
    reporting: ['Tid, sted, metode og usikkerhet'],
    sourceIds: ['src-bestemmelse-radiacmaletjeneste-del-i'],
    competenceRequired: ['RAD10'],
    warning: 'Kontroller alltid mot gjeldende radiacbestemmelse og ordre.',
  },
  {
    slug: 'mfe-anmodning',
    title: 'Anmodning om MFE-støtte',
    phase: 'for',
    roles: ['mfe', 'leder'],
    scenarios: ['mfe-stotte', 'flom'],
    priority: 'medium',
    steps: ['Avklar oppdragstype', 'Kontroller transport'],
    safety: ['Ikke send ressurs uten tydelig oppdrag'],
    reporting: ['Loggfør anmodning og ressursstatus'],
    sourceIds: ['src-tiltakskort-05-stotte-av-mfe'],
    competenceRequired: [],
    warning: 'Kontroller mot gjeldende distriktets tiltakskort.',
  },
  {
    slug: 'tilfluktsrom-klargjoring',
    title: 'Klargjør offentlig tilfluktsrom',
    phase: 'for',
    roles: ['leder'],
    scenarios: ['tilfluktsrom'],
    priority: 'high',
    steps: ['Klargjøring'],
    safety: [],
    reporting: [],
    sourceIds: ['src-tilfluktsrom'],
    competenceRequired: [],
  },
] satisfies ActionCard[];

it('shows CBRN module-specific cards and source warnings', () => {
  render(<SpecialistModuleContent cards={cards} config={specialistModuleConfigs.cbrn} />);
  expect(screen.getByRole('heading', { name: /CBRN\/CBRNE/i, level: 1 })).toBeInTheDocument();
  expect(screen.getByText(/Startkort CBRN\/CBRNE/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Faglig støtte/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/src-tiltakskort-cbrne/i)).toBeInTheDocument();
  expect(screen.queryByText(/RADIAC dosekontroll/i)).not.toBeInTheDocument();
});

it('shows RADIAC module-specific cards and source warnings', () => {
  render(<SpecialistModuleContent cards={cards} config={specialistModuleConfigs.radiac} />);
  expect(screen.getByRole('heading', { name: /RADIAC/i, level: 1 })).toBeInTheDocument();
  expect(screen.getByText(/RADIAC dosekontroll/i)).toBeInTheDocument();
  expect(screen.getAllByText(/radiacbestemmelse/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/RAD10/i)).toBeInTheDocument();
  expect(screen.queryByText(/Anmodning om MFE/i)).not.toBeInTheDocument();
});

it('shows MFE module-specific cards and source warnings', () => {
  render(<SpecialistModuleContent cards={cards} config={specialistModuleConfigs.mfe} />);
  expect(screen.getByRole('heading', { name: /MFE/i, level: 1 })).toBeInTheDocument();
  expect(screen.getByText(/Anmodning om MFE-støtte/i)).toBeInTheDocument();
  expect(screen.getAllByText(/gjeldende distriktets tiltakskort/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/src-tiltakskort-05-stotte-av-mfe/i)).toBeInTheDocument();
  expect(screen.queryByText(/Klargjør offentlig tilfluktsrom/i)).not.toBeInTheDocument();
});
