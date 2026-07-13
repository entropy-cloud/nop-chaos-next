import type { ComponentType } from 'react';

export interface VueFormItemComponentProps {
  value?: unknown;
  onValueChange?: (value: unknown) => void;
}

export type VueFormItemComponent = ComponentType<VueFormItemComponentProps>;

const componentRegistry = new Map<string, VueFormItemComponent>();

export function registerVueFormItemComponent(
  name: string,
  component: VueFormItemComponent,
): void {
  if (!name || !name.trim()) {
    throw new Error('registerVueFormItemComponent: name is required');
  }

  if (typeof component !== 'function') {
    throw new Error(`registerVueFormItemComponent: component for "${name}" is not a function`);
  }

  componentRegistry.set(name, component);
}

export function getVueFormItemComponent(
  name: string | undefined,
): VueFormItemComponent | undefined {
  if (!name) {
    return undefined;
  }

  return componentRegistry.get(name);
}

export function hasVueFormItemComponent(name: string): boolean {
  return Boolean(name) && componentRegistry.has(name);
}

export function clearVueFormItemComponents(): void {
  componentRegistry.clear();
}
