type StoreApi<T> = {
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
};

type BoundStore<T> = {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
};

export function createBoundStore<T>(store: StoreApi<T>): BoundStore<T> {
  const bound = (<U>(selector?: (state: T) => U) => {
    const state = store.getState();
    return selector ? selector(state) : state;
  }) as BoundStore<T>;

  bound.getState = store.getState;
  bound.subscribe = store.subscribe;

  return bound;
}
