import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAmisRuntimeAdapter, createAmisPageObject } from '@nop-chaos/amis-core';
import { createAmisEnv } from './env';

const navigate = vi.fn();
const isCurrentUrl = vi.fn(() => false);
const notifyFn = vi.fn();
const alertFn = vi.fn(async () => undefined);
const confirmFn = vi.fn(async () => true);

function registerTestAdapter() {
  registerAmisRuntimeAdapter({
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
    navigate,
    isCurrentUrl,
    notify: notifyFn,
    alert: alertFn,
    confirm: confirmFn,
    logout: () => undefined,
    pageProvider: { getPage: async () => ({}) },
    dictProvider: {
      getDict: async () => ({ status: 200, data: { status: 0, msg: '', data: [] }, headers: {} }),
    },
  });
}

describe('createAmisEnv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerTestAdapter();
  });

  it('returns env with session matching page.id and _page reference', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    expect(env.session).toBe(page.id);
    expect(env._page).toBe(page);
  });

  it('provides a fetcher function wired with the page', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    expect(typeof env.fetcher).toBe('function');
  });

  it('jumpTo delegates to adapter.navigate', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    env.jumpTo('/target');
    expect(navigate).toHaveBeenCalledWith('/target');
  });

  it('updateLocation delegates with replace option', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    env.updateLocation('/target', true);
    expect(navigate).toHaveBeenCalledWith('/target', { replace: true });
  });

  it('updateLocation defaults replace to false', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    env.updateLocation('/target');
    expect(navigate).toHaveBeenCalledWith('/target', { replace: false });
  });

  it('isCurrentUrl delegates to adapter.isCurrentUrl', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    env.isCurrentUrl('/check');
    expect(isCurrentUrl).toHaveBeenCalledWith('/check');
  });

  it('notify normalizes string messages and delegates', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    env.notify('error', 'test message');
    expect(notifyFn).toHaveBeenCalledWith('error', 'test message');
  });

  it('notify normalizes Error objects to message strings', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    env.notify('error', new Error('boom'));
    expect(notifyFn).toHaveBeenCalledWith('error', 'boom');
  });

  it('notify normalizes unknown values to fallback string', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    env.notify('warning', 42);
    expect(notifyFn).toHaveBeenCalledWith('warning', 'Unknown amis runtime message');
  });

  it('alert delegates to adapter.alert', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    env.alert('message', 'title');
    expect(alertFn).toHaveBeenCalledWith('message', 'title');
  });

  it('confirm delegates to adapter.confirm', () => {
    const page = createAmisPageObject('test://path');
    const env = createAmisEnv(page);
    env.confirm('are you sure?', 'confirm');
    expect(confirmFn).toHaveBeenCalledWith('are you sure?', 'confirm');
  });
});
