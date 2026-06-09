'use client';

import { useCallback, useEffect, useState } from 'react';
import { readSelectedActiveMissionId, saveSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { listMissions } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';

export interface ActiveMissionHandle {
  mission: MissionContext | null;
  missions: MissionContext[];
  loading: boolean;
  hasActiveMission: boolean;
  setActiveMissionId: (id: string) => void;
  refresh: () => Promise<void>;
}

export function useActiveMission(): ActiveMissionHandle {
  const [missions, setMissions] = useState<MissionContext[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return readSelectedActiveMissionId();
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const stored = await listMissions();
      setMissions(stored);
      const selectedId = readSelectedActiveMissionId();
      if (selectedId && !stored.some((m) => m.id === selectedId)) {
        saveSelectedActiveMissionId(null);
        setActiveId(null);
      } else {
        setActiveId(selectedId);
      }
    } catch {
      setMissions([]);
      setActiveId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const stored = await listMissions();
        if (cancelled) return;
        setMissions(stored);
        const selectedId = readSelectedActiveMissionId();
        if (selectedId && !stored.some((m) => m.id === selectedId)) {
          saveSelectedActiveMissionId(null);
          if (!cancelled) setActiveId(null);
        } else {
          if (!cancelled) setActiveId(selectedId);
        }
      } catch {
        if (!cancelled) {
          setMissions([]);
          setActiveId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const setActiveMissionId = useCallback((id: string) => {
    saveSelectedActiveMissionId(id);
    setActiveId(id);
  }, []);

  const mission = selectActiveMission(missions, activeId);
  const hasActiveMission = mission !== null;

  return {
    mission,
    missions,
    loading,
    hasActiveMission,
    setActiveMissionId,
    refresh: load,
  };
}
