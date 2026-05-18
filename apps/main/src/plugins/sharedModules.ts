import * as ReactLib from 'react';
// eslint-disable-next-line no-restricted-imports -- intentional: full module re-exported for plugin system module federation
import * as ReactDOMLib from 'react-dom';
import * as ReactJsxDevRuntimeLib from 'react/jsx-dev-runtime';
import * as ReactJsxRuntimeLib from 'react/jsx-runtime';
import * as ReactQueryLib from '@tanstack/react-query';
import * as ReactRouterDomLib from 'react-router-dom';
import * as ZustandLib from 'zustand';
import * as I18NextLib from 'i18next';
import * as ReactI18NextLib from 'react-i18next';
import * as LucideReactLib from 'lucide-react';
import * as SonnerLib from 'sonner';
import * as SharedLib from '@nop-chaos/shared';
import * as PluginBridgeLib from '@nop-chaos/plugin-bridge';
import { registerSharedModules } from '@nop-chaos/core';
import * as UiLib from '@nop-chaos/ui';

declare global {
  var __NOP_SHARED__: Record<string, unknown> | undefined;
}

const { setAuthConfig: _setAuthConfig, resetAuthConfig: _resetAuthConfig, setRefreshTokenFetcher: _setRefreshTokenFetcher, ...pluginSafeSharedLib } = SharedLib;
const { setI18nGetter: _setI18nGetter, ...pluginSafeUiLib } = UiLib;

const baseSharedModules = {
  react: ReactLib,
  'react-dom': ReactDOMLib,
  'react/jsx-dev-runtime': ReactJsxDevRuntimeLib,
  'react/jsx-runtime': ReactJsxRuntimeLib,
  'react-router-dom': ReactRouterDomLib,
  zustand: ZustandLib,
  '@tanstack/react-query': ReactQueryLib,
  '@nop-chaos/plugin-bridge': PluginBridgeLib,
  '@nop-chaos/shared': pluginSafeSharedLib,
  '@nop-chaos/ui': pluginSafeUiLib,
  i18next: I18NextLib,
  'react-i18next': ReactI18NextLib,
  'lucide-react': LucideReactLib,
  sonner: SonnerLib,
};

let didRegisterBaseModules = false;
let didRegisterPluginExtraModules = false;
let pluginExtraModulesPromise: Promise<void> | null = null;
let pluginExtraModulesLoader: () => Promise<typeof import('recharts')> = () => import('recharts');

export function registerHostSharedModules() {
  globalThis.__NOP_SHARED__ = {
    ...(globalThis.__NOP_SHARED__ ?? {}),
    ...baseSharedModules,
  };
}

export function registerBaseSharedModules() {
  registerHostSharedModules();

  if (didRegisterBaseModules) {
    return;
  }

  registerSharedModules(baseSharedModules);
  didRegisterBaseModules = true;
}

export function resetSharedModulesForTests() {
  didRegisterBaseModules = false;
  didRegisterPluginExtraModules = false;
  pluginExtraModulesPromise = null;
  pluginExtraModulesLoader = () => import('recharts');
  delete globalThis.__NOP_SHARED__;
}

export function setPluginExtraModulesLoaderForTests(
  loader: () => Promise<typeof import('recharts')>,
) {
  pluginExtraModulesLoader = loader;
}

async function ensurePluginExtraSharedModules() {
  if (didRegisterPluginExtraModules) {
    return;
  }

  if (!pluginExtraModulesPromise) {
    pluginExtraModulesPromise = pluginExtraModulesLoader()
      .then((rechartsModule) => {
        const pluginExtraSharedModules = {
          recharts: rechartsModule,
        };

        globalThis.__NOP_SHARED__ = {
          ...(globalThis.__NOP_SHARED__ ?? {}),
          ...pluginExtraSharedModules,
        };
        registerSharedModules(pluginExtraSharedModules);
        didRegisterPluginExtraModules = true;
      })
      .catch((error: unknown) => {
        pluginExtraModulesPromise = null;
        throw error;
      });
  }

  await pluginExtraModulesPromise;
}

export async function ensurePluginSharedModules(): Promise<void> {
  registerBaseSharedModules();
  await ensurePluginExtraSharedModules();
}
