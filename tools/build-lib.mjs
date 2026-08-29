#!/usr/bin/env node
/**
 * Library build helper for SDK packages.
 *
 * For each TypeScript-based SDK package (`shared`, `plugin-bridge`,
 * `theme-tokens`, `tailwind-preset`, `flux-lib/ui`), this script emits:
 *   - `dist/index.js`     — ESM bundle (rollup + esbuild for TS/TSX + CJS interop)
 *   - `dist/index.d.ts`   — declaration only (tsc --emitDeclarationOnly)
 *   - any copied CSS      — listed by the caller via `--copy-css`
 *
 * Call from a package via its `build:lib` script:
 *
 *   "build:lib": "node ../../tools/build-lib.mjs
 *                 --entry src/index.ts
 *                 --out dist
 *                 --copy-css src/styles.css=dist/styles.css ..."
 */

import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { rollup } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';

/**
 * @param {string[]} argv
 * @returns {{ entry: string; out: string; copies: Array<[string, string]>; external: string[] }}
 */
function parseArgs(argv) {
  /** @type {Record<string, string | string[]>} */
  const opts = {};
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      opts[key] = true;
      continue;
    }
    opts[key] = next;
    i += 1;
  }

  const entry = typeof opts.entry === 'string' ? opts.entry : positional[0];
  const out = typeof opts.out === 'string' ? opts.out : 'dist';
  const copies = typeof opts['copy-css'] === 'string'
    ? opts['copy-css'].split(',').map((pair) => {
        const [from, to] = pair.split('=');
        if (!from || !to) {
          throw new Error(`build-lib: bad --copy-css pair '${pair}' (expected '<from>=<to>')`);
        }
        return [from, to];
      })
    : [];
  const external = typeof opts.external === 'string' ? opts.external.split(',') : [];

  if (!entry) {
    throw new Error('build-lib: --entry <src/index.ts> is required');
  }

  return { entry, out, copies, external };
}

async function buildLibrary({ entry, out, copies, external }) {
  const cwd = process.cwd();
  const entryAbs = resolve(cwd, entry);
  const outAbs = resolve(cwd, out);

  if (!existsSync(entryAbs)) {
    throw new Error(`build-lib: entry not found: ${entryAbs}`);
  }

  rmSync(outAbs, { recursive: true, force: true });
  mkdirSync(outAbs, { recursive: true });

  // 1) ESM bundle via rollup + esbuild.
  const bundle = await rollup({
    input: entryAbs,
    external,
    plugins: [
      esbuild({
        tsconfig: existsSync(resolve(cwd, 'tsconfig.json'))
          ? resolve(cwd, 'tsconfig.json')
          : undefined,
        target: 'es2022',
        jsx: 'automatic',
      }),
    ],
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        return;
      }
      warn(warning);
    },
  });

  await bundle.write({
    file: resolve(outAbs, 'index.js'),
    format: 'es',
    sourcemap: false,
    exports: 'named',
  });
  await bundle.close();

  // 2) Emit .d.ts (declaration only) via tsc. Bundler resolution lets the
  // program resolve workspace peers whose exports point at TS sources.
  const { execFileSync } = await import('node:child_process');

  /** @returns {string | undefined} */
  function findTsc() {
    let dir = cwd;
    for (let i = 0; i < 5; i += 1) {
      const candidate = resolve(dir, 'node_modules/.bin/tsc');
      if (existsSync(candidate)) {
        return candidate;
      }
      const parent = resolve(dir, '..');
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
    return undefined;
  }

  const tscBin = findTsc();

  if (!tscBin) {
    throw new Error('build-lib: tsc not found (searched node_modules/.bin upwards)');
  }

  try {
    execFileSync(
      tscBin,
      [
        '--ignoreConfig',
        '--declaration',
        '--emitDeclarationOnly',
        '--outDir', outAbs,
        '--moduleResolution', 'bundler',
        '--module', 'esnext',
        '--target', 'es2022',
        '--jsx', 'react-jsx',
        '--skipLibCheck',
        '--strict', 'false',
        entryAbs,
      ],
      { cwd, stdio: 'inherit' },
    );
  } catch (error) {
    throw new Error(`build-lib: tsc --emitDeclarationOnly failed for ${entryAbs}: ${error.message}`);
  }

  // 3) Copy CSS and other static assets verbatim.
  for (const [from, to] of copies) {
    const src = resolve(cwd, from);
    const dest = resolve(cwd, to);
    if (!existsSync(src)) {
      console.warn(`build-lib: skipping missing source '${from}'`);
      continue;
    }
    mkdirSync(resolve(dest, '..'), { recursive: true });
    copyFileSync(src, dest);
    console.log(`build-lib: copied ${from} -> ${to}`);
  }

  console.log(`build-lib: done (${entryAbs} -> ${outAbs})`);
}

const { entry, out, copies, external } = parseArgs(process.argv.slice(2));
buildLibrary({ entry, out, copies, external }).catch((error) => {
  console.error('[build-lib] error:', error);
  process.exitCode = 1;
});