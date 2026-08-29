import * as React from 'react';

function hasMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/**
 * Subscribe to multiple CSS media queries at once. Returns one result per
 * query: `true` = matching, `false` = not matching, `null` = environment
 * without matchMedia support (SSR / jsdom).
 *
 * Implemented with `useSyncExternalStore` so each value is derived
 * straight from the browser API — no synchronous setState in effects.
 */
export function useBreakpoints(queries: string[]): Array<boolean | null> {
  const queriesKey = queries.join('|||');

  return React.useSyncExternalStore(
    React.useCallback(
      (notify) => {
        if (!hasMatchMedia()) {
          return () => {};
        }
        const qs = queriesKey ? queriesKey.split('|||') : [];
        const mqls = qs.map((query) => window.matchMedia(query));
        mqls.forEach((mql) => mql.addEventListener('change', notify));
        return () => mqls.forEach((mql) => mql.removeEventListener('change', notify));
      },
      [queriesKey],
    ),
    React.useCallback((): Array<boolean | null> => {
      if (!hasMatchMedia()) {
        return queries.map(() => null);
      }
      return queries.map((query) => window.matchMedia(query).matches);
    }, [queries]),
    () => queries.map(() => null),
  );
}
