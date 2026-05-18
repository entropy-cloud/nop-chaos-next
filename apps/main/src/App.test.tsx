// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import App from './App';

type StoreSelector<T, U> = (value: T) => U;
type StoreHook<T> = {
  <U>(selector: StoreSelector<T, U>): U;
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
  setState: (nextState: T) => void;
};

const {
  setPluginBridgeMock,
  registerBaseSharedModulesMock,
  useThemeStoreMock,
  useAuthStoreMock,
  usePluginStoreMock,
} = vi.hoisted(() => {
  function createStoreHook<T>(initialState: T) {
    let state = initialState;
    const listeners = new Set<() => void>();

    const hook = ((selector: (value: T) => unknown) => selector(state)) as StoreHook<T>;

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
    setPluginBridgeMock: vi.fn(),
    registerBaseSharedModulesMock: vi.fn(),
    useThemeStoreMock: createStoreHook({
      themeConfig: { themeId: 'classic', displayMode: 'light' as const },
    }),
    useAuthStoreMock: createStoreHook({ user: null, isAuthenticated: false }),
    usePluginStoreMock: createStoreHook({ plugins: [] as Array<never> }),
  };
});

vi.mock('@nop-chaos/ui', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@nop-chaos/plugin-bridge', () => ({
  setPluginBridge: (bridge: unknown) => setPluginBridgeMock(bridge),
}));

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

vi.mock('./store/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('./store/pluginStore', () => ({
  usePluginStore: usePluginStoreMock,
}));

function RouteAdvanceButton() {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate('/next')}>
      next
    </button>
  );
}

describe('App plugin bridge wiring', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    setPluginBridgeMock.mockReset();
    registerBaseSharedModulesMock.mockReset();
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

  it('keeps the same bridge instance across route changes while updating current path getter', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/start']}>
          <App />
          <RouteAdvanceButton />
        </MemoryRouter>,
      );
    });

    expect(setPluginBridgeMock).toHaveBeenCalledTimes(1);
    const bridge = setPluginBridgeMock.mock.calls[0][0] as { getCurrentPath: () => string };
    expect(bridge.getCurrentPath()).toBe('/start');

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setPluginBridgeMock).toHaveBeenCalledTimes(1);
    expect(bridge.getCurrentPath()).toBe('/next');
  });
});
