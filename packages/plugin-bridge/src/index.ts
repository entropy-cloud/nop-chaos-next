import { useSyncExternalStore } from 'react';
import type { ThemeConfig, User, PluginManifest } from '@nop-chaos/shared';
import type { BridgeI18n, BridgeSnapshot, PluginBridge, PluginBridgeNotifications, PluginBridgeNavigateOptions, PluginBridgeStores } from './types';
import { setPluginBridge, getPluginBridge, subscribePluginBridge, getPluginBridgeSnapshot } from './bridge';

export type { BridgeI18n, BridgeSnapshot, PluginBridge, PluginBridgeNotifications, PluginBridgeNavigateOptions, PluginBridgeStores };
export { setPluginBridge, getPluginBridge, subscribePluginBridge, getPluginBridgeSnapshot };

const FALLBACK_THEME_CONFIG: ThemeConfig = { themeId: 'classic', displayMode: 'light' };
const FALLBACK_I18N: BridgeI18n = { language: 'en-US', t: (key: string) => key };

function subscribeBridgeSnapshot(listener: () => void): () => void {
  const unsubscribeBridge = subscribePluginBridge(listener);
  const unsubscribeSnapshot = getPluginBridge()?.subscribe(listener) ?? (() => undefined);

  return () => {
    unsubscribeSnapshot();
    unsubscribeBridge();
  };
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
  return useSyncExternalStore(subscribeBridgeStore, getBridgeI18n, getBridgeI18n);
}

export function usePluginNotifications(): PluginBridgeNotifications {
  return (
    getPluginBridge()?.notifications ?? {
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
    }
  );
}
