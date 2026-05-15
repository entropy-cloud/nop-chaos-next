import { copyFile, mkdir, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const sourceFile = resolve(rootDir, '../dist/plugin-demo.system.js');
const configuredTarget = process.env.NOP_PLUGIN_SYNC_TARGET;
const targetFile = configuredTarget
  ? resolve(configuredTarget)
  : resolve(rootDir, '../../../apps/main/public/plugins/plugin-demo.system.js');
const tempTargetFile = `${targetFile}.tmp`;

const RETRY_DELAY_MS = 150;
const MAX_RETRIES = 6;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function isRetryableError(error) {
  return (
    error && typeof error === 'object' && 'code' in error && ['EBUSY', 'EPERM'].includes(error.code)
  );
}

async function replaceFileWithRetry(source, target) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await rm(tempTargetFile, { force: true });
      await copyFile(source, tempTargetFile);
      await rm(target, { force: true });
      await rename(tempTargetFile, target);
      return;
    } catch (error) {
      await rm(tempTargetFile, { force: true }).catch(() => undefined);

      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        throw error;
      }

      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }
}

await mkdir(dirname(targetFile), { recursive: true });
await replaceFileWithRetry(sourceFile, targetFile);
