import { readLocalProfile } from '@/lib/privacy/local-profile';
import { readSelectedActiveMissionId } from '@/lib/mission/active-mission-selection';

export const DEVICE_GATE_STORAGE_KEY = 'beredskapsboka-device-gate-v1';

export type CheckId =
  | 'pwa-installed'
  | 'offline-ready'
  | 'pin-set'
  | 'data-retention'
  | 'map-offline'
  | 'mission-offline';

export type CheckStatus = 'pass' | 'fail' | 'skip';

export interface DeviceGateCheck {
  id: CheckId;
  label: string;
  description: string;
  autoDetected: CheckStatus;
  manualConfirmed: boolean;
  detail: string;
}

export interface DeviceGateState {
  checks: DeviceGateCheck[];
  sha: string | null;
  shaFetchedAt: string | null;
}

export const CHECK_DEFS: Array<{
  id: CheckId;
  label: string;
  description: string;
}> = [
  {
    id: 'pwa-installed',
    label: 'PWA installeres på hjem-skjerm',
    description: 'Appen må kjøre i standalone-modus (ikke nettleserfane) på en reell enhet.',
  },
  {
    id: 'offline-ready',
    label: 'App fungerer fullt ut offline etter installasjon',
    description: 'Service worker kontrollerer siden, og appen skal fungere uten nettverk.',
  },
  {
    id: 'pin-set',
    label: 'PIN er satt og PIN-forsøk begrenses',
    description: 'Lokal personvernfriksjon med PIN-kode er aktivert.',
  },
  {
    id: 'data-retention',
    label: 'Datalagring + manuell sletting sletter faktisk',
    description: 'Retensjonsinnstillinger finnes, og sletting fjerner data fra enheten.',
  },
  {
    id: 'map-offline',
    label: 'Kart vises offline (skjematisk fallback akseptert)',
    description: 'Minst ett skjematisk kart-pakke er bufret for offline-bruk.',
  },
  {
    id: 'mission-offline',
    label: 'Rolle + oppdragslivssyklus fullføres offline',
    description: 'Et aktivt oppdrag er valgt, og en rolle er satt.',
  },
];

function detectPwaInstalled(): { status: CheckStatus; detail: string } {
  const standalone =
    (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches)
    || (typeof navigator !== 'undefined' && (navigator as unknown as Record<string, unknown>).standalone === true);

  return standalone
    ? { status: 'pass', detail: 'Appen kjører i standalone-modus (installert PWA).' }
    : { status: 'fail', detail: 'Appen kjører i nettleser. Installer til hjem-skjerm for standalone-modus.' };
}

function detectOfflineReady(): { status: CheckStatus; detail: string } {
  const hasController = typeof navigator !== 'undefined'
    && typeof navigator.serviceWorker !== 'undefined'
    && navigator.serviceWorker?.controller !== null;

  return hasController
    ? { status: 'pass', detail: 'Service worker kontrollerer siden og kan levere offline.' }
    : { status: 'fail', detail: 'Ingen aktiv service worker. Registrering av /sw.js kreves for offline-drift.' };
}

function detectPinSet(): { status: CheckStatus; detail: string } {
  try {
    const profile = readLocalProfile();
    if (profile?.pinLock) {
      return { status: 'pass', detail: 'PIN-lås er satt og aktivert for lokal personvernfriksjon.' };
    }
    return { status: 'fail', detail: 'Ingen PIN-lås funnet. Gå til Profil og sett PIN.' };
  } catch {
    return { status: 'skip', detail: 'Kunne ikke lese lokal profil.' };
  }
}

function detectMapOffline(): { status: CheckStatus; detail: string } {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem('beredskapsboka-offline-map-cache-v1')
      : null;
    if (!raw) return { status: 'fail', detail: 'Ingen offline-kartpakker bufret. Gå til Kart og last ned en pakke.' };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return { status: 'pass', detail: `${parsed.length} kartpakke(r) bufret for offline-bruk.` };
    }
    return { status: 'fail', detail: 'Tom kartpakkeliste. Gå til Kart og last ned en pakke.' };
  } catch {
    return { status: 'skip', detail: 'Kunne ikke lese offline-kartbuffer.' };
  }
}

