import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExportReview } from '@/components/mission/export-review';

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
}

afterEach(() => {
  // jsdom has no clipboard by default; remove the mock between tests.
  delete (navigator as { clipboard?: unknown }).clipboard;
});

describe('ExportReview', () => {
  it('renders nothing until export text exists', () => {
    const { container } = render(<ExportReview title="Feltlogg" text="" textareaId="export-empty" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('copies to the clipboard and confirms visibly', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    render(<ExportReview title="Feltlogg" text="# Lokal logg" textareaId="export-ok" />);

    await userEvent.click(screen.getByRole('button', { name: 'Kopier' }));

    expect(writeText).toHaveBeenCalledWith('# Lokal logg');
    expect(await screen.findByText(/Kopiert til utklippstavlen/i)).toBeInTheDocument();
  });

  it('reports failure and opens the manual preview when the clipboard is unavailable', async () => {
    render(<ExportReview title="Feltlogg" text="# Lokal logg" textareaId="export-fail" />);

    await userEvent.click(screen.getByRole('button', { name: 'Kopier' }));

    expect(await screen.findByText(/Kunne ikke kopiere automatisk/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Feltlogg')).toBeVisible();
  });

  it('clears stale copy feedback when the export text is regenerated', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    const { rerender } = render(<ExportReview title="Feltlogg" text="versjon 1" textareaId="export-stale" />);

    await userEvent.click(screen.getByRole('button', { name: 'Kopier' }));
    expect(await screen.findByText(/Kopiert til utklippstavlen/i)).toBeInTheDocument();

    rerender(<ExportReview title="Feltlogg" text="versjon 2" textareaId="export-stale" />);
    expect(screen.queryByText(/Kopiert til utklippstavlen/i)).not.toBeInTheDocument();
  });
});
