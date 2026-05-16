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

/** Bridge object injected by the host into each plugin iframe. */
export interface PluginBridge {
  /** Internationalization helpers for the current plugin. */
  i18n: BridgeI18n;
  /** Toast notification helpers. */
  notifications: PluginBridgeNotifications;
  /** Access to host Zustand stores bound to the plugin. */
  stores: PluginBridgeStores;
  /** Navigate to a different route inside the host shell. */
  navigate: (to: string, options?: PluginBridgeNavigateOptions) => void;
  /** Returns the currently authenticated user, or null. */
  getCurrentUser: () => User | null;
  /** Returns the current URL pathname inside the host shell. */
  getCurrentPath: () => string;
  /** Returns the active theme configuration. */
  getThemeConfig: () => ThemeConfig;
  /** Retrieves the manifest for a specific plugin by ID. */
  getPluginManifest: (pluginId: string) => PluginManifest | undefined;
  /** Subscribes a listener that fires on any bridge state change. */
  subscribe: (listener: () => void) => () => void;
  /** Returns a snapshot of the current bridge state. */
  getSnapshot: () => BridgeSnapshot;
}
