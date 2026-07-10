import type { LoadedExtension, ShellChromeMode, ShellProfileOverride } from '@nop-chaos/shared';

/**
 * Shell profile resolution (see docs/design/shell-profiles.md).
 *
 * A profile is a string identifier (e.g. "web", "mobile", "pos") that selects both
 * the menu source (`siteId` passed to `SiteMapApi__getSiteMap`) and the shell chrome
 * mode (`full` / `chromeless`). The profile name is resolved once during bootstrap,
 * before extensions are loaded, and is immutable for the rest of the session.
 *
 * Default derivation:
 *   name        -> from URL `?profile=` > `window.__NOP_SHELL_PROFILE__` > "web"
 *   siteId      -> equals `name`
 *   chromeMode  -> "full" when name === "web", otherwise "chromeless"
 *
 * Extensions can override `siteId` / `chromeMode` for a given profile name via
 * `ExtensionShellConfig.profiles` (see `applyExtensionProfileOverrides`).
 */

export const DEFAULT_PROFILE_NAME = 'main';
const PROFILE_QUERY_PARAM = 'profile';
const WINDOW_PROFILE_KEY = '__NOP_SHELL_PROFILE__';
const WINDOW_PROFILE_LOCKED_KEY = '__NOP_SHELL_PROFILE_LOCKED__';

declare global {
  interface Window {
    [WINDOW_PROFILE_KEY]?: string;
    [WINDOW_PROFILE_LOCKED_KEY]?: boolean;
  }
}

export interface ShellProfile {
  /** Profile name, e.g. "web", "mobile". */
  name: string;
  /** siteId passed to the backend `SiteMapApi__getSiteMap`. Defaults to `name`. */
  siteId: string;
  /** Shell chrome mode controlling which shell chrome elements are rendered. */
  chromeMode: ShellChromeMode;
}

let currentProfile: ShellProfile | null = null;

function readUrlProfile(): string | null {
  if (typeof window === 'undefined' || !window.location?.href) {
    return null;
  }

  try {
    const params = new URL(window.location.href).searchParams.get(PROFILE_QUERY_PARAM);
    return params && params.trim() ? params : null;
  } catch {
    return null;
  }
}

function readWindowProfile(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const injected = window[WINDOW_PROFILE_KEY];
  return typeof injected === 'string' && injected.trim() ? injected : null;
}

function isWindowProfileLocked(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window[WINDOW_PROFILE_LOCKED_KEY] === true;
}

/**
 * Resolve the profile name from sources in priority order:
 *   1. URL `?profile=` (dev / debug override) — ignored when the deployment locks
 *      the profile via `window.__NOP_SHELL_PROFILE_LOCKED__ = true`.
 *   2. `window.__NOP_SHELL_PROFILE__` (server-side HTML injection).
 *   3. default `"web"`.
 */
function resolveProfileName(): string {
  if (!isWindowProfileLocked()) {
    const urlProfile = readUrlProfile();
    if (urlProfile) {
      return urlProfile;
    }
  }

  const windowProfile = readWindowProfile();
  if (windowProfile) {
    return windowProfile;
  }

  return DEFAULT_PROFILE_NAME;
}

function deriveDefaultProfile(name: string): ShellProfile {
  return {
    name,
    siteId: name,
    chromeMode: name === DEFAULT_PROFILE_NAME ? 'full' : 'chromeless',
  };
}

/**
 * Resolve the shell profile during bootstrap. Must be called before
 * `fetchMenuConfig()`, extension bootstrap, and `AppShell` first render.
 * Subsequent calls return the cached profile unchanged.
 */
export function resolveShellProfile(): ShellProfile {
  if (currentProfile) {
    return currentProfile;
  }

  currentProfile = deriveDefaultProfile(resolveProfileName());
  return currentProfile;
}

/**
 * Read the resolved profile. If `resolveShellProfile()` has not been called yet,
 * it will be called implicitly.
 */
export function getShellProfile(): ShellProfile {
  if (!currentProfile) {
    return resolveShellProfile();
  }

  return currentProfile;
}

/**
 * Apply extension-provided overrides for the active profile name. Extensions are
 * processed in `order` ascending; later extensions win. Only `siteId` and
 * `chromeMode` may be overridden — the profile `name` is immutable.
 *
 * Returns `true` when the cached profile was replaced.
 */
export function applyExtensionProfileOverrides(extensions: LoadedExtension[]): boolean {
  if (!currentProfile) {
    return false;
  }

  const sorted = [...extensions].sort(
    (left, right) => (left.extension.order ?? 0) - (right.extension.order ?? 0),
  );

  let override: ShellProfileOverride | undefined;

  for (const { extension } of sorted) {
    const profiles = extension.shell?.profiles;
    if (!profiles) {
      continue;
    }

    const match = profiles[currentProfile.name];
    if (!match) {
      continue;
    }

    override = {
      siteId: match.siteId ?? override?.siteId,
      chromeMode: match.chromeMode ?? override?.chromeMode,
    };
  }

  if (!override) {
    return false;
  }

  const nextSiteId = override.siteId ?? currentProfile.siteId;
  const nextChromeMode = override.chromeMode ?? currentProfile.chromeMode;

  if (nextSiteId === currentProfile.siteId && nextChromeMode === currentProfile.chromeMode) {
    return false;
  }

  currentProfile = {
    name: currentProfile.name,
    siteId: nextSiteId,
    chromeMode: nextChromeMode,
  };

  return true;
}

/** Reset the cached profile. Intended for tests only. */
export function resetShellProfile(): void {
  currentProfile = null;
}
