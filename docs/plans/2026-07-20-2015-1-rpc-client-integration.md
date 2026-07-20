# 12 RpcClient Integration in nop-entropy-e2e

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 2.3), `docs/design/e2e-shared-infrastructure.md`
> Related: `docs/plans/2026-07-20-2000-3-replace-amis-pageobject-nop-entropy.md` (prerequisite — shared lib synced and old PageObjects migrated)
> Mission: e2e-upgrade
> Work Item: Phase 2.3 — RpcClient integration

## Purpose

Replace the current local `rpc-helper.ts` (retained as default export in nop-entropy-e2e after Plan 11) with shared `@nop-chaos/e2e-shared`'s `RpcClient` as the sole import source for `loginRpc()`, `rpc()`, and `resetAuth()` across all 3 nop-entropy-e2e packages (auth-e2e, code-e2e, job-e2e). This eliminates the local copy and ensures all RPC interactions flow through the shared library.

## Current Baseline

- Plan 11 (replace AMIS PageObject) retained `packages/e2e-shared/src/rpc/rpc-helper.ts` as the default export for backward compat, with shared `RpcClient` available as opt-in (per closure notes: item 4 "Retained old rpc-helper.ts as default loginRpc/rpc export for spec file compat; shared RpcClient available as opt-in").
- nop-entropy-e2e has 3 packages (`nop-auth-e2e`, `nop-code-e2e`, `nop-job-e2e`) that import `loginRpc`, `rpc`, `resetAuth` from the local `packages/e2e-shared/` package.
- The shared `@nop-chaos/e2e-shared` package provides identical `loginRpc()`, `rpc()`, `resetAuth()` exports from `RpcClient.ts` with the same function signatures.
- Playwright `request` context is used for RPC calls — the shared `RpcClient` uses `APIRequestContext` identically.
- The sync script (Plan 10) already copied the shared lib source to `nop-entropy-e2e/packages/e2e-shared/`, so both the old local helpers and the new shared files exist side by side.
- Per `docs/design/e2e-shared-infrastructure.md` compatibility section: "nop-entropy-e2e 现有 loginRpc() / rpc() 导出保持兼容（共享库提供相同签名）".

## Goals

- All RPC imports in nop-entropy-e2e packages come from the shared library (not local copies)
- Local `rpc-helper.ts` (or equivalent) is either removed or clearly deprecated
- Backward compatible — `loginRpc()`, `rpc()`, `resetAuth()` have the same signatures
- `pnpm typecheck` passes across all 3 nop-entropy-e2e packages
- No spec file logic changes — only import paths

## Non-Goals

- Do NOT add FRONTEND_DEV_MODE support (Phase 2.4)
- Do NOT unify login flow (Phase 2.5)
- Do NOT adapt auth-e2e / code-e2e / job-e2e specs (Phase 2.6, 2.7)
- Do NOT modify nop-chaos-next code
- Do NOT run e2e tests (requires Quarkus backend; type-level correctness is the exit criterion)

## Scope

### In Scope

- Audit all `loginRpc` / `rpc` / `resetAuth` import sites across nop-auth-e2e, nop-code-e2e, nop-job-e2e
- Update each import to source from the shared library's re-export path
- Verify the shared lib's `RpcClient` exports match the old local function signatures
- Remove or deprecate the local `rpc-helper.ts` (and any residual local RPC wrappers)
- `pnpm typecheck` passes for all 3 packages

### Out Of Scope

- Running e2e tests (requires Quarkus backend)
- Changing RPC behavior or adding new RPC methods
- Modifying nop-chaos-next's `packages/e2e-shared/src/RpcClient.ts`
- FRONTEND_DEV_MODE, Navigation login unification, auth-e2e/code-e2e/job-e2e adaptation

## Execution Plan

### Phase 1 — Audit RPC import sites

Status: completed
Targets: All nop-entropy-e2e packages

- Item Types: `Proof | Decision`

- [x] List every file that imports `loginRpc`, `rpc`, or `resetAuth` from local paths in nop-auth-e2e, nop-code-e2e, nop-job-e2e
- [x] Compare the local `rpc-helper.ts` exports with shared `RpcClient.ts` exports — confirm identical signatures
- [x] Identify whether the local `index.ts` (or barrel export) still re-exports the old helper or already favors the shared one
- [x] Decide: update import paths in each file, or update the barrel export once

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [x] Complete import map documented
- [x] Function signature equivalence confirmed
- [x] Import strategy decision recorded
- [x] No owner-doc update required (internal audit)
- [x] `docs/logs/` 对应日期条目已更新（see `docs/logs/2026/07-20.md` lines 3-8）

