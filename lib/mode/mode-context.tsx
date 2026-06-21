'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
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

function getClientMode(): AppMode {
  try {
    return readLocalProfile()?.mode ?? DEFAULT_APP_MODE;
  } catch {
    return DEFAULT_APP_MODE;
  }
}

export function ModeProvider({ children }: { children: ReactNode }) {
  // Backed by the local profile (an external store). The server snapshot is the
  // default mode so SSR and the first client render match; useSyncExternalStore
  // then reconciles to the stored mode on the client without a hydration
  // mismatch warning — even though Personlig swaps the whole home.
  const mode = useSyncExternalStore(subscribeLocalProfile, getClientMode, () => DEFAULT_APP_MODE);

  const setMode = useCallback((next: AppMode) => {
    // Merge with the stored profile so switching mode preserves role and other
    // fields (saveLocalProfile replaces rather than merges). The store change
    // event re-renders subscribers; no local state needed.
    try {
      saveLocalProfile({ ...(readLocalProfile() ?? {}), mode: next });
    } catch {
      // Best effort: if storage is blocked the snapshot simply stays as-is.
    }
  }, []);

  const value = useMemo<ModeContextValue>(() => ({
    mode,
    modeLabel: APP_MODE_LABELS[mode],
    setMode,
  }), [mode, setMode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}
