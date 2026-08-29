import * as React from 'react';

/**
 * Subscribe to a single CSS media query. Returns `true` when the query
 * matches, `false` when it does not, and `null` in environments without
 * matchMedia support (SSR / jsdom) so callers can fall back explicitly.
 *
 * Implemented with `useSyncExternalStore` so the value is derived
 * straight from the browser API — no synchronous setState in effects.
 */
export function useBreakpoint(query: string): boolean | null {
  return React.useSyncExternalStore(
    React.useCallback(
      (notify) => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
          return () => {};
        }
        const mql = window.matchMedia(query);
        mql.addEventListener('change', notify);
        return () => mql.removeEventListener('change', notify);
      },
      [query],
    ),
    React.useCallback((): boolean | null => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return null;
      }
      return window.matchMedia(query).matches;
    }, [query]),
    () => null,
  );
}
