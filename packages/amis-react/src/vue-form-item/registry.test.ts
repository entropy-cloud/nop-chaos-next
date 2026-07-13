import { afterEach, describe, expect, it } from 'vitest';
import {
  clearVueFormItemComponents,
  getVueFormItemComponent,
  hasVueFormItemComponent,
  registerVueFormItemComponent,
} from './registry';

function makeComponent() {
  return function MockComponent() {
    return null;
  };
}

describe('vue-form-item registry', () => {
  afterEach(() => {
    clearVueFormItemComponents();
  });

  it('registers and resolves a component by name', () => {
    const Comp = makeComponent();

    registerVueFormItemComponent('icon-picker', Comp);

    expect(getVueFormItemComponent('icon-picker')).toBe(Comp);
    expect(hasVueFormItemComponent('icon-picker')).toBe(true);
  });

  it('returns undefined for unknown or empty names', () => {
    registerVueFormItemComponent('icon-picker', makeComponent());

    expect(getVueFormItemComponent('not-registered')).toBeUndefined();
    expect(getVueFormItemComponent(undefined)).toBeUndefined();
    expect(getVueFormItemComponent('')).toBeUndefined();
    expect(hasVueFormItemComponent('not-registered')).toBe(false);
  });

  it('throws when registering with an empty name', () => {
    expect(() => registerVueFormItemComponent('', makeComponent())).toThrow(/name is required/);
    expect(() => registerVueFormItemComponent('   ', makeComponent())).toThrow(/name is required/);
  });

  it('throws when component is not a function', () => {
    expect(() =>
      registerVueFormItemComponent('icon-picker', 'not-a-component' as unknown as () => null),
    ).toThrow(/not a function/);
  });

  it('overwrites a previously registered component', () => {
    const first = makeComponent();
    const second = makeComponent();

    registerVueFormItemComponent('icon-picker', first);
    registerVueFormItemComponent('icon-picker', second);

    expect(getVueFormItemComponent('icon-picker')).toBe(second);
  });

  it('clears all registrations', () => {
    registerVueFormItemComponent('icon-picker', makeComponent());

    clearVueFormItemComponents();

    expect(hasVueFormItemComponent('icon-picker')).toBe(false);
  });
});
