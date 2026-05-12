import { useMemo } from 'react';

export function usePermissionGuard(userRoles: string[], requiredRoles?: string[]): boolean {
  return useMemo(() => {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const allowed = new Set(requiredRoles);
    return userRoles.some((role) => allowed.has(role));
  }, [requiredRoles, userRoles]);
}
