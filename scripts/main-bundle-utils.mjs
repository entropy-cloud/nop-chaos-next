import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const repoRoot = path.resolve(__dirname, '..');

const WORKSPACE_ROOTS = ['apps', 'packages', 'examples', 'flux-lib'];
const MAIN_APP_NAME = '@nop-chaos/main';
const MAIN_EXTERNAL_BUILD_REQUIREMENTS = new Map([
  ['amis', ['esm/index.js', 'lib/themes/cxd.css']],
  ['amis-core', ['esm/index.js']],
  ['amis-ui', ['esm/index.js']],
  ['amis-formula', ['esm/index.js']],
]);
const MAIN_EXTERNAL_RUNTIME_DEPENDENCY_POLICIES = [
  { packageName: 'react', strategy: 'bundler-override' },
  { packageName: 'react-dom', strategy: 'bundler-override' },
  { packageName: 'i18next', strategy: 'bundler-override' },
  { packageName: 'react-i18next', strategy: 'bundler-override' },
  { packageName: 'zustand', strategy: 'single-instance' },
  { packageName: 'echarts', strategy: 'bundler-override' },
  { packageName: 'sonner', strategy: 'single-instance' },
];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listDirectories(rootPath) {
  if (!exists(rootPath)) {
    return [];
  }

  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function collectManifestDependencyNames(manifest) {
  return new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]);
}

