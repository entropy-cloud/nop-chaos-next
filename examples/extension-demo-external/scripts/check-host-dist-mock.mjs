#!/usr/bin/env node
/**
 * Dev:mock precheck: verify HOST_DIST_MOCK points to a host dist that
 * was built with mock APIs enabled.
 *
 * Mock-enabled dist is produced by:
 *   pnpm --filter @nop-chaos/main exec vite build --mode devtools-e2e \
 *     && node scripts/build-nop-shared.mjs
 *
 * It includes dist/mock/preview.lib.js and dist/data/*.json which the
 * host's runtime uses when VITE_MOCK_MEMORY_ONLY=true (or VITE_ENABLE_MOCK=true).
 */
import { existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const repoRoot = resolve(projectRoot, '..', '..');

function resolveHostDistMock() {
  if (process.env.HOST_DIST_MOCK) {
    const candidate = resolve(process.env.HOST_DIST_MOCK);
    if (existsSync(join(candidate, 'index.html'))) {
      return candidate;
    }
    console.error(`[dev:mock] HOST_DIST_MOCK=${candidate} does not contain index.html`);
    process.exit(1);
  }

  // Common locations: a sibling dist-mock, or the regular dist with mock data.
  const candidates = [
    resolve(repoRoot, 'apps/main/dist-mock'),
    resolve(repoRoot, 'apps/main/dist'),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'index.html'))) {
      // Sanity check: mock dist should contain dist/mock/preview.lib.js.
      if (existsSync(join(candidate, 'mock', 'preview.lib.js'))) {
        return candidate;
      }
      console.warn(`[dev:mock] ${candidate} has no mock/ — built without VITE_ENABLE_MOCK`);
      console.warn(`Build a mock-enabled host: pnpm --filter @nop-chaos/main exec vite build --mode devtools-e2e`);
    }
  }

  console.error('[dev:mock] No host dist with mock APIs found.');
  console.error('Set HOST_DIST_MOCK=<path> or build a mock-enabled host:');
  console.error('  pnpm --filter @nop-chaos/main exec vite build --mode devtools-e2e');
  process.exit(1);
}

const hostDist = resolveHostDistMock();
console.log(`[dev:mock] Using host dist: ${hostDist}`);
console.log(`[dev:mock] Login: admin / 123456`);