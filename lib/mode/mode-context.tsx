'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readLocalProfile, saveLocalProfile, subscribeLocalProfile, DEFAULT_APP_MODE, type AppMode } from '@/lib/privacy/local-profile';

export const APP_MODE_LABELS: Record<AppMode, string> = {
  innsats: 'Innsats',
  personlig: 'Personlig',
};

export const APP_MODE_DESCRIPTIONS: Record<AppMode, string> = {
  innsats: 'Operative verktøy — oppdrag, runbook, tiltakskort, kart.',
  personlig: 'Gjør deg klar hjemme — pakk sekken, egenberedskap, før vakt.',
};

export interface ModeContextValue {
  mode: AppMode;
  modeLabel: string;
  setMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextValue>({
  mode: DEFAULT_APP_MODE,
  modeLabel: APP_MODE_LABELS[DEFAULT_APP_MODE],
  setMode: () => undefined,
});

export function useMode(): ModeContextValue {
  return useContext(ModeContext);
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window === 'undefined') return DEFAULT_APP_MODE;
    try {
      return readLocalProfile()?.mode ?? DEFAULT_APP_MODE;
    } catch {
      return DEFAULT_APP_MODE;
    }
  });

  const setMode = useCallback((next: AppMode) => {
    try {
      // Merge with the stored profile so switching mode preserves role and
      // other fields (saveLocalProfile replaces rather than merges).
      const updated = saveLocalProfile({ ...(readLocalProfile() ?? {}), mode: next });
      setModeState(updated.mode);
    } catch {
      setModeState(next);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeLocalProfile(() => {
      try {
        const profile = readLocalProfile();
        if (profile) setModeState(profile.mode);
      } catch {
        // Keep current mode on read failure.
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo<ModeContextValue>(() => ({
    mode,
    modeLabel: APP_MODE_LABELS[mode],
    setMode,
  }), [mode, setMode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}
