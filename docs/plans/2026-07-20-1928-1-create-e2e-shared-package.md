# 1 Create e2e-shared Workspace Package

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 0.1), `docs/design/e2e-shared-infrastructure.md`
> Mission: e2e-upgrade
> Work Item: Phase 0.1 — Create `packages/e2e-shared`

## Purpose

Create the `packages/e2e-shared` workspace package as the single source of truth for cross-project E2E test infrastructure. Extract the core EngineAdapter interface, AmisAdapter/FluxAdapter implementations, PageObject base classes, API clients (GraphQLClient, RpcClient), Navigation, fixtures, and type definitions from the nop-app-erp `pages/` code, adapted to be an independent workspace package under nop-chaos-next.

## Current Baseline

- `packages/e2e-shared/` does not exist yet
- nop-app-erp has a mature `tests/e2e/pages/` implementation with the full set of interfaces and classes described in `docs/design/e2e-shared-infrastructure.md`
- nop-chaos-next has no shared E2E infrastructure — all spec files use ad-hoc selectors
- The workspace uses `pnpm` with `packages/*` glob in `pnpm-workspace.yaml`
- Existing packages follow the pattern: `package.json` with `"type": "module"`, `tsconfig.json` extending `tsconfig.base.json`, `build`/`typecheck`/`lint`/`test` scripts
- `tsconfig.base.json` path aliases need to be updated with `@nop-chaos/e2e-shared`
- `turbo.json` workspace configuration governs build/typecheck/test/lint task pipelines

## Goals

- Create the `packages/e2e-shared` directory with the full package structure defined in `docs/design/e2e-shared-infrastructure.md`
- All source files compile with `pnpm --filter @nop-chaos/e2e-shared typecheck`
- The package exports all public API surfaces via `src/index.ts`
- The package is registered in `pnpm-workspace.yaml` (already covered by `packages/*` glob)
- The package is registered in `tsconfig.base.json` path aliases
- `turbo.json` does not need explicit changes (the `packages/*` glob and `dependsOn: ["^build"]` pipeline handle it)
- The package has `build`, `typecheck`, `lint`, `test` scripts following workspace conventions

## Non-Goals

- Do NOT add Playwright as a direct dependency — shared lib is framework-agnostic (Playwright `Page` type is imported as a dev dependency for type checking only)
- Do NOT modify any existing spec files or playwright.config.ts in this plan
- Do NOT create the sync script (covered by Plan 2)
- Do NOT add unit tests for the shared library (the library is verified through e2e test execution; add tests if specific modules demand them)
- Do NOT change any existing package boundaries or workspace configuration beyond the minimal additions

## Scope

### In Scope

- Creation of `packages/e2e-shared/` directory structure
- `packages/e2e-shared/package.json` with `@nop-chaos/e2e-shared` name, workspace-standard scripts
- `packages/e2e-shared/tsconfig.json` extending `tsconfig.base.json`
- `packages/e2e-shared/src/` with all source files:
  - `index.ts` — public exports
  - `types.ts` — `EngineAdapter` interface, `CrudPageConfig`, constants
  - `engine.ts` — `getEngineType()`, `createEngine()`, `getEngine()` factory
  - `AmisAdapter.ts` — AMIS engine implementation
  - `FluxAdapter.ts` — Flux engine implementation
  - `Page.ts` — `BasePage` abstract base class
  - `CrudListPage.ts` — CRUD list page object
  - `FormDialog.ts` — form dialog page object
  - `GraphQLClient.ts` — GraphQL API client
  - `RpcClient.ts` — Nop RPC protocol client
  - `Navigation.ts` — `login()`, `navigateTo()`, `loginAndNavigate()`
  - `fixtures.ts` — Playwright custom fixtures (engine, page)
- `packages/e2e-shared/README.md` — brief usage guide
- Update `tsconfig.base.json` to add `@nop-chaos/e2e-shared` path alias
- `pnpm install` to link the new workspace package

### Out Of Scope

- Playwright `devDependencies` version selection (use compatible version matching the root `playwright.config.ts`)
- Any spec file modifications in `tests/e2e/`
- The sync script (`scripts/sync-e2e-shared.sh`)
- Documentation beyond the package README

## Execution Plan

### Phase 1 — Create package scaffolding

Status: completed
Targets: `packages/e2e-shared/package.json`, `packages/e2e-shared/tsconfig.json`, `tsconfig.base.json`

- Item Types: `Fix | Proof`

