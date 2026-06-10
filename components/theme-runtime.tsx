'use client';

import { useEffect } from 'react';
import { applyResolvedTheme, readThemePreference } from '@/lib/theme';

function applyCurrentTheme() {
  const preference = readThemePreference(window.localStorage);
  const systemPrefersDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyResolvedTheme(document.documentElement, preference, systemPrefersDark);
}

export function ThemeRuntime() {
  useEffect(() => {
    applyCurrentTheme();

    const onThemeChange = () => applyCurrentTheme();
    window.addEventListener('storage', onThemeChange);
    window.addEventListener('innsats-theme-change', onThemeChange);

    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const onSystemThemeChange = () => {
      if (readThemePreference(window.localStorage) === 'system') applyCurrentTheme();
    };
    media?.addEventListener('change', onSystemThemeChange);

    return () => {
      window.removeEventListener('storage', onThemeChange);
      window.removeEventListener('innsats-theme-change', onThemeChange);
      media?.removeEventListener('change', onSystemThemeChange);
    };
  }, []);

  return null;
}
