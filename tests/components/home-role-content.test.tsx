import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeRoleContent } from '@/components/home-role-content';
import { RoleProvider } from '@/lib/role/role-context';
import { readLocalProfile } from '@/lib/privacy/local-profile';

function renderHome() {
  return render(
    <RoleProvider>
      <HomeRoleContent />
    </RoleProvider>,
  );
}

it('offers a first-viewport role lens control on home and persists through the role provider', async () => {
  renderHome();

  expect(screen.getByRole('radiogroup', { name: /Rollevisning/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: /Mannskap/i }));

  expect(await screen.findByRole('heading', { name: /Enkel tilgang/i })).toBeInTheDocument();
  expect(readLocalProfile()?.preferredRole).toBe('mannskap');
  expect(screen.getByRole('link', { name: /Hurtigkort/i })).toHaveAttribute('href', '/hurtigkort');
});