- [x] Create `packages/e2e-shared/` directory
- [x] Create `packages/e2e-shared/package.json` with workspace-standard configuration
- [x] Create `packages/e2e-shared/tsconfig.json` extending `tsconfig.base.json`
- [x] Add `@nop-chaos/e2e-shared` path alias to `tsconfig.base.json`
- [x] Run `pnpm install` to link the new workspace package
- [x] Verify `pnpm --filter @nop-chaos/e2e-shared typecheck` passes on empty `src/`

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [x] `packages/e2e-shared/package.json` exists and follows workspace conventions
- [x] `packages/e2e-shared/tsconfig.json` exists and extends `tsconfig.base.json`
- [x] `tsconfig.base.json` has `@nop-chaos/e2e-shared` alias pointing to `packages/e2e-shared/src/index.ts`
- [x] `pnpm install` succeeds and `pnpm ls --depth 0` shows `@nop-chaos/e2e-shared`
- [x] `pnpm --filter @nop-chaos/e2e-shared typecheck` passes
- [x] No owner-doc update required (scaffolding is self-documenting)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — Implement core interfaces and types

Status: completed
Targets: `packages/e2e-shared/src/types.ts`, `packages/e2e-shared/src/engine.ts`

- Item Types: `Fix | Proof`

- [x] Create `src/types.ts` — `EngineAdapter` interface with all methods per design doc, `CrudPageConfig`, `EngineType` type, constants
- [x] Create `src/engine.ts` — `getEngineType()` (reads `E2E_ENGINE` env var), `createEngine()`, `getEngine()` caching singleton
- [x] Verify `pnpm --filter @nop-chaos/e2e-shared typecheck` passes

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [x] `EngineAdapter` interface defines all CRUD, form, dialog, and selectOption methods matching the design doc
- [x] `engine.ts` exports `getEngineType()`, `createEngine()`, `getEngine()` with correct env var semantics
- [x] `pnpm --filter @nop-chaos/e2e-shared typecheck` passes
- [x] No owner-doc update required (types match design doc)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — Implement AmisAdapter and FluxAdapter

Status: completed
Targets: `packages/e2e-shared/src/AmisAdapter.ts`, `packages/e2e-shared/src/FluxAdapter.ts`

- Item Types: `Fix | Proof`

- [x] Create `src/AmisAdapter.ts` — implements `EngineAdapter` using `.cxd-*` CSS class selectors per design doc
- [x] Create `src/FluxAdapter.ts` — implements `EngineAdapter` using `data-slot` / `data-testid` selectors per design doc
- [x] Verify `pnpm --filter @nop-chaos/e2e-shared typecheck` passes

Exit Criteria:

> All `[x]` before Phase 3 Status can be set to `completed`.

- [x] `AmisAdapter` implements all `EngineAdapter` methods with correct AMIS selectors
- [x] `FluxAdapter` implements all `EngineAdapter` methods with correct Flux selectors
- [x] `pnpm --filter @nop-chaos/e2e-shared typecheck` passes
- [x] No owner-doc update required (adapters match design doc)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 — Implement PageObject base classes

Status: completed
Targets: `packages/e2e-shared/src/Page.ts`, `packages/e2e-shared/src/CrudListPage.ts`, `packages/e2e-shared/src/FormDialog.ts`

- Item Types: `Fix | Proof`

- [x] Create `src/Page.ts` — `BasePage` abstract class with `goto(hashRoute)` and shared page/engine references
- [x] Create `src/CrudListPage.ts` — extends `BasePage` with navigation, CRUD operations, row finding, API methods
- [x] Create `src/FormDialog.ts` — form dialog interaction: `waitForVisible`, `setField`, `getField`, `selectOption`, `submit`
- [x] Verify `pnpm --filter @nop-chaos/e2e-shared typecheck` passes

Exit Criteria:

> All `[x]` before Phase 4 Status can be set to `completed`.

- [x] `BasePage` provides `goto()` and shared constructor pattern
- [x] `CrudListPage` provides `navigate()`, `waitForList()`, CRUD button operations, row finding, `graphQL` client access
- [x] `FormDialog` provides full dialog interaction API
- [x] `pnpm --filter @nop-chaos/e2e-shared typecheck` passes
- [x] No owner-doc update required (classes match design doc)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 5 — Implement API clients and Navigation

Status: completed
Targets: `packages/e2e-shared/src/GraphQLClient.ts`, `packages/e2e-shared/src/RpcClient.ts`, `packages/e2e-shared/src/Navigation.ts`

