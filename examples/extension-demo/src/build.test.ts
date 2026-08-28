/**
 * Regression test for the production build pipeline.
 *
 * Runs `vite build` against a temporary copy of the project so we can assert
 * the resulting `dist/extension.json` schema and the presence of per-extension
 * static assets without disturbing the working tree.
 *
 * Background: the production contract requires
 *   - `dist/assets/index.js` ends with `export { ... as default };` (the
 *     ShellExtension default export),
 *   - `dist/extension.json` contains the `id`, `entry`, `styleAssets`, and
 *     `assets` fields populated from `new URL('./xxx', import.meta.url)`
 *     literals in `src/index.ts`,
 *   - the per-extension resources `harbor.css`, `shell.css`,
 *     `component-page.css`, and `harbor-mark.svg` are copied into
 *     `dist/assets/`.
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
    // Copy `dist/` from the most recent `pnpm build` invocation under the
    // project root. We do not invoke Vite inside the test process because the
    // test runs through Vitest's own transform pipeline, which can race with
    // Vite's bundler. Instead we shell out to a clean `pnpm build` into a
    // scratch directory.
    execFileSync(
      'pnpm',
      ['--filter', PROJECT_NAME, 'build', '--outDir', join(workdir, 'dist')],
      { cwd: PROJECT_ROOT, stdio: 'pipe' },
    );
    distRoot = join(workdir, 'dist');
  }, 60_000);

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

    expect(Array.isArray(manifest.assets)).toBe(true);
    const assets = manifest.assets ?? [];
    expect(assets.some((p) => p.includes('harbor-mark') && p.endsWith('.svg'))).toBe(true);

    for (const path of [...styles, ...assets]) {
      expect(path.startsWith('./assets/')).toBe(true);
    }
  });

  it('emits the entry chunk with `export default extension`', () => {
    const entryPath = join(distRoot, 'assets/index.js');
    expect(existsSync(entryPath)).toBe(true);

    const source = readFileSync(entryPath, 'utf-8');
    expect(source).toMatch(/export\s*\{[^}]*default[^}]*\}/);
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