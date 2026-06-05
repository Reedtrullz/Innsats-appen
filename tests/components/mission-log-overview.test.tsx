import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MissionLogOverview } from '@/components/mission/mission-log-overview';
import { buildMission } from '../helpers/mission-fixtures';

function visibleLogTexts(overview: HTMLElement) {
  return within(overview).queryAllByRole('listitem').map((item) => item.textContent ?? '');
}

describe('MissionLogOverview', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders sorted local logs for the active mission and filters critical, map-linked and must-forward entries without storage writes', async () => {
    const user = userEvent.setup();
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const mission = buildMission({
      id: 'active-mission',
      title: 'Aktivt oppdrag',
      fieldLogEntries: [
        {
          id: 'log-04-forward',
          timestamp: '2026-06-04T08:04:00.000Z',
          category: 'ressursbehov',
          text: 'Må videresendes logg',
          criticalObservation: false,
          mustBeForwarded: true,
        },
        {
          id: 'log-02-map',
          timestamp: '2026-06-04T08:02:00.000Z',
          category: 'observasjon',
          text: 'Kartlogg',
          locationText: 'Teig nord',
          mapReference: {
            source: 'map-point',
            label: 'KO',
            point: { x: 34, y: 56 },
          },
          criticalObservation: false,
          mustBeForwarded: false,
        },
        {
          id: 'log-03-critical',
          timestamp: '2026-06-04T08:03:00.000Z',
          category: 'hms-avvik',
          text: 'Kritisk logg',
          criticalObservation: true,
          mustBeForwarded: false,
        },
        {
          id: 'log-01-normal',
          timestamp: '2026-06-04T08:01:00.000Z',
          category: 'funn',
          text: 'Vanlig logg',
          linkedMissionId: 'active-mission',
          criticalObservation: false,
          mustBeForwarded: false,
        },
        {
          id: 'log-other-mission',
          timestamp: '2026-06-04T08:00:00.000Z',
          category: 'observasjon',
          text: 'Annet oppdrag logg',
          linkedMissionId: 'other-mission',
          criticalObservation: false,
          mustBeForwarded: false,
        },
      ],
    });

    render(<MissionLogOverview mission={mission} />);

    const overview = screen.getByRole('region', { name: /loggoversikt/i });
    expect(overview).toHaveAttribute('id', 'loggoversikt');
    expect(within(overview).getByText(/Viser bare lokale feltlogginnslag for aktivt oppdrag/i)).toBeInTheDocument();
    expect(within(overview).queryByText('Annet oppdrag logg')).not.toBeInTheDocument();

    expect(visibleLogTexts(overview)).toEqual([
      expect.stringContaining('Vanlig logg'),
      expect.stringContaining('Kartlogg'),
      expect.stringContaining('Kritisk logg'),
      expect.stringContaining('Må videresendes logg'),
    ]);
    expect(within(overview).getByText('KO')).toBeInTheDocument();
    expect(overview).not.toHaveTextContent('34,56');

    await user.click(within(overview).getByRole('button', { name: /Kartlogg/i }));
    expect(visibleLogTexts(overview)).toEqual([expect.stringContaining('Kartlogg')]);
    expect(visibleLogTexts(overview).join(' ')).not.toMatch(/Vanlig logg|Kritisk logg|Må videresendes logg/);

    await user.click(within(overview).getByRole('button', { name: /Kritisk/i }));
    expect(visibleLogTexts(overview)).toEqual([
      expect.stringContaining('Kritisk logg'),
      expect.stringContaining('Må videresendes logg'),
    ]);
    expect(visibleLogTexts(overview).join(' ')).not.toMatch(/Vanlig logg|Kartlogg/);

    await user.click(within(overview).getByRole('button', { name: /Må videresendes/i }));
    expect(visibleLogTexts(overview)).toEqual([expect.stringContaining('Må videresendes logg')]);
    expect(visibleLogTexts(overview).join(' ')).not.toMatch(/Kritisk logg|Vanlig logg|Kartlogg/);

    await user.click(within(overview).getByRole('button', { name: /Alle logger/i }));
    expect(within(overview).getByText('Vanlig logg')).toBeInTheDocument();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('shows helpful empty copy when a filter has no matching active-mission entries', async () => {
    const user = userEvent.setup();
    const mission = buildMission({
      id: 'mission-without-map-log',
      title: 'Uten kartlogg',
      fieldLogEntries: [
        {
          id: 'normal-only',
          timestamp: '2026-06-04T09:00:00.000Z',
          category: 'observasjon',
          text: 'Vanlig logg',
          criticalObservation: false,
          mustBeForwarded: false,
        },
      ],
    });

    render(<MissionLogOverview mission={mission} />);

    const overview = screen.getByRole('region', { name: /loggoversikt/i });
    await user.click(within(overview).getByRole('button', { name: /Kartlogg/i }));

    expect(within(overview).queryByText('Vanlig logg')).not.toBeInTheDocument();
    expect(within(overview).getByText(/Ingen lokale logginnslag matcher filteret Kartlogg/i)).toBeInTheDocument();
  });
});
