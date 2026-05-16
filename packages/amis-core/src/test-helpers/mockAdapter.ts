import type { AmisRuntimeAdapter } from '../types';

export function createMockAdapter(overrides: Partial<AmisRuntimeAdapter> = {}): AmisRuntimeAdapter {
  return {
    getI18n: () => ({}) as never,
    getLocale: () => 'en-US',
    getCurrentUser: () => null,
    getAuthToken: () => undefined,
    setAuthToken: () => undefined,
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
    ...overrides,
  };
}
