#!/usr/bin/env node
/**
 * Generates the host's native-ESM shared-module facades
 * (`dist/nop-shared/<name>.mjs`) and injects a native import map into
 * `dist/index.html`.
 *
 * Why facades instead of bundled vendor files
 * -------------------------------------------
 * Extensions are plain ESM bundles that externalize `SHARED_MODULE_NAMES`.
 * For the browser's native `import('react')` (etc.) to resolve to the SAME
 * module instances the host itself uses, each shared name must map (via a
 * native `<script type="importmap">`) to a real ESM file. The host keeps its
 * shared modules inlined and registers the very same instances on
 * `globalThis.__NOP_SHARED__` during bootstrap; the generated facade files
 * re-export those instances, so host and extensions share exactly one copy
 * of react/ui/... — no bundler can be asked to "split out" a module that
 * another bundle keeps inline, hence facades + runtime registry.
 *
 * Export enumeration is automatic (Node `require` for CJS npm packages,
 * esbuild bundle + `import` for workspace TS packages), so facades stay
 * complete as packages grow.
 *
 * Timing: facades are only ever imported by extensions, which the host
 * loads AFTER `registerBaseSharedModules()` populated `__NOP_SHARED__` —
 * safe to evaluate.
 *
 * The legacy SystemJS shims (`.js` facade files used by the plugin SystemJS
 * import map) are restored from `scripts/nop-shared-shims/` because
 * `vite build` empties `dist/`.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build as esbuildBuild } from 'esbuild';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const mainDistDir = resolve(repoRoot, 'apps/main/dist');
const nopSharedDir = resolve(mainDistDir, 'nop-shared');
const shimArchiveDir = resolve(scriptDir, 'nop-shared-shims');
const entryCacheDir = resolve(repoRoot, '.cache', 'nop-shared-entries');

const IMPORT_MAP_MARKER = '<!--nop-shared-import-map-->';
const requireFromRepo = createRequire(resolve(repoRoot, 'package.json'));
// Rendering engines (flux / amis) are file: dependencies of apps/main, so
// they resolve from the app's node_modules, not the repo root.
const requireFromMain = createRequire(resolve(repoRoot, 'apps/main/package.json'));

/**
 * Canonical shared-module names — re-read from
 * `packages/shared/src/plugins/sharedModuleNames.ts` (single source of
 * truth) so the list never drifts.
 */
const SHARED_MODULE_NAMES = parseSharedModuleNames();

/** @type {Record<string, string>} */
const FILE_NAMES = {
  'react': 'react.mjs',
  'react-dom': 'react-dom.mjs',
  'react/jsx-dev-runtime': 'react-jsx-dev-runtime.mjs',
  'react/jsx-runtime': 'react-jsx-runtime.mjs',
  'react-router-dom': 'react-router-dom.mjs',
  'zustand': 'zustand.mjs',
  '@tanstack/react-query': 'tanstack-react-query.mjs',
  '@nop-chaos/plugin-bridge': 'plugin-bridge.mjs',
  '@nop-chaos/shared': 'shared.mjs',
  '@nop-chaos/ui': 'ui.mjs',
  'i18next': 'i18next.mjs',
  'react-i18next': 'react-i18next.mjs',
  'lucide-react': 'lucide-react.mjs',
  'sonner': 'sonner.mjs',
  '@nop-chaos/flux': 'flux.mjs',
  'amis': 'amis.mjs',
  'amis-core': 'amis-core.mjs',
  'amis-ui': 'amis-ui.mjs',
  'amis-formula': 'amis-formula.mjs',
};

/** Workspace packages (TS sources): esbuild-bundle to enumerate exports. */
const WORKSPACE_ENTRIES = {
  '@nop-chaos/plugin-bridge': resolve(repoRoot, 'packages/plugin-bridge/src/index.ts'),
  '@nop-chaos/shared': resolve(repoRoot, 'packages/shared/src/index.ts'),
  '@nop-chaos/ui': resolve(repoRoot, 'flux-lib/ui/src/index.ts'),
};

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * @returns {string[]}
 */
