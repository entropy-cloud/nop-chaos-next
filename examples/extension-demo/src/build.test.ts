/**
 * Regression test for the production build pipeline.
 *
 * Runs the official extension build (`nop-extension-dev build`, same command
 * as the project's `pnpm build`) against the project and asserts the
 * resulting `dist/extension.json` schema and the presence of per-extension
 * static assets.
 *
 * Background: the production contract requires
 *   - `dist/assets/index.js` to be a plain ESM bundle that keeps
 *     `SHARED_MODULE_NAMES` external (resolved at runtime through the host's
 *     native import map → single host/shared runtime instances, no duplicate
 *     React),
 *   - `dist/extension.json` to contain the `id`, `entry`, `styleAssets`,
 *     and `assets` fields populated from `new URL('./xxx', import.meta.url)`
 *     literals in `src/index.ts`,
 *   - the per-extension resources `harbor.css`, `shell.css`,
 *     `component-page.css`, and `harbor-mark.svg` to be copied into
 *     `dist/assets/` under both their original and hashed names (runtime
 *     references vs. stable Java pre-injection contract).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';

const PROJECT_ROOT = join(import.meta.dirname, '..');
const PROJECT_NAME = '@nop-chaos/example-extension-demo';

interface Manifest {
  id: string;
  name: string;
  version?: string;
  entry: string;
  styleAssets?: string[];
  assets?: string[];
}

describe('extension-demo production build pipeline', () => {
  let distRoot: string;

  beforeAll(() => {
    const workdir = mkdtempSync(join(tmpdir(), 'extension-demo-build-'));
    // Shell out to a clean build into a scratch directory so the test does
    // not disturb the working tree and does not race with Vitest's own
    // transform pipeline.
    execFileSync(
      'pnpm',
      ['--filter', PROJECT_NAME, 'build', '--outDir', join(workdir, 'dist')],
      { cwd: PROJECT_ROOT, stdio: 'pipe' },
    );
    distRoot = join(workdir, 'dist');
  }, 120_000);

  it('emits dist/extension.json with the expected schema', () => {
    const manifestPath = join(distRoot, 'extension.json');
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;

    expect(manifest.id).toBe('example-extension-demo');
    expect(manifest.name).toBe('Harbor Operations Suite');
    expect(manifest.version).toBe('0.0.1');
    expect(manifest.entry).toBe('./assets/index.js');

    expect(Array.isArray(manifest.styleAssets)).toBe(true);
    const styles = manifest.styleAssets ?? [];
    expect(styles.some((p) => p.includes('harbor') && p.endsWith('.css'))).toBe(true);
    expect(styles.some((p) => p.includes('shell') && p.endsWith('.css'))).toBe(true);
    expect(styles.some((p) => p.includes('component-page') && p.endsWith('.css'))).toBe(true);

    for (const path of styles) {
      expect(path.startsWith('./assets/')).toBe(true);
    }
  });

  it('emits a plain ESM entry that keeps the shared modules external', () => {
    const entryPath = join(distRoot, 'assets/index.js');
    expect(existsSync(entryPath)).toBe(true);

    const source = readFileSync(entryPath, 'utf-8');
    // ESM: real import declarations (not System.register).
    expect(source).toMatch(/\bimport\b/);
    expect(source).not.toMatch(/System\.register/);
    // React and the UI library must NOT be bundled (host provides them).
    expect(source).toMatch(/"react"/);
    expect(source).toMatch(/"@nop-chaos\/ui"/);
  });

  it('emits every per-extension static asset referenced by `new URL()`', () => {
    const assetsDir = join(distRoot, 'assets');
    expect(existsSync(assetsDir)).toBe(true);

    const files = readdirSync(assetsDir);
    const expectedSubstrings = [
      'harbor-mark', // .svg
      'harbor', // .css
      'shell', // .css
      'component-page', // .css
    ];

    for (const token of expectedSubstrings) {
      const match = files.find((f) => f.startsWith(token) && statSync(join(assetsDir, f)).isFile());
      expect(match, `expected asset containing "${token}" in ${assetsDir}`).toBeTruthy();
    }
  });
});