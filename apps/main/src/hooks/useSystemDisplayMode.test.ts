// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyThemeToDocument, resolveDisplayMode } from '../utils/themeCss';

vi.mock('../config/themeRegistry', () => ({
  getDefaultThemeId: () => 'classic',
  hasRegisteredTheme: () => true,
}));

function createMatchMediaMock(initialMatches: boolean) {
  let currentMatches = initialMatches;
  const listeners = new Set<(e: { matches: boolean }) => void>();

  return {
    get matches() {
      return currentMatches;
    },
    addEventListener: vi.fn((_event: string, listener: (e: { matches: boolean }) => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_event: string, listener: (e: { matches: boolean }) => void) => {
      listeners.delete(listener);
    }),
    fireChange(newMatches: boolean) {
      currentMatches = newMatches;
      for (const listener of listeners) {
        listener({ matches: newMatches });
      }
    },
  };
}

describe('resolveDisplayMode', () => {
  it('returns "dark" for explicit dark mode', () => {
    expect(resolveDisplayMode('dark')).toBe('dark');
  });

  it('returns "light" for explicit light mode', () => {
    expect(resolveDisplayMode('light')).toBe('light');
  });

  it('resolves "system" to dark when OS prefers dark', () => {
    const mock = createMatchMediaMock(true);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mock as unknown as MediaQueryList);
    expect(resolveDisplayMode('system')).toBe('dark');
    vi.restoreAllMocks();
  });

  it('resolves "system" to light when OS prefers light', () => {
    const mock = createMatchMediaMock(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mock as unknown as MediaQueryList);
    expect(resolveDisplayMode('system')).toBe('light');
    vi.restoreAllMocks();
  });
});

describe('OS theme change listener', () => {
  let mock: ReturnType<typeof createMatchMediaMock>;

  beforeEach(() => {
    mock = createMatchMediaMock(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mock as unknown as MediaQueryList);
    document.documentElement.dataset.theme = '';
    document.documentElement.dataset.mode = '';
    document.documentElement.classList.remove('dark');
  });

  it('updates data-mode when OS preference changes during system mode', () => {
    const config = { themeId: 'classic' as const, displayMode: 'system' as const };

    applyThemeToDocument(config);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      applyThemeToDocument(config);
    });

    expect(document.documentElement.dataset.mode).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    mock.fireChange(true);
    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    mock.fireChange(false);
    expect(document.documentElement.dataset.mode).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('removes listener on cleanup', () => {
    const config = { themeId: 'classic' as const, displayMode: 'system' as const };

    applyThemeToDocument(config);
    expect(document.documentElement.dataset.mode).toBe('light');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      applyThemeToDocument(config);
    };
    mediaQuery.addEventListener('change', listener);
    mediaQuery.removeEventListener('change', listener);

    mock.fireChange(true);
    expect(document.documentElement.dataset.mode).toBe('light');
  });

  it('does not register listener for non-system modes', () => {
    const config = { themeId: 'classic' as const, displayMode: 'dark' as const };
    applyThemeToDocument(config);

    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(mock.addEventListener).not.toHaveBeenCalled();
  });
});
