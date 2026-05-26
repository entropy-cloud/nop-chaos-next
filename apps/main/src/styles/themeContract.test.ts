import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const mainSrcDir = dirname(currentDir);
const mainAppDir = dirname(mainSrcDir);
const repoRoot = dirname(dirname(mainAppDir));

function readRepoFile(...segments: string[]) {
  return readFileSync(join(repoRoot, ...segments), 'utf8');
}

describe('theme and styling contracts', () => {
  it('uses the main app Tailwind config from the CSS entrypoint', () => {
    const tailwindEntry = readRepoFile('apps', 'main', 'src', 'styles', 'tailwind.css');
    const mainEntry = readRepoFile('apps', 'main', 'src', 'main.tsx');

    expect(tailwindEntry).toContain("@config '../../tailwind.config.ts';");
    expect(tailwindEntry).not.toContain("@config '../../../../tailwind.config.ts';");
    expect(mainEntry).toContain("import '../../../packages/theme-tokens/src/styles.css';");
    expect(mainEntry).toContain("import './styles/flux-host-token-extension.css';");
    expect(mainEntry.indexOf("../../../packages/theme-tokens/src/styles.css")).toBeLessThan(
      mainEntry.indexOf("./styles/flux-host-token-extension.css"),
    );
  });

  it('scans the canonical @nop-chaos/ui source for Tailwind classes', () => {
    const mainTailwindConfig = readRepoFile('apps', 'main', 'tailwind.config.ts');
    const rootTailwindConfig = readRepoFile('tailwind.config.ts');
    const hostTailwindExtension = readRepoFile(
      'apps',
      'main',
      'src',
      'styles',
      'fluxHostTailwindExtension.ts',
    );

    expect(mainTailwindConfig).toContain("'../../flux-lib/ui/src/**/*.{ts,tsx}'");
    expect(mainTailwindConfig).not.toContain("'../../packages/ui/src/**/*.{ts,tsx}'");
    expect(rootTailwindConfig).toContain('createNopTailwindPreset');
    expect(rootTailwindConfig).toContain('fluxHostTokenExtension.tailwindThemeExtension');
    expect(hostTailwindExtension).toContain('defineHostTokenExtension');
  });

  it('keeps AMIS bridge scoped to AMIS-owned variables', () => {
    const themeBridgeCss = readRepoFile('apps', 'main', 'src', 'styles', 'amis-theme-bridge.css');
    const amisFixCss = readRepoFile('apps', 'main', 'src', 'styles', 'amis-fix.css');

    expect(themeBridgeCss).not.toContain('--background: hsl(var(--card));');
    expect(themeBridgeCss).toContain('--Tooltip-bg: hsl(var(--card));');
    expect(themeBridgeCss).toContain('--Tooltip--attr-color: hsl(var(--background));');
    expect(amisFixCss).toContain('.amis .cxd-Input {');
    expect(amisFixCss).toContain('background: hsl(var(--background));');
    expect(amisFixCss).toContain('.amis-dialog-widget .cxd-Modal-overlay {');
    expect(amisFixCss).toContain('background: var(--surface-overlay);');
  });

  it('uses @nop-chaos/ui as the canonical table row helper owner', () => {
    const flowEditorPage = readRepoFile('apps', 'main', 'src', 'pages', 'flow-editor', 'index.tsx');
    const masterDetailTable = readRepoFile(
      'apps',
      'main',
      'src',
      'pages',
      'data-management',
      'master-detail',
      'components',
      'MasterDetailTable.tsx',
    );
    const itemsSection = readRepoFile(
      'apps',
      'main',
      'src',
      'pages',
      'data-management',
      'master-detail',
      '[id]',
      'components',
      'ItemsSection.tsx',
    );
    const legacyHelperPath = join(repoRoot, 'apps', 'main', 'src', 'lib', 'tableRowClassName.ts');

    expect(flowEditorPage).toContain("from '@nop-chaos/ui';");
    expect(flowEditorPage).toContain('getTableRowClassName');
    expect(masterDetailTable).toContain("from '@nop-chaos/ui';");
    expect(masterDetailTable).toContain('getTableRowClassName');
    expect(itemsSection).toContain("from '@nop-chaos/ui';");
    expect(itemsSection).toContain('getTableRowClassName');
    expect(existsSync(legacyHelperPath)).toBe(false);
  });
});
