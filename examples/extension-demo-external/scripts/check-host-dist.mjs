#!/usr/bin/env node
/**
 * Dev precheck: verify HOST_DIST points to a valid built host
 * (apps/main/dist or similar). The hostShellPlugin uses this to serve
 * the host page.
 *
 * Resolution order:
 *   1. process.env.HOST_DIST
 *   2. <repoRoot>/apps/main/dist (sibling nop-chaos-next checkout)
 *
 * <repoRoot> is computed as the parent of this script's project:
 *   examples/extension-demo-external/scripts/ → ../../.. → repo root
 */
import { existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const repoRoot = resolve(projectRoot, '..', '..');

function resolveHostDist() {
  if (process.env.HOST_DIST) {
    const candidate = resolve(process.env.HOST_DIST);
    if (existsSync(join(candidate, 'index.html'))) {
      return candidate;
    }
    console.error(`[dev] HOST_DIST=${candidate} does not contain index.html`);
    process.exit(1);
  }

  const siblingCandidate = resolve(repoRoot, 'apps/main/dist');
  if (existsSync(join(siblingCandidate, 'index.html'))) {
    return siblingCandidate;
  }

  console.error('[dev] No host dist found.');
  console.error('Set HOST_DIST=<path-to-apps/main/dist> or build the host:');
  console.error('  pnpm --filter @nop-chaos/main build');
  console.error('Backend must be running on http://127.0.0.1:8080 for API calls.');
  process.exit(1);
}

const hostDist = resolveHostDist();
console.log(`[dev] Using host dist: ${hostDist}`);
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:8080';
console.log(`[dev] Backend will be reached at ${backendOrigin}`);
console.log(`       (set BACKEND_ORIGIN to override)`);