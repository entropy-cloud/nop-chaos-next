/**
 * Ambient type declaration for the host-shell plugin (plain JS module).
 */
declare module '*extension-host-shell-plugin.mjs' {
  import type { PluginOption } from 'vite';
  export function hostShellPlugin(options?: { entry?: string }): PluginOption[];
}