- Item Types: `Fix | Proof`

- [x] Create `src/GraphQLClient.ts` — full GraphQL CRUD client with mutation/query support
- [x] Create `src/RpcClient.ts` — `loginRpc()`, `rpc()`, `resetAuth()` standalone functions + `RpcClient` class
- [x] Create `src/Navigation.ts` — `login()`, `navigateTo()`, `loginAndNavigate()` with browser-based auth
- [x] Verify `pnpm --filter @nop-chaos/e2e-shared typecheck` passes

Exit Criteria:

> All `[x]` before Phase 5 Status can be set to `completed`.

- [x] `GraphQLClient` implements all documented CRUD and query methods
- [x] `RpcClient` exports both standalone functions and class style with matching signatures
- [x] `Navigation` implements browser login flow and page navigation
- [x] `pnpm --filter @nop-chaos/e2e-shared typecheck` passes
- [x] No owner-doc update required (clients match design doc)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 6 — Implement fixtures, index.ts, README, and final verification

Status: completed
Targets: `packages/e2e-shared/src/fixtures.ts`, `packages/e2e-shared/src/index.ts`, `packages/e2e-shared/README.md`

- Item Types: `Fix | Proof`

- [x] Create `src/fixtures.ts` — custom Playwright `test` fixture with engine injection and enhanced page fixture (console error capture)
- [x] Create `src/index.ts` — re-export all public API surfaces
- [x] Create `README.md` — brief usage guide referencing the design doc
- [x] Final verification: `pnpm --filter @nop-chaos/e2e-shared typecheck` + `pnpm --filter @nop-chaos/e2e-shared build`
- [x] Run `pnpm typecheck` from root to ensure no regressions in other packages
- [x] Run `pnpm build` from root to ensure turbo pipeline still works

Exit Criteria:

> All `[x]` before Phase 6 Status can be set to `completed`.

- [x] `fixtures.ts` exports a `test` fixture with `engine` and `page` customization
- [x] `index.ts` exports all public API types, classes, and functions
- [x] `README.md` exists with minimal usage instructions
- [x] `pnpm --filter @nop-chaos/e2e-shared typecheck` passes
- [x] `pnpm --filter @nop-chaos/e2e-shared build` passes
- [x] `pnpm typecheck` (root) passes
- [x] `pnpm build` (root) passes
- [x] No owner-doc update required (design doc already documents the package structure)
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [x] All 6 phases completed with Exit Criteria checked
- [x] `packages/e2e-shared/` directory exists with the full file structure
- [x] `pnpm typecheck` passes from root
- [x] `pnpm build` passes from root
- [x] `pnpm lint` passes (no violations from the new package)
- [x] `pnpm test` passes (existing tests unaffected)
- [x] There are no deferred live defects or contract drifts
- [x] Owner docs (`docs/design/e2e-shared-infrastructure.md`) are current; update if the implementation diverged from the design
- [x] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- Add focused unit tests for `engine.ts`, `GraphQLClient`, `RpcClient` — not blocking package creation but desirable for contract stability in successor plans

## Closure

Status Note: All 6 phases completed. Package `packages/e2e-shared/` created with full file structure per design doc. Typecheck, build, lint, and test all pass. Workspace alias registered in `tsconfig.base.json`. No deferred in-scope defects or contract drifts.

Closure Audit Evidence:

- Auditor / Agent: closure-audit (independent subagent)
- Evidence:
  - `packages/e2e-shared/` exists with all 12 source files matching design doc
  - `packages/e2e-shared/package.json` — `@nop-chaos/e2e-shared` name, workspace-standard scripts
  - `packages/e2e-shared/tsconfig.json` extends `tsconfig.base.json`
  - `tsconfig.base.json` line 42: `@nop-chaos/e2e-shared` alias → `packages/e2e-shared/src/index.ts`
  - `pnpm typecheck` — 28/28 tasks pass
  - `pnpm build` — 15/15 tasks pass
  - `pnpm --filter @nop-chaos/e2e-shared lint` — 0 errors
  - `pnpm test` — 28/28 tasks pass (new package: `--passWithNoTests`)
  - `docs/logs/2026/07-20.md` recorded execution with full verification results
  - `docs/design/e2e-shared-infrastructure.md` is current and matches implementation
  - All execution items across 6 phases marked `[x]`
  - All Closure Gates marked `[x]`

Follow-up:

- Add focused unit tests for `engine.ts`, `GraphQLClient`, `RpcClient` — deferred to successor plan as non-blocking optimization candidate
