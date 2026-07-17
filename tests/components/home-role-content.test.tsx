import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeRoleContent } from '@/components/home-role-content';
import { RoleProvider } from '@/lib/role/role-context';
import { readLocalProfile } from '@/lib/privacy/local-profile';
import { buildMission } from '../helpers/mission-fixtures';

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
  expect(screen.getByRole('link', { name: /Start oppdrag/i })).toHaveAttribute('href', '/oppdrag/ny');
  expect(screen.getByRole('link', { name: /Finn tiltak/i })).toHaveAttribute('href', '/sok?intent=action');
});

it('shows exactly one state-aware primary action and one search action', () => {
  const { rerender } = render(
    <RoleProvider>
      <HomeRoleContent activeMission={null} />
    </RoleProvider>,
  );
  let actions = document.querySelector('[data-primary-actions="home"]');
  expect(actions?.querySelectorAll('a')).toHaveLength(2);
  expect(screen.getByRole('link', { name: /Start oppdrag/i })).toHaveAttribute('href', '/oppdrag/ny');

  rerender(
    <RoleProvider>
      <HomeRoleContent activeMission={buildMission({ id: 'active-home-mission', title: 'Aktiv flominnsats' })} />
    </RoleProvider>,
  );
  actions = document.querySelector('[data-primary-actions="home"]');
  expect(actions?.querySelectorAll('a')).toHaveLength(2);
  expect(screen.getByRole('link', { name: /Fortsett oppdrag/i })).toHaveAttribute('href', '/oppdrag');
  expect(screen.getAllByText(/Aktiv flominnsats/i).length).toBeGreaterThan(0);
});
