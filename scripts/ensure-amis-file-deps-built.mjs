import path from 'node:path';
import process from 'node:process';
import {
  getMissingMainExternalBuildOutputs,
  repoRoot,
} from './main-bundle-utils.mjs';

function formatMissingEntries(entries) {
  return entries.map((entry) => `- ${entry.packageName}: ${entry.relativePath}`).join('\n');
}

let missingOutputs = getMissingMainExternalBuildOutputs(repoRoot);

if (missingOutputs.length === 0) {
  console.log('main bundle external file dependencies are available in libs/');
  process.exit(0);
}

const libsDirectory = path.relative(repoRoot, path.join(repoRoot, 'libs')) || 'libs';

console.error(`Missing external tarballs required by apps/main in ${libsDirectory}:`);
console.log(formatMissingEntries(missingOutputs));
console.error('Run `pnpm import:amis` or copy the required tgz files into libs/.');
process.exit(1);
