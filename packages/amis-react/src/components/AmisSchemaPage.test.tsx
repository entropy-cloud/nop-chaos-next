// @vitest-environment happy-dom
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render as renderAmis } from 'amis';
import { bindActions, transformPageJson } from '@nop-chaos/amis-core';
import type { AmisRuntimeAdapter } from '@nop-chaos/amis-core';
import { AmisSchemaPage } from './AmisSchemaPage';

vi.mock('amis', () => ({
  render: vi.fn(() => null),
  clearStoresCache: vi.fn(),
  setDefaultLocale: vi.fn(),
}));

vi.mock('@nop-chaos/amis-core', () => ({
  registerAmisRuntimeAdapter: vi.fn(),
  getAmisRuntimeAdapter: vi.fn(() => ({
    navigate: vi.fn(),
    isCurrentUrl: vi.fn(() => false),
    notify: vi.fn(),
    alert: vi.fn(async () => undefined),
    confirm: vi.fn(async () => true),
    getLocale: vi.fn(() => 'en-US'),
    getAuthToken: vi.fn(() => undefined),
    getRefreshToken: vi.fn(() => undefined),
    setAuthToken: vi.fn(),
    clearTokens: vi.fn(),
    refreshAccessToken: vi.fn(async () => {
      throw new Error('Refresh token not available');
    }),
    logout: vi.fn(),
  })),
  transformPageJson: vi.fn(async (s: unknown) => s),
  bindActions: vi.fn(async (s: unknown) => s),
  fetchAmisRequest: vi.fn(async () => ({ status: 200, data: {}, headers: {} })),
  createAmisPageObject: vi.fn(() => ({
    id: 'test-page-id',
    schemaPath: undefined,
    registerAction: vi.fn(),
    getAction: vi.fn(() => undefined),
    resetActions: vi.fn(),
    getComponent: vi.fn(() => undefined),
    getScopedStore: vi.fn(() => undefined),
    getState: vi.fn(() => undefined),
    setState: vi.fn(),
    destroy: vi.fn(),
  })),
}));

function createAdapter(): AmisRuntimeAdapter {
  return {
    getI18n: () => ({ language: 'en', t: (key: string) => key }) as never,
    getLocale: () => 'en-US',
    getCurrentUser: () => null,
    getAuthToken: () => undefined,
    getRefreshToken: () => undefined,
    setAuthToken: () => undefined,
    clearTokens: () => undefined,
    refreshAccessToken: async () => {
      throw new Error('Refresh token not available');
    },
    hasRole: () => false,
    getThemeConfig: () => ({ themeId: 'classic', displayMode: 'light' as const }),
    navigate: () => undefined,
    isCurrentUrl: () => false,
    notify: () => undefined,
    alert: async () => undefined,
    confirm: async () => true,
    logout: () => undefined,
    pageProvider: { getPage: async () => ({}) },
    dictProvider: {
      getDict: async () => ({ status: 200, data: { status: 0, msg: '', data: [] }, headers: {} }),
    },
  };
}

describe('AmisSchemaPage', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.mocked(transformPageJson).mockImplementation(async (s) => s);
    vi.mocked(bindActions).mockImplementation(async (s) => s);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('shows loading view while schema is being transformed', async () => {
    vi.mocked(transformPageJson).mockImplementation(() => new Promise(() => {}));

    const root = ReactDOM.createRoot(container);
    root.render(
      <AmisSchemaPage adapter={createAdapter()} schema={{ type: 'page' }} title="Loading Test" />,
    );

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Loading amis page...');
    });

    root.unmount();
  });

  it('shows error view when transformation fails', async () => {
    vi.mocked(transformPageJson).mockRejectedValue(new Error('Schema transform failed'));

    const root = ReactDOM.createRoot(container);
    root.render(
      <AmisSchemaPage adapter={createAdapter()} schema={{ type: 'page' }} title="Error Test" />,
    );

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Schema transform failed');
    });

    root.unmount();
  });

  it('renders amis when transformation succeeds', async () => {
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(
        <AmisSchemaPage adapter={createAdapter()} schema={{ type: 'page' }} title="Success Test" />,
      );
    });

    expect(container.querySelector('.amis')).toBeTruthy();
    expect(vi.mocked(renderAmis)).toHaveBeenCalled();

    root.unmount();
  });
});
