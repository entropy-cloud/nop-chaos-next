import type { PluginManifest, ThemeConfig, User } from '@nop-chaos/shared';

export interface BridgeI18n {
  language: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  changeLanguage?: (language: string) => Promise<unknown> | unknown;
  options?: {
    supportedLngs?: false | readonly string[];
  };
  on?: (event: string, listener: () => void) => void;
  off?: (event: string, listener: () => void) => void;
}

export interface BridgeSnapshot {
  i18n: BridgeI18n;
  themeConfig: ThemeConfig;
  user: User | null;
  plugins: PluginManifest[];
}

type BoundStore<T> = {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
};

export interface PluginBridgeStores {
  authStore: BoundStore<{
    user: User | null;
    isAuthenticated: boolean;
    token?: string;
  }>;
  themeStore: BoundStore<{
    themeConfig: ThemeConfig;
  }>;
  pluginStore: BoundStore<{
    plugins: PluginManifest[];
  }>;
}

export interface PluginBridgeNotifications {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export interface PluginBridgeNavigateOptions {
  replace?: boolean;
  state?: unknown;
}

export interface PluginBridge {
  i18n: BridgeI18n;
  notifications: PluginBridgeNotifications;
  stores: PluginBridgeStores;
  navigate: (to: string, options?: PluginBridgeNavigateOptions) => void;
  getCurrentUser: () => User | null;
  getCurrentPath: () => string;
  getThemeConfig: () => ThemeConfig;
  getPluginManifest: (pluginId: string) => PluginManifest | undefined;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => BridgeSnapshot;
}
