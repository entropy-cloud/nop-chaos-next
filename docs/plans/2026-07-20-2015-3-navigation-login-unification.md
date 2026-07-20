# 14 Navigation Login Unification in nop-entropy-e2e

> Plan Status: active
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 2.5), `docs/design/e2e-shared-infrastructure.md`
> Related: `docs/plans/2026-07-20-2000-3-replace-amis-pageobject-nop-entropy.md` (prerequisite — PageObject migration complete), `docs/plans/2026-07-20-2015-1-rpc-client-integration.md` (prerequisite — RPC imports unified)
> Mission: e2e-upgrade
> Work Item: Phase 2.5 — Navigation login unification

## Purpose

Migrate existing `LoginPage` / `LoginPO` usage in nop-entropy-e2e packages to use the shared `@nop-chaos/e2e-shared` `Navigation.login()` API, unifying the login flow across all 3 e2e packages (auth-e2e, code-e2e, job-e2e). This eliminates the local login implementations and ensures a single, shared login flow supporting both browser-based and RPC-based authentication modes.

## Current Baseline

- nop-entropy-e2e has local login helpers in `packages/e2e-shared/src/pages/login-page.ts` (and/or equivalent `LoginPage`/`LoginPO` classes) that implement browser login via form filling (`input[name="username"]`, `input[name="password"]`) followed by submission.
- The shared `@nop-chaos/e2e-shared` provides `Navigation.login()` (in `Navigation.ts`) which supports browser-based login with credentials.
- The shared library also provides `RpcClient.loginRpc()` for RPC-based login (used by auth-mode switching), already unified by Plan 12.
- Plan 11 (replace AMIS PageObject) retained backward-compatible local login exports; the shared `Navigation` class is available as opt-in.
- The design doc (`docs/design/e2e-shared-infrastructure.md`) specifies unified login under `E2E_AUTH_MODE` env var: `browser` (default, form-fill) or `rpc` (token-based).
- nop-entropy-e2e currently has no `E2E_AUTH_MODE` support — login is always browser-based via local helpers.
- Each package may have its own `LoginPage` or `LoginPO` extending or wrapping the local `login-page.ts`.
- `playwright.config.ts` changes for `FRONTEND_DEV_MODE` are handled by a separate plan (Plan 13) — this plan does not touch config files.

## Goals

- Replace all local `LoginPage` / `LoginPO` imports with shared `Navigation.login()` or `Navigation` constructor
- Shared `Navigation.login()` supports the same credential flow (username/password form fill)
- `E2E_AUTH_MODE=rpc` support is wired in (using shared `RpcClient.loginRpc()` for token-based login)
- Backward compatible — default login behavior unchanged
- `pnpm typecheck` passes for all 3 e2e packages
- No spec file behavior changes

## Non-Goals

- Do NOT add `FRONTEND_DEV_MODE` support (Phase 2.4, handled by Plan 13)
- Do NOT adapt auth-e2e / code-e2e / job-e2e specs (Phase 2.6, 2.7)
- Do NOT modify nop-chaos-next code
- Do NOT run e2e tests (requires Quarkus backend)
- Do NOT add global-setup / storageState optimization (out of scope — Phase 2 scoped to import rewiring)

## Scope

### In Scope

- Audit all `LoginPage` / `LoginPO` / `login-page` imports across nop-auth-e2e, nop-code-e2e, nop-job-e2e
- Replace with shared `Navigation.login()` — or `Navigation` class instantiation if the caller needs route navigation alongside login
- Wire optional `E2E_AUTH_MODE=rpc` path: use `RpcClient.loginRpc()` for token-based auth, set localStorage token
- Remove or deprecate local `login-page.ts` and any login-only adapter files
- `pnpm typecheck` passes for all 3 packages

### Out Of Scope

- Spec file adaptation (Phase 2.6, 2.7)
- `global-setup.ts` or `storageState` optimization (future Phase 2+ optimization)
- Changes to `playwright.config.ts`
- nop-chaos-next changes

## Execution Plan

### Phase 1 — Audit login imports and map migration

Status: planned
Targets: All nop-entropy-e2e packages

- Item Types: `Proof | Decision`

- [ ] List every file that imports `LoginPage`, `LoginPO`, or relative login helpers across nop-auth-e2e, nop-code-e2e, nop-job-e2e
- [ ] Compare local `login-page.ts` API with shared `Navigation.login()` API — document signature differences
- [ ] Identify whether spec files use `LoginPage` directly or through a helper/PO class
- [ ] Identify whether `LoginPage` is used standalone (just login) or as part of a larger navigation flow (navigate to page → login → wait for redirect)
- [ ] Decide per-package strategy: direct `Navigation.login()` vs `Navigation` class instantiation vs thin local adapter
- [ ] Identify any package-specific login quirks (custom redirect handling, post-login assertions, env-specific variants)

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [ ] Complete import map documented
- [ ] API compatibility between local and shared login documented
- [ ] Migration strategy per package decided
- [ ] Package-specific login quirks documented
- [ ] No owner-doc update required (internal audit)
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 — Migrate login imports in nop-auth-e2e

