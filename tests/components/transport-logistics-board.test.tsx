import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TransportLogisticsBoard } from '@/components/mission/dashboard/transport-logistics-board';
import type { MissionContext } from '@/lib/mission/schemas';
import { buildMission } from '../helpers/mission-fixtures';

function BoardHarness({ initialMission }: { initialMission: MissionContext }) {
  const [mission, setMission] = useState(initialMission);
  return (
    <>
      <TransportLogisticsBoard
        mission={mission}
        onMissionChange={async (_missionId, update) => {
          setMission((current) => update(current));
        }}
      />
      <output aria-label="mission-json">{JSON.stringify(mission)}</output>
    </>
  );
}

it('seeds and updates a local transport logistics board without official dispatch behavior', async () => {
  const user = userEvent.setup();
  render(<BoardHarness initialMission={buildMission({
    id: 'mission-transport-board-ui',
    title: 'Transport board UI',
    phase: 'for',
    role: 'atv-bat',
    scenario: 'evakuering',
    tasks: [],
    resourceRequests: [],
  })} />);

  const board = screen.getByRole('region', { name: /Transportlogistikk board/i });
  expect(board).toHaveTextContent(/ikke offisiell ordre/i);
  expect(board).toHaveTextContent(/ikke navn, persondata, passasjerdetaljer, kjøretøyidentifikatorer/i);

  await user.click(screen.getByRole('button', { name: /Legg inn transportsteg/i }));
  await user.click(screen.getByRole('button', { name: /Marker Rute, vær og framkommelighet trenger assistanse/i }));
  await user.click(screen.getByRole('button', { name: /Registrer ressursbehov for Rute, vær og framkommelighet/i }));

  await waitFor(() => {
    const missionJson = screen.getByLabelText(/mission-json/i).textContent ?? '';
    expect(missionJson).toContain('Transportlogistikk: Oppdrag, last og mottak');
    expect(missionJson).toContain('Transportlogistikk: Rute, vær og framkommelighet');
    expect(missionJson).toContain('"status":"needs-assistance"');
    expect(missionJson).toContain('"kind":"transport"');
    expect(missionJson).toContain('Ikke offisiell anmodning, utkalling, kjørebok eller sporingssystem');
    expect(missionJson).not.toMatch(/\b(?:personnummer|\+47|GPS-sporing|live tracking|sanntid)\b/i);
  });
});
