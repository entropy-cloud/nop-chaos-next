import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from './router/AppRoutes';
import { useAuthBootstrap } from './hooks/useAuth';
import { useMenuConfigQuery } from './hooks/useMenuConfig';
import { registerBaseSharedModules } from './plugins/sharedModules';
import { useThemeStore } from './store/themeStore';
import { useSystemDisplayMode } from './hooks/useSystemDisplayMode';

let didRegisterSharedModules = false;

export default function App() {
  const themeConfig = useThemeStore((state) => state.themeConfig);
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

  useEffect(() => {
    import('./amis/init').then(({ ensureAmisRuntime }) => {
      ensureAmisRuntime().catch(() => {});
    });
  }, []);

  return <AppRoutes />;
}
