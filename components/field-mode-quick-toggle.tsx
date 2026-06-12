'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import {
  FIELD_MODE_STORAGE_EVENT,
  FIELD_MODE_STORAGE_KEY,
  parseFieldModeSettings,
  readFieldModeSettings,
  writeFieldModeSettings,
} from '@/lib/field-mode/field-mode';
import { OperationalIcon } from './ui/operational-icons';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(FIELD_MODE_STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(FIELD_MODE_STORAGE_EVENT, callback);
  };
}

function snapshot() {
  try {
    return localStorage.getItem(FIELD_MODE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * One-tap field mode from home, with a visible active state. Full settings
 * (glove mode, theme) stay on /feltmodus — this only flips the main switch
 * so going operational does not require digging through /mer.
 */
export function FieldModeQuickToggle() {
  const serialized = useSyncExternalStore(subscribe, snapshot, () => '');
  const settings = parseFieldModeSettings(serialized || null);

  function toggle() {
    const current = readFieldModeSettings();
    writeFieldModeSettings({ ...current, enabled: !current.enabled });
    window.dispatchEvent(new Event(FIELD_MODE_STORAGE_EVENT));
  }

  return (
    <div className={`mt-3 flex items-center justify-between gap-2 rounded-2xl border px-3 py-1.5 ${settings.enabled ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-white text-slate-950'}`}>
      <button type="button" onClick={toggle} aria-pressed={settings.enabled} className="inline-flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left text-sm font-black">
        <OperationalIcon name="shield" className="h-4 w-4 shrink-0" />
        <span className="truncate">{settings.enabled ? 'Feltmodus aktiv' : 'Feltmodus av'}</span>
        <span className={`ml-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${settings.enabled ? 'justify-end bg-emerald-600' : 'justify-start bg-slate-300'}`} aria-hidden="true">
          <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
        </span>
      </button>
      <Link href="/feltmodus" className="inline-flex min-h-11 shrink-0 items-center text-xs font-black underline underline-offset-2">
        Innstillinger
      </Link>
    </div>
  );
}

