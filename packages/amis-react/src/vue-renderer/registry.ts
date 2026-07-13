import type { ComponentType } from 'react';

export type VueRenderComponent = ComponentType<Record<string, unknown>>;

const componentRegistry = new Map<string, VueRenderComponent>();

export function registerVueRenderComponent(
  name: string,
  component: VueRenderComponent,
): void {
  if (!name || !name.trim()) {
    throw new Error('registerVueRenderComponent: name is required');
  }

  if (typeof component !== 'function') {
    throw new Error(`registerVueRenderComponent: component for "${name}" is not a function`);
  }

  componentRegistry.set(name, component);
}

export function getVueRenderComponent(
  name: string | undefined,
): VueRenderComponent | undefined {
  if (!name) {
    return undefined;
  }

  return componentRegistry.get(name);
}

export function clearVueRenderComponents(): void {
  componentRegistry.clear();
}
