import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, it } from 'vitest';
import { ReleaseReadinessTool } from '@/components/release-readiness-tool';

afterEach(() => {
  localStorage.clear();
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
