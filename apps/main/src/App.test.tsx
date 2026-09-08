// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

import App from './App';

const {
  registerBaseSharedModulesMock,
  useThemeStoreMock,
} = vi.hoisted(() => {
  type ThemeStoreState = {
    themeConfig: { themeId: string; displayMode: 'light' | 'dark' | 'system' };
  };

  function createStoreHook<T>(initialState: T) {
    let state = initialState;
    const listeners = new Set<() => void>();

    const hook = ((selector: (value: T) => unknown) => selector(state)) as {
      <U>(selector: (value: T) => U): U;
      getState: () => T;
      subscribe: (listener: () => void) => () => void;
      setState: (nextState: T) => void;
    };

    hook.getState = () => state;
    hook.subscribe = (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    };
    hook.setState = (nextState: T) => {
      state = nextState;
      for (const listener of listeners) {
        listener();
      }
    };

    return hook;
  }

  return {
    registerBaseSharedModulesMock: vi.fn(),
    useThemeStoreMock: createStoreHook<ThemeStoreState>({
      themeConfig: { themeId: 'classic', displayMode: 'light' as const },
    }),
  };
});

vi.mock('./router/AppRoutes', () => ({
  AppRoutes: () => null,
}));

vi.mock('./hooks/useAuth', () => ({
  useAuthBootstrap: () => ({ isAuthenticated: false, bootstrapStatus: 'success' }),
}));

vi.mock('./hooks/useMenuConfig', () => ({
  useMenuConfigQuery: vi.fn(),
}));

vi.mock('./plugins/sharedModules', () => ({
  registerBaseSharedModules: () => registerBaseSharedModulesMock(),
}));

vi.mock('./hooks/useSystemDisplayMode', () => ({
  useSystemDisplayMode: vi.fn(),
}));

vi.mock('./store/themeStore', () => ({
  useThemeStore: useThemeStoreMock,
}));

describe('App', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    registerBaseSharedModulesMock.mockReset();
    useThemeStoreMock.setState({
      themeConfig: { themeId: 'classic', displayMode: 'light' },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    container?.remove();
  });

  it('registers shared modules on mount', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/start']}>
          <App />
        </MemoryRouter>,
      );
    });

    expect(registerBaseSharedModulesMock).toHaveBeenCalledTimes(1);
  });
});
