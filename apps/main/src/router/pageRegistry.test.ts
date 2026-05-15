import { describe, expect, it } from 'vitest';
import { getBuiltinPage, getSystemPage, registerBuiltinPages } from './pageRegistry';

describe('pageRegistry', () => {
  it('resolves builtin page by componentId', () => {
    const page = getBuiltinPage('dashboard');
    expect(page).toBeDefined();
  });

  it('returns undefined for unknown componentId', () => {
    const page = getBuiltinPage('nonexistent-page');
    expect(page).toBeUndefined();
  });

  it('returns undefined for undefined componentId', () => {
    const page = getBuiltinPage(undefined);
    expect(page).toBeUndefined();
  });

  it('resolves contributed builtin pages', () => {
    const FakePage = () => null;
    registerBuiltinPages([{ componentId: 'contributed-page', component: FakePage }]);
    const page = getBuiltinPage('contributed-page');
    expect(page).toBe(FakePage);
  });

  it('resolves system pages', () => {
    const login = getSystemPage('login');
    expect(login).toBeDefined();
  });
});
