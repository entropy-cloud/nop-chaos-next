#!/usr/bin/env node
/**
 * Pack the extension SDK packages into distributable tarballs.
 *
 * Output: `<repo>/dist/sdks/<name>-<version>.tgz` for:
 *   @nop-chaos/shared, @nop-chaos/plugin-bridge, @nop-chaos/theme-tokens,
 *   @nop-chaos/tailwind-preset, @nop-chaos/ui, @nop-chaos/extension-dev
 *
 * How it works
 * ------------
 * Workspace manifests keep `exports → src/*.ts` so the monorepo dev flow
 * stays source-linked. This script therefore does NOT touch the workspace
 * package.json files: for each SDK it builds `dist/`, assembles a
 * *publishable* manifest in a staging directory (`.cache/sdk-pack/<pkg>/`),
 * copies the artifacts there, and runs `npm pack` in the staging dir.
 *
 * Consumers then install via any of:
 *   - tarballs dir:  pnpm add file:../dist/sdks/@nop-chaos-shared-0.1.0.tgz ...
 *   - HTTP file server / object storage (pnpm add https://.../x.tgz)
 *   - a private registry (verdaccio — see tools/verdaccio/)
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const outDir = resolve(repoRoot, 'dist/sdks');
const stageRoot = resolve(repoRoot, '.cache/sdk-pack');

const SDK_VERSION = '0.1.0';

/**
 * Host API contract version — read from the shared package source so it
 * stays in sync with the canonical definition.
 */
function readHostApiVersion() {
  const versionPath = resolve(repoRoot, 'packages/shared/src/version.ts');
  const source = readFileSync(versionPath, 'utf8');
  const match = source.match(/export\s+const\s+HOST_API_VERSION\s*=\s*['"]([^'"]+)['"]/);
  return match?.[1] ?? '0.0.0';
}
const HOST_API_VERSION = readHostApiVersion();

/**
 * @typedef {Object} SdkDef
 * @property {string} name
 * @property {string} dir
 * @property {'build-lib' | 'pnpm-build' | 'source'} build
 * @property {string[]} [buildLibExternal]
 * @property {(manifest: Record<string, unknown>) => Record<string, unknown>} [patch]
 *   Applied to the *staged* manifest.
 */

/** @type {SdkDef[]} */
const SDKS = [
  {
    name: '@nop-chaos/shared',
    dir: 'packages/shared',
    build: 'build-lib',
    patch: (m) => ({
      ...m,
      sideEffects: false,
    }),
  },
  {
    name: '@nop-chaos/plugin-bridge',
    dir: 'packages/plugin-bridge',
    build: 'build-lib',
    buildLibExternal: ['@nop-chaos/shared'],
    patch: (m) => ({
      ...m,
      sideEffects: false,
      peerDependencies: {
        '@nop-chaos/shared': `^${SDK_VERSION}`,
        i18next: '26.0.5',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        sonner: '^2.0.7',
        zustand: '^5.0.12',
      },
    }),
  },
  {
    name: '@nop-chaos/theme-tokens',
    dir: 'packages/theme-tokens',
    build: 'pnpm-build',
    patch: (m) => ({
      ...m,
      exports: {
        '.': { types: './dist/index.d.ts', default: './dist/index.js' },
        './styles.css': { default: './dist/styles.css' },
      },
      files: ['dist'],
    }),
  },
  {
    name: '@nop-chaos/tailwind-preset',
    dir: 'packages/tailwind-preset',
    build: 'pnpm-build',
    patch: (m) => ({
      ...m,
      files: ['dist'],
    }),
  },
  {
    name: '@nop-chaos/ui',
    dir: 'flux-lib/ui',
    build: 'pnpm-build',
    patch: (m) => ({
      ...m,
      // Keep runtime deps + peerDeps from the workspace manifest; strip
      // everything dev-only and pin the SDK version.
      devDependencies: undefined,
      scripts: undefined,
      files: ['dist'],
    }),
  },
  {
    name: '@nop-chaos/extension-dev',
    dir: 'packages/extension-dev',
    build: 'source',
    patch: (m) => ({
      ...m,
      devDependencies: undefined,
      scripts: undefined,
      files: ['src', 'templates', 'README.md'],
    }),
  },
];

/** Base manifest shared by every staged package. */
function baseManifest(name) {
  return {
    name,
    version: SDK_VERSION,
    type: 'module',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    exports: {
      '.': { types: './dist/index.d.ts', default: './dist/index.js' },
    },
    files: ['dist'],
  };
}

/**
 * @param {SdkDef} sdk
 */
