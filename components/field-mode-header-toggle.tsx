'use client';

import { useSyncExternalStore } from 'react';
import {
  FIELD_MODE_STORAGE_EVENT,
  FIELD_MODE_STORAGE_KEY,
  parseFieldModeSettings,
  readFieldModeSettings,
  writeFieldModeSettings,
} from '@/lib/field-mode/field-mode';

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
 * One-tap feltmodus from the shell header so field ergonomics are reachable
 * from every screen — not only via home or /mer. Full settings (glove mode,
 * theme) stay on /feltmodus.
 */
export function FieldModeHeaderToggle() {
  const serialized = useSyncExternalStore(subscribe, snapshot, () => '');
  const settings = parseFieldModeSettings(serialized || null);

  function toggle() {
    const current = readFieldModeSettings();
    writeFieldModeSettings({ ...current, enabled: !current.enabled });
    window.dispatchEvent(new Event(FIELD_MODE_STORAGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={settings.enabled}
      aria-label={settings.enabled ? 'Feltmodus på (snarvei i toppmeny)' : 'Feltmodus av (snarvei i toppmeny)'}
      className={settings.enabled
        ? 'inline-flex min-h-11 items-center rounded-full bg-emerald-700 px-3 py-2 text-xs font-black text-white shadow-sm'
        : 'inline-flex min-h-11 items-center rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/15'}
    >
      Felt
    </button>
  );
}
