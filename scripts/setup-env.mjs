#!/usr/bin/env node

/**
 * setup-env.mjs
 *
 * One-command environment setup for new developers. Automates:
 *   1. Clone missing brother repos (amis-react19, nop-chaos-flux)
 *   2. Import tgz artifacts into local libs/
 *   3. Sync optional Flux source packages
 *   4. Install workspace dependencies
 *
 * Usage:
 *   node scripts/setup-env.mjs
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const PARENT_DIR = path.resolve(REPO_ROOT, '..')

const AMIS_REPO = 'https://gitee.com/canonical-entropy/amis-react19.git'
const FLUX_REPO = 'https://gitee.com/canonical-entropy/nop-chaos-flux.git'

const AMIS_DIR = path.join(PARENT_DIR, 'amis-react19')
const FLUX_DIR = path.join(PARENT_DIR, 'nop-chaos-flux')

function log(msg) {
  console.log(`[setup-env] ${msg}`)
}

function warn(msg) {
  console.warn(`[setup-env] ⚠ ${msg}`)
}

function run(cmd, opts = {}) {
  const cwd = opts.cwd ?? REPO_ROOT
  log(`Running: ${cmd} (in ${path.relative(PARENT_DIR, cwd)})`)
  execSync(cmd, { cwd, stdio: 'inherit', ...opts })
}

function checkRepo(dir, name, repoUrl) {
  if (existsSync(dir)) {
    if (existsSync(path.join(dir, 'package.json'))) {
      log(`${name} found at ${dir}`)
      return true
    }
    warn(`${dir} exists but has no package.json — treating as missing`)
    return false
  }
  log(`Cloning ${name} from ${repoUrl} ...`)
  run(`git clone ${repoUrl} "${dir}"`, { cwd: PARENT_DIR })
  return existsSync(path.join(dir, 'package.json'))
}

function ensureTarballs(amisDir) {
  log('Importing AMIS tarballs into libs/ ...')
  run('bash scripts/import-amis-to-libs.sh', {
    cwd: REPO_ROOT,
    env: { ...process.env, AMIS_ROOT: amisDir },
  })
  return existsSync(path.join(REPO_ROOT, 'libs', 'amis-6.13.1.tgz'))
}

function syncFlux(fluxDir) {
  if (!existsSync(path.join(fluxDir, 'packages/ui'))) {
    warn('Flux packages not found — skipping sync')
    return false
  }
  log('Importing Flux tarball into libs/ ...')
  run('bash scripts/import-flux-to-libs.sh', {
    cwd: REPO_ROOT,
    env: { ...process.env, FLUX_ROOT: fluxDir },
  })
  log('Syncing Flux source packages ...')
  run('bash scripts/sync-flux-lib.sh', {
    cwd: REPO_ROOT,
    env: { ...process.env, FLUX_ROOT: fluxDir },
  })
  return true
}

function installDeps() {
  log('Installing workspace dependencies ...')
  run('pnpm install', { cwd: REPO_ROOT })
}

function main() {
  log('Starting environment setup')
  console.log('')

  // Step 1: Check / clone brother repos
  const amisOk = checkRepo(AMIS_DIR, 'amis-react19', AMIS_REPO)
  const fluxOk = checkRepo(FLUX_DIR, 'nop-chaos-flux', FLUX_REPO)

  if (!amisOk) {
    console.error(`\n[setup-env] ✗ Failed to set up amis-react19 at ${AMIS_DIR}`)
    process.exit(1)
  }

  if (!fluxOk) {
    console.error(`\n[setup-env] ✗ Failed to set up nop-chaos-flux at ${FLUX_DIR}`)
    process.exit(1)
  }

  // Step 2: Import AMIS tgz artifacts into libs/
  const tarballsOk = ensureTarballs(AMIS_DIR)

  if (!tarballsOk) {
    console.error('\n[setup-env] ✗ Failed to build AMIS tarballs')
    process.exit(1)
  }

  // Step 3: Import Flux tgz artifact and sync Flux source packages
  syncFlux(FLUX_DIR)

  // Step 4: Refresh file deps and install dependencies
  run('bash scripts/refresh-libs-deps.sh', { cwd: REPO_ROOT })
  installDeps()

  console.log('')
  log('Environment setup complete!')
  console.log('')
  console.log('  Run the dev server:')
  console.log('')
  console.log('    pnpm dev')
  console.log('')
}

main()
