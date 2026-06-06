import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { ReleaseReadinessTool } from '@/components/release-readiness-tool';

const originalFetch = globalThis.fetch;

afterEach(() => {
  localStorage.clear();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

it('tracks open release work and can mark it completed', async () => {
  const { container } = render(<ReleaseReadinessTool />);

  expect(screen.getByRole('heading', { name: /Innsats-app pilot/i })).toBeInTheDocument();
  expect(screen.getAllByText(/Release Readiness/i).length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { name: /Needs Attention/i })).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText('Title'), 'Write release notes');
  await userEvent.type(screen.getByLabelText('Owner'), 'Reidar');
  await userEvent.selectOptions(container.querySelector('select[name="stage"]')!, 'release');
  await userEvent.selectOptions(container.querySelector('select[name="risk"]')!, 'low');
  await userEvent.click(screen.getByRole('button', { name: /Add to release board/i }));

  expect(screen.getByRole('heading', { name: 'Write release notes' })).toBeInTheDocument();
  const item = screen.getByRole('heading', { name: 'Write release notes' }).closest('article');
  expect(item).not.toBeNull();

  await userEvent.selectOptions(item!.querySelector('select')!, 'completed');
  await waitFor(() => {
    const stored = localStorage.getItem('beredskapsboka-release-readiness-v1') ?? '';
    expect(stored).toContain('Write release notes');
    expect(stored).toContain('"status":"completed"');
  });
  expect(screen.getAllByText(/Write release notes/).length).toBeGreaterThan(0);
});

it('describes workplans as generated local artifacts without backend sync', async () => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('content-coverage-report')) {
      return {
        ok: true,
        json: async () => ({ releaseBoard: { gaps: [] } }),
      } as Partial<Response> as Response;
    }
    return {
      ok: true,
      json: async () => ({
        generatedAt: '2026-06-04T12:00:00.000Z',
        sourceCount: 1,
        workplans: [
          {
            id: 'pilot-workplan',
            title: 'Pilot Workplan',
            sourcePath: '.hermes/plans/pilot-workplan.md',
            sourceType: 'hermes-plan',
            summary: 'Ship generated local workplan artifacts.',
            stage: 'verify',
            risk: 'high',
            status: 'active',
            taskCount: 2,
            updatedAt: '2026-06-04T12:00:00.000Z',
            tasks: [
              { id: 'pilot-workplan-task-1', title: 'Generate Obsidian note', status: 'completed', stage: 'verify', risk: 'medium' },
              { id: 'pilot-workplan-task-2', title: 'Verify release page', status: 'active', stage: 'release', risk: 'high' },
            ],
          },
        ],
      }),
    } as Partial<Response> as Response;
  });

  render(<ReleaseReadinessTool />);

  expect(await screen.findByRole('heading', { name: 'Genererte lokale workplan-artefakter' })).toBeInTheDocument();
  expect((await screen.findAllByRole('heading', { name: 'Pilot Workplan' })).length).toBeGreaterThan(0);
  expect(screen.getByText(/1\/2 tasks completed/i)).toBeInTheDocument();
  expect(screen.getByText(/Open: Verify release page/i)).toBeInTheDocument();
  expect(screen.getByText(/1 workplan lastet fra `\/generated-content\/workplans\.json` — ingen backend-synk/i)).toBeInTheDocument();
  expect(screen.getByText(/Artefakt generert: 2026-06-04T12:00:00.000Z/i)).toBeInTheDocument();
  expect(screen.queryByText(/Automatic sync|Synced workplans|Last sync|synced from Obsidian/i)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  await waitFor(() => {
    expect(localStorage.getItem('beredskapsboka-release-readiness-v1') ?? '').toContain('workplan-pilot-workplan');
  });
});

it('shows content coverage gaps on the release board', async () => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('content-coverage-report')) {
      return {
        ok: true,
        json: async () => ({
          releaseBoard: {
            gaps: [
              { id: 'content-orphan-sources', title: 'Sources without linked content', count: 2, severity: 'medium', detail: '2 sources need linking.' },
            ],
          },
        }),
      } as Partial<Response> as Response;
    }
    return { ok: true, json: async () => ({ generatedAt: '2026-06-04T12:00:00.000Z', sourceCount: 0, workplans: [] }) } as Partial<Response> as Response;
  });

  render(<ReleaseReadinessTool />);

  expect(await screen.findByRole('heading', { name: 'Content coverage gaps' })).toBeInTheDocument();
  expect(await screen.findByText('Sources without linked content')).toBeInTheDocument();
  expect(screen.getByText(/2 sources need linking/i)).toBeInTheDocument();
});

