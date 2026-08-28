import type { ExtensionSource } from '@nop-chaos/shared';
import { isRelativeOrRootPath } from '@nop-chaos/shared';

type ExtensionHost = typeof globalThis & {
  __NOP_EXTENSIONS__?: ExtensionSource[];
};

const NOP_EXTENSION_SCRIPT_SELECTOR = 'script[type="module"][data-nop-extension]';
const NOP_EXTENSION_STYLE_SELECTOR = 'link[rel="stylesheet"][data-nop-extension]';

type ScriptWithNopExtension = HTMLScriptElement & {
  dataset: { nopExtension?: string; nopExtensionId?: string };
};

type LinkWithNopExtension = HTMLLinkElement & {
  dataset: { nopExtension?: string; nopExtensionId?: string };
};

function getConfiguredDemoExtensionSource(): ExtensionSource[] {
  const entry = import.meta.env.VITE_DEMO_EXTENSION_ENTRY;

  if (!entry || !isRelativeOrRootPath(entry)) {
    return [];
  }

  return [
    {
      id: 'demo-shell-extension',
      entry,
    },
  ];
}

function getAliasedDemoExtensionSource(): ExtensionSource[] {
  if (!import.meta.env.VITE_DEMO_EXTENSION_ALIAS_PATH) {
    return [];
  }

  return [
    {
      id: 'demo-shell-extension',
      load: () => import('@demo-extension'),
    },
  ];
}

function isExtensionSource(value: unknown): value is ExtensionSource {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (typeof (value as ExtensionSource).id !== 'string') {
    return false;
  }

  const candidate = value as ExtensionSource & {
    entry?: unknown;
    load?: unknown;
  };

  return (
    typeof candidate.entry === 'string' || typeof candidate.load === 'function'
  );
}

function getWindowExtensionSources(): ExtensionSource[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const runtimeSources = (globalThis as ExtensionHost).__NOP_EXTENSIONS__;

  if (!Array.isArray(runtimeSources)) {
    return [];
  }

  return runtimeSources.filter(isExtensionSource);
}

function normalizeExtensionHref(href: string, base: string): string {
  if (typeof URL === 'undefined') {
    return href;
  }

  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

function collectStyleAssetsFor(
  extensionId: string,
  documentBase: string
): string[] {
  if (typeof document === 'undefined') {
    return [];
  }

  const links = document.querySelectorAll<HTMLLinkElement>(NOP_EXTENSION_STYLE_SELECTOR);
  const collected: string[] = [];

  for (const link of Array.from(links)) {
    const linkEl = link as LinkWithNopExtension;
    if (linkEl.dataset.nopExtensionId !== extensionId) {
      continue;
    }

    if (!linkEl.href) {
      continue;
    }

    collected.push(normalizeExtensionHref(linkEl.href, documentBase));
  }

  return collected;
}

/**
 * Scan the host HTML for `<script type="module" data-nop-extension>` tags emitted
 * by the server-side `IndexHtmlProvider` (Java `nop.web` module). The producer
 * (Java side) renders each enabled extension as a `<link rel="stylesheet"
 * data-nop-extension>` plus a `<script type="module" data-nop-extension
 * data-nop-extension-id="<id>" src="<basePath>/<id>/<entry>">` pair, replacing the
 * `<!--NOP_EXTENSIONS_INJECT-->` marker. The browser has already begun loading
 * these resources at parse time; this scan lets `getExtensionSources()` observe
 * them and route them through the regular `bootstrapExtensions()` pipeline so
 * `ShellExtension` semantics (languages, themes, builtinPages, auth, plugins,
 * userMenuItems, etc.) are applied to the host runtime.
 */
function getDomExtensionSources(): ExtensionSource[] {
  if (typeof document === 'undefined') {
    return [];
  }

  const scripts = document.querySelectorAll<HTMLScriptElement>(NOP_EXTENSION_SCRIPT_SELECTOR);
  const documentBase =
    typeof document.baseURI === 'string' && document.baseURI.length > 0
      ? document.baseURI
      : (typeof location !== 'undefined' ? location.href : '');

  const sourcesById = new Map<string, ExtensionSource>();

  for (const script of Array.from(scripts)) {
    const scriptEl = script as ScriptWithNopExtension;
    const extensionId = scriptEl.dataset.nopExtensionId;
    const entry = scriptEl.src;

    if (!extensionId || !entry) {
      continue;
    }

    const styleAssets = collectStyleAssetsFor(extensionId, documentBase);
    const normalizedEntry = normalizeExtensionHref(entry, documentBase);

    const existing = sourcesById.get(extensionId);
    if (existing) {
      if (!existing['styleAssets'] || existing['styleAssets']!.length === 0) {
        existing['styleAssets'] = styleAssets;
      }
      continue;
    }

    const source: ExtensionSource & { styleAssets?: string[] } = {
      id: extensionId,
      entry: normalizedEntry,
    };

    if (styleAssets.length > 0) {
      source.styleAssets = styleAssets;
    }

    sourcesById.set(extensionId, source);
  }

  return Array.from(sourcesById.values());
}

function getDemoExtensionSources(): ExtensionSource[] {
  const configuredSources = getConfiguredDemoExtensionSource();

  if (configuredSources.length > 0) {
    return configuredSources;
  }

  const aliasedSources = getAliasedDemoExtensionSource();

  if (aliasedSources.length > 0) {
    return aliasedSources;
  }

  if (import.meta.env.VITE_ENABLE_DEMO_EXTENSION !== 'true') {
    return [];
  }

  return [
    {
      id: 'demo-shell-extension',
      entry: './demo/index.ts',
    },
  ];
}

function logSources(label: string, sources: ExtensionSource[]): void {
  if (sources.length === 0) {
    return;
  }

  console.info(
    `[extensions] Found ${sources.length} ${label} extension(s):`,
    sources.map((s) => s.id).join(', '),
  );
}

export function getExtensionSources(): ExtensionSource[] {
  const windowSources = getWindowExtensionSources();
  if (windowSources.length > 0) {
    logSources('runtime (window.__NOP_EXTENSIONS__)', windowSources);
    return windowSources;
  }

  const domSources = getDomExtensionSources();
  if (domSources.length > 0) {
    logSources('runtime (server-injected)', domSources);
    return domSources;
  }

  return getDemoExtensionSources();
}

export const __test = {
  NOP_EXTENSION_SCRIPT_SELECTOR,
  NOP_EXTENSION_STYLE_SELECTOR,
  getWindowExtensionSources,
  getDomExtensionSources,
  isExtensionSource,
};