function parseSharedModuleNames() {
  const sourcePath = resolve(repoRoot, 'packages/shared/src/plugins/sharedModuleNames.ts');
  const source = readFileSync(sourcePath, 'utf8');
  const names = [...source.matchAll(/^\s*'([^']+)',?\s*$/gm)].map((match) => match[1]);

  if (names.length === 0) {
    throw new Error(`build-nop-shared: could not parse SHARED_MODULE_NAMES from ${sourcePath}`);
  }

  return names;
}

/**
 * Browser-only rendering engines: they touch DOM globals at import time, so
 * they can neither be `require`d nor be dynamically imported under Node.
 * Their exports are enumerated statically instead — esbuild bundles a
 * `export * from '<pkg>'` proxy (browser platform, code never executes) and
 * the emitted export clause is parsed for the real runtime export names.
 */
const RENDERER_ENGINE_NAMES = new Set([
  '@nop-chaos/flux',
  'amis',
  'amis-core',
  'amis-ui',
  'amis-formula',
]);

// Probe proxies must resolve '@nop-chaos/flux' / 'amis*' from apps/main's
// node_modules (they are file: deps of the app), so they live inside it.
const probeDir = resolve(repoRoot, 'apps/main/node_modules/.nop-shared-probe');

/**
 * @param {string} name
 * @returns {Promise<string[]>}
 */
