import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { toast } from '@nop-chaos/ui';
import { setPluginBridge } from '@nop-chaos/plugin-bridge';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from './router/AppRoutes';
import { getDefaultThemeId } from './config/themeRegistry';
import i18n from './config/i18n';
import { useAuthBootstrap } from './hooks/useAuth';
import { useMenuConfigQuery } from './hooks/useMenuConfig';
import { createBoundStore } from './plugins/boundStore';
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
  const currentPathRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);
  const { isAuthenticated, bootstrapStatus } = useAuthBootstrap();
  const bootstrapPending = bootstrapStatus === 'idle' || bootstrapStatus === 'pending';
  useMenuConfigQuery(isAuthenticated && !bootstrapPending);

  useSystemDisplayMode(themeConfig);

  useLayoutEffect(() => {
    currentPathRef.current = location.pathname;
    navigateRef.current = navigate;
  }, [location.pathname, navigate]);

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
      authStore: createBoundStore({
        getState: useAuthStore.getState,
        subscribe: useAuthStore.subscribe,
      }),
      themeStore: createBoundStore({
        getState: useThemeStore.getState,
        subscribe: useThemeStore.subscribe,
      }),
      pluginStore: createBoundStore({
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
        navigateRef.current(to, options),
      stores: bridgeStores,
      getCurrentUser: () => useAuthStore.getState().user,
      getCurrentPath: () => currentPathRef.current,
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
    [bridgeSnapshot, bridgeStores, pluginThemeConfig],
  );

  useLayoutEffect(() => {
    setPluginBridge(pluginBridge);
  }, [pluginBridge, bridgeSnapshot]);

  return <AppRoutes />;
}
