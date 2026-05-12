import { getAmisRuntimeAdapter } from '../adapter';
import type { AmisAction, AmisPageObject, AmisSchemaRecord } from '../types';
import { splitPrefixUrl } from '../core/url';

interface ImportedScope {
  standalone: boolean;
  libs: Record<string, Record<string, unknown>>;
}

function isRecord(value: unknown): value is AmisSchemaRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbsoluteHttpUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function getBaseOrigin() {
  return typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
}

function resolveModuleUrl(modulePath: string, schemaPath?: string) {
  if (isAbsoluteHttpUrl(modulePath)) {
    return modulePath;
  }

  if (modulePath.startsWith('/')) {
    return new URL(modulePath, getBaseOrigin()).href;
  }

  if (schemaPath && (isAbsoluteHttpUrl(schemaPath) || !splitPrefixUrl(schemaPath))) {
    const baseUrl = isAbsoluteHttpUrl(schemaPath)
      ? schemaPath
      : new URL(schemaPath, getBaseOrigin()).href;
    return new URL(modulePath, baseUrl).href;
  }

  return new URL(modulePath, getBaseOrigin()).href;
}

function getPathName(path: string) {
  const normalizedPath = path.split('?')[0];
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  const fileName = lastSlashIndex >= 0 ? normalizedPath.slice(lastSlashIndex + 1) : normalizedPath;
  const extensionIndex = fileName.indexOf('.');

  return extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
}

function normalizeImportMap(modulePaths: unknown) {
  if (typeof modulePaths === 'string') {
    return modulePaths.split(',').reduce<Record<string, string>>((accumulator, path) => {
      const trimmedPath = path.trim();

      if (!trimmedPath) {
        return accumulator;
      }

      accumulator[getPathName(trimmedPath)] = trimmedPath;
      return accumulator;
    }, {});
  }

  if (isRecord(modulePaths)) {
    return Object.entries(modulePaths).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        if (typeof value === 'string' && value.trim()) {
          accumulator[key] = value.trim();
        }

        return accumulator;
      },
      {},
    );
  }

  return {};
}

async function importRuntimeModule(moduleUrl: string) {
  const runtime = globalThis as typeof globalThis & {
    System?: {
      import<T = unknown>(url: string): Promise<T>;
    };
  };

  const resolvedUrl = new URL(moduleUrl, getBaseOrigin());
  const useSystemImport = resolvedUrl.pathname.endsWith('.system.js');

  if (useSystemImport && runtime.System?.import) {
    return runtime.System.import<Record<string, unknown>>(moduleUrl);
  }

  return import(/* @vite-ignore */ moduleUrl) as Promise<Record<string, unknown>>;
}

async function createImportedScope(
  modulePaths: unknown,
  standalone: boolean,
  page: AmisPageObject,
): Promise<ImportedScope> {
  const importMap = normalizeImportMap(modulePaths);
  const libs: ImportedScope['libs'] = {};

  await Promise.all(
    Object.entries(importMap).map(async ([moduleName, modulePath]) => {
      const moduleUrl = resolveModuleUrl(modulePath, page.schemaPath);
      libs[moduleName] = await importRuntimeModule(moduleUrl);
    }),
  );

  return {
    standalone,
    libs,
  };
}

function resolveImportedAction(actionName: string, scopes: ImportedScope[], page: AmisPageObject) {
  const separatorIndex = actionName.indexOf('.');

  if (separatorIndex < 0) {
    return page.getAction(actionName);
  }

  const libName = actionName.slice(0, separatorIndex);
  const methodName = actionName.slice(separatorIndex + 1);

  for (let index = scopes.length - 1; index >= 0; index -= 1) {
    const scope = scopes[index];
    const lib = scope.libs[libName];
    const method = lib?.[methodName];

    if (typeof method === 'function') {
      return method as AmisAction;
    }

    if (scope.standalone) {
      break;
    }
  }

  return page.getAction(actionName);
}

function wrapFunction(action: AmisAction, source: string) {
  const wrapped = (...args: unknown[]) => action(...args);
  (wrapped as typeof wrapped & { toJSON: () => string }).toJSON = () => source;
  return wrapped as AmisAction;
}

function registerScopedAction(page: AmisPageObject, actionName: string, action: AmisAction) {
  for (let index = 0; index < 1000; index += 1) {
    const candidateName = index === 0 ? actionName : `${actionName}-${index}`;
    const existingAction = page.getAction(candidateName);

    if (!existingAction) {
      page.registerAction(candidateName, action);
      return candidateName;
    }

    if (existingAction === action) {
      return candidateName;
    }
  }

  throw new Error(`Amis action name conflict: ${actionName}`);
}

function processActionString(value: string, page: AmisPageObject, scopes: ImportedScope[]) {
  const adapter = getAmisRuntimeAdapter();
  const prefixedUrl = splitPrefixUrl(value);

  if (prefixedUrl) {
    const [type, path] = prefixedUrl;

    if (
      type === 'query' ||
      type === 'mutation' ||
      type === 'subscription' ||
      type === 'graphql' ||
      type === 'dict' ||
      type === 'page'
    ) {
      return `${type}://${path}`;
    }
  }

  if (value.startsWith('@action:')) {
    const actionName = value.slice('@action:'.length).trim();
    const lookupName = actionName.split('-')[0];
    const action =
      resolveImportedAction(lookupName, scopes, page) ?? adapter.resolveAction?.(lookupName, page);

    if (!action) {
      throw new Error(`Unknown amis action: ${lookupName}`);
    }

    return `action://${registerScopedAction(page, lookupName, action)}`;
  }

  if (value.startsWith('@fn:')) {
    const source = value.slice('@fn:'.length).trim();

    if (!adapter.compileFunction) {
      throw new Error('Amis runtime adapter does not support @fn compilation');
    }

    return wrapFunction(adapter.compileFunction(source, page), value);
  }

  return value;
}

async function bindValue(
  value: unknown,
  page: AmisPageObject,
  scopes: ImportedScope[],
): Promise<unknown> {
  if (typeof value === 'string') {
    return processActionString(value, page, scopes);
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => bindValue(item, page, scopes)));
  }

  if (!isRecord(value)) {
    return value;
  }

  const activeScopes =
    'xui:import' in value
      ? [
          ...scopes,
          await createImportedScope(value['xui:import'], Boolean(value['xui:standalone']), page),
        ]
      : scopes;

  const nextValue: AmisSchemaRecord = {};

  for (const [key, childValue] of Object.entries(value)) {
    nextValue[key] = await bindValue(childValue, page, activeScopes);
  }

  return nextValue;
}

export async function bindActions(schema: unknown, page: AmisPageObject) {
  page.resetActions();
  return bindValue(schema, page, []);
}