Status: planned
Targets: `nop-auth-e2e` package

- Item Types: `Fix | Proof | Decision`

- [ ] For each import site identified in Phase 1, replace local `LoginPage` import with shared `Navigation.login()`
- [ ] If the spec calls `loginPage.login(user, pass)` followed by navigation, replace with `Navigation.login(page, engine, { username, password })` — adjust call site as needed
- [ ] Wire `E2E_AUTH_MODE=rpc` path: if `process.env.E2E_AUTH_MODE === 'rpc'`, use `RpcClient.loginRpc()` to obtain token and set via `page.evaluate()` into localStorage instead of browser form-fill
- [ ] Verify `pnpm typecheck` passes for nop-auth-e2e

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [ ] No spec file in nop-auth-e2e imports from local login-page or LoginPage
- [ ] All login flows use shared `Navigation.login()` (browser mode) or `RpcClient.loginRpc()` (RPC mode)
- [ ] `pnpm typecheck` passes for nop-auth-e2e
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 — Migrate login imports in nop-code-e2e

Status: planned
Targets: `nop-code-e2e` package

- Item Types: `Fix | Proof`

- [ ] Apply same migration pattern as Phase 2 to nop-code-e2e
- [ ] Handle any package-specific login quirks found in Phase 1
- [ ] Verify `pnpm typecheck` passes for nop-code-e2e

Exit Criteria:

> All `[x]` before Phase 3 Status can be set to `completed`.

- [ ] No spec file in nop-code-e2e imports from local login-page or LoginPage
- [ ] All login flows use shared `Navigation.login()` or `RpcClient.loginRpc()`
- [ ] `pnpm typecheck` passes for nop-code-e2e
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 — Migrate login imports in nop-job-e2e

Status: planned
Targets: `nop-job-e2e` package

- Item Types: `Fix | Proof`

- [ ] Apply same migration pattern as Phase 2 to nop-job-e2e
- [ ] Verify `pnpm typecheck` passes for nop-job-e2e

Exit Criteria:

> All `[x]` before Phase 4 Status can be set to `completed`.

- [ ] No spec file in nop-job-e2e imports from local login-page or LoginPage
- [ ] All login flows use shared `Navigation.login()` or `RpcClient.loginRpc()`
- [ ] `pnpm typecheck` passes for nop-job-e2e
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 5 — Cleanup and final typecheck

Status: planned
Targets: All nop-entropy-e2e packages

- Item Types: `Fix | Proof`

- [ ] Remove or deprecate local `login-page.ts` (and any residual login-only adapter files)
- [ ] Run full `pnpm typecheck` across all 3 packages

Exit Criteria:

> All `[x]` before Phase 5 Status can be set to `completed`.

- [ ] Local login helper files removed or deprecated
- [ ] `pnpm typecheck` passes for all 3 packages
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [ ] All 5 phases completed with Exit Criteria checked
- [ ] No spec file in any nop-entropy-e2e package imports from local login helpers
- [ ] All login flows use shared `Navigation.login()` or `RpcClient.loginRpc()`
- [ ] `E2E_AUTH_MODE=rpc` wired in (using shared RPC-based login)
- [ ] `pnpm typecheck` passes for all 3 packages
- [ ] `pnpm build` passes (nop-chaos-next workspace unaffected)
- [ ] `pnpm lint` passes (nop-chaos-next workspace unaffected)
- [ ] `pnpm test` passes (nop-chaos-next tests unaffected)
- [ ] No deferred in-scope items
- [ ] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

### Running actual e2e tests after login migration

- Classification: `watch-only residual`
- Why Not Blocking Closure: This plan replaces login imports and ensures type correctness. Verifying that e2e tests still pass at runtime requires a full Quarkus backend + Playwright run, which is the responsibility of the successor Phase 2.6 (auth-e2e) and 2.7 (code-e2e/job-e2e) work items. Type-level correctness and import-path verification are the exit criteria for this plan.
- Successor Required: `yes` (Phase 2.6, 2.7)

### Global setup + storageState optimization

- Classification: `optimization candidate`
- Why Not Blocking Closure: The current login-per-spec approach works correctly; optimizing to a single global-setup with storageState reuse would reduce test runtime but does not change the login correctness or API compatibility. This is a performance optimization for a future Phase.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Consider updating `docs/design/e2e-shared-infrastructure.md` with any login flow specifics discovered during migration

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<no remaining plan-owned work>>
