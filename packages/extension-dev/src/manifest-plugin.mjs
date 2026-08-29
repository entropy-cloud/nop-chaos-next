/**
 * Vite/Rollup plugin that emits `extension.json` for a library-style
 * extension build, and copies per-extension assets (referenced via
 * `new URL('./xxx', import.meta.url)`) into the output `assets/` folder.
 *
 * Original logic: `examples/extension-demo/vite.config.ts` (plan 44). Moved
 * into the official tooling so external extension projects build the same
 * manifest contract without host source. Works both as a Vite plugin and as
 * a plain Rollup plugin (`nop-extension-dev build`).
 *
 * Manifest shape:
 *   { id, name, version, entry, styleAssets?, assets? }  (relative paths)
 *
 * Asset naming: every collected asset is emitted twice — with the ORIGINAL
 * name (so runtime `new URL('./x', import.meta.url)` references resolve)
 * and with a hashed name (stable cache-busting for the Java-side
 * pre-injection contract in `extension.json`).
 */

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

/**
 * @typedef {Object} ExtensionManifestOptions
 * @property {string} id - Extension id (must equal the deploy directory name).
 * @property {string} name - Human-readable extension name.
 * @property {string} [version] - Extension version (optional).
 * @property {string} [entry] - Entry module relative to the root. Defaults to
 *   `src/index.ts`.
 * @property {Set<string>} [extraStyleAssets] - Relative paths (e.g.
 *   `./assets/foo.css`) contributed by bundler CSS handling; merged into
 *   `styleAssets` (optional).
 */

/**
 * Deterministic asset name for an absolute file path, e.g.
 * `/…/harbor-mark.svg` → `harbor-mark-_v65npr.svg`. Used by the manifest
 * plugin and `buildExtension` so runtime asset URL references and the
 * `extension.json` asset list always agree.
 *
 * @param {string} absPath
 * @returns {string}
 */
export function assetHashedName(absPath) {
  const base = basename(absPath);
  const dot = base.lastIndexOf('.');
  const name = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  return `${name}-${hash(absPath)}${ext}`;
}

/**
 * @param {string} input
 * @returns {string}
 */
function hash(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return '_' + Math.abs(h).toString(36).slice(0, 8);
}

/**
 * @param {ExtensionManifestOptions} options
 * @returns {import('rollup').Plugin}
 */
export function extensionManifestPlugin(options) {
  const { id, name, version } = options;
  const entryPath = options.entry ?? 'src/index.ts';
  const extraStyleAssets = new Set(options.extraStyleAssets ?? []);

  /** @type {Set<string>} */
  const collectedAssets = new Set();

  /** @type {{ root: string; build: { outDir: string } } | null} */
  let resolvedConfig = null;

  /** @type {string | null} */
  let entryAbs = null;

  /** @type {string | null} */
  let outDir = null;

  /**
   * @param {string} source
   * @returns {string[]}
   */
  function scanUrlLiteralsFromSource(source) {
    const out = [];
    const re = /new\s+URL\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*,\s*import\.meta\.url\s*\)/g;
    let match;
    while ((match = re.exec(source)) !== null) {
      out.push(match[2]);
    }
    return out;
  }

  /**
   * @returns {string}
   */
  function resolveOutDir() {
    if (outDir) {
      return outDir;
    }
    return resolvedConfig?.build.outDir ?? 'dist';
  }

  // Typed as rollup.Plugin is too strict for a dual vite/rollup plugin
  // (`apply` / `configResolved` are vite-only hooks; rollup ignores them).
  /** @type {any} */
  const plugin = {
    name: 'extension-manifest',
    apply: 'build',

    /**
     * Vite-only hook (rollup ignores it).
     *
     * @param {{ root: string; build: { outDir: string } }} config
     */
    configResolved(config) {
      resolvedConfig = config;
    },

    /**
     * Hook the entry source to extract every `new URL` literal.
     *
     * @param {string} code
     * @param {string} id
     */
    async transform(code, id) {
      if (!entryAbs) {
        entryAbs = resolve(resolvedConfig?.root ?? process.cwd(), entryPath);
      }
      if (id !== entryAbs) {
        return null;
      }

      for (const literal of scanUrlLiteralsFromSource(code)) {
        const cleaned = literal.replace(/^\.\.?\//, '');
        const assetAbs = resolve(dirname(entryAbs), cleaned);

        if (existsSync(assetAbs)) {
          collectedAssets.add(assetAbs);
        }
      }

      return null;
    },

    /**
     * After bundling, copy collected assets into outDir/assets with both the
     * original name (runtime `new URL` references) and a hashed name (stable
     * Java pre-injection contract).
     */
    closeBundle() {
      const targetDir = resolveOutDir();
      const assetsDir = resolve(targetDir, 'assets');
      mkdirSync(assetsDir, { recursive: true });

      for (const abs of collectedAssets) {
        const base = basename(abs);

        for (const fileName of [base, assetHashedName(abs)]) {
          const dest = resolve(assetsDir, fileName);
          if (!existsSync(dest)) {
            copyFileSync(abs, dest);
          }
        }
      }
    },

    /**
     * Emit `extension.json` next to the bundle.
     *
     * @param {{ dir?: string } | undefined} outputOptions
     * @param {Record<string, import('rollup').OutputChunk | import('rollup').OutputAsset> | undefined} bundle
     */
    writeBundle(outputOptions, bundle) {
      /** @type {string | undefined} */
      let entry;
      /** @type {string[]} */
      const styleAssets = [];

      if (outputOptions?.dir) {
        outDir = String(outputOptions.dir);
      }

      if (bundle) {
        for (const [fileName, output] of Object.entries(bundle)) {
          const ref = output;
          if (ref.type === 'chunk' && ref.isEntry) {
            entry = `./${fileName}`;
          }
          if (ref.type === 'asset' && fileName.endsWith('.css')) {
            styleAssets.push(`./${fileName}`);
          }
        }
      }

      for (const cssPath of [...extraStyleAssets]) {
        if (!styleAssets.includes(cssPath)) {
          styleAssets.push(cssPath);
        }
      }

      /** @type {string[]} */
      const assets = [];
      for (const abs of collectedAssets) {
        const hashed = `./assets/${assetHashedName(abs)}`;

        if (hashed.endsWith('.css')) {
          if (!styleAssets.includes(hashed)) {
            styleAssets.push(hashed);
          }
        } else {
          // Every collected per-extension asset is listed (hashed name), even
          // when the bundler itself emitted it — the manifest doubles as the
          // deploy inventory for Java pre-injection.
          assets.push(hashed);
        }

        const base = basename(abs);
        if (base.endsWith('.css')) {
          const original = `./assets/${base}`;
          if (!styleAssets.includes(original)) {
            styleAssets.push(original);
          }
        }
      }

      if (!entry) {
        return;
      }

      /** @type {Record<string, unknown>} */
      const manifest = {
        id,
        name,
        ...(version ? { version } : {}),
        entry,
        ...(styleAssets.length > 0 ? { styleAssets } : {}),
        ...(assets.length > 0 ? { assets } : {}),
      };

      const targetDir = resolveOutDir();
      writeFileSync(resolve(targetDir, 'extension.json'), JSON.stringify(manifest, null, 2) + '\n');
    },
  };

  return plugin;
}