# Build Guide

> Complete instructions for setting up and building nop-chaos-next, including sibling repository dependencies.

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | Tested on Node 25 |
| pnpm | 10.0.0 | Set via `packageManager` field; `corepack enable` recommended |
| npm | bundled with Node | Required by amis-react19 (uses npm workspaces) |
| Git | any | |

---

## 2. Directory Layout

`nop-chaos-next` depends on two sibling repositories at the same parent level:

```
<parent>/
  amis-react19/          # AMIS fork (npm workspaces)
    dist-packages/       # tgz output of pack:nop-chaos
      amis-6.13.1.tgz
      amis-core-6.13.1.tgz
      amis-formula-6.13.1.tgz
      amis-ui-6.13.1.tgz
      office-viewer-0.3.14.tgz
  nop-chaos-flux/        # Flux UI packages (pnpm workspaces)
    packages/
      ui/                # @nop-chaos/ui components
      theme-tokens/      # @nop-chaos/theme-tokens
      tailwind-preset/   # @nop-chaos/tailwind-preset
  nop-chaos-next/        # This repo (pnpm workspaces)
    apps/main/
    packages/
    flux-lib/ui/         # synced from nop-chaos-flux
    ...
```

| Sibling repo | Integration method | What it provides |
|-------------|-------------------|------------------|
| `amis-react19` | `file:*.tgz` in package.json | AMIS renderer (React 19 fork) |
| `nop-chaos-flux` | Source sync via `pnpm sync:flux` | UI components, theme tokens, Tailwind preset |

Without the tgz files from amis-react19, `pnpm install` will fail. Without the Flux sync, `@nop-chaos/ui` and related packages will be missing.

---

## 3. Standard Build (First-Time Setup)

### Step 1: Clone all three repositories

```bash
cd /path/to/parent

git clone https://gitee.com/canonical-entropy/amis-react19.git
git clone https://gitee.com/canonical-entropy/nop-chaos-flux.git
git clone <nop-chaos-next-repo-url>
```

### Step 2: Build and pack amis-react19

```bash
cd amis-react19

# Install dependencies (npm workspaces, not pnpm)
npm install

# Build and pack all AMIS packages into dist-packages/*.tgz
npm run pack:nop-chaos
```

`pack:nop-chaos` runs these steps in order:

1. Clean `dist-packages/`
2. Build `amis-formula` -> pack -> `amis-formula-6.13.1.tgz`
3. Build `amis-core` -> pack -> `amis-core-6.13.1.tgz`
4. Build `amis-ui` -> pack -> `amis-ui-6.13.1.tgz`
5. Build `office-viewer` -> pack -> `office-viewer-0.3.14.tgz`
6. Build `amis` (custom build) -> pack -> `amis-6.13.1.tgz`

All steps run with `SKIP_SDK_BUILD=1` to skip SDK generation.

### Step 3: Install, sync Flux packages, and build

```bash
cd ../nop-chaos-next

# Install dependencies (resolves tgz files from sibling amis-react19)
pnpm install

# Sync UI packages from sibling nop-chaos-flux
pnpm sync:flux

# Build all packages
pnpm build
```

`pnpm sync:flux` copies three packages from `../nop-chaos-flux/packages/`:

| Source | Destination |
|--------|------------|
| `packages/ui/` | `flux-lib/ui/` |
| `packages/theme-tokens/` | `packages/theme-tokens/` |
| `packages/tailwind-preset/` | `packages/tailwind-preset/` |

It also strips upstream test files and refreshes the workspace install.

`pnpm build` for `apps/main` runs the full pipeline:

1. `ensure-amis-file-deps-built.mjs` -- verifies tgz files exist (auto-triggers `pack:nop-chaos` if missing)
2. `check-main-external-runtime-deps.mjs --check` -- verifies shared runtime singletons (react, react-dom, echarts)
3. `tsc --noEmit` -- type check
4. `vite build` -- bundle with code splitting
5. `analyze-main-package-graph.mjs --check` -- source dependency graph validation
6. `analyze-main-chunk-graph.mjs --check` -- chunk layering validation

### Step 4: Start development server

```bash
pnpm dev          # All packages
pnpm dev:main     # Main app only
```

---

## 4. Quick Commands Reference

