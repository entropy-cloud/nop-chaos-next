import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

function fail(message) {
  throw new Error(message);
}

function parsePort(value) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(`Invalid port '${value}'. Expected an integer between 1 and 65535.`);
  }

  return port;
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toSlug(value) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    fail('Extension name must contain at least one letter or number');
  }

  return slug;
}

function toWords(slug) {
  return slug.split('-').filter(Boolean);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toPascalCase(slug) {
  return toWords(slug).map(capitalize).join('');
}

function toTitle(slug) {
  return toWords(slug).map(capitalize).join(' ');
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}
`;
}

function lines(parts) {
  return `${parts.join('\n')}
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, json(value));
}

function setScriptIfMissing(scripts, key, value) {
  if (!(key in scripts)) {
    scripts[key] = value;
  }
}

async function updateMainAppIntegration({ devPort, packageName, slug }) {
  const rootPackagePath = resolve(repoRoot, 'package.json');
  const mainEnvPath = resolve(repoRoot, `apps/main/.env.${slug}`);

  const rootPackage = await readJson(rootPackagePath);

  rootPackage.scripts ??= {};

  setScriptIfMissing(rootPackage.scripts, `dev:${slug}`, `pnpm --filter ${packageName} dev`);
  setScriptIfMissing(
    rootPackage.scripts,
    `dev:main:${slug}`,
    `pnpm --filter @nop-chaos/main exec vite --mode ${slug}`,
  );

  await writeJson(rootPackagePath, rootPackage);
  await writeFile(
    mainEnvPath,
    lines([
      'VITE_ENABLE_MOCK=true',
      `VITE_DEMO_EXTENSION_ALIAS_PATH=../../examples/${slug}/src/index.ts`,
    ]),
  );
}

function createPackageJson(packageName) {
  return json({
    name: packageName,
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc -p tsconfig.json --noEmit && vite build',
      preview: 'vite preview',
      typecheck: 'tsc -p tsconfig.json --noEmit',
      lint: 'eslint "src/**/*.{ts,tsx}"',
      test: 'vitest run --passWithNoTests',
    },
    devDependencies: {
      '@nop-chaos/plugin-bridge': 'workspace:*',
      '@nop-chaos/shared': 'workspace:*',
      '@nop-chaos/tailwind-preset': 'workspace:*',
      '@nop-chaos/theme-tokens': 'workspace:*',
      '@nop-chaos/ui': 'workspace:*',
      '@vitejs/plugin-react': '^6.0.1',
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      tailwindcss: '^4.2.1',
      typescript: '^5.9.3',
      vite: '^8.0.0',
    },
    peerDependencies: {
      '@nop-chaos/plugin-bridge': 'workspace:*',
      '@nop-chaos/shared': 'workspace:*',
      '@nop-chaos/ui': 'workspace:*',
      react: '^18.3.1',
    },
  });
}

function createTsconfig() {
  return lines([
    '{',
    '  "extends": "../../tsconfig.base.json",',
    '  "compilerOptions": {',
    '    "types": ["vite/client"]',
    '  },',
    '  "include": ["src", "vite.config.ts", "tailwind.config.ts"]',
    '}',
  ]);
}

function createTailwindConfig() {
  return lines([
    "import type { Config } from 'tailwindcss'",
    "import { nopTailwindPreset } from '@nop-chaos/tailwind-preset'",
    '',
    'const config: Config = {',
    '  presets: [nopTailwindPreset],',
    "  content: ['./src/**/*.{ts,tsx}']",
    '}',
    '',
    'export default config',
  ]);
}

function createIndexHtml(title) {
  return lines([
    '<!doctype html>',
    "<html lang='en'>",
    '  <head>',
    "    <meta charset='UTF-8' />",
    "    <meta name='viewport' content='width=device-width, initial-scale=1.0' />",
    `    <title>${title}</title>`,
    '  </head>',
    '  <body>',
    "    <div id='root'></div>",
    "    <script type='module' src='/src/standalone/main.tsx'></script>",
    '  </body>',
    '</html>',
  ]);
}

