import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from '@/components/search-box';

const docs = [
  { id: 'kort:jod', title: 'Jodtabletter', body: 'atomberedskap radiac', type: 'kort', href: '/kort/jod' },
  { id: 'kort:rens', title: 'Rens CBRN', body: 'MFE samband dose tilfluktsrom FIG10', type: 'kort', href: '/kort/rens' },
];

it('finds operational stress terms locally', async () => {
  render(<SearchBox documents={docs} />);
  for (const term of ['jod', 'rens', 'MFE', 'samband', 'dose', 'tilfluktsrom', 'FIG10']) {
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), term);
    expect(screen.getByText(/kort/i)).toBeInTheDocument();
  }
});

it('reacts to query-string changes while mounted', async () => {
  window.history.replaceState(null, '', '/hurtigkort');
  render(<SearchBox documents={docs} />);
  expect(screen.getByRole('searchbox')).toHaveValue('');

  act(() => {
    window.history.pushState(null, '', '/hurtigkort?q=FIG10');
  });

  await waitFor(() => expect(screen.getByRole('searchbox')).toHaveValue('FIG10'));
  expect(screen.getByRole('link', { name: 'Rens CBRN' })).toBeInTheDocument();
});