### nop-chaos-next (this repo)

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm sync:flux` | Sync UI packages from `../nop-chaos-flux` |
| `pnpm rebuild:amis-flux:build` | Repack AMIS, repack Flux, sync Flux packages, then build this repo |
| `pnpm dev` | Start dev server (all packages) |
| `pnpm dev:main` | Start main app dev server only |
| `pnpm build` | Build all packages (includes AMIS pre-build check) |
| `pnpm typecheck` | TypeScript type check |
| `pnpm lint` | ESLint + source artifact check |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | E2E tests (Playwright) |
| `pnpm pack:amis:deps` | Manually trigger AMIS tgz build |
| `pnpm clean:dist-packages` | Clean amis-react19/dist-packages/ |

### amis-react19 (sibling repo)

| Command | Description |
|---------|-------------|
| `npm install` | Install AMIS workspace dependencies |
| `npm run pack:nop-chaos` | Build + pack all AMIS packages into tgz |
| `npm run build --workspace=packages/amis-formula` | Build single package |

### nop-chaos-flux (sibling repo)

Two flows exist for Flux integration:

- `pnpm sync:flux` in `nop-chaos-next` syncs `packages/ui`, `packages/theme-tokens`, and `packages/tailwind-preset` from the sibling repo, applies the runtime-only package policy, and rebuilds the synced workspace packages.
- `pnpm pack:flux-bundle` in `nop-chaos-flux` rebuilds and packs the `@nop-chaos/flux` tarball consumed by `apps/main`.

The canonical sync policy now lives in `docs/references/flux-sync-spec.md`.

For a full local refresh across both sibling repos, use the root command in `nop-chaos-next`:

```bash
pnpm rebuild:amis-flux:build
```

This runs, in order:

1. `npm run pack:nop-chaos` in `../amis-react19`
2. `pnpm --filter @nop-chaos/ui build` in `../nop-chaos-flux`
3. `pnpm pack:flux-bundle` in `../nop-chaos-flux`
4. `pnpm sync:flux` in `nop-chaos-next`
5. `pnpm build` in `nop-chaos-next`

### Guardrails and examples

- `turbo lint` currently depends on upstream package builds via `turbo.json`, so a clean `pnpm build` remains part of the expected verification baseline before large lint sweeps
- `lint-staged` runs `prettier --write` for `*.{ts,tsx}` in addition to ESLint, so pre-commit formatting is part of the live DX contract
- `examples/plugin-demo` and `examples/extension-demo` now ship real `vitest.config.ts` files and focused tests; they are no longer allowed to rely on `--passWithNoTests` as a fake baseline
- demo i18n is part of the reference surface: if a demo calls a translation API, it must also ship matching locale assets and tests
- remote plugin bundles are expected to `default export` a React component; the host plugin slot now treats invalid default exports and long-running loads as explicit runtime errors instead of leaving the page in an indefinite loading state

---

## 5. AMIS Development Workflow

When you need to modify AMIS source code and iterate:

### Option A: Hot-sync (recommended for quick iterations)

Build in amis-react19, then sync built files directly into nop-chaos-next's node_modules:

```bash
# From nop-chaos-next
bash scripts/sync-amis.sh --build            # Build all, then sync
bash scripts/sync-amis.sh --build amis-ui    # Build & sync specific package
bash scripts/sync-amis.sh                    # Sync only (no build)
```

`sync-amis.sh` copies `lib/` and `esm/` from amis-react19 source into the pnpm store's resolved package locations, and clears the Vite pre-bundle cache.

Override the default amis-react19 path with `AMIS_ROOT`:

```bash
AMIS_ROOT=/custom/path/to/amis-react19 bash scripts/sync-amis.sh --build
```

### Option B: Full tgz rebuild (for final verification)

```bash
# In amis-react19
npm run pack:nop-chaos

# In nop-chaos-next
pnpm install
pnpm build
```

---

## 6. Flux Development Workflow

When you need to modify Flux UI components:

```bash
# 1. Make changes in ../nop-chaos-flux/packages/ui/

# 2. Sync updated packages into this workspace
pnpm sync:flux

# 3. When the Flux tarball is also involved, rebuild everything end-to-end
pnpm rebuild:amis-flux:build
```

Sync specific packages only:

```bash
bash scripts/sync-flux-lib.sh ui                    # sync ui only
bash scripts/sync-flux-lib.sh theme-tokens          # sync theme-tokens only
bash scripts/sync-flux-lib.sh ui tailwind-preset     # sync multiple
```

Override the default Flux repo path with `FLUX_ROOT`:

```bash
FLUX_ROOT=/custom/path/to/nop-chaos-flux pnpm sync:flux
```

`pnpm sync:flux` is not a raw copy anymore. It now:

1. Replaces those packages with the upstream sibling sources
2. Removes synced test files plus accidental source artifacts such as `src/**/*.d.ts` and `src/**/*.d.ts.map`
3. Applies explicit runtime-only `package.json` policy (`scripts.test = vitest run --passWithNoTests` for the synced packages)
4. Runs `pnpm install` and rebuilds the synced workspace packages

Important: this is a runtime-oriented sync, not a full upstream mirror. Test sources are intentionally removed during sync. No generic downstream source patch replay is part of the live contract. See `docs/references/flux-sync-spec.md` for the governing contract, allowed downstream drift, and dependency metadata policy.

---

## 7. CI/CD Pipeline

A minimal CI pipeline:

```bash
# 1. Clone all three repos side by side
git clone https://gitee.com/canonical-entropy/amis-react19.git
git clone https://gitee.com/canonical-entropy/nop-chaos-flux.git
git clone <nop-chaos-next-repo-url>

