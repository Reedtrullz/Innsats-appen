export const THEME_STORAGE_KEY = 'innsats-theme';

export type ThemePreference = 'system' | 'light' | 'dark';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveThemePreference(preference: ThemePreference, systemPrefersDark: boolean): 'light' | 'dark' {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
}

export function readThemePreference(storage: Pick<Storage, 'getItem'> | null | undefined): ThemePreference {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

export function applyResolvedTheme(root: HTMLElement, preference: ThemePreference, systemPrefersDark: boolean) {
  const resolved = resolveThemePreference(preference, systemPrefersDark);
  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.themePreference = preference;
  root.dataset.themeResolved = resolved;
  root.style.colorScheme = resolved;
}

export function getThemeInitScript() {
  return `
(function () {
  try {
    var storageKey = '${THEME_STORAGE_KEY}';
    var stored = window.localStorage.getItem(storageKey);
    var preference = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.dataset.themePreference = preference;
    root.dataset.themeResolved = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (error) {
    document.documentElement.classList.remove('dark');
    document.documentElement.dataset.themePreference = 'system';
    document.documentElement.dataset.themeResolved = 'light';
    document.documentElement.style.colorScheme = 'light';
  }
}());
`.trim();
}
