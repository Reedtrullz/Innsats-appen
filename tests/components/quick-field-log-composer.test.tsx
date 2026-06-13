import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuickFieldLogComposer } from '@/components/mission/quick-field-log-composer';
import { buildMission } from '../helpers/mission-fixtures';

describe('QuickFieldLogComposer', () => {
  it('adds a structured quick field-log entry with category and flags', async () => {
    const user = userEvent.setup();
    const mission = buildMission({ id: 'mission-quick-log', title: 'Quick log', fieldLogEntries: [] });
    const onMissionChange = vi.fn(async (_missionId, update) => update(mission));

    render(<QuickFieldLogComposer mission={mission} onMissionChange={onMissionChange} defaultCategory="observasjon" sourceLabel="Under-fasen" />);

    expect(screen.getByText('Hurtiglogg · Under-fasen')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Hurtiglogg tekst'), 'Vannstand øker ved pumpested');
    await user.click(screen.getByLabelText('Kritisk observasjon'));
    await user.click(screen.getByRole('button', { name: /lagre hurtiglogg/i }));

    expect(onMissionChange).toHaveBeenCalledTimes(1);
    expect(onMissionChange).toHaveBeenCalledWith(mission.id, expect.any(Function));
    const updated = onMissionChange.mock.calls[0][1](mission);
    expect(updated.fieldLogEntries[0]).toMatchObject({
      category: 'observasjon',
      text: 'Vannstand øker ved pumpested',
      criticalObservation: true,
      linkedMissionId: mission.id,
      locationText: 'Under-fasen',
    });
  });

  it('blocks quick field-log text with sensitive operational details', async () => {
    const user = userEvent.setup();
    const mission = buildMission({ id: 'mission-quick-log-sensitive', title: 'Quick sensitive log', fieldLogEntries: [] });
    const onMissionChange = vi.fn(async (_missionId, update) => update(mission));

    render(<QuickFieldLogComposer mission={mission} onMissionChange={onMissionChange} defaultCategory="observasjon" sourceLabel="Under-fasen" />);

    await user.type(screen.getByLabelText('Hurtiglogg tekst'), 'fødselsnummer 01017012345');
    await user.click(screen.getByRole('button', { name: /lagre hurtiglogg/i }));

    // The error names the matched category (here: national-id) instead of the
    // old generic persondata sentence, and never echoes the input.
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/hurtiglogg.*fødselsnummer\/personnummer/i);
    expect(alert).toHaveTextContent(/persondata/i);
    expect(alert).not.toHaveTextContent(/01017012345/);
    expect(onMissionChange).not.toHaveBeenCalled();
  });

  it('warns on fuzzy sensitive matches and saves after an explicit override', async () => {
    const user = userEvent.setup();
    const mission = buildMission({ id: 'mission-quick-log-override', title: 'Quick override log', fieldLogEntries: [] });
    const onMissionChange = vi.fn(async (_missionId, update) => update(mission));

    render(<QuickFieldLogComposer mission={mission} onMissionChange={onMissionChange} defaultCategory="observasjon" sourceLabel="Under-fasen" />);

    // patient-reference is a fuzzy heuristic: warn first, never hard-block.
    await user.type(screen.getByLabelText('Hurtiglogg tekst'), 'Pasient nr 123 flyttes til samleplass');
    await user.click(screen.getByRole('button', { name: /lagre hurtiglogg/i }));

    expect(onMissionChange).not.toHaveBeenCalled();
    const warning = screen.getByRole('alert');
    expect(warning).toHaveTextContent(/advarsel/i);

    await user.click(screen.getByRole('button', { name: /lagre likevel/i }));
    expect(onMissionChange).toHaveBeenCalledTimes(1);
    const updated = onMissionChange.mock.calls[0][1](mission);
    expect(updated.fieldLogEntries[0].text).toContain('flyttes til samleplass');
  });

  it('still hard-blocks structured identifiers with no override offered', async () => {
    const user = userEvent.setup();
    const mission = buildMission({ id: 'mission-quick-log-hard', title: 'Quick hard log', fieldLogEntries: [] });
    const onMissionChange = vi.fn(async (_missionId, update) => update(mission));

    render(<QuickFieldLogComposer mission={mission} onMissionChange={onMissionChange} defaultCategory="observasjon" sourceLabel="Under-fasen" />);

    await user.type(screen.getByLabelText('Hurtiglogg tekst'), 'Ring +47 99 88 77 66 for status');
    await user.click(screen.getByRole('button', { name: /lagre hurtiglogg/i }));

    expect(onMissionChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/stoppet/i);
    expect(screen.queryByRole('button', { name: /lagre likevel/i })).not.toBeInTheDocument();
  });
});
