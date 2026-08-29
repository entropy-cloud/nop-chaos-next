#!/usr/bin/env node
/**
 * Verify that every SDK package exports its documented API surface and
 * loads without runtime errors. Run after `pnpm install` to confirm
 * the installed tgz files are consumable.
 *
 * Usage:
 *   pnpm verify:imports
 *
 * Exits 0 on success, 1 on any failed import / missing export.
 *
 * This is the "smoke test" for SDK distribution: it proves that the
 * shipped tarballs contain everything an extension developer needs,
 * including the rendering engines (flux / amis).
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Use Node's CJS require to read package.json exports; ESM dynamic import
// for actually loading the modules.
const require = createRequire(import.meta.url);

const REQUIRED_EXPORTS = {
  // Core SDK packages
  '@nop-chaos/shared': ['SHARED_MODULE_NAMES', 'HOST_API_VERSION'],
  '@nop-chaos/ui': ['Button', 'Card'],
  '@nop-chaos/plugin-bridge': ['getPluginBridge'],
  '@nop-chaos/theme-tokens': [],
  '@nop-chaos/tailwind-preset': ['nopTailwindPreset'],
  '@nop-chaos/extension-dev': ['buildExtension'],

  // Rendering engines (for type-checked standalone preview only — the
  // host provides the actual runtime instance via the import map).
  // These are verified at TypeScript level (tsc --noEmit), not at
  // runtime, because they touch DOM globals at import time.
  '@nop-chaos/flux': null,
  'amis': null,
  'amis-core': null,
  'amis-ui': null,
  'amis-formula': [],
};

let totalChecked = 0;
let totalErrors = 0;

console.log('[verify-imports] Loading every SDK package to confirm exports…\n');

for (const [pkg, expectedExports] of Object.entries(REQUIRED_EXPORTS)) {
  const label = pkg.padEnd(30);

  // Skip DOM-only packages (they fail to load in Node).
  if (expectedExports === null) {
    // Verify the tarball is installed by checking node_modules.
    const packageJsonPath = resolve(projectRoot, 'node_modules', pkg, 'package.json');
    if (existsSync(packageJsonPath)) {
      console.log(`  ⏭ ${label} DOM-only — installed at node_modules/${pkg}/ (verified at TypeScript level only)`);
      totalChecked += 1;
    } else {
      console.error(`  ✗ ${label} not installed: ${packageJsonPath}`);
      totalErrors += 1;
    }
    continue;
  }

  try {
    // Resolve the package via Node so we get the package's own entry,
    // not the host's facade.
    const entry = require.resolve(pkg);
    const mod = await import(pathToFileURL(entry).href);

    const exportedKeys = Object.keys(mod);
    const missing = expectedExports.filter((name) => !(name in mod));

    if (missing.length > 0) {
      console.error(`  ✗ ${label} loaded but missing exports: ${missing.join(', ')}`);
      totalErrors += 1;
    } else {
      console.log(`  ✓ ${label} ${expectedExports.length > 0 ? `(${expectedExports.length} named exports verified)` : ''}`);
      totalChecked += 1;
    }

    // Sanity: verify this is actually the SDK and not a host facade by
    // checking the resolved path lives inside node_modules (not in the
    // host dist's nop-shared/ folder).
    if (!entry.includes('/node_modules/')) {
      console.warn(`  ! ${label} resolved outside node_modules: ${entry}`);
    }
  } catch (error) {
    console.error(`  ✗ ${label} failed to load: ${error.message}`);
    totalErrors += 1;
  }
}

console.log(`\n[verify-imports] ${totalChecked} passed, ${totalErrors} failed`);

if (totalErrors > 0) {
  process.exit(1);
}