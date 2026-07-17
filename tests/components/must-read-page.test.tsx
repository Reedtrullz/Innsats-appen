import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MustReadPage from '@/app/(app)/ma-leses/page';
import { getMustReadNotices } from '@/lib/content/load-content';

it('stores a versioned acknowledgement for a must-read notice', async () => {
  localStorage.clear();
  const [notice] = getMustReadNotices();
  render(<MustReadPage />);

  await userEvent.click(screen.getByRole('button', { name: `Merk ${notice.title} som lest` }));

  const stored = JSON.parse(localStorage.getItem('beredskapsboka-must-read-ack-v1') ?? '{}');
  expect(stored[notice.id]).toBe(notice.changedAt);
  expect(screen.getByRole('button', { name: `${notice.title} er lest` })).toBeDisabled();
});
