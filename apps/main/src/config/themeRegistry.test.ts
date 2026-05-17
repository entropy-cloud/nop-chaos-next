import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('themeRegistry', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('has default themes (classic, glass) initially', async () => {
    const { getThemeRegistry } = await import('./themeRegistry');
    const themes = getThemeRegistry();
    expect(themes.map((t) => t.id)).toEqual(['classic', 'glass']);
  });

  it('getDefaultThemeId returns classic', async () => {
    const { getDefaultThemeId } = await import('./themeRegistry');
    expect(getDefaultThemeId()).toBe('classic');
  });

  it('hasRegisteredTheme returns true for existing themes', async () => {
    const { hasRegisteredTheme } = await import('./themeRegistry');
    expect(hasRegisteredTheme('classic')).toBe(true);
    expect(hasRegisteredTheme('glass')).toBe(true);
  });

  it('hasRegisteredTheme returns false for unknown themes', async () => {
    const { hasRegisteredTheme } = await import('./themeRegistry');
    expect(hasRegisteredTheme('nonexistent')).toBe(false);
    expect(hasRegisteredTheme(undefined)).toBe(false);
    expect(hasRegisteredTheme('')).toBe(false);
  });

  it('getThemeDefinition returns the matching definition', async () => {
    const { getThemeDefinition } = await import('./themeRegistry');
    const classic = getThemeDefinition('classic');
    expect(classic).toBeDefined();
    expect(classic!.labelKey).toBe('settings.themeOptions.classic.label');
  });

  it('getThemeDefinition returns undefined for unknown', async () => {
    const { getThemeDefinition } = await import('./themeRegistry');
    expect(getThemeDefinition('unknown')).toBeUndefined();
  });

  it('registerThemes appends new themes', async () => {
    const { registerThemes, getThemeRegistry } = await import('./themeRegistry');
    registerThemes([{ id: 'dark', labelKey: 'theme.dark' }]);
    const themes = getThemeRegistry();
    expect(themes.map((t) => t.id)).toContain('dark');
    expect(themes).toHaveLength(3);
  });

  it('registerThemes updates existing themes by id', async () => {
    const { registerThemes, getThemeRegistry, getThemeDefinition } = await import('./themeRegistry');
    registerThemes([{ id: 'classic', labelKey: 'theme.classic.v2', descriptionKey: 'updated' }]);
    const classic = getThemeDefinition('classic');
    expect(classic!.labelKey).toBe('theme.classic.v2');
    expect(classic!.descriptionKey).toBe('updated');
    expect(getThemeRegistry()).toHaveLength(2);
  });

  it('registerThemes can update and append in one call', async () => {
    const { registerThemes, getThemeRegistry } = await import('./themeRegistry');
    registerThemes([
      { id: 'classic', labelKey: 'updated' },
      { id: 'neon', labelKey: 'theme.neon' },
    ]);
    const themes = getThemeRegistry();
    expect(themes).toHaveLength(3);
    expect(themes.find((t) => t.id === 'classic')!.labelKey).toBe('updated');
    expect(themes.find((t) => t.id === 'neon')!.labelKey).toBe('theme.neon');
  });

  describe('getNextThemeId', () => {
    it('cycles to next theme in order', async () => {
      const { getNextThemeId } = await import('./themeRegistry');
      expect(getNextThemeId('classic')).toBe('glass');
      expect(getNextThemeId('glass')).toBe('classic');
    });

    it('returns first theme when given id is not found', async () => {
      const { getNextThemeId } = await import('./themeRegistry');
      expect(getNextThemeId('unknown')).toBe('classic');
    });

    it('returns first theme when no id provided', async () => {
      const { getNextThemeId } = await import('./themeRegistry');
      expect(getNextThemeId()).toBe('classic');
    });

    it('wraps around with 3+ themes', async () => {
      const { registerThemes, getNextThemeId } = await import('./themeRegistry');
      registerThemes([{ id: 'dark', labelKey: 'theme.dark' }]);
      expect(getNextThemeId('classic')).toBe('glass');
      expect(getNextThemeId('glass')).toBe('dark');
      expect(getNextThemeId('dark')).toBe('classic');
    });
  });

  it('getThemeRegistry returns a copy (mutations do not affect registry)', async () => {
    const { getThemeRegistry } = await import('./themeRegistry');
    const copy = getThemeRegistry();
    copy.push({ id: 'hacked', labelKey: 'hacked' });
    const fresh = getThemeRegistry();
    expect(fresh.find((t) => t.id === 'hacked')).toBeUndefined();
  });
});
