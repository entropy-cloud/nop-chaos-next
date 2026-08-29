#!/usr/bin/env node
/**
 * Preinstall hook: verify that all required SDK tarballs exist in ./sdks/.
 *
 * Setup: run `pnpm setup` (or `node scripts/sync-sdks.mjs`) to copy tarballs
 * from the monorepo's dist/sdks/ directory into this project's ./sdks/
 * directory. The user can also manually place tarballs in ./sdks/.
 *
 * Why: this project intentionally does NOT use workspace:* deps — it
 * mirrors the "external consumer" experience (you got sdks/ from a
 * release and want to develop against it).
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const sdksDir = resolve(projectRoot, 'sdks');

const requiredTarballs = [
  'nop-chaos-shared-0.1.0.tgz',
  'nop-chaos-plugin-bridge-0.1.0.tgz',
  'nop-chaos-theme-tokens-0.1.0.tgz',
  'nop-chaos-tailwind-preset-0.1.0.tgz',
  'nop-chaos-ui-0.1.0.tgz',
  'nop-chaos-extension-dev-0.1.0.tgz',
  'nop-chaos-flux-0.1.0.tgz',
  'amis-6.13.1-fix.0.tgz',
  'amis-core-6.13.1-fix.0.tgz',
  'amis-ui-6.13.1-fix.0.tgz',
  'amis-formula-6.13.1-fix.0.tgz',
];

if (!existsSync(sdksDir)) {
  console.error(`[extension-demo-external] sdks/ not found at ${sdksDir}`);
  console.error(`Run 'pnpm setup' to copy tarballs from the monorepo, or`);
  console.error(`manually place SDK tarballs in ${sdksDir}/.`);
  process.exit(1);
}

const missing = requiredTarballs.filter((name) => !existsSync(resolve(sdksDir, name)));

if (missing.length > 0) {
  console.error(`[extension-demo-external] Missing SDK tarballs in sdks/: ${missing.join(', ')}`);
  console.error(`Run 'pnpm setup' to copy them, or place them manually.`);
  process.exit(1);
}

console.log(`[extension-demo-external] All ${requiredTarballs.length} SDK tarballs present in sdks/`);