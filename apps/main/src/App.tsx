import { useEffect, useMemo } from 'react';
import { toast } from '@nop-chaos/ui';
import { setPluginBridge } from '@nop-chaos/plugin-bridge';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from './router/app-routes';
import { getDefaultThemeId } from './config/theme-registry';
import i18n from './config/i18n';
import { useAuthBootstrap } from './hooks/use-auth';
import { useMenuConfigQuery } from './hooks/use-menu-config';
import { useRuntimeCapabilities } from './hooks/use-runtime-capabilities';
import { registerBaseSharedModules } from './plugins/shared-modules';
import { usePluginStore } from './store/plugin-store';
import { useAuthStore } from './store/auth-store';
import { useThemeStore } from './store/theme-store';
import { applyThemeToDocument } from './utils/theme-css';

let didRegisterSharedModules = false;

export default function App() {
  const themeConfig = useThemeStore((state) => state.themeConfig);
  const plugins = usePluginStore((state) => state.plugins);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, bootstrapStatus } = useAuthBootstrap();
  const bootstrapPending = bootstrapStatus === 'idle' || bootstrapStatus === 'pending';
  const menuQuery = useMenuConfigQuery(isAuthenticated && !bootstrapPending);
  const capabilities = useRuntimeCapabilities(menuQuery.data?.items ?? []);

  useEffect(() => {
    applyThemeToDocument(themeConfig);
  }, [themeConfig]);

  useEffect(() => {
    if (didRegisterSharedModules) {
      return;
    }

    registerBaseSharedModules();
    didRegisterSharedModules = true;
  }, []);

  useEffect(() => {
    if (capabilities.needsAmis && didRegisterSharedModules) {
      import('./amis/init').catch(() => {});
    }
  }, [capabilities.needsAmis]);

  const pluginThemeConfig = useMemo(
    () => ({
      ...themeConfig,
      themeId: themeConfig.themeId || getDefaultThemeId(),
    }),
    [themeConfig],
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
      stores: {
        authStore: useAuthStore,
        themeStore: useThemeStore,
        pluginStore: usePluginStore,
      },
      getCurrentUser: () => user,
      getCurrentPath: () => location.pathname,
      getThemeConfig: () => pluginThemeConfig,
      getPluginManifest: (pluginId: string) => plugins.find((plugin) => plugin.id === pluginId),
      subscribe: (listener: () => void) => {
        const handleLanguageChange = () => listener();
        i18n.on('languageChanged', handleLanguageChange);

        const unsubscribeTheme = useThemeStore.subscribe(listener);
        const unsubscribeAuth = useAuthStore.subscribe(listener);
        const unsubscribePlugins = usePluginStore.subscribe(listener);

        return () => {
          i18n.off('languageChanged', handleLanguageChange);
          unsubscribeTheme();
          unsubscribeAuth();
          unsubscribePlugins();
        };
      },
      getSnapshot: () => bridgeSnapshot,
    }),
    [bridgeSnapshot, location.pathname, navigate, pluginThemeConfig, plugins, user],
  );

  useEffect(() => {
    setPluginBridge(pluginBridge);
  }, [pluginBridge]);

  return <AppRoutes />;
}
