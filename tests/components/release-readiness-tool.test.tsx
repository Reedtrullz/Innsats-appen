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

it('loads synced workplans into the release board', async () => {
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
            summary: 'Ship synced workplans.',
            stage: 'verify',
            risk: 'high',
            status: 'active',
            taskCount: 2,
            updatedAt: '2026-06-04T12:00:00.000Z',
            tasks: [
              { id: 'pilot-workplan-task-1', title: 'Sync Obsidian note', status: 'completed', stage: 'verify', risk: 'medium' },
              { id: 'pilot-workplan-task-2', title: 'Verify release page', status: 'active', stage: 'release', risk: 'high' },
            ],
          },
        ],
      }),
    } as Partial<Response> as Response;
  });

  render(<ReleaseReadinessTool />);

  expect(await screen.findByRole('heading', { name: 'Synced workplans' })).toBeInTheDocument();
  expect((await screen.findAllByRole('heading', { name: 'Pilot Workplan' })).length).toBeGreaterThan(0);
  expect(screen.getByText(/1\/2 tasks completed/i)).toBeInTheDocument();
  expect(screen.getByText(/Open: Verify release page/i)).toBeInTheDocument();
  expect(screen.getByText(/1 synced from Obsidian/i)).toBeInTheDocument();
  expect(screen.getByText(/Last sync: 2026-06-04T12:00:00.000Z/i)).toBeInTheDocument();

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

it('renders release controls with mobile-safe touch targets', () => {
  render(<ReleaseReadinessTool />);

  expect(screen.getByRole('button', { name: /Idea intake status/i })).toHaveClass('h-11', 'w-11');
  expect(screen.getByRole('button', { name: 'Reset' })).toHaveClass('min-h-11');
  expect(screen.getAllByRole('button', { name: 'Remove' })[0]).toHaveClass('min-h-11');
  for (const select of screen.getAllByRole('combobox')) {
    expect(select).toHaveClass('min-h-11');
  }
});
