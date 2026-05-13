import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { repoRoot } from './main-bundle-utils.mjs';

const STATIC_IMPORT_RE = /\bimport\s*(?:[^"'()]*?from\s*)?["'](\.\/[^"']+\.js)["']/g;
const EXPORT_FROM_RE = /\bexport\s+(?:\*|\{[^}]*\})\s*from\s+["'](\.\/[^"']+\.js)["']/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*["'](\.\/[^"']+\.js)["']\s*\)/g;

const CHUNK_TYPE_RANK = new Map([
  ['runtime', 0],
  ['vendor', 1],
  ['workspace', 2],
  ['host', 3],
  ['bridge', 4],
  ['page', 5],
  ['entry', 6],
  ['facade', 7],
  ['other', 8],
]);

function isAmisBridgeChunk(stem) {
  return (
    stem.startsWith('host-amis-') ||
    stem.startsWith('vendor-amis-bridge') ||
    stem.startsWith('vendor-amis-ui') ||
    stem.startsWith('vendor-amis-formula') ||
    stem.startsWith('vendor-amis-')
  );
}

function getCycleFamily(stem) {
  if (stem.startsWith('vendor-amis')) {
    return 'amis';
  }

  if (stem.startsWith('host-entry') || stem.startsWith('index-')) {
    return 'entry-bootstrap';
  }

  return null;
}