async function enumerateViaEsbuildProbe(name) {
  mkdirSync(probeDir, { recursive: true });
  const safe = name.replace(/[/@]/g, '_');
  const proxyPath = resolve(probeDir, `${safe}.proxy.mjs`);
  const outPath = resolve(probeDir, `${safe}.probe.mjs`);
  writeFileSync(proxyPath, `export * from ${JSON.stringify(name)};\n`);

  await esbuildBuild({
    entryPoints: [proxyPath],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outfile: outPath,
    logLevel: 'error',
    // The probe only needs the export clause — asset loaders are placeholders.
    loader: {
      '.ttf': 'dataurl',
      '.woff': 'dataurl',
      '.woff2': 'dataurl',
      '.eot': 'dataurl',
      '.png': 'dataurl',
      '.gif': 'dataurl',
      '.jpg': 'dataurl',
      '.jpeg': 'dataurl',
      '.svg': 'dataurl',
      '.cur': 'dataurl',
    },
  });

  const code = readFileSync(outPath, 'utf8');
  /** @type {Set<string>} */
  const names = new Set();

  for (const match of code.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
    for (const clause of match[1].split(',')) {
      const item = clause.trim();
      if (!item) {
        continue;
      }
      const asMatch = item.match(/(?:^|\s)as\s+([\w$]+|"[^"]+")$/);
      const exported = asMatch ? asMatch[1] : item.split(/\s+/).pop() ?? '';
      const clean = exported.replace(/^"|"$/g, '');
      if (clean && clean !== 'default') {
        names.add(clean);
      }
    }
  }

  rmSync(resolve(probeDir, `${safe}.proxy.mjs`), { force: true });
  rmSync(outPath, { force: true });

  if (names.size === 0) {
    throw new Error(`build-nop-shared: esbuild probe found no exports for '${name}'`);
  }

  return [...names];
}

/**
 * Enumerate the export names of a shared module.
 *
 * @param {string} name
 * @returns {Promise<string[]>}
 */
async function enumerateExports(name) {
  if (RENDERER_ENGINE_NAMES.has(name)) {
    return enumerateViaEsbuildProbe(name);
  }

  if (WORKSPACE_ENTRIES[name]) {
    const outfile = resolve(entryCacheDir, `enum-${name.replace(/[/@]/g, '_')}.mjs`);
    await esbuildBuild({
      entryPoints: [WORKSPACE_ENTRIES[name]],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      jsx: 'automatic',
      outfile,
      logLevel: 'error',
    });
    const mod = await import(pathToFileURL(outfile).href);
    return Object.keys(mod);
  }

  // npm deps: try the repo root first, then apps/main (file: deps such as
  // @nop-chaos/flux and the amis family only resolve there). ESM-only
  // packages fall back to a dynamic import of the resolved entry.
  for (const req of [requireFromRepo, requireFromMain]) {
    try {
      const mod = req(name);
      return Object.keys(mod ?? {});
    } catch (error) {
      const code = /** @type {NodeJS.ErrnoException} */ (error).code;
      if (code !== 'ERR_REQUIRE_ASYNC_MODULE' && code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED' && code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
      // ESM-only entry: resolve the file and import it.
      try {
        const entryPath = req.resolve(name);
        const mod = await import(pathToFileURL(entryPath).href);
        return Object.keys(mod);
      } catch {
        // try next resolver
      }
    }
  }

  const mod = await import(name);
  return Object.keys(mod);
}

function restoreLegacyShims() {
  if (!existsSync(shimArchiveDir)) {
    return;
  }
  mkdirSync(nopSharedDir, { recursive: true });
  cpSync(shimArchiveDir, nopSharedDir, { recursive: true });
}

/**
 * Generate `dist/nop-shared/<file>.mjs`: a facade that re-exports the host
 * instance registered on `__NOP_SHARED__` (complete export list, generated).
 *
 * @param {string} name
 * @param {string[]} exportNames
 * @returns {string}
 */
function buildFacade(name, exportNames) {
  const lines = [
    '// Generated by scripts/build-nop-shared.mjs — host shared module facade.',
    '// Re-exports the host instance registered at bootstrap on',
    '// `window.__NOP_SHARED__`; only loaded by extensions (after registration).',
    "import { getSharedModule } from './_registry.js';",
    '',
    `const moduleRef = getSharedModule(${JSON.stringify(name)});`,
    '',
    'export default moduleRef.default ?? moduleRef;',
  ];

  for (const key of exportNames) {
    if (key === 'default' || !IDENTIFIER.test(key)) {
      continue;
    }
    lines.push(`export const ${key} = moduleRef[${JSON.stringify(key)}];`);
  }

  lines.push('');
  return lines.join('\n');
}

async function buildFacades() {
  rmSync(entryCacheDir, { recursive: true, force: true });
  mkdirSync(entryCacheDir, { recursive: true });
  mkdirSync(nopSharedDir, { recursive: true });

  for (const name of SHARED_MODULE_NAMES) {
    const file = FILE_NAMES[name];
    if (!file) {
      throw new Error(`build-nop-shared: no output file mapping for '${name}'`);
    }

    process.stdout.write(`[build-nop-shared] enumerating ${name} ...\n`);
    const exportNames = await enumerateExports(name);
    writeFileSync(resolve(nopSharedDir, file), buildFacade(name, exportNames));
    process.stdout.write(
      `[build-nop-shared] wrote nop-shared/${file} (${exportNames.length} exports)\n`,
    );
  }
}

/**
 * Build the native import map fragment (idempotent marker included).
 *
 * @returns {string}
 */
function buildImportMapFragment() {
  /** @type {Record<string, string>} */
  const imports = {};
  for (const name of SHARED_MODULE_NAMES) {
    imports[name] = `./nop-shared/${FILE_NAMES[name]}`;
  }

  const json = JSON.stringify({ imports }, null, 2);
  return `${IMPORT_MAP_MARKER}<script type="importmap">\n${json}\n</script>`;
}

function injectImportMap() {
  const indexPath = resolve(mainDistDir, 'index.html');
  if (!existsSync(indexPath)) {
    throw new Error(`build-nop-shared: ${indexPath} not found — run the host build first`);
  }

  let html = readFileSync(indexPath, 'utf8');

  // Idempotency: drop a previously injected map first.
  const markerIndex = html.indexOf(IMPORT_MAP_MARKER);
  if (markerIndex >= 0) {
    const end = html.indexOf('</script>', markerIndex);
    const after = end >= 0 ? html.slice(end + '</script>'.length) : html.slice(markerIndex);
    html = html.slice(0, markerIndex) + after;
  }

  const headMatch = /<head\b[^>]*>/i.exec(html);
  const fragment = buildImportMapFragment();

  if (headMatch) {
    const at = headMatch.index + headMatch[0].length;
    html = `${html.slice(0, at)}\n${fragment}\n${html.slice(at)}`;
  } else {
    html = `${fragment}\n${html}`;
  }

  writeFileSync(indexPath, html);
  process.stdout.write('[build-nop-shared] import map injected into dist/index.html\n');
}

async function main() {
  try {
    restoreLegacyShims();
    await buildFacades();
    injectImportMap();
    process.stdout.write(
      `[build-nop-shared] done: ${SHARED_MODULE_NAMES.length} shared ESM facades + import map.\n`,
    );
  } finally {
    rmSync(entryCacheDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('[build-nop-shared] error:', error);
  process.exitCode = 1;
});