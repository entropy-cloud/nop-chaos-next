# 11 Replace AMIS-only PageObject in nop-entropy-e2e

> Plan Status: active
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 2.2), `docs/design/e2e-shared-infrastructure.md`
> Related: `docs/plans/2026-07-20-2000-2-sync-e2e-shared-to-nop-entropy.md` (REQUIRED prerequisite — shared lib must be synced first)
> Mission: e2e-upgrade
> Work Item: Phase 2.2 — Replace AMIS-only PageObject

## Purpose

Replace nop-entropy-e2e's AMIS-only `AmisCrudPage` with the dual-engine shared `CrudListPage` + `FormDialog` from `@nop-chaos/e2e-shared`, and migrate the local `helpers/` modules to use shared library equivalents. This is the first code migration step in Phase 2.

## Current Baseline

- nop-entropy-e2e is a sibling project at `../nop-entropy/nop-entropy-e2e/` with 3 e2e packages: `nop-auth-e2e`, `nop-code-e2e`, `nop-job-e2e`.
- Each package has its own `playwright.config.ts`, spec files, and shared helpers.
- Shared helpers are organized within `packages/e2e-shared/`:
  - `packages/e2e-shared/src/` — `LoginPage`, `BasePage`, `AmisCrudPage` (AMIS-only, no Flux)
  - `packages/e2e-shared/src/helpers/` — `amis-selectors.ts`, `modal-helper.ts`, `table-helper.ts`, `form-helper.ts`, `button-helper.ts`
  - `packages/e2e-shared/src/rpc/` — `rpc-helper.ts` (loginRpc, rpc, resetAuth)
- `AmisCrudPage` uses `.cxd-*` CSS selectors exclusively — no `EngineAdapter` abstraction.
- `AmisCrudPage` is an abstract class with constructor `(page: Page)` and requires subclasses to define an abstract `entityName` property. Spec files extend it with `class UserPO extends AmisCrudPage` using `super(page)`. The shared `CrudListPage` is a concrete class with constructor `(page, engine, config: CrudPageConfig)` — a different API shape that existing PO subclasses cannot directly inherit from.
- Plan 10 (sync) is expected to have copied `@nop-chaos/e2e-shared` source files into `packages/e2e-shared/`, creating a shared library copy alongside the existing local AMIS-only code.
- The shared library provides:
  - `EngineAdapter` interface with `AmisAdapter` and `FluxAdapter` implementations
  - `BasePage`, `CrudListPage`, `FormDialog` (dual-engine aware)
  - `GraphQLClient`, `RpcClient` (backward-compatible with existing `loginRpc()`/`rpc()` exports)
  - `Navigation`, `MockAuthAdapter`, `fixtures.ts`
- The shared `RpcClient` exports `loginRpc`, `rpc`, `resetAuth` as standalone functions — same API as nop-entropy-e2e's current helpers.
- Migration pattern documented in `docs/design/e2e-shared-infrastructure.md` (Phase 2 section).

## Goals

- Replace `AmisCrudPage` imports in all e2e packages with the shared `CrudListPage` + `FormDialog`
- Migrate `helpers/amis-selectors.ts` to use `AmisAdapter` from the shared library
- Migrate `helpers/modal-helper.ts`, `helpers/table-helper.ts`, `helpers/form-helper.ts`, `helpers/button-helper.ts` to use shared library equivalents
- Migrate `helpers/rpc/rpc-helper.ts` to use shared `RpcClient` (already backward-compatible exports)
- Migrate `helpers/login-page.ts` to use shared `Navigation` + `BasePage`
- All existing spec files continue to pass with the migrated imports
- No changes to spec files themselves (import paths only, or minimal adapters)

## Non-Goals

- Do NOT add FRONTEND_DEV_MODE support (Phase 2.4)
- Do NOT unify login flow (Phase 2.5)
- Do NOT modify nop-chaos-next code
- Do NOT add Flux-specific test coverage (Phase 4)
- Do NOT modify Playwright configs

