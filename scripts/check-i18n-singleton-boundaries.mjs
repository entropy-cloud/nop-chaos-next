import { access, readdir, readFile } from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const workspaceRoots = ['apps', 'packages', 'examples', 'flux-lib'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const ignoredDirectoryNames = new Set(['dist', 'node_modules', 'coverage', '.turbo', 'test-results']);
const reactI18nextImportPattern = /from\s+['"]react-i18next['"]/;

function toPosixPath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectSourceFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredDirectoryNames.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

async function workspacePackageDirs() {
  const directories = [];

  for (const workspaceRoot of workspaceRoots) {
    const workspaceRootPath = path.join(rootDir, workspaceRoot);
    let entries = [];

    try {
      entries = await readdir(workspaceRootPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageDir = path.join(workspaceRootPath, entry.name);
      const manifestPath = path.join(packageDir, 'package.json');

      if (await pathExists(manifestPath)) {
        directories.push(packageDir);
      }
    }
  }

  return directories.sort((left, right) => left.localeCompare(right));
}

async function packageUsesReactI18next(packageDir) {
  const srcDir = path.join(packageDir, 'src');
  if (!(await pathExists(srcDir))) {
    return false;
  }

  let files = [];
  try {
    files = await collectSourceFiles(srcDir);
  } catch {
    return false;
  }

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8');
    if (reactI18nextImportPattern.test(content)) {
      return true;
    }
  }

  return false;
}

function hasDeclaredI18next(manifest) {
  return Boolean(
    manifest.dependencies?.i18next ||
      manifest.peerDependencies?.i18next ||
      manifest.devDependencies?.i18next,
  );
}

async function main() {
  const packageDirs = await workspacePackageDirs();
  const violations = [];
  const audited = [];

  for (const packageDir of packageDirs) {
    const manifestPath = path.join(packageDir, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const usesReactI18next = await packageUsesReactI18next(packageDir);

    if (!usesReactI18next) {
      continue;
    }

    audited.push(manifest.name ?? toPosixPath(packageDir));

    if (!hasDeclaredI18next(manifest)) {
      violations.push({
        packageName: manifest.name ?? toPosixPath(packageDir),
        manifestPath: toPosixPath(manifestPath),
      });
    }
  }

  if (violations.length > 0) {
    console.error('[check-i18n-singleton-boundaries] Missing i18next declarations:');
    for (const violation of violations) {
      console.error(
        `  - ${violation.packageName} (${violation.manifestPath}) imports react-i18next but does not declare i18next`,
      );
    }
    process.exit(1);
  }

  console.log(
    `[check-i18n-singleton-boundaries] OK (${audited.length} packages audited: ${audited.join(', ')})`,
  );
}

main().catch((error) => {
  console.error('[check-i18n-singleton-boundaries] failed', error);
  process.exit(1);
});
