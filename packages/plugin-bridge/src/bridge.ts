import type { PluginBridge, BridgeSnapshot } from './types';

const BRIDGE_KEY = '__NOP_PLUGIN_BRIDGE__';
const BRIDGE_LISTENERS_KEY = '__NOP_PLUGIN_BRIDGE_LISTENERS__';
const BRIDGE_UNSUBSCRIBE_KEY = '__NOP_PLUGIN_BRIDGE_UNSUBSCRIBE__';
const FALLBACK_SNAPSHOT: BridgeSnapshot = {
  i18n: { language: 'en-US', t: (key: string) => key },
  themeConfig: { themeId: 'classic', displayMode: 'light' },
  user: null,
  plugins: [],
};

function getHost() {
  return globalThis as typeof globalThis & {
    [BRIDGE_KEY]?: PluginBridge;
    [BRIDGE_LISTENERS_KEY]?: Set<() => void>;
    [BRIDGE_UNSUBSCRIBE_KEY]?: () => void;
  };
}

function getListeners() {
  const host = getHost();
  host[BRIDGE_LISTENERS_KEY] ??= new Set();
  return host[BRIDGE_LISTENERS_KEY];
}

function notifyBridgeListeners() {
  for (const listener of getListeners()) {
    listener();
  }
}

export function setPluginBridge(bridge: PluginBridge) {
  const host = getHost();
  host[BRIDGE_UNSUBSCRIBE_KEY]?.();
  host[BRIDGE_KEY] = bridge;
  host[BRIDGE_UNSUBSCRIBE_KEY] = bridge.subscribe(notifyBridgeListeners);
  notifyBridgeListeners();
}

export function getPluginBridge(): PluginBridge | undefined {
  return getHost()[BRIDGE_KEY];
}

export function subscribePluginBridge(listener: () => void): () => void {
  const listeners = getListeners();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getPluginBridgeSnapshot(): BridgeSnapshot {
  return getPluginBridge()?.getSnapshot() ?? FALLBACK_SNAPSHOT;
}