function parseArguments(argv) {
  const options = {
    assets: path.join(repoRoot, 'apps', 'main', 'dist', 'assets'),
    check: false,
    json: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--assets') {
      options.assets = path.resolve(argv[index + 1] ?? options.assets);
      index += 1;
      continue;
    }

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

function extractChunkImports(sourceText, expressions) {
  const imports = new Set();

  for (const expression of expressions) {
    expression.lastIndex = 0;
    let match = expression.exec(sourceText);

    while (match) {
      imports.add(path.basename(match[1]));
      match = expression.exec(sourceText);
    }
  }

  return [...imports].sort((left, right) => left.localeCompare(right));
}

function classifyChunk(chunkName, imports) {
  const stem = path.basename(chunkName, '.js');

  if (
    stem.startsWith('rolldown-runtime') ||
    stem.startsWith('preload-helper') ||
    stem.startsWith('storage-')
  ) {
    return 'runtime';
  }

  if (stem.startsWith('index-')) {
    return 'entry';
  }

  if (isAmisBridgeChunk(stem)) {
    return 'bridge';
  }

  if (stem.startsWith('vendor-')) {
    return 'vendor';
  }

  if (stem.startsWith('pkg-')) {
    return 'workspace';
  }

  if (stem === 'index') {
    return 'entry';
  }

  if (stem === 'shell-core' || stem.startsWith('host-')) {
    return 'host';
  }

  if (stem.startsWith('page-')) {
    return 'page';
  }

  if (imports.length <= 2) {
    return 'facade';
  }

  return 'other';
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

function isIgnorableCycle(cycle, chunks) {
  const cycleNodes = cycle.slice(0, -1);

  if (cycleNodes.length === 0) {
    return false;
  }

  const families = new Set(
    cycleNodes
      .map((name) => getCycleFamily(path.basename(name, '.js')))
      .filter(Boolean),
  );

  return families.size === 1 && cycleNodes.every((name) => chunks.has(name));
}

function isIgnorableViolation(sourceChunk, importedChunk) {
  if (!sourceChunk || !importedChunk) {
    return false;
  }

  const sourceStem = path.basename(sourceChunk.name, '.js');
  const targetStem = path.basename(importedChunk.name, '.js');

  if (sourceStem.startsWith('host-entry') && targetStem.startsWith('index-')) {
    return true;
  }

  return false;
}

const options = parseArguments(process.argv.slice(2));

if (!fs.existsSync(options.assets)) {
  console.error(`assets directory not found: ${options.assets}`);
  process.exit(1);
}

const chunkFiles = fs
  .readdirSync(options.assets)
  .filter((fileName) => fileName.endsWith('.js'))
  .sort((left, right) => left.localeCompare(right));
const chunks = new Map();

for (const fileName of chunkFiles) {
  const filePath = path.join(options.assets, fileName);
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const imports = extractChunkImports(sourceText, [STATIC_IMPORT_RE, EXPORT_FROM_RE]).filter((imported) =>
    chunkFiles.includes(imported),
  );
  const dynamicImports = extractChunkImports(sourceText, [DYNAMIC_IMPORT_RE]).filter((imported) =>
    chunkFiles.includes(imported),
  );
  const type = classifyChunk(fileName, imports);

  chunks.set(fileName, {
    name: fileName,
    size: fs.statSync(filePath).size,
    imports,
    dynamicImports,
    type,
    rank: CHUNK_TYPE_RANK.get(type) ?? CHUNK_TYPE_RANK.get('other'),
  });
}

const reverseImports = new Map([...chunks.keys()].map((name) => [name, []]));
for (const chunk of chunks.values()) {
  for (const target of chunk.imports) {
    reverseImports.get(target)?.push(chunk.name);
  }
}
for (const dependents of reverseImports.values()) {
  dependents.sort((left, right) => left.localeCompare(right));
}

const graph = new Map([...chunks.entries()].map(([name, chunk]) => [name, chunk.imports]));
const cycles = detectCycles(graph).filter((cycle) => !isIgnorableCycle(cycle, chunks));
const violations = [];

for (const chunk of chunks.values()) {
  for (const importedName of chunk.imports) {
    const importedChunk = chunks.get(importedName);

    if (!importedChunk) {
      continue;
    }

    if (chunk.type === 'facade' || chunk.type === 'entry') {
      continue;
    }

    if (isIgnorableViolation(chunk, importedChunk)) {
      continue;
    }

    if ((chunk.rank ?? 0) < (importedChunk.rank ?? 0)) {
      violations.push({
        kind: 'reverse-layer-import',
        source: chunk.name,
        sourceType: chunk.type,
        target: importedChunk.name,
        targetType: importedChunk.type,
      });
    }
  }
}

for (const chunk of chunks.values()) {
  if (chunk.type !== 'page') {
    continue;
  }

  for (const dependentName of reverseImports.get(chunk.name) ?? []) {
    const dependentChunk = chunks.get(dependentName);

    if (!dependentChunk || dependentChunk.type === 'facade' || dependentChunk.type === 'entry') {
      continue;
    }

    violations.push({
      kind: 'page-used-as-shared-runtime',
      source: dependentChunk.name,
      sourceType: dependentChunk.type,
      target: chunk.name,
      targetType: chunk.type,
    });
  }
}

const largestChunks = [...chunks.values()]
  .sort((left, right) => right.size - left.size)
  .slice(0, 15)
  .map((chunk) => `${chunk.name}: ${chunk.size}`);

const reportLines = [];
reportLines.push('Largest chunks');
for (const line of largestChunks) {
  reportLines.push(`  ${line}`);
}

reportLines.push('');
reportLines.push('Chunk imports');
for (const chunk of [...chunks.values()].sort((left, right) => left.name.localeCompare(right.name))) {
  const staticImports = chunk.imports.length === 0 ? 'none' : chunk.imports.join(', ');
  const dynamicImports = chunk.dynamicImports.length === 0 ? 'none' : chunk.dynamicImports.join(', ');
  reportLines.push(`  ${chunk.name} [${chunk.type}] -> ${staticImports}`);
  reportLines.push(`    dynamic -> ${dynamicImports}`);
}

reportLines.push('');
reportLines.push('Cycles');
if (cycles.length === 0) {
  reportLines.push('  none');
} else {
  for (const cycle of cycles) {
    reportLines.push(`  ${cycle.join(' -> ')}`);
  }
}

reportLines.push('');
reportLines.push('Layer violations');
if (violations.length === 0) {
  reportLines.push('  none');
} else {
  for (const violation of violations) {
    reportLines.push(
      `  ${violation.kind}: ${violation.source} [${violation.sourceType}] -> ${violation.target} [${violation.targetType}]`,
    );
  }
}

console.log(reportLines.join('\n'));

if (options.json) {
  const payload = {
    chunks: [...chunks.values()],
    reverseImports: Object.fromEntries(reverseImports),
    cycles,
    violations,
  };

  fs.writeFileSync(options.json, JSON.stringify(payload, null, 2));
}

if (options.check && (cycles.length > 0 || violations.length > 0)) {
  process.exit(1);
}
