import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpPage from '@/app/(app)/hjelp/page';
import { ACTIVE_MISSION_STORAGE_KEY } from '@/lib/mission/active-mission-selection';
import { getMission, clearLocalMissionData } from '@/lib/mission/local-store';
import { readMissionMapState } from '@/lib/maps/operations-map';

afterEach(async () => {
  localStorage.clear();
  await clearLocalMissionData();
});

it('renders help cards and the full local demo entry point', () => {
  render(<HelpPage />);

  expect(screen.getByRole('heading', { name: /Lær flytene i Innsats-appen/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Velg situasjonen din/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Jeg er ny/i })).toHaveAttribute('href', '/hjelp#start-her');
  expect(screen.getByRole('link', { name: /Jeg må logge eller markere/i })).toHaveAttribute('href', '/kart');
  expect(screen.getByRole('heading', { name: /Tre separate treningsflyter/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mannskap' })).toHaveAttribute('href', '/hjelp#tren-mannskap');
  expect(screen.getByRole('heading', { name: /Treningsflyt for mannskap/i })).toBeInTheDocument();
  expect(screen.getByText(/Mannskap bruker appen som støtte i egen oppgave/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Søk som mannskap/i })).toHaveAttribute('href', '/sok?q=samband');
  expect(screen.getByRole('heading', { name: /Treningsflyt for lagfører/i })).toBeInTheDocument();
  expect(screen.getByText(/Lagfører bruker appen til å koordinere laget/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Øv kart/i })).toHaveAttribute('href', '/kart');
  expect(screen.getByRole('heading', { name: /Treningsflyt for leder/i })).toBeInTheDocument();
  expect(screen.getByText(/Leder bruker appen som beslutningsstøtte/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Se lederstatus/i })).toHaveAttribute('href', '/oppdrag#ruh-velferd');
  expect(screen.getByRole('heading', { name: /Demohendelse: flom ved idrettshall/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Start demo/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Åpne demooppdrag/i })).toHaveAttribute('href', '/oppdrag');
  expect(screen.getByRole('link', { name: /Søk etter flom/i })).toHaveAttribute('href', '/sok?q=flom');
});

it('creates a reusable local demo mission and map objects on demand', async () => {
  render(<HelpPage />);

  await userEvent.click(screen.getByRole('button', { name: /Start demo/i }));

  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Demohendelse er klar/i));
  await expect.poll(async () => getMission('demo-innsats-flom-ovelse-v1')).toMatchObject({
    title: 'DEMO: Flom ved idrettshall',
    phase: 'under',
    scenario: 'flom',
    activeChecklistIds: ['fig-under-innsats'],
  });
  expect(localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY)).toBe('demo-innsats-flom-ovelse-v1');
  expect(readMissionMapState().markers.filter((marker) => marker.missionId === 'demo-innsats-flom-ovelse-v1')).toHaveLength(3);
});
