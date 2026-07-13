import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerVueRenderComponent,
  getVueRenderComponent,
  clearVueRenderComponents,
} from './registry';

describe('VueRenderComponent registry', () => {
  beforeEach(() => {
    clearVueRenderComponents();
  });

  it('stores and returns a registered component', () => {
    const Comp = () => null;

    registerVueRenderComponent('test', Comp);

    expect(getVueRenderComponent('test')).toBe(Comp);
  });

  it('resolves a component by name', () => {
    const Comp = () => null;

    registerVueRenderComponent('my-component', Comp);

    expect(getVueRenderComponent('my-component')).toBe(Comp);
  });

  it('returns undefined for an unregistered name', () => {
    expect(getVueRenderComponent('non-existent')).toBeUndefined();
  });

  it('returns undefined for empty or undefined name', () => {
    expect(getVueRenderComponent('')).toBeUndefined();
    expect(getVueRenderComponent(undefined)).toBeUndefined();
  });

  it('throws when registering an empty name', () => {
    expect(() => registerVueRenderComponent('', () => null)).toThrow('name is required');
  });

  it('throws when registering a non-function', () => {
    expect(() =>
      registerVueRenderComponent('bad', 'not-a-function' as unknown as React.ComponentType),
    ).toThrow('not a function');
  });

  it('overwrites an existing registration silently', () => {
    const CompA = () => null;
    const CompB = () => null;

    registerVueRenderComponent('overwrite', CompA);
    registerVueRenderComponent('overwrite', CompB);

    expect(getVueRenderComponent('overwrite')).toBe(CompB);
  });

  it('clears all registrations', () => {
    registerVueRenderComponent('a', () => null);
    registerVueRenderComponent('b', () => null);

    clearVueRenderComponents();

    expect(getVueRenderComponent('a')).toBeUndefined();
    expect(getVueRenderComponent('b')).toBeUndefined();
  });
});
