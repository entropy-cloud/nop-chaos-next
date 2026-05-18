import { useSyncExternalStore } from 'react';
import type { ThemeConfig, User, PluginManifest } from '@nop-chaos/shared';
import type { BridgeI18n, BridgeSnapshot, PluginBridge, PluginBridgeNotifications, PluginBridgeNavigateOptions, PluginBridgeStores } from './types';
import { getPluginBridge, subscribePluginBridge, getPluginBridgeSnapshot } from './bridge';

export type { BridgeI18n, BridgeSnapshot, PluginBridge, PluginBridgeNotifications, PluginBridgeNavigateOptions, PluginBridgeStores };
export { getPluginBridge, subscribePluginBridge, getPluginBridgeSnapshot };

const FALLBACK_THEME_CONFIG: ThemeConfig = { themeId: 'classic', displayMode: 'light' };
const FALLBACK_I18N: BridgeI18n = { language: 'en-US', t: (key: string) => key };
const FALLBACK_NOTIFICATIONS: PluginBridgeNotifications = {
  success: () => undefined,
  error: () => undefined,
  info: () => undefined,
};
let cachedI18nSource: BridgeI18n | undefined;
let cachedI18nLanguage: string | undefined;
let cachedI18nSupportedLngs: false | readonly string[] | undefined;
let cachedI18nSnapshot: BridgeI18n | undefined;

function subscribeBridgeSnapshot(listener: () => void): () => void {
  return subscribePluginBridge(listener);
}

function subscribeBridgeStore(listener: () => void): () => void {
  return subscribePluginBridge(listener);
}

function getBridgeThemeConfig(): ThemeConfig {
  return getPluginBridge()?.getSnapshot().themeConfig ?? FALLBACK_THEME_CONFIG;
}

function getBridgeUser(): User | null {
  return getPluginBridge()?.getSnapshot().user ?? null;
}

function getBridgeI18n(): BridgeI18n {
  return getPluginBridge()?.getSnapshot().i18n ?? FALLBACK_I18N;
}

function getBridgeI18nSnapshot(): BridgeI18n {
  const i18n = getBridgeI18n();
  const supportedLngs = i18n.options?.supportedLngs;

  if (
    cachedI18nSource === i18n &&
    cachedI18nLanguage === i18n.language &&
    cachedI18nSupportedLngs === supportedLngs &&
    cachedI18nSnapshot
  ) {
    return cachedI18nSnapshot;
  }

  cachedI18nSource = i18n;
  cachedI18nLanguage = i18n.language;
  cachedI18nSupportedLngs = supportedLngs;
  cachedI18nSnapshot = {
    ...i18n,
    language: i18n.language,
    options: i18n.options
      ? {
          ...i18n.options,
          supportedLngs,
        }
      : undefined,
  };

  return cachedI18nSnapshot;
}

export function usePluginBridge(): PluginBridge | undefined {
  return useSyncExternalStore(subscribePluginBridge, getPluginBridge, getPluginBridge);
}

export function usePluginBridgeSnapshot(): BridgeSnapshot {
  return useSyncExternalStore(
    subscribeBridgeSnapshot,
    getPluginBridgeSnapshot,
    getPluginBridgeSnapshot,
  );
}

export function usePluginThemeConfig(): ThemeConfig {
  return useSyncExternalStore(subscribeBridgeStore, getBridgeThemeConfig, getBridgeThemeConfig);
}

export function usePluginUser(): User | null {
  return useSyncExternalStore(subscribeBridgeStore, getBridgeUser, getBridgeUser);
}

export function usePluginManifest(pluginId: string): PluginManifest | undefined {
  const snapshot = useSyncExternalStore(
    subscribeBridgeStore,
    getPluginBridgeSnapshot,
    getPluginBridgeSnapshot,
  );
  return snapshot.plugins.find((plugin) => plugin.id === pluginId);
}

export function usePluginI18n(): BridgeI18n {
  return useSyncExternalStore(subscribeBridgeStore, getBridgeI18nSnapshot, getBridgeI18nSnapshot);
}

export function usePluginNotifications(): PluginBridgeNotifications {
  return useSyncExternalStore(
    subscribeBridgeStore,
    () => getPluginBridge()?.notifications ?? FALLBACK_NOTIFICATIONS,
    () => getPluginBridge()?.notifications ?? FALLBACK_NOTIFICATIONS,
  );
}
