// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSystemDisplayMode } from './useSystemDisplayMode';
import {
  applyThemeToDocument,
  resolveDisplayMode,
  subscribeToSystemDisplayMode,
} from '../utils/themeCss';

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

function HookHarness({
  config,
}: {
  config: { themeId: 'classic'; displayMode: 'light' | 'dark' | 'system' };
}) {
  useSystemDisplayMode(config);
  return null;
}

describe('resolveDisplayMode', () => {
  it('returns dark for explicit dark mode', () => {
    expect(resolveDisplayMode('dark')).toBe('dark');
  });

  it('returns light for explicit light mode', () => {
    expect(resolveDisplayMode('light')).toBe('light');
  });

  it('resolves system to dark when OS prefers dark', () => {
    const mock = createMatchMediaMock(true);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mock as unknown as MediaQueryList);
    expect(resolveDisplayMode('system')).toBe('dark');
  });

  it('resolves system to light when OS prefers light', () => {
    const mock = createMatchMediaMock(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mock as unknown as MediaQueryList);
    expect(resolveDisplayMode('system')).toBe('light');
  });
});

describe('subscribeToSystemDisplayMode', () => {
  let mock: ReturnType<typeof createMatchMediaMock>;

  beforeEach(() => {
    mock = createMatchMediaMock(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mock as unknown as MediaQueryList);
    document.documentElement.dataset.theme = '';
    document.documentElement.dataset.mode = '';
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates data-mode when OS preference changes during system mode', () => {
    const config = { themeId: 'classic' as const, displayMode: 'system' as const };
    applyThemeToDocument(config);

    const unsubscribe = subscribeToSystemDisplayMode(config);

    expect(document.documentElement.dataset.mode).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    mock.fireChange(true);
    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    mock.fireChange(false);
    expect(document.documentElement.dataset.mode).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    unsubscribe();
  });

  it('removes listener on cleanup', () => {
    const config = { themeId: 'classic' as const, displayMode: 'system' as const };
    applyThemeToDocument(config);

    const unsubscribe = subscribeToSystemDisplayMode(config);
    expect(mock.addEventListener).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(mock.removeEventListener).toHaveBeenCalledTimes(1);

    mock.fireChange(true);
    expect(document.documentElement.dataset.mode).toBe('light');
  });

  it('does not register listener for non-system modes', () => {
    const config = { themeId: 'classic' as const, displayMode: 'dark' as const };
    applyThemeToDocument(config);

    const unsubscribe = subscribeToSystemDisplayMode(config);

    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(mock.addEventListener).not.toHaveBeenCalled();

    unsubscribe();
  });
});

describe('useSystemDisplayMode', () => {
  let mock: ReturnType<typeof createMatchMediaMock>;
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    mock = createMatchMediaMock(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mock as unknown as MediaQueryList);
    document.documentElement.dataset.theme = '';
    document.documentElement.dataset.mode = '';
    document.documentElement.classList.remove('dark');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('registers and cleans up listener through the hook', () => {
    const config = { themeId: 'classic' as const, displayMode: 'system' as const };

    act(() => {
      root.render(<HookHarness config={config} />);
    });

    expect(document.documentElement.dataset.mode).toBe('light');
    expect(mock.addEventListener).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });

    expect(mock.removeEventListener).toHaveBeenCalledTimes(1);

    mock.fireChange(true);
    expect(document.documentElement.dataset.mode).toBe('light');
  });

  it('does not register listener for non-system mode in hook', () => {
    const config = { themeId: 'classic' as const, displayMode: 'dark' as const };

    act(() => {
      root.render(<HookHarness config={config} />);
    });

    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(mock.addEventListener).not.toHaveBeenCalled();
  });
});
