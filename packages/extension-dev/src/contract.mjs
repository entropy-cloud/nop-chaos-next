/**
 * Mirror of the host/extension runtime contract used by tooling that runs in
 * plain Node (which cannot import the TypeScript sources of
 * `@nop-chaos/shared`).
 *
 * The authoritative definitions live in `packages/shared/src/version.ts`
 * (`HOST_API_VERSION`) and `packages/shared/src/plugins/sharedModuleNames.ts`
 * (`SHARED_MODULE_NAMES`). Parity between these mirrors and the authorities is
 * enforced by `src/contract.test.mjs` (runs through the Vitest/Vite pipeline,
 * which can import `@nop-chaos/shared`).
 *
 * When bumping the contract, update BOTH this file and the shared sources.
 */

/**
 * Host API contract version (see `packages/shared/src/version.ts`).
 */
export const HOST_API_VERSION = '0.2.0';

/**
 * Canonical runtime shared-module names the host registers for remote code.
 */
export const SHARED_MODULE_NAMES = Object.freeze([
  'react',
  'react-dom',
  'react/jsx-dev-runtime',
  'react/jsx-runtime',
  'react-router-dom',
  'zustand',
  '@tanstack/react-query',
  '@nop-chaos/plugin-bridge',
  '@nop-chaos/shared',
  '@nop-chaos/ui',
  'i18next',
  'react-i18next',
  'lucide-react',
  'sonner',
  // Rendering engines shared from the host (see sharedModuleNames.ts).
  '@nop-chaos/flux',
  'amis',
  'amis-core',
  'amis-ui',
  'amis-formula',
]);

/**
 * Window global that accepts `ExtensionSource[]` before host bootstrap.
 * The built host checks this first (see `apps/main/src/extensions/config.ts`).
 */
export const EXTENSION_SOURCES_GLOBAL = '__NOP_EXTENSIONS__';

/**
 * Window global the built host exposes with its API version
 * (see `apps/main/src/extensions/bootstrap.ts`).
 */
export const HOST_API_VERSION_GLOBAL = '__NOP_HOST_API_VERSION__';

/**
 * Window global holding the host shared-module registry
 * (see `apps/main/src/plugins/sharedModules.ts`).
 */
export const NOP_SHARED_REGISTRY_GLOBAL = '__NOP_SHARED__';