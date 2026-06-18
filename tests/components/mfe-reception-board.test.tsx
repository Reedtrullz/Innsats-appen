import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MfeReceptionBoard } from '@/components/mission/dashboard/mfe-reception-board';
import type { MissionContext } from '@/lib/mission/schemas';
import { buildMission } from '../helpers/mission-fixtures';

function BoardHarness({ initialMission }: { initialMission: MissionContext }) {
  const [mission, setMission] = useState(initialMission);
  return (
    <>
      <MfeReceptionBoard
        mission={mission}
        onMissionChange={async (_missionId, update) => {
          setMission((current) => update(current));
        }}
      />
      <output aria-label="mission-json">{JSON.stringify(mission)}</output>
    </>
  );
}

it('seeds and updates a local MFE reception board without becoming an official request channel', async () => {
  const user = userEvent.setup();
  render(<BoardHarness initialMission={buildMission({
    id: 'mission-mfe-board-ui',
    title: 'MFE board UI',
    phase: 'for',
    role: 'beredskapsvakt',
    scenario: 'mfe-stotte',
    tasks: [],
    resourceRequests: [],
  })} />);

  const board = screen.getByRole('region', { name: /MFE mottaksboard/i });
  expect(board).toHaveTextContent(/ikke offisiell anmodning/i);
  expect(board).toHaveTextContent(/ikke navn, persondata, kjøretøyidentifikatorer eller depotdetaljer/i);

  await user.click(screen.getByRole('button', { name: /Legg inn MFE mottakssteg/i }));
  await user.click(screen.getByRole('button', { name: /Marker Mottak, oppmøte og første ordre pågår/i }));
  await user.click(screen.getByRole('button', { name: /Registrer ressursbehov for Mottak, oppmøte og første ordre/i }));

  await waitFor(() => {
    const missionJson = screen.getByLabelText(/mission-json/i).textContent ?? '';
    expect(missionJson).toContain('MFE mottak: Kontaktpunkt og mottaker');
    expect(missionJson).toContain('MFE mottak: Mottak, oppmøte og første ordre');
    expect(missionJson).toContain('"status":"in-progress"');
    expect(missionJson).toContain('"kind":"transport"');
    expect(missionJson).toContain('Ikke offisiell anmodning eller utkalling');
    expect(missionJson).not.toMatch(/\b(?:personnummer|\+47|GPS-sporing|live tracking|sanntid)\b/i);
  });
});
