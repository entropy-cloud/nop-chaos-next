// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveThemeConfig } from '../config/themeResolution';
import { applyThemeToDocument, resolveDisplayMode } from './themeCss';

vi.mock('../config/themeRegistry', () => ({
  getDefaultThemeId: () => 'classic',
  hasRegisteredTheme: (id: string) => id === 'classic' || id === 'glass',
}));

describe('themeCss', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = '';
    document.documentElement.dataset.mode = '';
    document.documentElement.classList.remove('dark');
  });

  it('resolves system mode to light when no dark preference', () => {
    const result = resolveDisplayMode('light');
    expect(result).toBe('light');
  });

  it('resolves dark mode directly', () => {
    const result = resolveDisplayMode('dark');
    expect(result).toBe('dark');
  });

  it('applies theme to document with registered theme', () => {
    applyThemeToDocument({ themeId: 'glass', displayMode: 'dark' });

    expect(document.documentElement.dataset.theme).toBe('glass');
    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--secondary')).toBe(
      'var(--host-secondary)',
    );
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('var(--host-primary)');
  });

  it('falls back to default theme when theme not registered', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    applyThemeToDocument({ themeId: 'nonexistent', displayMode: 'light' });

    expect(document.documentElement.dataset.theme).toBe('classic');
    expect(document.documentElement.dataset.mode).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(resolveThemeConfig({ themeId: 'nonexistent', displayMode: 'light' })).toEqual({
      themeId: 'classic',
      displayMode: 'light',
    });

    warnSpy.mockRestore();
  });

  it('applies light mode without dark class', () => {
    applyThemeToDocument({ themeId: 'classic', displayMode: 'light' });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