it('highlights source governance release gaps as pilot blockers', async () => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('content-coverage-report')) {
      return {
        ok: true,
        json: async () => ({
          releaseBoard: {
            gaps: [
              {
                id: 'source-governance-pilot-blockers',
                title: 'Sources referenced by pilot content are not approved',
                count: 57,
                severity: 'high',
                detail: '57 referenced sources are not verified, pilot-approved, and public-approved.',
              },
            ],
          },
        }),
      } as Partial<Response> as Response;
    }
    return { ok: true, json: async () => ({ generatedAt: '2026-06-06T01:25:09.000Z', sourceCount: 0, workplans: [] }) } as Partial<Response> as Response;
  });

  render(<ReleaseReadinessTool />);

  expect(await screen.findByRole('heading', { name: 'Content coverage gaps' })).toBeInTheDocument();
  expect(await screen.findByText('Sources referenced by pilot content are not approved')).toBeInTheDocument();
  expect(screen.getAllByText(/Pilot blocker/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/57 referenced sources/i)).toBeInTheDocument();
});

it('prevents a ready label when high coverage gaps still block pilot readiness', async () => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('content-coverage-report')) {
      return {
        ok: true,
        json: async () => ({
          releaseBoard: {
            gaps: [
              {
                id: 'source-governance-pilot-blockers',
                title: 'Sources referenced by pilot content are not approved',
                count: 57,
                severity: 'high',
                detail: '57 referenced sources are not verified, pilot-approved, and public-approved.',
              },
            ],
          },
        }),
      } as Partial<Response> as Response;
    }
    return { ok: true, json: async () => ({ generatedAt: '2026-06-06T01:25:09.000Z', sourceCount: 0, workplans: [] }) } as Partial<Response> as Response;
  });

  render(<ReleaseReadinessTool />);

  expect(await screen.findByText(/Ikke pilotklar/i)).toBeInTheDocument();
  expect(screen.getByText(/57 pilot blocker/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Pilot blockers/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/No active risks on the board/i)).not.toBeInTheDocument();
});

it('ignores malformed content coverage report gaps instead of crashing', async () => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('content-coverage-report')) {
      return { ok: true, json: async () => ({ releaseBoard: { gaps: 'not-an-array' } }) } as Partial<Response> as Response;
    }
    return { ok: true, json: async () => ({ generatedAt: '2026-06-04T12:00:00.000Z', sourceCount: 0, workplans: [] }) } as Partial<Response> as Response;
  });

  render(<ReleaseReadinessTool />);

  expect(await screen.findByRole('heading', { name: /Innsats-app pilot/i })).toBeInTheDocument();
  expect(await screen.findByText(/No release-board content coverage gaps reported/i)).toBeInTheDocument();
});

it('treats generated content fallback coverage reports as unknown, not clean release evidence', async () => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('content-coverage-report')) {
      return { ok: true, json: async () => ({ generatedAt: null, releaseBoard: { gaps: [] }, fallback: true }) } as Partial<Response> as Response;
    }
    return { ok: true, json: async () => ({ generatedAt: '2026-06-04T12:00:00.000Z', sourceCount: 0, workplans: [] }) } as Partial<Response> as Response;
  });

  render(<ReleaseReadinessTool />);

  expect(await screen.findByText(/Dekning ukjent/i)).toBeInTheDocument();
  expect(await screen.findByText(/Content coverage report is unavailable/i)).toBeInTheDocument();
  expect(screen.getByText(/Dekning ikke verifisert/i)).toBeInTheDocument();
  expect(screen.queryByText(/No release-board content coverage gaps reported/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/^Ready$/i)).not.toBeInTheDocument();
});

it('renders release controls with mobile-safe touch targets', () => {
  render(<ReleaseReadinessTool />);

  expect(screen.getByRole('button', { name: /Idea intake status/i })).toHaveClass('h-11', 'w-11');
  expect(screen.getByRole('button', { name: 'Reset' })).toHaveClass('min-h-11');
  expect(screen.getAllByRole('button', { name: 'Remove' })[0]).toHaveClass('min-h-11');
  for (const select of screen.getAllByRole('combobox')) {
    expect(select).toHaveClass('min-h-11');
  }
});