## Scope

### In Scope

- Audit existing nop-entropy-e2e imports and usage of `AmisCrudPage`, helpers, and RPC helpers across all 3 e2e packages
- Replace `AmisCrudPage` → shared `CrudListPage` + `FormDialog` in each package
- Replace local helper modules → shared library equivalents
- Ensure backward-compatible re-exports exist for any modules that are widely imported
- Verify `pnpm typecheck` passes in each nop-entropy-e2e package
- Verify spec files still compile against the new imports

### Out Of Scope

- Running e2e tests
- Adding FRONTEND_DEV_MODE support
- Navigation login unification
- auth-e2e / code-e2e / job-e2e spec adaptation (Phase 2.6-2.7)
- Flux engine coverage in tests

## Execution Plan

### Phase 1 — Audit existing imports and usage

Status: planned
Targets: `packages/e2e-shared/`, `packages/nop-auth-e2e/`, `packages/nop-code-e2e/`, `packages/nop-job-e2e/` (all under `../nop-entropy/nop-entropy-e2e/`)

- Item Types: `Proof | Decision`

- [ ] List all files that import from the local `e2e-shared` package in nop-entropy-e2e
- [ ] List all files that import from local `helpers/` modules
- [ ] Map each import to its shared library equivalent
- [ ] Identify any local overrides or extensions that are NOT covered by the shared library
- [ ] Decide whether to keep local adapters or extend the shared lib
- [ ] **Decision: import path strategy** — Decide whether spec files should import from `@nop-chaos/e2e-shared` directly, or whether `@nop-entropy/e2e-shared` should re-export from `@nop-chaos/e2e-shared` for backward compatibility. Record the chosen strategy with rationale.
- [ ] **Decision: PO migration strategy** — Audit each `extends AmisCrudPage` subclass. For each, decide whether to rewrite as a direct `CrudListPage` instantiation, create a thin local adapter, or keep the local subclass with updated constructor.

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [ ] Complete import map documented
- [ ] Any gaps between local API and shared API identified
- [ ] Import path strategy decision recorded
- [ ] PO migration strategy decision recorded for each subclass
- [ ] Decision recorded for each local file (replace vs wrap vs keep)
- [ ] No owner-doc update required (audit is internal)
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 — Replace AmisCrudPage with shared CrudListPage + FormDialog

Status: planned
Targets: All nop-entropy-e2e packages using `AmisCrudPage`

- Item Types: `Fix | Proof`

- [ ] Update import paths in spec files that use `AmisCrudPage` to use `CrudListPage` and `FormDialog` from the shared library
- [ ] If `CrudListPage` constructor API differs from `AmisCrudPage`, add thin adapters or update call sites
- [ ] Verify `pnpm --filter nop-auth-e2e typecheck` passes (or equivalent package-level command)
- [ ] Repeat for nop-code-e2e and nop-job-e2e

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [ ] No spec file imports `AmisCrudPage` from local e2e-shared
- [ ] All CRUD page interactions go through shared `CrudListPage` + `FormDialog`
- [ ] `pnpm typecheck` passes across all 3 e2e packages
- [ ] No owner-doc update required (design doc already describes this migration)
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 — Migrate helpers to shared library equivalents

Status: planned
Targets: Local `helpers/` directories in each nop-entropy-e2e package

- Item Types: `Fix | Proof`

