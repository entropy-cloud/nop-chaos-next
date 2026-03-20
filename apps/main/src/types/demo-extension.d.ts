declare module '@demo-extension' {
  import type { ShellExtension } from '@nop-chaos/shared'

  const defaultExtension: ShellExtension

  export const extension: ShellExtension
  export function getExtension(): ShellExtension | Promise<ShellExtension>

  export default defaultExtension
}
