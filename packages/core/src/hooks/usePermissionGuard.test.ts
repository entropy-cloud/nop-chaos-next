import { describe, expect, it } from 'vitest';

function checkPermission(userRoles: string[], requiredRoles?: string[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const allowed = new Set(requiredRoles);
  return userRoles.some((role) => allowed.has(role));
}

describe('usePermissionGuard logic', () => {
  it('returns true when no required roles', () => {
    expect(checkPermission(['admin'])).toBe(true);
    expect(checkPermission([])).toBe(true);
  });

  it('returns true when user has required role', () => {
    expect(checkPermission(['admin', 'user'], ['admin'])).toBe(true);
    expect(checkPermission(['user'], ['user'])).toBe(true);
  });

  it('returns false when user lacks required role', () => {
    expect(checkPermission(['user'], ['admin'])).toBe(false);
    expect(checkPermission([], ['admin'])).toBe(false);
  });

  it('returns true when required roles is empty array', () => {
    expect(checkPermission(['admin'], [])).toBe(true);
  });
});