- [ ] Replace `helpers/amis-selectors.ts` references — use `AmisAdapter` from shared lib (the adapter encapsulates selector logic; specs should use `engine.crudContainer()` etc. rather than raw selectors)
- [ ] Replace `helpers/modal-helper.ts` — use shared `FormDialog` (provides `waitForVisible`, `setField`, `submit`, etc.)
- [ ] Replace `helpers/table-helper.ts` — use shared `CrudListPage` (provides `findRowByField`, `getCellText`, etc.)
- [ ] Replace `helpers/form-helper.ts` — use shared `FormDialog` (provides `setField`, `getField`, `selectOption`)
- [ ] Replace `helpers/button-helper.ts` — use shared `EngineAdapter.addButton()`, `EngineAdapter.rowAction()`
- [ ] Replace `helpers/rpc/rpc-helper.ts` — import `loginRpc`, `rpc`, `resetAuth` from shared `RpcClient`
- [ ] Replace `helpers/login-page.ts` — use shared `Navigation` + `BasePage` (or `MockAuthAdapter` for mock mode)
- [ ] If any helper has nop-entropy-specific logic not covered by shared lib, keep it as a local file that imports from shared lib
- [ ] Verify `pnpm typecheck` passes across all 3 e2e packages

Exit Criteria:

> All `[x]` before Phase 3 Status can be set to `completed`.

- [ ] No spec file imports from local `helpers/` modules that have shared equivalents
- [ ] RPC functions imported from shared `RpcClient` (backward-compatible `loginRpc`/`rpc` exports)
- [ ] Any nop-entropy-specific helper logic retained as thin local wrappers
- [ ] `pnpm typecheck` passes across all 3 e2e packages
- [ ] No owner-doc update required (design doc already describes this migration)
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 — Verification and regression check

Status: planned
Targets: All modified nop-entropy-e2e packages

- Item Types: `Proof`

- [ ] Run `pnpm typecheck` across all nop-entropy-e2e packages (verifies all imports resolve correctly)
- [ ] If typecheck-only tools exist (e.g., separate lint configs), run those too
- [ ] Verify that the local `e2e-shared` package's old exports (`AmisCrudPage`, etc.) are either removed or clearly marked as deprecated

Exit Criteria:

> All `[x]` before Phase 4 Status can be set to `completed`.

- [ ] Full typecheck pass across all affected packages
- [ ] Old AMIS-only PageObject classes not referenced by any remaining code
- [ ] `pnpm typecheck` passes
- [ ] No owner-doc update required (verification is internal)
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [ ] All 4 phases completed with Exit Criteria checked
- [ ] `AmisCrudPage` no longer used — replaced by shared `CrudListPage` + `FormDialog`
- [ ] All local helpers migrated to shared library equivalents (or retained as thin wrappers)
- [ ] `pnpm typecheck` passes across all 3 nop-entropy-e2e packages
- [ ] `pnpm build` passes (nop-chaos-next workspace unaffected)
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] No changes to nop-chaos-next code
- [ ] No deferred in-scope items
- [ ] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

### Running actual e2e tests after migration

- Classification: `watch-only residual`
- Why Not Blocking Closure: This plan replaces imports and ensures type correctness. Verifying that e2e tests still pass at runtime requires a full Quarkus backend + Playwright run, which is the responsibility of the successor Phase 2 workstream (2.6 auth-e2e, 2.7 code-e2e/job-e2e adaptation). Type-level correctness is the exit criterion for this plan.
- Successor Required: `yes` (Phase 2.6, 2.7 will run the actual tests)

### FluxAdapter engagement in nop-entropy-e2e

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Replacing `AmisCrudPage` with the shared `CrudListPage` makes the codebase dual-engine ready (tests could switch to Flux via `E2E_ENGINE=flux`). However, engaging the Flux adapter and verifying Flux-specific rendering is a separate concern (Phase 4) that should not block the structural migration.
- Successor Required: `no` (Phase 4 plans cover Flux engagement)

## Non-Blocking Follow-ups

- Consider removing the local `AmisCrudPage` file entirely after migration to prevent accidental re-imports
- Consider adding a deprecation warning comment to the old exports

## Closure

Status Note: (to be filled at completion)

Closure Audit Evidence:

- (to be filled at completion)

Follow-up:

- (to be filled at completion)