function buildSdk(sdk) {
  const pkgDir = resolve(repoRoot, sdk.dir);

  if (sdk.build === 'build-lib') {
    const args = ['../../tools/build-lib.mjs', '--entry', 'src/index.ts', '--out', 'dist'];
    if (sdk.buildLibExternal?.length) {
      args.push('--external', sdk.buildLibExternal.join(','));
    }
    // tools/ is at repo root; flux-lib and packages are one level deep.
    const helperRel = sdk.dir.startsWith('packages/') ? '../../tools/build-lib.mjs' : '../../tools/build-lib.mjs';
    args[0] = helperRel;
    execFileSync('node', args, { cwd: pkgDir, stdio: 'inherit' });
    return;
  }

  if (sdk.build === 'pnpm-build') {
    execFileSync('pnpm', ['run', 'build'], { cwd: pkgDir, stdio: 'inherit' });
    return;
  }

  // 'source': nothing to build (runtime is plain .mjs).
}

/**
 * @param {SdkDef} sdk
 */
function stageSdk(sdk) {
  const pkgDir = resolve(repoRoot, sdk.dir);
  const stageDir = resolve(stageRoot, sdk.name.replace('@', '').replace('/', '__'));
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });

  /** @type {Record<string, unknown>} */
  let manifest;

  if (sdk.build === 'source') {
    // Source-distributed package (e.g. extension-dev): reuse its manifest,
    // apply the patch (strip devDeps etc).
    const original = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8'));
    manifest = { ...original, version: SDK_VERSION };
    for (const key of ['private', 'devDependencies', 'scripts']) {
      delete manifest[key];
    }
    for (const file of ['src', 'templates', 'README.md']) {
      const from = resolve(pkgDir, file);
      if (existsSync(from)) {
        cpSync(from, resolve(stageDir, file), { recursive: true });
      }
    }
  } else {
    const distDir = resolve(pkgDir, 'dist');
    if (!existsSync(resolve(distDir, 'index.js'))) {
      throw new Error(`pack-sdks: ${sdk.name} has no dist/index.js — build first`);
    }

    manifest = sdk.name === '@nop-chaos/ui'
      ? (() => {
          // ui keeps its rich exports map (chart / lib/utils / css) from the
          // workspace manifest, minus dev-only fields.
          const original = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8'));
          const next = { ...original, version: SDK_VERSION };
          for (const key of ['private', 'devDependencies', 'scripts']) {
            delete next[key];
          }
          return next;
        })()
      : baseManifest(sdk.name);

    cpSync(distDir, resolve(stageDir, 'dist'), { recursive: true });

    const readme = resolve(pkgDir, 'README.md');
    if (existsSync(readme)) {
      cpSync(readme, resolve(stageDir, 'README.md'));
    }
  }

  if (sdk.patch) {
    manifest = sdk.patch(manifest);
    for (const [key, value] of Object.entries(manifest)) {
      if (value === undefined) {
        delete manifest[key];
      }
    }
  }

  writeFileSync(resolve(stageDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return stageDir;
}

/**
 * @param {string} stageDir
 */
function packStage(stageDir) {
  const stdout = execFileSync('npm', ['pack', '--pack-destination', outDir], {
    cwd: stageDir,
    encoding: 'utf8',
  });
  return stdout.trim().split('\n').pop();
}

/**
 * Vendored upstream tarballs (rendering engines) shipped alongside the SDK.
 * They already carry dist + .d.ts — copy verbatim; versions follow upstream.
 */
const VENDORED_TARBALLS = [
  'libs/nop-chaos-flux-0.1.0.tgz',
  'libs/amis-6.13.1-fix.0.tgz',
  'libs/amis-core-6.13.1-fix.0.tgz',
  'libs/amis-ui-6.13.1-fix.0.tgz',
  'libs/amis-formula-6.13.1-fix.0.tgz',
];

/**
 * Read the host app's package.json to extract the actual dependency versions
 * used at runtime. These are written into version-manifest.json so the
 * setup-extension script can install matching versions in new projects.
 */
function readHostDependencyVersions() {
  const mainPkgPath = resolve(repoRoot, 'apps/main/package.json');
  const mainPkg = JSON.parse(readFileSync(mainPkgPath, 'utf8'));
  const allDeps = { ...mainPkg.dependencies, ...mainPkg.devDependencies };

  // Only include the deps that extensions typically need (peer deps of SDK
  // packages + shared modules that extensions may import directly).
  const tracked = [
    'react',
    'react-dom',
    'react-router-dom',
    'zustand',
    '@tanstack/react-query',
    'i18next',
    'react-i18next',
    'lucide-react',
    'sonner',
  ];

  /** @type {Record<string, string>} */
  const versions = {};
  for (const name of tracked) {
    if (allDeps[name]) {
      versions[name] = allDeps[name];
    }
  }
  return versions;
}

/**
 * Generate version-manifest.json in the output directory. This file is
 * consumed by setup-extension.mjs to install correct versions.
 */
function writeVersionManifest(tarballs) {
  /** @type {Record<string, string>} sdkPackageName → tarball filename */
  const sdkPackages = {};
  for (const sdk of SDKS) {
    // npm pack naming: @nop-chaos/shared → nop-chaos-shared-0.1.0.tgz
    const prefix = sdk.name.replace('@', '').replace('/', '-');
    const tgz = tarballs.find((t) => t.startsWith(`${prefix}-`));
    if (tgz) {
      sdkPackages[sdk.name] = SDK_VERSION;
    }
  }

  /** @type {Record<string, string>} vendoredPackageName → tarball filename */
  const vendoredPackages = {};
  const vendoredNames = [
    ['@nop-chaos/flux', 'nop-chaos-flux'],
    ['amis', 'amis'],
    ['amis-core', 'amis-core'],
    ['amis-ui', 'amis-ui'],
    ['amis-formula', 'amis-formula'],
  ];
  for (const [pkgName, prefix] of vendoredNames) {
    const tgz = tarballs.find((t) => t.startsWith(prefix));
    if (tgz) {
      // Extract version from filename: "amis-6.13.1-fix.0.tgz" → "6.13.1-fix.0"
      const match = tgz.match(new RegExp(`^${prefix}-(.+\\.tgz)$`));
      vendoredPackages[pkgName] = match?.[1]?.replace(/\.tgz$/, '') ?? 'unknown';
    }
  }

  const manifest = {
    hostApiVersion: HOST_API_VERSION,
    dependencies: readHostDependencyVersions(),
    sdkPackages,
    vendoredPackages,
  };

  const manifestPath = resolve(outDir, 'version-manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`[pack-sdks] wrote version-manifest.json\n`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  rmSync(stageRoot, { recursive: true, force: true });
  mkdirSync(stageRoot, { recursive: true });

  /** @type {string[]} */
  const tarballs = [];

  for (const sdk of SDKS) {
    process.stdout.write(`\n[pack-sdks] === ${sdk.name} ===\n`);
    buildSdk(sdk);
    const stageDir = stageSdk(sdk);
    const tarball = packStage(stageDir);
    tarballs.push(tarball);
    process.stdout.write(`[pack-sdks] ${sdk.name} -> dist/sdks/${tarball}\n`);
  }

  for (const vendored of VENDORED_TARBALLS) {
    const from = resolve(repoRoot, vendored);
    if (!existsSync(from)) {
      throw new Error(`pack-sdks: vendored tarball missing: ${vendored}`);
    }
    cpSync(from, resolve(outDir, vendored.replace('libs/', '')));
    tarballs.push(vendored.replace('libs/', ''));
    process.stdout.write(`[pack-sdks] vendored ${vendored} -> dist/sdks/\n`);
  }

  // Generate version-manifest.json for setup-extension.mjs
  writeVersionManifest(tarballs);

  // Copy setup-extension.mjs into dist/sdks/
  const setupScript = resolve(repoRoot, 'tools/setup-extension.mjs');
  if (existsSync(setupScript)) {
    cpSync(setupScript, resolve(outDir, 'setup-extension.mjs'));
    process.stdout.write(`[pack-sdks] copied setup-extension.mjs -> dist/sdks/\n`);
  }

  // Copy extension-host-shell-plugin.mjs (used by `pnpm dev` to integrate
  // the built host with the extension source).
  const hostShellPlugin = resolve(repoRoot, 'tools/extension-host-shell-plugin.mjs');
  if (existsSync(hostShellPlugin)) {
    cpSync(hostShellPlugin, resolve(outDir, 'extension-host-shell-plugin.mjs'));
    process.stdout.write(`[pack-sdks] copied extension-host-shell-plugin.mjs -> dist/sdks/\n`);
  }

  process.stdout.write(`\n[pack-sdks] done — ${tarballs.length} tarballs in ${outDir}:\n`);
  for (const t of tarballs) {
    process.stdout.write(`  dist/sdks/${t}\n`);
  }
}

main().catch((error) => {
  console.error('[pack-sdks] error:', error);
  process.exitCode = 1;
});