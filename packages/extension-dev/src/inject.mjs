/**
 * HTML injection helpers for the runtime extension-source contract.
 *
 * The built host reads `window.__NOP_EXTENSIONS__` (an array of
 * `ExtensionSource`) before its own bootstrap executes. Because the host
 * entry is a `<script type="module">` (which is deferred), any inline classic
 * script earlier in the document runs first — so injecting right after
 * `<head>` guarantees the sources are registered in time, without touching
 * host source code.
 */

import { EXTENSION_SOURCES_GLOBAL } from './contract.mjs';

/**
 * @typedef {Object} InjectedExtension
 * @property {string} id - Extension id (displayed in host logs).
 * @property {string} url - Absolute http(s) URL of the extension ESM entry
 *   (dev server or static asset server). Loaded via page-context dynamic
 *   `import()`, so the server must send CORS headers (Vite dev does by
 *   default; `nop-extension-dev serve` does too).
 */

/** @type {Set<string>} */
const seenIds = new Set();

/**
 * Build the inline `<script>` that registers extension sources on
 * `window.__NOP_EXTENSIONS__` before host bootstrap.
 *
 * @param {InjectedExtension[]} extensions
 * @returns {string} The full `<script>...</script>` fragment.
 */
export function buildExtensionInjectionScript(extensions) {
  if (!Array.isArray(extensions) || extensions.length === 0) {
    throw new TypeError('buildExtensionInjectionScript: at least one extension is required');
  }

  const entries = [];

  seenIds.clear();

  for (const ext of extensions) {
    if (typeof ext.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(ext.id)) {
      throw new TypeError(
        `buildExtensionInjectionScript: invalid extension id '${String(ext.id)}' ` +
          '(must match /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/)',
      );
    }

    if (seenIds.has(ext.id)) {
      throw new TypeError(`buildExtensionInjectionScript: duplicate extension id '${ext.id}'`);
    }
    seenIds.add(ext.id);

    if (typeof ext.url !== 'string' || !/^https?:\/\//.test(ext.url)) {
      throw new TypeError(
        `buildExtensionInjectionScript: extension '${ext.id}' requires an absolute http(s) url`,
      );
    }

    // JSON.stringify stays valid inside a JS string literal and escapes
    // quotes/backslashes safely for URLs.
    const jsonUrl = JSON.stringify(ext.url);
    const loadFn = ext.url.endsWith('.system.js')
      ? // SystemJS bundles must resolve through the host import map so they
        // share the host's react/ui instances (duplicate-React breaks rendering).
        `function () { var s = typeof globalThis.System !== 'undefined' ? globalThis.System : undefined; return s && typeof s.import === 'function' ? s.import(${jsonUrl}) : import(${jsonUrl}); }`
      : `function () { return import(${jsonUrl}); }`;

    entries.push(`    { id: ${JSON.stringify(ext.id)}, load: ${loadFn} }`);
  }

  return [
    '<script>',
    '  // Injected by @nop-chaos/extension-dev — runtime extension sources. Do not edit.',
    '  (function () {',
    `    if (window.${EXTENSION_SOURCES_GLOBAL} !== undefined) { return; }`,
    `    window.${EXTENSION_SOURCES_GLOBAL} = [`,
    ...entries,
    '    ];',
    '  })();',
    '</script>',
  ].join('\n');
}

/**
 * Insert the extension-injection script into an HTML document.
 *
 * Insertion point: immediately after the opening `<head ...>` tag (earliest
 * position that runs before any deferred module script). Falls back to right
 * after a leading doctype, then to document start.
 *
 * @param {string} html - The original HTML document.
 * @param {InjectedExtension[]} extensions
 * @returns {string} The HTML with the injection script inserted.
 */
export function injectExtensionSources(html, extensions) {
  if (typeof html !== 'string') {
    throw new TypeError('injectExtensionSources: html must be a string');
  }

  const script = buildExtensionInjectionScript(extensions);
  const headMatch = /<head\b[^>]*>/i.exec(html);

  if (headMatch) {
    const at = headMatch.index + headMatch[0].length;
    return `${html.slice(0, at)}\n${script}\n${html.slice(at)}`;
  }

  const doctypeMatch = /^\s*<!doctype[^>]*>/i.exec(html);

  if (doctypeMatch) {
    const at = doctypeMatch.index + doctypeMatch[0].length;
    return `${html.slice(0, at)}\n${script}\n${html.slice(at)}`;
  }

  return `${script}\n${html}`;
}