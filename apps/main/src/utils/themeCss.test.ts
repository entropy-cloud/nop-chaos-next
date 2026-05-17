// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/themeRegistry', () => ({
  getDefaultThemeId: () => 'classic',
  hasRegisteredTheme: (id: string) => id === 'classic' || id === 'glass',
}));

describe('themeCss', () => {
  beforeEach(() => {
    vi.resetModules();
    document.documentElement.dataset.theme = '';
    document.documentElement.dataset.mode = '';
    document.documentElement.classList.remove('dark');
  });

  it('resolves system mode to light when no dark preference', async () => {
    const { resolveDisplayMode } = await import('./themeCss');
    const result = resolveDisplayMode('light');
    expect(result).toBe('light');
  });

  it('resolves dark mode directly', async () => {
    const { resolveDisplayMode } = await import('./themeCss');
    const result = resolveDisplayMode('dark');
    expect(result).toBe('dark');
  });

  it('applies theme to document with registered theme', async () => {
    const { applyThemeToDocument } = await import('./themeCss');
    applyThemeToDocument({ themeId: 'glass', displayMode: 'dark' });

    expect(document.documentElement.dataset.theme).toBe('glass');
    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('falls back to default theme when theme not registered', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { applyThemeToDocument } = await import('./themeCss');
    applyThemeToDocument({ themeId: 'nonexistent', displayMode: 'light' });

    expect(document.documentElement.dataset.theme).toBe('classic');
    expect(document.documentElement.dataset.mode).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    warnSpy.mockRestore();
  });

  it('applies light mode without dark class', async () => {
    const { applyThemeToDocument } = await import('./themeCss');
    applyThemeToDocument({ themeId: 'classic', displayMode: 'light' });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