function collectWorkspacePackages(rootDir) {
  const packages = [];

  for (const workspaceRoot of WORKSPACE_ROOTS) {
    const workspaceRootPath = path.join(rootDir, workspaceRoot);

    for (const entryName of listDirectories(workspaceRootPath)) {
      const directory = path.join(workspaceRootPath, entryName);
      const manifestPath = path.join(directory, 'package.json');

      if (!exists(manifestPath)) {
        continue;
      }

      const manifest = readJson(manifestPath);

      packages.push({
        name: manifest.name,
        directory,
        manifest,
        kind: 'workspace',
      });
    }
  }

  const packageNames = new Set(packages.map((entry) => entry.name));

  return packages
    .map((entry) => ({
      ...entry,
      declaredDependencies: collectManifestDependencyNames(entry.manifest),
      workspaceDependencies: [...collectManifestDependencyNames(entry.manifest)].filter((dependency) =>
        packageNames.has(dependency),
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function collectMainExternalPackages(rootDir) {
  const mainDirectory = path.join(rootDir, 'apps', 'main');
  const manifest = readJson(path.join(mainDirectory, 'package.json'));
  const entries = [];

  for (const [dependencyName, dependencyVersion] of Object.entries(manifest.dependencies ?? {})) {
    if (!dependencyVersion.startsWith('file:')) {
      continue;
    }

    const resolvedTargetPath = path.resolve(mainDirectory, dependencyVersion.slice('file:'.length));

    if (resolvedTargetPath.endsWith('.tgz')) {
      entries.push({
        name: dependencyName,
        declaredName: dependencyName,
        directory: resolvedTargetPath,
        manifest: { name: dependencyName },
        kind: 'external-tarball',
      });
      continue;
    }

    const dependencyManifestPath = path.join(resolvedTargetPath, 'package.json');

    if (!exists(dependencyManifestPath)) {
      continue;
    }

    const dependencyManifest = readJson(dependencyManifestPath);

    entries.push({
      name: dependencyManifest.name ?? dependencyName,
      declaredName: dependencyName,
      directory: resolvedTargetPath,
      manifest: dependencyManifest,
      kind: 'external',
    });
  }

  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function buildRootEntries(entries) {
  return entries
    .map((entry) => ({
      ...entry,
      normalizedDirectory: normalizePath(path.resolve(entry.directory)),
    }))
    .sort((left, right) => right.normalizedDirectory.length - left.normalizedDirectory.length);
}

function buildDependentsMap(packages) {
  const dependents = new Map(packages.map((entry) => [entry.name, []]));

  for (const entry of packages) {
    for (const dependencyName of entry.workspaceDependencies) {
      dependents.get(dependencyName)?.push(entry.name);
    }
  }

  for (const names of dependents.values()) {
    names.sort((left, right) => left.localeCompare(right));
  }

  return dependents;
}

function collectReachableWorkspacePackages(workspaceByName, entryNames) {
  const reachable = new Set();
  const stack = [...entryNames];

  while (stack.length > 0) {
    const name = stack.pop();

    if (!name || reachable.has(name)) {
      continue;
    }

    const entry = workspaceByName.get(name);

    if (!entry) {
      continue;
    }

    reachable.add(name);

    for (const dependencyName of entry.workspaceDependencies) {
      stack.push(dependencyName);
    }
  }

  return reachable;
}

export function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

export function createMainPackageContext(rootDir = repoRoot) {
  const workspacePackages = collectWorkspacePackages(rootDir);
  const workspaceByName = new Map(workspacePackages.map((entry) => [entry.name, entry]));
  const externalPackages = collectMainExternalPackages(rootDir);
  const rootEntries = buildRootEntries([...workspacePackages, ...externalPackages]);

  return {
    rootDir,
    workspacePackages,
    workspaceByName,
    externalPackages,
    rootEntries,
    resolvePackageEntryByFile(filePath) {
      const normalizedFilePath = normalizePath(path.resolve(filePath));

      return (
        rootEntries.find(
          (entry) =>
            normalizedFilePath === entry.normalizedDirectory ||
            normalizedFilePath.startsWith(`${entry.normalizedDirectory}/`),
        ) ?? null
      );
    },
    resolvePackageNameByFile(filePath) {
      return this.resolvePackageEntryByFile(filePath)?.name;
    },
  };
}

export function getWorkspaceDependencyLayers(context, entryNames = [MAIN_APP_NAME]) {
  const reachable = collectReachableWorkspacePackages(context.workspaceByName, entryNames);
  const packages = [...reachable]
    .map((name) => context.workspaceByName.get(name))
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name));
  const dependents = buildDependentsMap(packages);
  const inDegree = new Map(
    packages.map((entry) => [entry.name, entry.workspaceDependencies.filter((name) => reachable.has(name)).length]),
  );
  const layerByName = new Map(packages.map((entry) => [entry.name, 0]));
  const queue = packages
    .filter((entry) => (inDegree.get(entry.name) ?? 0) === 0)
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const orderedNames = [];

  while (queue.length > 0) {
    const name = queue.shift();

    if (!name) {
      continue;
    }

    orderedNames.push(name);

    for (const dependentName of dependents.get(name) ?? []) {
      if (!reachable.has(dependentName)) {
        continue;
      }

      const nextInDegree = (inDegree.get(dependentName) ?? 0) - 1;
      inDegree.set(dependentName, nextInDegree);
      layerByName.set(
        dependentName,
        Math.max(layerByName.get(dependentName) ?? 0, (layerByName.get(name) ?? 0) + 1),
      );

      if (nextInDegree === 0) {
        queue.push(dependentName);
        queue.sort((left, right) => left.localeCompare(right));
      }
    }
  }

  const unresolved = packages
    .map((entry) => entry.name)
    .filter((name) => !orderedNames.includes(name))
    .sort((left, right) => left.localeCompare(right));

  return {
    orderedNames,
    unresolved,
    layers: orderedNames.map((name) => ({
      name,
      layer: layerByName.get(name) ?? 0,
    })),
  };
}

export function getMainExternalBuildRequirements() {
  return MAIN_EXTERNAL_BUILD_REQUIREMENTS;
}

export function getMainExternalRuntimeDependencyPolicies() {
  return MAIN_EXTERNAL_RUNTIME_DEPENDENCY_POLICIES.map((entry) => ({ ...entry }));
}

export function resolvePackageSpecifierFromManifest(manifestPath, specifier) {
  try {
    const require = createRequire(manifestPath);
    return normalizePath(fs.realpathSync(require.resolve(specifier)));
  } catch {
    return null;
  }
}

function getPackageDirectoryFromResolvedFile(resolvedFilePath, packageName) {
  const normalizedResolvedFilePath = normalizePath(resolvedFilePath);
  const escapedPackageName = escapeRegex(packageName);
  const packageRootPattern = new RegExp(`/node_modules/${escapedPackageName}(?=/|$)`, 'g');
  let packageRootEndIndex = -1;
  let match;

  while ((match = packageRootPattern.exec(normalizedResolvedFilePath)) !== null) {
    packageRootEndIndex = match.index + match[0].length;
  }

  if (packageRootEndIndex === -1) {
    return null;
  }

  return normalizedResolvedFilePath.slice(0, packageRootEndIndex);
}

export function resolveMainRuntimeOverrideTarget(rootDir = repoRoot, packageName) {
  const mainManifestPath = path.join(rootDir, 'apps', 'main', 'package.json');
  const mainResolution = resolvePackageSpecifierFromManifest(mainManifestPath, packageName);
  const mainPackageDirectory = mainResolution
    ? getPackageDirectoryFromResolvedFile(mainResolution, packageName)
    : null;

  if (mainPackageDirectory) {
    return mainPackageDirectory;
  }

  const context = createMainPackageContext(rootDir);
  const candidateDirectories = new Set();

  for (const externalPackage of context.externalPackages) {
    const externalManifestPath = path.join(externalPackage.directory, 'package.json');
    const externalResolution = resolvePackageSpecifierFromManifest(externalManifestPath, packageName);
    const externalPackageDirectory = externalResolution
      ? getPackageDirectoryFromResolvedFile(externalResolution, packageName)
      : null;

    if (externalPackageDirectory) {
      candidateDirectories.add(externalPackageDirectory);
    }
  }

  return (
    [...candidateDirectories].sort(
      (left, right) => left.split('/').length - right.split('/').length || left.localeCompare(right),
    )[0] ?? null
  );
}

export function getMainRuntimeOverrideTargets(rootDir = repoRoot) {
  return new Map(
    MAIN_EXTERNAL_RUNTIME_DEPENDENCY_POLICIES.filter((entry) => entry.strategy === 'bundler-override').map(
      ({ packageName }) => [packageName, resolveMainRuntimeOverrideTarget(rootDir, packageName)],
    ),
  );
}

export function getMissingMainExternalBuildOutputs(rootDir = repoRoot) {
  const context = createMainPackageContext(rootDir);
  const externalByName = new Map(context.externalPackages.map((entry) => [entry.name, entry]));
  const missing = [];

  for (const [packageName, requiredFiles] of MAIN_EXTERNAL_BUILD_REQUIREMENTS.entries()) {
    const entry = externalByName.get(packageName);

    if (!entry) {
      continue;
    }

    if (entry.kind === 'external-tarball') {
      if (!exists(entry.directory)) {
        missing.push({
          packageName,
          directory: entry.directory,
          relativePath: path.basename(entry.directory),
          filePath: entry.directory,
        });
      }
      continue;
    }

    for (const relativePath of requiredFiles) {
      const filePath = path.join(entry.directory, relativePath);
      if (!exists(filePath)) {
        missing.push({
          packageName,
          directory: entry.directory,
          relativePath,
          filePath,
        });
      }
    }
  }

  return missing;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createExternalLibAliases(packageName, directory) {
  const escaped = escapeRegex(packageName);
  const esmDirectory = normalizePath(path.join(directory, 'esm'));
  const libDirectory = normalizePath(path.join(directory, 'lib'));

  return [
    {
      find: new RegExp(`^${escaped}$`),
      replacement: normalizePath(path.join(esmDirectory, 'index.js')),
    },
    {
      find: new RegExp(`^${escaped}/lib/(.+\\.css)$`),
      replacement: `${libDirectory}/$1`,
    },
    {
      find: new RegExp(`^${escaped}/lib/(.+)$`),
      replacement: `${esmDirectory}/$1.js`,
    },
  ];
}

export function getMainExternalPackageAliases(rootDir = repoRoot) {
  const context = createMainPackageContext(rootDir);
  const externalByName = new Map(context.externalPackages.map((entry) => [entry.name, entry]));
  const aliases = [];

  for (const packageName of MAIN_EXTERNAL_BUILD_REQUIREMENTS.keys()) {
    const entry = externalByName.get(packageName);

    if (!entry) {
      continue;
    }

    if (entry.kind === 'external-tarball') {
      continue;
    }

    aliases.push(...createExternalLibAliases(packageName, entry.directory));
  }

  return aliases;
}

export function getMainRuntimeOverrideAliases(rootDir = repoRoot) {
  const aliases = [];

  for (const [packageName, packageDirectory] of getMainRuntimeOverrideTargets(rootDir).entries()) {
    if (!packageDirectory) {
      continue;
    }

    const escapedPackageName = escapeRegex(packageName);

    aliases.push(
      {
        find: new RegExp(`^${escapedPackageName}$`),
        replacement: packageDirectory,
      },
      {
        find: new RegExp(`^${escapedPackageName}/(.+)$`),
        replacement: `${packageDirectory}/$1`,
      },
    );
  }

  return aliases;
}

function toChunkName(prefix, packageName) {
  return `${prefix}-${packageName.replace(/^@/, '').replace(/\//g, '-').replace(/\./g, '-')}`;
}

export function getWorkspaceChunkName(packageName) {
  if (packageName === '@nop-chaos/ui') {
    return 'pkg-ui';
  }

  if (packageName === '@nop-chaos/core') {
    return 'pkg-core';
  }

  if (packageName === '@nop-chaos/shared') {
    return 'pkg-shared';
  }

  if (packageName === '@nop-chaos/plugin-bridge') {
    return 'pkg-plugin-bridge';
  }

  return toChunkName('pkg', packageName);
}

export function getVendorChunkName(packageName) {
  if (packageName === 'amis') {
    return 'vendor-amis';
  }

  if (
    packageName === '@base-ui/react' ||
    packageName === '@base-ui/utils' ||
    packageName.startsWith('@floating-ui/') ||
    packageName === 'tabbable'
  ) {
    return 'vendor-base-ui';
  }

  if (
    packageName === 'react-day-picker' ||
    packageName === 'date-fns' ||
    packageName.startsWith('@date-fns/')
  ) {
    return 'vendor-date';
  }

  if (packageName === 'embla-carousel' || packageName.startsWith('embla-carousel-')) {
    return 'vendor-embla';
  }

  if (packageName === 'cmdk') {
    return 'vendor-cmdk';
  }

  if (
    packageName === 'mobx' ||
    packageName === 'mobx-react' ||
    packageName === 'mobx-react-lite' ||
    packageName === 'mobx-state-tree'
  ) {
    return 'vendor-mobx';
  }

  if (
    packageName === 'react-overlays' ||
    packageName === 'react-transition-group' ||
    packageName === 'dom-helpers' ||
    packageName === 'uncontrollable'
  ) {
    return 'vendor-react-overlays';
  }

  if (packageName === 'office-viewer') {
    return 'vendor-office-viewer';
  }

  if (packageName === 'amis-ui') {
    return 'vendor-amis-ui';
  }

  if (packageName === 'amis-formula') {
    return 'vendor-amis-formula';
  }

  if (packageName === 'monaco-editor' || packageName.startsWith('@codingame/')) {
    return 'vendor-monaco-editor';
  }

  if (
    packageName === 'codemirror' ||
    packageName.startsWith('@codemirror/') ||
    packageName.startsWith('@lezer/')
  ) {
    return 'vendor-codemirror';
  }

  if (
    packageName === 'echarts' ||
    packageName === 'zrender' ||
    packageName === 'echarts-wordcloud'
  ) {
    return 'vendor-echarts';
  }

  if (packageName === 'react' || packageName === 'react-dom' || packageName === 'scheduler') {
    return 'vendor-react';
  }

  if (
    packageName === 'react-router' ||
    packageName === 'react-router-dom' ||
    packageName === 'history'
  ) {
    return 'vendor-react-router';
  }

  if (packageName.startsWith('@tanstack/')) {
    return 'vendor-tanstack-react-query';
  }

  if (
    packageName === 'i18next' ||
    packageName === 'react-i18next' ||
    packageName === 'i18next-browser-languagedetector' ||
    packageName === 'i18next-http-backend'
  ) {
    return 'vendor-i18next';
  }

  if (packageName === 'systemjs') {
    return 'vendor-systemjs';
  }

  if (packageName === 'recharts') {
    return 'vendor-recharts';
  }

  if (packageName === '@xyflow/react') {
    return 'vendor-xyflow-react';
  }

  if (
    packageName === 'markdown-it' ||
    packageName === 'markdown-it-html5-media' ||
    packageName === 'linkify-it' ||
    packageName === 'mdurl' ||
    packageName === 'uc.micro' ||
    packageName === 'punycode'
  ) {
    return 'vendor-markdown-it';
  }

  if (packageName === 'jsbarcode') {
    return 'vendor-jsbarcode';
  }

  if (
    packageName === 'react-color' ||
    packageName === 'reactcss' ||
    packageName === 'tinycolor2' ||
    packageName === 'material-colors'
  ) {
    return 'vendor-react-color';
  }

  if (packageName === 'tinymce') {
    return 'vendor-tinymce';
  }

  if (packageName === 'froala-editor') {
    return 'vendor-froala-editor';
  }

  if (
    packageName === 'react-pdf' ||
    packageName === 'make-cancellable-promise' ||
    packageName === 'make-event-props'
  ) {
    return 'vendor-react-pdf';
  }

  if (packageName === 'react-cropper' || packageName === 'cropperjs') {
    return 'vendor-react-cropper';
  }

  if (packageName === 'react-json-view') {
    return 'vendor-react-json-view';
  }

  if (packageName === 'lodash' || packageName === 'lodash-es') {
    return 'vendor-lodash';
  }

  if (
    packageName === 'exceljs' ||
    packageName === 'xlsx' ||
    packageName === 'pdfjs-dist' ||
    packageName === 'hls.js' ||
    packageName === 'mpegts.js' ||
    packageName === 'sonner' ||
    packageName === 'lucide-react' ||
    packageName === 'zustand' ||
    packageName === '@fortawesome/fontawesome-free'
  ) {
    return toChunkName('vendor', packageName);
  }

  return 'vendor-misc';
}

export function getPackageChunkName(packageName) {
  if (packageName === '@nop-chaos/amis-core' || packageName === '@nop-chaos/amis-react') {
    return 'vendor-amis-bridge';
  }

  if (packageName.startsWith('@nop-chaos/')) {
    return getWorkspaceChunkName(packageName);
  }

  return getVendorChunkName(packageName);
}