# 2. Build AMIS packages
cd amis-react19
npm install
npm run pack:nop-chaos

# 3. Install, sync, build, and verify nop-chaos-next
cd ../nop-chaos-next
pnpm install
pnpm sync:flux
pnpm typecheck
pnpm build
pnpm lint
pnpm test

# 4. E2E tests (starts its own preview server)
pnpm test:e2e
```

---

## 8. Troubleshooting

### `pnpm install` fails with tgz not found

**Cause**: `amis-react19/dist-packages/*.tgz` does not exist.

**Fix**:
```bash
cd ../amis-react19 && npm install && npm run pack:nop-chaos
```

### `pnpm sync:flux` fails or packages not found

**Cause**: `nop-chaos-flux` is not cloned alongside this repo, or the source packages are missing.

**Fix**:
```bash
cd /path/to/parent
git clone https://gitee.com/canonical-entropy/nop-chaos-flux.git
cd nop-chaos-next
pnpm sync:flux
```

### `ensure-amis-file-deps-built` auto-triggers but fails

**Cause**: amis-react19 dependencies not installed or build fails.

**Fix**: Check `amis-react19` builds successfully standalone:
```bash
cd amis-react19
npm install
npm run pack:nop-chaos
```

### `check-main-external-runtime-deps` reports violations

**Cause**: Shared runtimes (react, react-dom, echarts) resolved to multiple copies.

**Fix**: This is usually a sign that the bundler alias configuration in `apps/main/vite.config.ts` is stale or incorrect. Check `scripts/main-bundle-utils.mjs` policy definitions and `getMainRuntimeOverrideAliases()`.

### Vite shows React dual-instance errors

**Cause**: Multiple React copies loaded at runtime.

**Fix**: The build pipeline should catch this. If it happens during dev, check that `resolve.dedupe` and alias entries in `apps/main/vite.config.ts` are active.

### `sync-amis.sh` fails on Windows

**Cause**: Script requires bash (Git Bash, WSL, etc.).

**Fix**: Use Git Bash or WSL. Alternatively, rebuild tgz: `cd ../amis-react19 && npm run pack:nop-chaos`.

---

## 9. Architecture Notes

### Why tgz instead of directory links?

Previous versions used `file:../amis-react19/packages/amis` (directory links). The tgz approach was introduced to:

- Provide a hermetic, reproducible dependency artifact
- Avoid pnpm treating directory links as workspace packages with special resolution
- Enable CI to cache and verify exact build outputs via integrity hashes
- Separate the AMIS build concern from nop-chaos-next's build

### Why source sync for Flux packages?

`nop-chaos-flux` provides shared UI components and theme infrastructure that are compiled as part of this workspace. Source sync (rather than tgz) is used because:

- These packages participate in the workspace TypeScript compilation and Tailwind scanning
- Changes are frequently co-developed across both repos
- The sync script strips upstream test files and refreshes the workspace automatically

The long-term plan is to transition Flux packages to a tarball-based distribution once the API surface stabilizes.

### Runtime singleton enforcement

`apps/main` and its external AMIS dependencies both depend on shared runtimes like `react` and `echarts`. Without enforcement, pnpm may install separate copies, causing dual-instance crashes at runtime.

The enforcement strategy has two layers:

1. **Node-level**: `check-main-external-runtime-deps.mjs` detects duplicate resolutions and fails the build if unmanaged.
2. **Bundler-level**: `vite.config.ts` uses `resolve.alias` + `resolve.dedupe` to force all imports through a single canonical copy.

See the generic method in [main-bundle-dependency-governance.md](../skills/main-bundle-dependency-governance.md) and the project spec in [main-bundle-dependency-spec.md](../design/main-bundle-dependency-spec.md).

### Remote plugin bundle honesty

`examples/plugin-demo/scripts/build-with-rollup.mjs` emits a SystemJS bundle that externalizes shared runtimes.

That means the generated `plugin-demo.system.js` only works when the host registers matching shared modules first, including `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `@nop-chaos/plugin-bridge`, `@nop-chaos/ui`, and other externalized packages.

Treat this demo as a host-coupled reference build, not a self-contained universal plugin artifact.
