import { useMemo } from 'react';
import type { MenuItem } from '@nop-chaos/shared';
import { flattenMenus } from '@nop-chaos/shared';

export interface RuntimeCapabilities {
  needsAmis: boolean;
  needsFlux: boolean;
}

export function useRuntimeCapabilities(menus: MenuItem[]): RuntimeCapabilities {
  return useMemo(() => {
    const flattened = flattenMenus(menus);

    return {
      needsAmis: flattened.some((item) => item.pageType === 'amis'),
      needsFlux: flattened.some((item) => item.pageType === 'flux'),
    };
  }, [menus]);
}
