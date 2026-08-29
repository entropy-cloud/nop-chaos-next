#!/usr/bin/env node
/**
 * Sync SDK tarballs from the monorepo's dist/sdks/ to this project's
 * sdks/ directory. Run via `pnpm setup`.
 *
 * Why: this external demo doesn't use workspace:* deps — it references
 * SDK tarballs from a local sdks/ folder (mirroring the "you got
 * sdks/ from a release" workflow). This script does the copy step.
 *
 * In CI / production, the user might instead manually drop a
 * pre-released sdks/ folder from the distribution artifact.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const targetSdks = resolve(projectRoot, 'sdks');

// Source: monorepo's dist/sdks/. Allow override via env var.
const sourceSdks = process.env.SDKS_SOURCE
  ? resolve(process.env.SDKS_SOURCE)
  : resolve(projectRoot, '../../dist/sdks');

if (!existsSync(sourceSdks)) {
  console.error(`[setup] Source SDK dir not found: ${sourceSdks}`);
  console.error(`Set SDKS_SOURCE=<path> or run 'pnpm pack:sdk' in the monorepo.`);
  process.exit(1);
}

console.log(`[setup] Copying tarballs from ${sourceSdks} → ${targetSdks}`);

mkdirSync(targetSdks, { recursive: true });

const allFiles = existsSync(sourceSdks) ? readdirSync(sourceSdks) : [];
let copied = 0;

// Copy all .tgz files
for (const entry of allFiles) {
  if (entry.endsWith('.tgz')) {
    cpSync(join(sourceSdks, entry), join(targetSdks, entry));
    console.log(`  + ${entry}`);
    copied += 1;
  }
}

// Copy specific support files
for (const file of ['version-manifest.json', 'setup-extension.mjs', 'extension-host-shell-plugin.mjs']) {
  if (existsSync(join(sourceSdks, file))) {
    cpSync(join(sourceSdks, file), join(targetSdks, file));
    console.log(`  + ${file}`);
    copied += 1;
  }
}

console.log(`[setup] Copied ${copied} file(s) to sdks/`);