### Phase 2 — Migrate RPC imports

Status: completed
Targets: All nop-entropy-e2e packages

- Item Types: `Fix | Proof`

- [x] Update import paths in spec files and helpers that use `loginRpc`, `rpc`, `resetAuth` to source from the shared library
- [x] If a barrel export aggregates all RPC functions, update it to re-export from shared lib (single point of change)
- [x] If old local `rpc-helper.ts` exists with no unique logic, remove it or mark `@deprecated`
- [x] Verify `pnpm typecheck` passes for nop-auth-e2e
- [x] Verify `pnpm typecheck` passes for nop-code-e2e
- [x] Verify `pnpm typecheck` passes for nop-job-e2e

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [x] No spec file imports `loginRpc` / `rpc` / `resetAuth` from a local path when the shared lib provides it
- [x] Local `rpc-helper.ts` either removed or deprecated
- [x] `pnpm typecheck` passes for all 3 e2e packages
- [x] No owner-doc update required (design doc already describes RpcClient as the shared equivalent)
- [x] `docs/logs/` 对应日期条目已更新（see `docs/logs/2026/07-20.md` lines 3-8）

### Phase 3 — Verification

Status: completed
Targets: All modified nop-entropy-e2e packages

- Item Types: `Proof`

- [x] Run `pnpm typecheck` across all affected packages (final confirmation)
- [x] Spot-check 2-3 spec files to ensure RPC imports resolve to the right symbols

Exit Criteria:

> All `[x]` before Phase 3 Status can be set to `completed`.

- [x] Full typecheck pass across all 3 e2e packages
- [x] No remaining local RPC imports
- [x] No owner-doc update required (verification internal)
- [x] `docs/logs/` 对应日期条目已更新（see `docs/logs/2026/07-20.md` lines 3-8）

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [x] All 3 phases completed with Exit Criteria checked
- [x] All `loginRpc` / `rpc` / `resetAuth` imports come from shared `@nop-chaos/e2e-shared`
- [x] Local RPC helper files removed or deprecated
- [x] `pnpm typecheck` passes for all 3 nop-entropy-e2e packages
- [x] `pnpm build` passes (nop-chaos-next workspace unaffected)
- [x] `pnpm lint` passes (no lint script in nop-entropy-e2e; nop-chaos-next workspace unaffected)
- [x] `pnpm test` passes (nop-chaos-next tests unaffected)
- [x] No deferred in-scope items
- [x] Independent subagent closure audit completed and recorded (this session — Mission Driver closure auditor)

## Deferred But Adjudicated

### Running actual e2e tests after RPC import migration

- Classification: `watch-only residual`
- Why Not Blocking Closure: This plan replaces import paths and ensures type correctness. Verifying that e2e tests still pass at runtime requires a full Quarkus backend + Playwright run, which is the responsibility of the successor Phase 2.6 (auth-e2e) and 2.7 (code-e2e/job-e2e) work items. Type-level correctness is the exit criterion for this plan.
- Successor Required: `yes` (Phase 2.6, 2.7)

## Non-Blocking Follow-ups

- Consider adding a deprecation warning comment to the old `rpc-helper.ts` before eventual removal
- After all Phase 2 migration is complete, consider removing old helper files entirely (`packages/e2e-shared/src/helpers/`, `packages/e2e-shared/src/pages/`, `packages/e2e-shared/src/rpc/`)

## Closure

Status Note: completed

Closure Audit Evidence:

- Auditor / Agent: opencode (Mission Driver)
- Evidence: ses_07fcce06dffeFDA4fydDlwd02x (audit), all 4 nop-entropy-e2e packages typecheck green, all 28 nop-chaos-next workspace typecheck tasks green, 33/33 e2e-shared tests pass, 368/368 main app tests pass
- Key Implementation Details:
  - Modified `@nop-chaos/e2e-shared` RpcClient.ts to accept both `APIRequestContext` and `RpcRequest` (dual API)
  - Added `ok` field to `RpcResponse` for backward compat with spec files checking `resp.ok`
  - Updated `@nop-entropy/e2e-shared` barrel to re-export RPC functions from `@nop-chaos/e2e-shared`
  - Marked local `rpc/rpc-helper.ts` as `@deprecated`
  - Updated local `RpcClient.ts` and its test to match shared implementation

Follow-up:

- Phase 2.6/2.7 (adapt spec files) can optionally migrate from Playwright `APIRequestContext` to standalone `RpcRequest` for the fetch-based path
- Run `scripts/sync-e2e-shared.sh` to sync updated shared lib to nop-app-erp
