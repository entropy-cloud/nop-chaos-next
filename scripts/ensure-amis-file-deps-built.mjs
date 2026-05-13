import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  createMainPackageContext,
  getMissingMainExternalBuildOutputs,
  repoRoot,
} from './main-bundle-utils.mjs';

const nodeCommand = process.execPath;
const npmCliPath = path.join(path.dirname(nodeCommand), 'node_modules', 'npm', 'bin', 'npm-cli.js');

if (!path.isAbsolute(npmCliPath)) {
  throw new Error('expected absolute npm cli path');
}

function getNpmCommandArguments(argumentsList) {
  return [npmCliPath, ...argumentsList];
}

function inferExternalRepoRoot(externalPackages) {
  const candidates = externalPackages
    .filter((entry) => ['amis', 'amis-core', 'amis-ui', 'amis-formula'].includes(entry.name))
    .map((entry) =>
      entry.kind === 'external-tarball'
        ? path.resolve(entry.directory, '..', '..')
        : path.resolve(entry.directory, '..', '..'),
    );
  const [first] = candidates;

  if (!first) {
    return null;
  }

  return candidates.every((candidate) => candidate === first) ? first : null;
}

function formatMissingEntries(entries) {
  return entries.map((entry) => `- ${entry.packageName}: ${entry.relativePath}`).join('\n');
}

function runBuild(externalRepoRoot) {
  const buildSteps = [
    ['run', 'build', '--workspace=packages/amis-formula'],
    ['run', 'build', '--workspace=packages/amis-core'],
    ['run', 'build', '--workspace=packages/amis-ui'],
    ['run', 'build', '--workspace=packages/amis'],
  ];

  for (const argumentsList of buildSteps) {
    const result = spawnSync(nodeCommand, getNpmCommandArguments(argumentsList), {
      cwd: externalRepoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      env: {
        ...process.env,
        SKIP_SDK_BUILD: '1',
      },
    });

    if (result.stdout) {
      process.stdout.write(result.stdout);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    if (result.status !== 0) {
      console.error(
        `Failed to build external AMIS file dependencies at step: ${argumentsList.join(' ')}`,
      );
      process.exit(result.status ?? 1);
    }
  }
}

function runPack(externalRepoRoot) {
  const result = spawnSync(nodeCommand, getNpmCommandArguments(['run', 'pack:nop-chaos']), {
    cwd: externalRepoRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    env: {
      ...process.env,
      SKIP_SDK_BUILD: '1',
    },
  });

  if (result.status !== 0) {
    console.error('Failed to pack external AMIS tgz dependencies');
    process.exit(result.status ?? 1);
  }
}

const context = createMainPackageContext(repoRoot);
const externalRepoRoot = inferExternalRepoRoot(context.externalPackages);

if (!externalRepoRoot) {
  console.log('main bundle external file dependencies not configured; skip AMIS prebuild check');
  process.exit(0);
}

let missingOutputs = getMissingMainExternalBuildOutputs(repoRoot);

if (missingOutputs.length === 0) {
  console.log('main bundle external file dependencies are already built');
  process.exit(0);
}

console.log('building missing AMIS file dependencies for apps/main');
console.log(formatMissingEntries(missingOutputs));

if (context.externalPackages.some((entry) => entry.kind === 'external-tarball')) {
  runPack(externalRepoRoot);
} else {
  runBuild(externalRepoRoot);
}

missingOutputs = getMissingMainExternalBuildOutputs(repoRoot);

if (missingOutputs.length > 0) {
  console.error('AMIS file dependency outputs are still missing after external build:');
  console.error(formatMissingEntries(missingOutputs));
  process.exit(1);
}

console.log('AMIS file dependencies built successfully');
