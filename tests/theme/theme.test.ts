import { describe, expect, it } from 'vitest';

import { isThemePreference, resolveThemePreference } from '@/lib/theme';

describe('theme preference resolver', () => {
  it('resolves system preference from dark media', () => {
    expect(resolveThemePreference('system', true)).toBe('dark');
  });

  it('resolves system preference from light media', () => {
    expect(resolveThemePreference('system', false)).toBe('light');
  });

  it('lets explicit dark override system', () => {
    expect(resolveThemePreference('dark', false)).toBe('dark');
  });

  it('lets explicit light override system', () => {
    expect(resolveThemePreference('light', true)).toBe('light');
  });

  it('guards stored values', () => {
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('night')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});
