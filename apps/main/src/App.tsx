import { useEffect, useLayoutEffect, useMemo } from 'react';
import { toast } from '@nop-chaos/ui';
import { setPluginBridge } from '@nop-chaos/plugin-bridge';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from './router/AppRoutes';
import { getDefaultThemeId } from './config/themeRegistry';
import i18n from './config/i18n';
import { useAuthBootstrap } from './hooks/useAuth';
import { useMenuConfigQuery } from './hooks/useMenuConfig';
import { registerBaseSharedModules } from './plugins/sharedModules';
import { usePluginStore } from './store/pluginStore';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useSystemDisplayMode } from './hooks/useSystemDisplayMode';

let didRegisterSharedModules = false;

export default function App() {
  const themeConfig = useThemeStore((state) => state.themeConfig);
  const plugins = usePluginStore((state) => state.plugins);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, bootstrapStatus } = useAuthBootstrap();
  const bootstrapPending = bootstrapStatus === 'idle' || bootstrapStatus === 'pending';
  useMenuConfigQuery(isAuthenticated && !bootstrapPending);

  useSystemDisplayMode(themeConfig);

  useEffect(() => {
    if (didRegisterSharedModules) {
      return;
    }

    registerBaseSharedModules();
    didRegisterSharedModules = true;
  }, []);

  const pluginThemeConfig = useMemo(
    () => ({
      ...themeConfig,
      themeId: themeConfig.themeId || getDefaultThemeId(),
    }),
    [themeConfig],
  );

  const bridgeStores = useMemo(
    () => ({
      authStore: Object.assign(() => useAuthStore.getState(), {
        getState: useAuthStore.getState,
        subscribe: useAuthStore.subscribe,
      }),
      themeStore: Object.assign(() => useThemeStore.getState(), {
        getState: useThemeStore.getState,
        subscribe: useThemeStore.subscribe,
      }),
      pluginStore: Object.assign(() => usePluginStore.getState(), {
        getState: usePluginStore.getState,
        subscribe: usePluginStore.subscribe,
      }),
    }),
    [],
  );

  const bridgeSnapshot = useMemo(
    () => ({
      i18n,
      themeConfig: pluginThemeConfig,
      user,
      plugins,
    }),
    [pluginThemeConfig, plugins, user],
  );

  const pluginBridge = useMemo(
    () => ({
      i18n,
      notifications: {
        success: (message: string) => toast.success(message),
        error: (message: string) => toast.error(message),
        info: (message: string) => toast(message),
      },
      navigate: (to: string, options?: { replace?: boolean; state?: unknown }) =>
        navigate(to, options),
      stores: bridgeStores,
      getCurrentUser: () => useAuthStore.getState().user,
      getCurrentPath: () => location.pathname,
      getThemeConfig: () => pluginThemeConfig,
      getPluginManifest: (pluginId: string) =>
        usePluginStore.getState().plugins.find((plugin) => plugin.id === pluginId),
      subscribe: (listener: () => void) => {
        const handleLanguageChange = () => listener();
        i18n.on?.('languageChanged', handleLanguageChange);

        const unsubscribeTheme = useThemeStore.subscribe(listener);
        const unsubscribeAuth = useAuthStore.subscribe(listener);
        const unsubscribePlugins = usePluginStore.subscribe(listener);

        return () => {
          i18n.off?.('languageChanged', handleLanguageChange);
          unsubscribeTheme();
          unsubscribeAuth();
          unsubscribePlugins();
        };
      },
      getSnapshot: () => bridgeSnapshot,
    }),
    [bridgeSnapshot, bridgeStores, location.pathname, navigate, pluginThemeConfig],
  );

  useLayoutEffect(() => {
    setPluginBridge(pluginBridge);
  }, [pluginBridge, bridgeSnapshot]);

  return <AppRoutes />;
}
