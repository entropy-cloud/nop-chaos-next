import 'systemjs';
import type { ComponentType } from 'react';
import { getBaseOrigin, resolveSameOriginPath } from '@nop-chaos/shared';

export interface RemoteComponentModule {
  default: ComponentType;
}

interface SystemApi {
  import<T = unknown>(url: string): Promise<T>;
  addImportMap(map: { imports: Record<string, string> }): void;
  set(name: string, module: unknown): void;
}

function getSystem() {
  return (globalThis as typeof globalThis & { System: SystemApi }).System;
}

function toModuleUrl(path: string) {
  return resolveSameOriginPath(path, getBaseOrigin()).href;
}

export function isSystemJsEntry(url: string) {
  return resolveSameOriginPath(url, getBaseOrigin()).pathname.endsWith('.system.js');
}

async function importRemoteModule(url: string) {
  const resolvedUrl = resolveSameOriginPath(url, getBaseOrigin());

  if (isSystemJsEntry(url)) {
    const system = getSystem();

    if (!system?.import) {
      throw new Error(`SystemJS is required to load plugin module: ${url}`);
    }

    return system.import<RemoteComponentModule>(
      `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`,
    );
  }

  return import(/* @vite-ignore */ resolvedUrl.href) as Promise<RemoteComponentModule>;
}

function isRenderableComponent(value: unknown): value is ComponentType {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null && '$$typeof' in value)
  );
}

export function registerSharedModules(
  sharedModules: Record<string, unknown>,
  basePath = '/nop-shared/',
) {
  const system = getSystem();

  for (const [name, moduleRef] of Object.entries(sharedModules)) {
    const modulePath = `${basePath}${name}.js`;
    const moduleUrl = toModuleUrl(modulePath);

    system.addImportMap({
      imports: {
        [name]: moduleUrl,
      },
    });
    system.set(moduleUrl, moduleRef);
  }
}

export async function loadRemoteComponent(url: string): Promise<ComponentType> {
  const module = await importRemoteModule(url);

  if (!isRenderableComponent(module.default)) {
    throw new Error(`Remote module must default export a React component: ${url}`);
  }

  return module.default;
}
