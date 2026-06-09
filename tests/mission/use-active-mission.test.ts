import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MissionContext } from '@/lib/mission/schemas';

const mockListMissions = vi.fn<() => Promise<MissionContext[]>>();
const mockReadSelectedId = vi.fn<() => string | null>();
const mockSaveSelectedId = vi.fn<(id: string | null) => string | null>();

vi.mock('@/lib/mission/local-store', () => ({
  listMissions: () => mockListMissions(),
}));

vi.mock('@/lib/mission/active-mission-selection', () => ({
  readSelectedActiveMissionId: () => mockReadSelectedId(),
  saveSelectedActiveMissionId: (id: string | null) => (
    mockSaveSelectedId(id)
  ),
  selectActiveMission: (missions: MissionContext[], selectedId?: string | null) => {
    const id = (typeof selectedId === 'string' ? selectedId.trim() : '') || null;
    return missions.find((m) => m.id === id) ?? missions[0] ?? null;
  },
}));

function mission(id: string): MissionContext {
  return {
    id,
    title: id,
    createdAt: '2026-06-09T08:00:00.000Z',
    updatedAt: '2026-06-09T08:00:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Lokalt område',
    externalSignals: [],
    externalSignalHistory: [],
    activeChecklistIds: [],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    fieldLogEntries: [],
    ruhReports: [],
    welfareChecks: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  };
}

import { useActiveMission } from '@/lib/mission/use-active-mission';
import { act, renderHook, waitFor } from '@testing-library/react';

beforeEach(() => {
  mockListMissions.mockReset();
  mockReadSelectedId.mockReset();
  mockSaveSelectedId.mockReset();
  mockReadSelectedId.mockReturnValue(null);
});

it('returns loading initially', () => {
  mockListMissions.mockReturnValue(new Promise(() => undefined));
  const { result } = renderHook(() => useActiveMission());
  expect(result.current.loading).toBe(true);
});

it('resolves to null mission when no missions exist', async () => {
  mockListMissions.mockResolvedValue([]);
  const { result } = renderHook(() => useActiveMission());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.mission).toBeNull();
  expect(result.current.hasActiveMission).toBe(false);
});

it('resolves active mission from stored id', async () => {
  mockListMissions.mockResolvedValue([mission('a'), mission('b')]);
  mockReadSelectedId.mockReturnValue('b');
  const { result } = renderHook(() => useActiveMission());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.mission?.id).toBe('b');
  expect(result.current.hasActiveMission).toBe(true);
});

it('clears stale selected id', async () => {
  mockListMissions.mockResolvedValue([mission('a')]);
  mockReadSelectedId.mockReturnValue('stale');
  const { result } = renderHook(() => useActiveMission());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(mockSaveSelectedId).toHaveBeenCalledWith(null);
  expect(result.current.mission?.id).toBe('a');
});

it('setActiveMissionId persists and updates active mission', async () => {
  mockListMissions.mockResolvedValue([mission('a'), mission('b')]);
  const { result } = renderHook(() => useActiveMission());
  await waitFor(() => expect(result.current.loading).toBe(false));

  await act(async () => {
    result.current.setActiveMissionId('b');
  });

  expect(mockSaveSelectedId).toHaveBeenCalledWith('b');
  expect(result.current.mission?.id).toBe('b');
});
