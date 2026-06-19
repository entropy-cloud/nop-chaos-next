import { mergeProperty, mergeObjects, isPlainObject, deepClone } from './mergeProperty.js';
import type { OverrideOp } from './mergeProperty.js';
import { resolvePrototypes } from './prototype.js';
import { cleanupXProps } from './cleanup.js';

export interface MergeOptions {
  loader: (path: string) => Promise<unknown>;
  baseDir: string;
}

export function mergeNode(node: unknown, options: MergeOptions): Promise<unknown> {
  return mergeNodeImpl(node, options, new Set());
}

async function mergeNodeImpl(
  node: unknown,
  options: MergeOptions,
  visited: Set<string>,
): Promise<unknown> {
  if (!isPlainObject(node)) return node;

  const obj = node as Record<string, unknown>;
  const extendsVal = obj['x:extends'];

  let base: Record<string, unknown> = {};

  if (typeof extendsVal === 'string') {
    const paths = extendsVal.split(',').map((p) => p.trim());

    for (const relativePath of paths) {
      const resolvedPath = resolvePath(options.baseDir, relativePath);

      if (visited.has(resolvedPath)) {
        throw new Error(`Circular x:extends detected: ${resolvedPath}`);
      }

      visited.add(resolvedPath);
      const loaded = await options.loader(resolvedPath);
      if (loaded == null) {
        throw new Error(`Failed to load x:extends target: ${resolvedPath}`);
      }

      if (!isPlainObject(loaded)) {
        throw new Error(`x:extends target must be an object: ${resolvedPath}`);
      }

      const mergedLoaded = await mergeNodeImpl(
        loaded,
        { ...options, baseDir: dirname(resolvedPath) },
        visited,
      );

      if (isPlainObject(mergedLoaded)) {
        base = mergeObjects(base, mergedLoaded as Record<string, unknown>);
      }
    }
  }

  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(obj)) {
    if (key === 'x:extends') continue;
    if (key === 'x:prototype' || key === 'x:prototype-override') continue;
    if (key.startsWith('x:') && key !== 'x:override') continue;

    const overrideRaw = obj['x:override'];
    const keyOverrideRaw =
      obj[key] && isPlainObject(obj[key])
        ? (obj[key] as Record<string, unknown>)['x:override']
        : undefined;
    const effectiveOp: OverrideOp =
      (keyOverrideRaw as OverrideOp) || (overrideRaw as OverrideOp) || 'merge';

    result[key] = mergeProperty(result[key], obj[key], effectiveOp);
  }

  const withPrototypes = resolvePrototypes(result);
  return cleanupXProps(withPrototypes);
}

function resolvePath(baseDir: string, relativePath: string): string {
  if (relativePath.startsWith('/') || relativePath.match(/^[A-Za-z]:\\/)) {
    return relativePath;
  }
  const separator = baseDir.includes('\\') ? '\\' : '/';
  const base = baseDir.endsWith(separator) ? baseDir.slice(0, -1) : baseDir;
  return base + separator + relativePath.replace(/^\.\//, '');
}

function dirname(filePath: string): string {
  const separator = filePath.includes('\\') ? '\\' : '/';
  const lastIdx = filePath.lastIndexOf(separator);
  if (lastIdx === -1) return '.';
  return filePath.slice(0, lastIdx);
}