function createIndexTs({
  extensionId,
  componentId,
  menuId,
  menuPath,
  themeId,
  title,
  pageFileName,
  styleIdPrefix,
}) {
  return lines([
    "import type { ShellExtension } from '@nop-chaos/shared'",
    `import { ${pageFileName} } from './pages/${pageFileName}'`,
    '',
    "const themeHref = new URL('./theme.css', import.meta.url).href",
    "const shellHref = new URL('./shell.css', import.meta.url).href",
    "const componentPageHref = new URL('./component-page.css', import.meta.url).href",
    '',
    'const extension: ShellExtension = {',
    `  id: '${extensionId}',`,
    '  order: 50,',
    '  app: {',
    "    defaultLanguage: 'en-US'",
    '  },',
    '  languages: [',
    '    {',
    "      code: 'fr-FR',",
    "      labelKey: 'settings.languageOptions.frFR'",
    '    }',
    '  ],',
    '  themes: [',
    '    {',
    `      id: '${themeId}',`,
    `      labelKey: 'settings.themeOptions.${themeId}.label',`,
    `      descriptionKey: 'settings.themeOptions.${themeId}.description',`,
    '      cssHref: themeHref',
    '    }',
    '  ],',
    '  styles: [',
    '    {',
    `      id: '${styleIdPrefix}-shell',`,
    '      href: shellHref,',
    "      scope: 'shell'",
    '    },',
    '    {',
    `      id: '${styleIdPrefix}-page',`,
    '      href: componentPageHref,',
    "      scope: 'shell'",
    '    }',
    '  ],',
    '  builtinPages: [',
    '    {',
    `      componentId: '${componentId}',`,
    `      component: ${pageFileName}`,
    '    }',
    '  ],',
    '  menus: [',
    '    {',
    `      id: '${menuId}',`,
    `      title: '${title} Page',`,
    `      path: '${menuPath}',`,
    "      icon: 'palette',",
    "      pageType: 'builtin',",
    `      componentId: '${componentId}',`,
    '      sort: 980',
    '    }',
    '  ],',
    '  i18nResources: [',
    '    {',
    "      lng: 'zh-CN',",
    '      resource: {',
    '        settings: {',
    '          languageOptions: {',
    "            frFR: 'French'",
    '          },',
    '          themeOptions: {',
    `            '${themeId}': {`,
    `              label: '${title}',`,
    `              description: '${title} theme delivered by the extension package.'`,
    '            }',
    '          }',
    '        }',
    '      }',
    '    },',
    '    {',
    "      lng: 'en-US',",
    '      resource: {',
    '        settings: {',
    '          languageOptions: {',
    "            frFR: 'French'",
    '          },',
    '          themeOptions: {',
    `            '${themeId}': {`,
    `              label: '${title}',`,
    `              description: '${title} theme delivered by the extension package.'`,
    '            }',
    '          }',
    '        }',
    '      }',
    '    },',
    '    {',
    "      lng: 'fr-FR',",
    '      resource: {',
    '        settings: {',
    '          languageOptions: {',
    "            frFR: 'Francais'",
    '          },',
    '          themeOptions: {',
    `            '${themeId}': {`,
    `              label: '${title}',`,
    `              description: '${title} theme delivered by the extension package.'`,
    '            }',
    '          }',
    '        }',
    '      }',
    '    }',
    '  ]',
    '}',
    '',
    'export default extension',
  ]);
}

function createStandaloneMain(pageFileName, title) {
  return lines([
    "import React from 'react'",
    "import ReactDOM from 'react-dom/client'",
    `import { ${pageFileName} } from '../pages/${pageFileName}'`,
    "import '@nop-chaos/theme-tokens/styles.css'",
    "import '@nop-chaos/ui/base.css'",
    "import '../theme.css'",
    "import '../shell.css'",
    "import '../component-page.css'",
    '',
    'function StandaloneApp() {',
    '  return (',
    '    <React.StrictMode>',
    "      <main className='min-h-screen bg-background px-6 py-10 text-foreground'>",
    "        <div className='mx-auto max-w-6xl space-y-4'>",
    '          <div>',
    "            <div className='eyebrow-text tracking-[0.22em]'>Standalone Preview</div>",
    `            <h1 className='mt-3 text-3xl font-semibold'>${title}</h1>`,
    "            <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>",
    '              This standalone entry is for local UI development. Host integration should use the host alias flow.',
    '            </p>',
    '          </div>',
    `          <${pageFileName} />`,
    '        </div>',
    '      </main>',
    '    </React.StrictMode>',
    '  )',
    '}',
    '',
    "ReactDOM.createRoot(document.getElementById('root')!).render(<StandaloneApp />)",
  ]);
}