function detectMissionOffline(): { status: CheckStatus; detail: string } {
  try {
    const missionId = readSelectedActiveMissionId();
    const profile = readLocalProfile();
    const hasRole = profile?.preferredRole && profile.preferredRole !== 'ikke-valgt';

    if (missionId && hasRole) {
      return { status: 'pass', detail: `Aktivt oppdrag («${missionId.slice(0, 8)}…») med rolle «${profile.preferredRole}».` };
    }
    const problems: string[] = [];
    if (!missionId) problems.push('Ingen aktivt oppdrag valgt');
    if (!hasRole) problems.push('Ingen rolle satt');
    return { status: 'fail', detail: problems.join('. ') + '.' };
  } catch {
    return { status: 'skip', detail: 'Kunne ikke lese oppdrag eller profil.' };
  }
}

export function runAutoDetect(checkId: CheckId): { status: CheckStatus; detail: string } {
  switch (checkId) {
    case 'pwa-installed': return detectPwaInstalled();
    case 'offline-ready': return detectOfflineReady();
    case 'pin-set': return detectPinSet();
    case 'data-retention': return { status: 'fail', detail: 'Trykk «Test sletting» for å kjøre lokal write-then-wipe.' };
    case 'map-offline': return detectMapOffline();
    case 'mission-offline': return detectMissionOffline();
  }
}

export function runDataRetentionWipeTest(): { status: CheckStatus; detail: string } {
  const scratchKey = 'beredskapsboka-device-gate-scratch';
  try {
    const ls = typeof localStorage !== 'undefined' ? localStorage : null;
    if (!ls) return { status: 'skip', detail: 'localStorage utilgjengelig.' };
    ls.setItem(scratchKey, `scratch-${Date.now()}`);
    const readBack = ls.getItem(scratchKey);
    if (!readBack) return { status: 'fail', detail: 'Skriving til localStorage feilet.' };
    ls.removeItem(scratchKey);
    const afterDelete = ls.getItem(scratchKey);
    if (afterDelete !== null) return { status: 'fail', detail: 'Sletting fra localStorage feilet — verdi fortsatt tilstede.' };
    const retentionRaw = ls.getItem('beredskapsboka-local-retention-v1');
    if (!retentionRaw) return { status: 'fail', detail: 'Write-then-wipe OK, men ingen retensjonsinnstillinger funnet. Gå til Profil og lagre retensjon.' };
    return { status: 'pass', detail: 'Write-then-wipe vellykket. localStorage skriving og sletting fungerer.' };
  } catch {
    return { status: 'skip', detail: 'Write-then-wipe test feilet med unntak.' };
  }
}

export function loadPersistedGate(): Pick<DeviceGateState, 'sha' | 'shaFetchedAt'> & { confirmed: Record<CheckId, boolean> } {
  if (typeof window === 'undefined') return { sha: null, shaFetchedAt: null, confirmed: {} as Record<CheckId, boolean> };
  try {
    const raw = localStorage.getItem(DEVICE_GATE_STORAGE_KEY);
    if (!raw) return { sha: null, shaFetchedAt: null, confirmed: {} as Record<CheckId, boolean> };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const confirmed: Record<string, boolean> = {};
    const cmap = parsed.manualConfirmed;
    if (cmap && typeof cmap === 'object' && !Array.isArray(cmap)) {
      for (const [key, value] of Object.entries(cmap as Record<string, unknown>)) {
        if (typeof value === 'boolean') confirmed[key] = value;
      }
    }
    return {
      sha: typeof parsed.sha === 'string' ? parsed.sha : null,
      shaFetchedAt: typeof parsed.shaFetchedAt === 'string' ? parsed.shaFetchedAt : null,
      confirmed: confirmed as Record<CheckId, boolean>,
    };
  } catch {
    return { sha: null, shaFetchedAt: null, confirmed: {} as Record<CheckId, boolean> };
  }
}

export function persistManualConfirm(checkId: CheckId, value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(DEVICE_GATE_STORAGE_KEY);
    const current = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    const confirmed = (current.manualConfirmed && typeof current.manualConfirmed === 'object' && !Array.isArray(current.manualConfirmed))
      ? { ...current.manualConfirmed as Record<string, boolean> }
      : {};
    confirmed[checkId] = value;
    current.manualConfirmed = confirmed;
    localStorage.setItem(DEVICE_GATE_STORAGE_KEY, JSON.stringify(current));
  } catch { /* no-op */ }
}

export function persistSha(sha: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(DEVICE_GATE_STORAGE_KEY);
    const current = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    current.sha = sha;
    current.shaFetchedAt = new Date().toISOString();
    localStorage.setItem(DEVICE_GATE_STORAGE_KEY, JSON.stringify(current));
  } catch { /* no-op */ }
}

export function resetDeviceGate(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DEVICE_GATE_STORAGE_KEY);
  } catch { /* no-op */ }
}
