import 'systemjs';
import type { ComponentType } from 'react';

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

function getBaseOrigin() {
  return typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
}

function toModuleUrl(path: string) {
  return new URL(path, getBaseOrigin()).href;
}

export function isSystemJsEntry(url: string) {
  return new URL(url, getBaseOrigin()).pathname.endsWith('.system.js');
}

async function importRemoteModule(url: string) {
  if (isSystemJsEntry(url)) {
    const system = getSystem();

    if (!system?.import) {
      throw new Error(`SystemJS is required to load plugin module: ${url}`);
    }

    return system.import<RemoteComponentModule>(url);
  }

  return import(/* @vite-ignore */ url) as Promise<RemoteComponentModule>;
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
  return module.default;
}
