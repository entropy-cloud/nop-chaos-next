// ==UserScript==
// @name         nop-chaos dev-in-host extension injector
// @namespace    @nop-chaos/extension-dev
// @version      0.1.0
// @description  Load dev extensions into the built nop-chaos host without host source.
//               Sets window.__NOP_EXTENSIONS__ before the host bootstrap module runs.
// @match        http://127.0.0.1:*
// @match        http://localhost:*
// @match        https://*.example.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

/*
 * Official dev tooling — part of @nop-chaos/extension-dev.
 *
 * HOW TO USE
 * 1. Install this file in Tampermonkey/Violentmonkey (or paste as a browser
 *    extension content script with `run_at: document_start`).
 * 2. Edit CONFIG below: which host origins to enable and which extension
 *    sources to inject. Entries are loaded with a page-context dynamic
 *    `import()`, so the extension server must respond with CORS headers
 *    (Vite dev does by default; `nop-extension-dev serve` does too).
 * 3. Open the host page: your extension is loaded as if it were deployed.
 *
 * The proxy-based alternative (`nop-extension-dev dev-in-host`) is
 * recommended when several people share the workflow: it injects the same
 * sources server-side with no browser extension needed.
 */

(function () {
  'use strict';

  const CONFIG = {
    // Host origin patterns to enable injection on (exact origin match).
    enabledHostOrigins: [
      'http://127.0.0.1:8080',
      'http://localhost:8080',
    ],

    // Extensions to inject: id must be unique; url must be an absolute
    // http(s) URL served with CORS. Point at your Vite dev server or at a
    // `nop-extension-dev serve` static server.
    extensions: [
      {
        id: 'dev-extension',
        url: 'http://127.0.0.1:4180/src/index.ts',
      },
    ],
  };

  const origin = window.location.origin;

  if (!CONFIG.enabledHostOrigins.includes(origin)) {
    console.info('[extension-dev] host origin not enabled:', origin);
    return;
  }

  if (window.__NOP_EXTENSIONS__ !== undefined) {
    console.warn('[extension-dev] extension sources already present; skipping.');
    return;
  }

  const sources = [];
  const seen = new Set();

  for (const ext of CONFIG.extensions) {
    if (!ext.id || !/^https?:\/\//.test(ext.url)) {
      console.error('[extension-dev] invalid extension entry:', ext);
      continue;
    }
    if (seen.has(ext.id)) {
      console.error('[extension-dev] duplicate extension id:', ext.id);
      continue;
    }
    seen.add(ext.id);
    sources.push({
      id: ext.id,
      load: function () {
        // SystemJS bundles (`.system.js`) must go through the host import map
        // to share the host's react/ui instances; plain ESM URLs load natively.
        const isSystemBundle = typeof ext.url === 'string' && ext.url.endsWith('.system.js');
        const system =
          typeof globalThis.System !== 'undefined' && typeof globalThis.System.import === 'function'
            ? globalThis.System
            : undefined;
        return isSystemBundle && system ? system.import(ext.url) : import(ext.url);
      },
    });
  }

  if (sources.length > 0) {
    window.__NOP_EXTENSIONS__ = sources;
    console.info(
      '[extension-dev] injected extension sources:',
      sources.map((s) => s.id).join(', '),
    );
  }
})();