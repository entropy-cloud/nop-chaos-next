import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  createMainPackageContext,
  getWorkspaceDependencyLayers,
  repoRoot,
} from './main-bundle-utils.mjs';

const STATIC_IMPORT_RE = /\bimport\s*(?:type\s*)?(?:[^"'()]*?\sfrom\s*)?["']([^"']+)["']/g;
const EXPORT_FROM_RE = /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

function collectSourceFiles(sourceDirectory) {
  if (!fs.existsSync(sourceDirectory)) {
    return [];
  }

  const files = [];
  const stack = [sourceDirectory];

  while (stack.length > 0) {
    const currentDirectory = stack.pop();
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.turbo') {
        continue;
      }

      const filePath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        stack.push(filePath);
        continue;
      }

      if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        files.push(filePath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function extractSpecifiers(sourceText) {
  const specifiers = new Set();

  for (const expression of [STATIC_IMPORT_RE, EXPORT_FROM_RE, DYNAMIC_IMPORT_RE]) {
    expression.lastIndex = 0;
    let match = expression.exec(sourceText);

    while (match) {
      specifiers.add(match[1]);
      match = expression.exec(sourceText);
    }
  }

  return [...specifiers].sort((left, right) => left.localeCompare(right));
}

function detectPackageName(context, specifier) {
  for (const entry of [...context.workspacePackages, ...context.externalPackages]) {
    if (specifier === entry.name || specifier.startsWith(`${entry.name}/`)) {
      return entry.name;
    }
  }

  return null;
}

function detectCycles(graph) {
  const visited = new Set();
  const active = new Set();
  const stack = [];
  const cycles = [];

  function visit(node) {
    if (active.has(node)) {
      const startIndex = stack.indexOf(node);
      cycles.push([...stack.slice(startIndex), node]);
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    active.add(node);
    stack.push(node);

    for (const dependency of graph.get(node) ?? []) {
      visit(dependency);
    }

    stack.pop();
    active.delete(node);
  }

  for (const node of [...graph.keys()].sort((left, right) => left.localeCompare(right))) {
    visit(node);
  }

  return cycles;
}

function parseArguments(argv) {
  const options = {
    check: false,
    json: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--check') {
      options.check = true;
      continue;
    }

    if (argument === '--json') {
      options.json = argv[index + 1] ?? '';
      index += 1;
    }
  }

  return options;
}

const options = parseArguments(process.argv.slice(2));
const context = createMainPackageContext(repoRoot);
const packageEntries = [...context.workspacePackages, ...context.externalPackages].sort((left, right) =>
  left.name.localeCompare(right.name),
);
const graph = new Map(packageEntries.map((entry) => [entry.name, new Set()]));
const edgesBySource = new Map(packageEntries.map((entry) => [entry.name, new Map()]));
const deepImportViolations = [];
const undeclaredImportViolations = [];

for (const entry of context.workspacePackages) {
  const sourceDirectory = path.join(entry.directory, 'src');
  const sourceFiles = collectSourceFiles(sourceDirectory);

  for (const filePath of sourceFiles) {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const specifiers = extractSpecifiers(sourceText);

    for (const specifier of specifiers) {
      if (specifier.includes('/src/')) {
        const targetPackageName = detectPackageName(context, specifier);

        if (targetPackageName && targetPackageName !== entry.name) {
          deepImportViolations.push({
            sourcePackage: entry.name,
            targetPackage: targetPackageName,
            specifier,
            filePath: path.relative(repoRoot, filePath).replace(/\\/g, '/'),
          });
        }
      }

      const targetPackageName = detectPackageName(context, specifier);

      if (!targetPackageName || targetPackageName === entry.name) {
        continue;
      }

      graph.get(entry.name)?.add(targetPackageName);

      if (!entry.declaredDependencies.has(targetPackageName)) {
        undeclaredImportViolations.push({
          sourcePackage: entry.name,
          targetPackage: targetPackageName,
          specifier,
          filePath: path.relative(repoRoot, filePath).replace(/\\/g, '/'),
        });
      }

      const files = edgesBySource.get(entry.name)?.get(targetPackageName) ?? [];
      files.push(path.relative(repoRoot, filePath).replace(/\\/g, '/'));
      edgesBySource.get(entry.name)?.set(targetPackageName, files);
    }
  }
}

const normalizedGraph = new Map(
  [...graph.entries()].map(([name, dependencies]) => [name, [...dependencies].sort((left, right) => left.localeCompare(right))]),
);
const workspaceGraph = new Map(
  context.workspacePackages.map((entry) => [
    entry.name,
    normalizedGraph.get(entry.name)?.filter((dependency) => context.workspaceByName.has(dependency)) ?? [],
  ]),
);
const cycles = detectCycles(workspaceGraph);
const layers = getWorkspaceDependencyLayers(context);
const chunkLayerPlan = new Map();

for (const { name, layer } of layers.layers) {
  const existing = chunkLayerPlan.get(layer) ?? [];
  existing.push(name);
  chunkLayerPlan.set(layer, existing);
}

const reportLines = [];

reportLines.push('Workspace package dependency layers');
for (const [layer, names] of [...chunkLayerPlan.entries()].sort((left, right) => left[0] - right[0])) {
  reportLines.push(`  layer ${layer}: ${names.sort((left, right) => left.localeCompare(right)).join(', ')}`);
}

reportLines.push('');
reportLines.push('apps/main external file packages');
if (context.externalPackages.length === 0) {
  reportLines.push('  none');
} else {
  for (const entry of context.externalPackages) {
    reportLines.push(`  ${entry.name}: ${path.relative(repoRoot, entry.directory).replace(/\\/g, '/')}`);
  }
}

reportLines.push('');
reportLines.push('Workspace import graph');
for (const entry of context.workspacePackages) {
  const dependencies = normalizedGraph.get(entry.name) ?? [];
  reportLines.push(`  ${entry.name}: ${dependencies.length === 0 ? 'none' : dependencies.join(', ')}`);
}

reportLines.push('');
reportLines.push('Workspace cycles');
if (cycles.length === 0 && layers.unresolved.length === 0) {
  reportLines.push('  none');
} else {
  for (const cycle of cycles) {
    reportLines.push(`  ${cycle.join(' -> ')}`);
  }
  if (layers.unresolved.length > 0) {
    reportLines.push(`  unresolved nodes: ${layers.unresolved.join(', ')}`);
  }
}

reportLines.push('');
reportLines.push('Cross-package src deep imports');
if (deepImportViolations.length === 0) {
  reportLines.push('  none');
} else {
  for (const violation of deepImportViolations) {
    reportLines.push(
      `  ${violation.sourcePackage} -> ${violation.targetPackage}: ${violation.specifier} (${violation.filePath})`,
    );
  }
}

reportLines.push('');
reportLines.push('Undeclared package imports');
if (undeclaredImportViolations.length === 0) {
  reportLines.push('  none');
} else {
  for (const violation of undeclaredImportViolations) {
    reportLines.push(
      `  ${violation.sourcePackage} -> ${violation.targetPackage}: ${violation.specifier} (${violation.filePath})`,
    );
  }
}

console.log(reportLines.join('\n'));

if (options.json) {
  const payload = {
    workspaceLayers: layers.layers,
    unresolvedWorkspaceNodes: layers.unresolved,
    externalPackages: context.externalPackages.map((entry) => ({
      name: entry.name,
      directory: path.relative(repoRoot, entry.directory).replace(/\\/g, '/'),
    })),
    graph: Object.fromEntries(normalizedGraph),
    cycles,
    deepImportViolations,
    undeclaredImportViolations,
  };

  fs.writeFileSync(options.json, JSON.stringify(payload, null, 2));
}

if (options.check && (cycles.length > 0 || layers.unresolved.length > 0 || deepImportViolations.length > 0 || undeclaredImportViolations.length > 0)) {
  process.exit(1);
}
