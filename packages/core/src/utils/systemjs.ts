import 'systemjs'
import type { ComponentType } from 'react'

export interface RemoteComponentModule {
  default: ComponentType
}

interface SystemApi {
  import<T = unknown>(url: string): Promise<T>
  addImportMap(map: { imports: Record<string, string> }): void
  set(name: string, module: unknown): void
}

function getSystem() {
  return (globalThis as typeof globalThis & { System: SystemApi }).System
}

function toModuleUrl(path: string) {
  return new URL(path, globalThis.location.origin).href
}

export function registerSharedModules(sharedModules: Record<string, unknown>, basePath = '/nop-shared/') {
  const system = getSystem()

  for (const [name, moduleRef] of Object.entries(sharedModules)) {
    const modulePath = `${basePath}${name}.js`
    const moduleUrl = toModuleUrl(modulePath)

    system.addImportMap({
      imports: {
        [name]: moduleUrl
      }
    })
    system.set(moduleUrl, moduleRef)
  }
}

export async function loadRemoteComponent(url: string): Promise<ComponentType> {
  const module = await getSystem().import<RemoteComponentModule>(url)
  return module.default
}