function createPageComponent(pageFileName, title, componentId, menuPath) {
  return lines([
    "import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui'",
    '',
    'const highlights = [',
    '  {',
    "    title: 'Alias-linked source',",
    "    description: 'The host can load this extension directly from source during development.'",
    '  },',
    '  {',
    "    title: 'Extension styles',",
    "    description: 'This package ships its own shell and page CSS while still using host theme tokens.'",
    '  },',
    '  {',
    "    title: 'Builtin registration',",
    "    description: 'The extension registers a builtin page so routing stays inside the host shell.'",
    '  }',
    ']',
    '',
    `export function ${pageFileName}() {`,
    '  return (',
    "    <div className='space-y-6'>",
    "      <Card className='theme-card overflow-hidden border-none extension-hero'>",
    "        <CardHeader className='space-y-3'>",
    "          <div className='eyebrow-text tracking-[0.22em]'>Extension Builtin Page</div>",
    `          <CardTitle className='text-3xl'>${title}</CardTitle>`,
    "          <p className='max-w-3xl text-sm text-muted-foreground'>",
    '            This page is compiled inside the extension project and exposed to the host through the extension loader.',
    '          </p>',
    '        </CardHeader>',
    "        <CardContent className='grid gap-4 md:grid-cols-3'>",
    '          {highlights.map((item) => (',
    "            <div key={item.title} className='extension-panel'>",
    "              <div className='text-sm font-medium text-foreground'>{item.title}</div>",
    "              <p className='mt-3 text-sm leading-6 text-muted-foreground'>{item.description}</p>",
    '            </div>',
    '          ))}',
    '        </CardContent>',
    '      </Card>',
    '',
    "      <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>",
    "        <Card className='theme-card border-none'>",
    '          <CardHeader>',
    '            <CardTitle>Host integration contract</CardTitle>',
    '          </CardHeader>',
    "          <CardContent className='space-y-4 text-sm text-muted-foreground'>",
    "            <div className='rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4'>",
    `              Component id: \`${componentId}\``,
    '            </div>',
    "            <div className='rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4'>",
    `              Menu path: \`${menuPath}\``,
    '            </div>',
    "            <div className='rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4'>",
    '              Alias mode keeps routing inside the host while resolving extension assets from this package.',
    '            </div>',
    '          </CardContent>',
    '        </Card>',
    '',
    "        <Card className='theme-card border-none'>",
    '          <CardHeader>',
    '            <CardTitle>Next steps</CardTitle>',
    '          </CardHeader>',
    "          <CardContent className='space-y-3 text-sm text-muted-foreground'>",
    '            {[',
    "              'Update i18n resources for your domain text',",
    "              'Replace placeholder theme and shell CSS',",
    "              'Wire real builtin pages, menus, and setup logic'",
    '            ].map((item) => (',
    "              <div key={item} className='rounded-xl border border-dashed border-[hsl(var(--border))] px-4 py-3'>",
    '                {item}',
    '              </div>',
    '            ))}',
    '          </CardContent>',
    '        </Card>',
    '      </div>',
    '    </div>',
    '  )',
    '}',
  ]);
}

function createViteConfig(devPort) {
  return lines([
    "import { defineConfig } from 'vite'",
    "import react from '@vitejs/plugin-react'",
    '',
    'export default defineConfig({',
    '  resolve: {',
    '    tsconfigPaths: true',
    '  },',
    '  plugins: [react()],',
    '  server: {',
    '    cors: true,',
    `    origin: 'http://127.0.0.1:${devPort}',`,
    `    port: ${devPort},`,
    '    strictPort: false',
    '  },',
    '  preview: {',
    `    port: ${devPort},`,
    '    strictPort: false',
    '  }',
    '})',
  ]);
}

