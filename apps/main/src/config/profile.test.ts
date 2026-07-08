// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LoadedExtension } from '@nop-chaos/shared';
import {
  DEFAULT_PROFILE_NAME,
  applyExtensionProfileOverrides,
  getShellProfile,
  resetShellProfile,
  resolveShellProfile,
} from './profile';

function makeLoaded(extension: Partial<LoadedExtension['extension']> & { id: string }): LoadedExtension {
  return {
    source: { id: extension.id, load: async () => ({}) },
    extension: extension as LoadedExtension['extension'],
  };
}

const originalLocation = window.location;

function setLocation(href: string) {
  // happy-dom supports assigning href via window.location
  // but to be safe we replace the entire location with a URL.
  Object.defineProperty(window, 'location', {
    value: new URL(href),
    configurable: true,
    writable: true,
  });
}

describe('shell profile resolution', () => {
  beforeEach(() => {
    resetShellProfile();
    delete (window as unknown as Record<string, unknown>).__NOP_SHELL_PROFILE__;
    delete (window as unknown as Record<string, unknown>).__NOP_SHELL_PROFILE_LOCKED__;
    setLocation('http://localhost/');
  });

  afterEach(() => {
    resetShellProfile();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
  });

  it('defaults to web profile with full chrome', () => {
    const profile = resolveShellProfile();

    expect(profile).toEqual({
      name: DEFAULT_PROFILE_NAME,
      siteId: DEFAULT_PROFILE_NAME,
      chromeMode: 'full',
    });
  });

  it('reads profile name from ?profile= query param', () => {
    setLocation('http://localhost/?profile=mobile');

    const profile = resolveShellProfile();

    expect(profile.name).toBe('mobile');
    expect(profile.siteId).toBe('mobile');
    expect(profile.chromeMode).toBe('chromeless');
  });

  it('reads profile name from window.__NOP_SHELL_PROFILE__', () => {
    (window as unknown as Record<string, unknown>).__NOP_SHELL_PROFILE__ = 'pos';

    const profile = resolveShellProfile();

    expect(profile.name).toBe('pos');
    expect(profile.chromeMode).toBe('chromeless');
  });

  it('URL param overrides window injection', () => {
    (window as unknown as Record<string, unknown>).__NOP_SHELL_PROFILE__ = 'pos';
    setLocation('http://localhost/?profile=kiosk');

    const profile = resolveShellProfile();

    expect(profile.name).toBe('kiosk');
  });

  it('honors window.__NOP_SHELL_PROFILE_LOCKED__ and ignores URL override', () => {
    (window as unknown as Record<string, unknown>).__NOP_SHELL_PROFILE__ = 'pos';
    (window as unknown as Record<string, unknown>).__NOP_SHELL_PROFILE_LOCKED__ = true;
    setLocation('http://localhost/?profile=kiosk');

    const profile = resolveShellProfile();

    expect(profile.name).toBe('pos');
  });

  it('ignores empty/whitespace profile values and falls back', () => {
    setLocation('http://localhost/?profile=  ');

    const profile = resolveShellProfile();

    expect(profile.name).toBe(DEFAULT_PROFILE_NAME);
  });

  it('is immutable after resolution — repeated calls return the same snapshot', () => {
    const first = resolveShellProfile();
    setLocation('http://localhost/?profile=mobile');

    const second = getShellProfile();

    expect(second).toBe(first);
    expect(second.name).toBe(DEFAULT_PROFILE_NAME);
  });

  it('getShellProfile triggers resolution when not yet resolved', () => {
    setLocation('http://localhost/?profile=mobile');

    const profile = getShellProfile();

    expect(profile.name).toBe('mobile');
  });
});

describe('applyExtensionProfileOverrides', () => {
  beforeEach(() => {
    resetShellProfile();
    delete (window as unknown as Record<string, unknown>).__NOP_SHELL_PROFILE__;
    setLocation('http://localhost/?profile=pos');
  });

  afterEach(() => {
    resetShellProfile();
  });

  it('returns false and leaves defaults untouched when no overrides match', () => {
    resolveShellProfile();
    const before = getShellProfile();

    const changed = applyExtensionProfileOverrides([
      makeLoaded({ id: 'a', shell: { profiles: { mobile: { chromeMode: 'full' } } } }),
    ]);

    expect(changed).toBe(false);
    expect(getShellProfile()).toBe(before);
    expect(getShellProfile().chromeMode).toBe('chromeless');
  });

  it('applies matching siteId and chromeMode override', () => {
    resolveShellProfile();

    const changed = applyExtensionProfileOverrides([
      makeLoaded({ id: 'pos-ext', shell: { profiles: { pos: { chromeMode: 'full', siteId: 'pos-terminal' } } } }),
    ]);

    expect(changed).toBe(true);
    const profile = getShellProfile();
    expect(profile.name).toBe('pos');
    expect(profile.siteId).toBe('pos-terminal');
    expect(profile.chromeMode).toBe('full');
  });

  it('later extensions (higher order) win for the same override field', () => {
    resolveShellProfile();

    applyExtensionProfileOverrides([
      makeLoaded({ id: 'first', order: 1, shell: { profiles: { pos: { siteId: 'first-pos' } } } }),
      makeLoaded({ id: 'second', order: 2, shell: { profiles: { pos: { siteId: 'second-pos' } } } }),
    ]);

    expect(getShellProfile().siteId).toBe('second-pos');
  });

  it('partial overrides keep existing derived fields', () => {
    resolveShellProfile();

    applyExtensionProfileOverrides([
      makeLoaded({ id: 'pos-ext', shell: { profiles: { pos: { siteId: 'pos-terminal' } } } }),
    ]);

    const profile = getShellProfile();
    expect(profile.siteId).toBe('pos-terminal');
    expect(profile.chromeMode).toBe('chromeless');
  });

  it('returns false when overrides produce the same values', () => {
    resolveShellProfile();

    applyExtensionProfileOverrides([
      makeLoaded({ id: 'pos-ext', shell: { profiles: { pos: { chromeMode: 'full' } } } }),
    ]);

    const changed = applyExtensionProfileOverrides([
      makeLoaded({ id: 'pos-ext', shell: { profiles: { pos: { chromeMode: 'full' } } } }),
    ]);

    expect(changed).toBe(false);
  });

  it('is a no-op when profile has not been resolved yet', () => {
    resetShellProfile();

    const changed = applyExtensionProfileOverrides([
      makeLoaded({ id: 'pos-ext', shell: { profiles: { pos: { chromeMode: 'full' } } } }),
    ]);

    expect(changed).toBe(false);
  });
});
