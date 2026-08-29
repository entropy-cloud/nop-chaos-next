/**
 * Canonical list of runtime shared modules the host registers for remote
 * code (plugins / extensions) via SystemJS + import map (see
 * `apps/main/src/plugins/sharedModules.ts`).
 *
 * This list is the single source of truth for:
 * - the host runtime registration (`apps/main/src/plugins/sharedModules.ts`),
 * - the extension SDK tooling contract mirror (`packages/extension-dev`,
 *   parity enforced by test),
 * - documentation of what remote bundles may rely on being provided at
 *   runtime instead of being bundled.
 *
 * Keep the names as bare package specifiers; they become import-map keys.
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
  // Rendering engines — extensions that render flux/amis schemas MUST use
  // the host instances: the host flux env is wired to its http adapter /
  // auth, and amis-core's renderer registry is a global singleton (a second
  // copy breaks custom-renderer registration).
  '@nop-chaos/flux',
  'amis',
  'amis-core',
  'amis-ui',
  'amis-formula',
]);