function createReadme({ packageName, rootScriptName, title }) {
  return lines([
    `# ${title}`,
    '',
    'This extension package is generated from the workspace extension scaffold.',
    '',
    '## Commands',
    '',
    '### Standalone development',
    '',
    '```bash',
    `pnpm dev:${rootScriptName}`,
    '```',
    '',
    '### Build',
    '',
    '```bash',
    `pnpm --filter ${packageName} build`,
    '```',
    '',
    '## Host integration',
    '',
    `- Start host integration with \`pnpm dev:main:${rootScriptName}\``,
    '- The generated `apps/main/.env.<name>` uses local alias mode by default',
    '- Edit this package source directly and the host app will reflect the changes immediately',
    '',
    'Then customize:',
    '',
    '- extension metadata in `src/index.ts`',
    '- builtin pages in `src/pages/*`',
    '- standalone preview in `src/standalone/main.tsx`',
    '- styles in `src/theme.css`, `src/shell.css`, and `src/component-page.css`',
  ]);
}

function createThemeCss(themeId) {
  return lines([
    ':root {',
    `  --${themeId}-accent: 210 84% 56%;`,
    '}',
    '',
    'body {',
    `  background-image: radial-gradient(circle at top right, hsl(var(--${themeId}-accent) / 0.18), transparent 40%);`,
    '}',
  ]);
}

function createShellCss() {
  return lines([
    '.extension-hero {',
    '  background:',
    '    linear-gradient(135deg, hsl(var(--background) / 0.94), hsl(var(--background) / 0.72)),',
    '    radial-gradient(circle at top right, hsl(var(--primary) / 0.18), transparent 38%);',
    '}',
  ]);
}

function createComponentPageCss() {
  return lines([
    '.extension-panel {',
    '  border: 1px solid hsl(var(--border));',
    '  border-radius: 1.25rem;',
    '  background: hsl(var(--background) / 0.72);',
    '  padding: 1.25rem;',
    '  backdrop-filter: blur(18px);',
    '}',
  ]);
}

function createFiles(config) {
  return [
    ['package.json', createPackageJson(config.packageName)],
    ['tsconfig.json', createTsconfig()],
    ['tailwind.config.ts', createTailwindConfig()],
    ['vite.config.ts', createViteConfig(config.devPort)],
    ['README.md', createReadme(config)],
    ['index.html', createIndexHtml(config.title)],
    ['src/index.ts', createIndexTs(config)],
    [
      `src/pages/${config.pageFileName}.tsx`,
      createPageComponent(config.pageFileName, config.title, config.componentId, config.menuPath),
    ],
    ['src/standalone/main.tsx', createStandaloneMain(config.pageFileName, config.title)],
    ['src/theme.css', createThemeCss(config.themeId)],
    ['src/shell.css', createShellCss()],
    ['src/component-page.css', createComponentPageCss()],
  ];
}

async function main() {
  const rawName = process.argv[2];
  const rawPort = process.argv[3];

  if (!rawName) {
    fail('Usage: pnpm generate:extension <name> [port]');
  }

  const slug = toSlug(rawName);
  const devPort = rawPort ? parsePort(rawPort) : 4180;
  const title = toTitle(slug);
  const pascalName = toPascalCase(slug);
  const pageFileName = `${pascalName}Page`;
  const extensionId = `example-${slug}`;
  const packageName = `@nop-chaos/example-${slug}`;
  const componentId = `${slug}-page`;
  const menuId = `${slug}-menu`;
  const menuPath = `/examples/${slug}`;
  const themeId = slug;
  const styleIdPrefix = `${slug}-extension`;
  const rootScriptName = slug;
  const targetDir = resolve(repoRoot, 'examples', slug);

  if (await pathExists(targetDir)) {
    fail(`Extension target already exists: examples/${slug}`);
  }

  if (await pathExists(resolve(repoRoot, `apps/main/.env.${slug}`))) {
    fail(`Main app env file already exists: apps/main/.env.${slug}`);
  }

  const files = createFiles({
    extensionId,
    componentId,
    devPort,
    menuId,
    menuPath,
    packageName,
    pageFileName,
    rootScriptName,
    styleIdPrefix,
    themeId,
    title,
  });

  await mkdir(targetDir);

  for (const [relativePath, content] of files) {
    const filePath = resolve(targetDir, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }

  await updateMainAppIntegration({ devPort, packageName, slug });

  console.log(`Created extension package at examples/${slug}`);
  console.log(`Package name: ${packageName}`);
  console.log(`Dev port: ${devPort}`);
  console.log(`Standalone dev: pnpm dev:${slug}`);
  console.log(`Main app dev: pnpm dev:main:${slug}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown generator error';
  console.error(message);
  process.exitCode = 1;
});
