import { render, screen } from '@testing-library/react';
import { TrainingPathDetail } from '@/components/training-path-detail';
import { TrainingPathsPageContent } from '@/components/training-paths-page-content';
import type { ActionCard, SourceDocument, TrainingPath } from '@/lib/content/schemas';

const paths = [
  {
    slug: 'fig10-grunnkurs',
    courseCode: 'FIG10',
    title: 'Grunnkurs FIG/FIGP',
    targetRoles: ['mannskap'],
    duration: '3 uker',
    prerequisites: [],
    skills: ['egensikkerhet', 'samband', 'førstehjelp'],
    sourceIds: ['src-kursplan-grunnkurs-fig10'],
    linkedCardSlugs: ['fem-punktsordre', 'sambandsplan-start'],
  },
  {
    slug: 'rad10-grunnkurs',
    courseCode: 'RAD10',
    title: 'Grunnopplæring RADIAC måletjeneste',
    targetRoles: ['rad'],
    duration: 'Etter lokal plan',
    prerequisites: ['FIG10'],
    skills: ['dosimeter', 'dosekontroll'],
    sourceIds: ['src-grunnopplaering-rad-10-mannskap'],
    linkedCardSlugs: ['radiac-dosekontroll'],
  },
  {
    slug: 'mre10-grunnkurs',
    courseCode: 'MRE10',
    title: 'Grunnopplæring mobil renseenhet',
    targetRoles: ['mre'],
    duration: 'Etter lokal plan',
    prerequisites: ['FIG10'],
    skills: ['rens', 'CBRN'],
    sourceIds: ['src-opplaering-mannskap-mre10'],
    linkedCardSlugs: ['cbrne-startkort'],
  },
  {
    slug: 'mfe10-grunnkurs',
    courseCode: 'MFE10',
    title: 'Grunnopplæring mobil forsterkningsenhet',
    targetRoles: ['mfe'],
    duration: 'Etter lokal plan',
    prerequisites: ['FIG10'],
    skills: ['mobilisering', 'logistikk'],
    sourceIds: ['src-grunnopplaering-mfe-10-mannskap'],
    linkedCardSlugs: ['mfe-anmodning'],
  },
] satisfies TrainingPath[];

const cards = [
  { slug: 'fem-punktsordre', title: '5-punktsordre', phase: 'for', roles: ['leder'], scenarios: ['generelt'], priority: 'high', steps: ['ordre'], safety: [], reporting: [], sourceIds: ['src-5-punktsordre'], competenceRequired: ['FIG10'] },
  { slug: 'sambandsplan-start', title: 'Sambandsplan start', phase: 'for', roles: ['mannskap'], scenarios: ['generelt'], priority: 'high', steps: ['test samband'], safety: [], reporting: [], sourceIds: ['src-samband'], competenceRequired: ['FIG10'] },
  { slug: 'radiac-dosekontroll', title: 'RADIAC dosekontroll', phase: 'under', roles: ['rad'], scenarios: ['radiac-nedfall'], priority: 'high', steps: ['dose'], safety: [], reporting: [], sourceIds: ['src-radiac'], competenceRequired: ['RAD10'] },
  { slug: 'cbrne-startkort', title: 'Startkort CBRN/CBRNE', phase: 'under', roles: ['mre'], scenarios: ['cbrn-cbrne'], priority: 'high', steps: ['rens'], safety: [], reporting: [], sourceIds: ['src-cbrn'], competenceRequired: ['MRE10'] },
  { slug: 'mfe-anmodning', title: 'Anmodning om MFE-støtte', phase: 'for', roles: ['mfe'], scenarios: ['mfe-stotte'], priority: 'medium', steps: ['anmodning'], safety: [], reporting: [], sourceIds: ['src-mfe'], competenceRequired: [] },
] satisfies ActionCard[];

const testSource = (overrides: Partial<SourceDocument>): SourceDocument => ({
  id: 'src-test',
  title: 'SRC - Test',
  sourcePath: 'source-extracts/SRC - Test.md',
  sourceType: 'source-extract',
  status: 'verified',
  verifiedAt: '2026-06-03',
  owner: 'content-team',
  reviewer: 'fagansvarlig',
  reviewRisk: 'low',
  body: 'Test',
  warnings: [],
  ...overrides,
});

it('shows FIG10 baseline, specialist training paths, source IDs, and linked cards', () => {
  render(<TrainingPathsPageContent paths={paths} cards={cards} />);
  expect(screen.getByRole('heading', { name: /Opplæring/i, level: 1 })).toBeInTheDocument();
  expect(screen.getAllByText(/FIG10/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Baseline for mannskap/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/ikke sertifiseringsbevis/i)).toBeInTheDocument();
  for (const text of ['RAD10', 'MRE10', 'MFE10']) {
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  }
  for (const cardTitle of ['RADIAC dosekontroll', 'Startkort CBRN/CBRNE', 'Anmodning om MFE-støtte']) {
    expect(screen.getByRole('link', { name: new RegExp(cardTitle, 'i') })).toHaveAttribute('href', expect.stringMatching(/^\/kort\//));
  }
  for (const path of paths) {
    expect(screen.getByRole('link', { name: new RegExp(path.title, 'i') })).toHaveAttribute('href', `/laering/${path.slug}`);
  }
  expect(screen.getByText(/src-kursplan-grunnkurs-fig10/i)).toBeInTheDocument();
  expect(screen.getByText(/src-grunnopplaering-mfe-10-mannskap/i)).toBeInTheDocument();
  expect(screen.getAllByText(/RAD10/i).length).toBeGreaterThan(1);
});

it('renders training path detail from injected source documents', () => {
  const path = {
    slug: 'sps-detail',
    courseCode: 'SPS41',
    title: 'SPS41 samvirke på forurenset skadested CBRN/E',
    targetRoles: ['lagforer', 'leder'],
    duration: 'Etter kursplan',
    prerequisites: ['FIG10'],
    skills: ['CBRN/E-samvirke'],
    sourceIds: ['src-injected-sps41'],
    linkedCardSlugs: ['cbrne-startkort'],
  } satisfies TrainingPath;
  const sources = [testSource({ id: 'src-injected-sps41', title: 'SRC - Injected SPS41 source', body: 'Injected SPS41 source body' })];

  render(<TrainingPathDetail path={path} cards={cards} sources={sources} />);

  expect(screen.getByRole('heading', { name: /SPS41 samvirke/i })).toBeInTheDocument();
  expect(screen.getByText(/Lagfører, Leder/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Startkort CBRN\/CBRNE/i })).toHaveAttribute('href', '/kort/cbrne-startkort');
  expect(screen.getByText(/SRC - Injected SPS41 source/i)).toBeInTheDocument();
});
