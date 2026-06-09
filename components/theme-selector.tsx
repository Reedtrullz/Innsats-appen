'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { isThemePreference, resolveThemePreference, THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme';

const options: Array<{ value: ThemePreference; label: string; description: string }> = [
  { value: 'system', label: 'System', description: 'Følg enhetens innstilling.' },
  { value: 'light', label: 'Lys', description: 'Fast lys modus.' },
  { value: 'dark', label: 'Mørk', description: 'Fast mørk modus.' },
];

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(value) ? value : 'system';
}

function subscribeThemePreference(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener('innsats-theme-change', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener('innsats-theme-change', onStoreChange);
  };
}

function applyThemePreference(preference: ThemePreference) {
  const systemPrefersDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = resolveThemePreference(preference, systemPrefersDark);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.themePreference = preference;
  root.dataset.themeResolved = resolved;
  root.style.colorScheme = resolved;
}

export function ThemeSelector() {
  const preference = useSyncExternalStore<ThemePreference>(subscribeThemePreference, readStoredPreference, () => 'system');

  useEffect(() => {
    applyThemePreference(preference);
  }, [preference]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (readStoredPreference() === 'system') applyThemePreference('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const selectedLabel = useMemo(() => options.find((option) => option.value === preference)?.label ?? 'System', [preference]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="theme-selector-heading">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-sky-800">Visning</p>
        <h2 id="theme-selector-heading" className="text-2xl font-black text-slate-950">Fargemodus</h2>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          Velg lys, mørk eller systemstyrt visning. Valget lagres bare lokalt i denne nettleseren.
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={`Fargemodus. Valgt: ${selectedLabel}`}>
        {options.map((option) => {
          const selected = option.value === preference;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                window.localStorage.setItem(THEME_STORAGE_KEY, option.value);
                window.dispatchEvent(new Event('innsats-theme-change'));
                applyThemePreference(option.value);
              }}
              className={`min-h-16 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49] ${
                selected ? 'border-sky-800 bg-[#082F49] text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-sky-300 hover:bg-sky-50'
              }`}
            >
              <span className="block text-sm font-black">{option.label}</span>
              <span className={`mt-1 block text-xs font-semibold ${selected ? 'text-sky-100' : 'text-slate-600'}`}>{option.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
