import type { AmisSchemaRecord } from '../types';

export type XuiComponentTransform = (
  schema: AmisSchemaRecord,
) => AmisSchemaRecord | Promise<AmisSchemaRecord>;

const componentRegistry = new Map<string, XuiComponentTransform>();

export function registerXuiComponent(type: string, transform: XuiComponentTransform) {
  componentRegistry.set(type, transform);
}

export function unregisterXuiComponent(type: string) {
  componentRegistry.delete(type);
}

export function clearXuiComponentRegistry() {
  componentRegistry.clear();
}

export async function resolveXuiComponent(type: string, schema: AmisSchemaRecord) {
  const transform = componentRegistry.get(type);

  if (!transform) {
    throw new Error(`Unknown xui component: ${type}`);
  }

  return transform(schema);
}
