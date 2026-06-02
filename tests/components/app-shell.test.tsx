import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/app-shell';

it('shows mobile navigation links with current route', () => {
  render(<AppShell currentPath="/hurtigkort"><p>Innhold</p></AppShell>);
  for (const label of ['Hurtigkort', 'Før', 'Under', 'Etter', 'Oppdrag', 'Kilder']) {
    expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
  }
  expect(screen.getByRole('link', { name: 'Hurtigkort' })).toHaveAttribute('aria-current', 'page');
});
