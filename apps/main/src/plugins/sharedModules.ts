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
// Rendering engines: extensions must reuse the host instances — the host flux
// env is wired to the host http adapter/auth, and amis-core's renderer
// registry is a global singleton (a second copy breaks custom renderers).
import * as FluxLib from '@nop-chaos/flux';
import * as AmisLib from 'amis';
import * as AmisCoreLib from 'amis-core';
import * as AmisUiLib from 'amis-ui';
import * as AmisFormulaLib from 'amis-formula';

const SHARED_MODULE_NAMES = SharedLib.SHARED_MODULE_NAMES;

declare global {
  var __NOP_SHARED__: Record<string, unknown> | undefined;
}

const { setAuthConfig: _setAuthConfig, resetAuthConfig: _resetAuthConfig, setRefreshTokenFetcher: _setRefreshTokenFetcher, ...pluginSafeSharedLib } = SharedLib;
const { setI18nGetter: _setI18nGetter, ...pluginSafeUiLib } = UiLib;

/**
 * Module namespace for every name in the canonical `SHARED_MODULE_NAMES`
 * contract. Keys must match the contract exactly; drift is rejected at
 * module initialization so the runtime registration can never disagree with
 * the documented shared-module surface.
 */
const sharedModuleLibs: Record<string, unknown> = {
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
  '@nop-chaos/flux': FluxLib,
  amis: AmisLib,
  'amis-core': AmisCoreLib,
  'amis-ui': AmisUiLib,
  'amis-formula': AmisFormulaLib,
};

const baseSharedModules: Record<string, unknown> = {};

for (const name of SHARED_MODULE_NAMES) {
  const moduleRef = sharedModuleLibs[name];

  if (moduleRef === undefined) {
    throw new Error(
      `Shared module '${name}' is missing from the host registration (contract drift: ` +
        'every name in SHARED_MODULE_NAMES must be provided by the host)',
    );
  }

  baseSharedModules[name] = moduleRef;
}

for (const name of Object.keys(sharedModuleLibs)) {
  if (!SHARED_MODULE_NAMES.includes(name)) {
    throw new Error(
      `Shared module '${name}' is provided by the host but absent from SHARED_MODULE_NAMES ` +
        '(contract drift: remove it from the host or extend the canonical list)',
    );
  }
}

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
