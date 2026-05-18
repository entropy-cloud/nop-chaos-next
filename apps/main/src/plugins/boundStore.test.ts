import { describe, expect, it, vi } from 'vitest';
import { createBoundStore } from './boundStore';

describe('createBoundStore', () => {
  it('returns the whole state when called without a selector', () => {
    const state = { user: { id: 'u1' }, isAuthenticated: true };
    const store = createBoundStore({
      getState: () => state,
      subscribe: vi.fn(() => () => undefined),
    });

    expect(store()).toBe(state);
  });

  it('applies selector functions to the current state', () => {
    const state = { user: { id: 'u1' }, isAuthenticated: true };
    const store = createBoundStore({
      getState: () => state,
      subscribe: vi.fn(() => () => undefined),
    });

    expect(store((current) => current.user?.id)).toBe('u1');
    expect(store((current) => current.isAuthenticated)).toBe(true);
  });

  it('preserves getState and subscribe passthroughs', () => {
    const subscribe = vi.fn(() => () => undefined);
    const getState = vi.fn(() => ({ value: 1 }));
    const store = createBoundStore({ getState, subscribe });

    expect(store.getState()).toEqual({ value: 1 });
    expect(store.subscribe).toBe(subscribe);
  });
});
