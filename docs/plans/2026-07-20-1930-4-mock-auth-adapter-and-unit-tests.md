# 4 MockAuthAdapter and Shared Lib Unit Tests

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (items 1.8), `docs/plans/2026-07-20-1928-1-create-e2e-shared-package.md` (deferred unit tests)
> Related: `docs/plans/2026-07-20-1928-2-create-e2e-shared-sync-script.md`, `docs/plans/2026-07-20-1928-3-e2e-engine-and-base-url-support.md`
> Mission: e2e-upgrade
> Work Item: Phase 1.8 — MockAuthAdapter + shared lib unit tests

## Purpose

Add `MockAuthAdapter` to `packages/e2e-shared` to encapsulate the mock login + route interception pattern currently duplicated across every spec in `tests/e2e/support/auth.ts`. Also fulfill the deferred unit test items from Plan 1 for `engine.ts`, `GraphQLClient`, and `RpcClient`.

## Current Baseline

- `tests/e2e/support/auth.ts` (448 lines) provides the primary mock login implementation, used by 19 of 23 spec files. 4 spec files have local login implementations duplicating the same pattern: `amis-prototype.spec.ts`, `flux-prototype.spec.ts`, `check-live2.spec.ts`, `tmp-react-306.spec.ts`. It exports `login(page, options?)` which:
  - Sets up route interception for `/r/LoginApi__login*`, `/r/SiteMapApi__getSiteMap`, `/data/menu-config.json`
  - Handles both `harbor` and `default` login variant detection
  - Accepts a `setup` callback for custom route overrides (used by `permission.spec.ts`, `i18n-persistence.spec.ts`, `flow-editor.spec.ts`)
- `packages/e2e-shared/src/Navigation.ts` has a `login()` that does real credential-based login — NOT suitable for mock/development mode testing
- `packages/e2e-shared/src/` has no dedicated mock auth module; the shared lib fixture (`test`) from `fixtures.ts` updates `page` to capture console errors, but specs still import `test` from `@playwright/test` directly
- Deferred from Plan 1 (create-e2e-shared-package): "Add focused unit tests for `engine.ts`, `GraphQLClient`, `RpcClient`" — non-blocking optimization candidate
- Spec files import `{ login }` from `./support/auth` — no spec has been migrated to shared lib yet

## Goals

- Create `packages/e2e-shared/src/MockAuthAdapter.ts` — encapsulates the full mock login pattern from `support/auth.ts`
- The adapter exports:
  - `login(page, options?)` — identical API to current `support/auth.ts` (drop-in compatible)
  - `MockAuthAdapter` class for programmatic setup if needed
  - Default response builders (`buildMockLoginResponse`, `defaultSiteMapResponse`, `defaultMenuResponse`) for custom route scenarios
  - Support for `harbor` and `default` login variants
  - Support for `setup` callback (custom route overrides)
- Add focused unit tests for `engine.ts`, `GraphQLClient`, `RpcClient` in `packages/e2e-shared/`
- Typecheck and build pass for `@nop-chaos/e2e-shared`
- No breakage to existing `tests/e2e/support/auth.ts` imports (backward compatible)
- `@nop-chaos/e2e-shared` exports `login` from its public API surface

## Non-Goals

- Do NOT modify any existing spec files to use the new `login` import (covered by Phase 1.3-1.7 plans)
- Do NOT modify `tests/e2e/support/auth.ts` (it stays as the local reference; spec conversion happens in successor plans)
- Do NOT add Playwright as a direct runtime dependency (devDependency only for type checking)
- Do NOT add e2e-style Playwright tests in the shared package (unit tests only, Vitest-based)

## Scope

### In Scope

- Create `packages/e2e-shared/src/MockAuthAdapter.ts` with:
  - Re-exportable `login(page, options?)` function matching current `support/auth.ts` signature
  - `LoginOptions` type, `LoginVariant` type
  - Default response builders: `buildMockLoginResponse()`, `defaultSiteMapResponse`, `defaultMenuResponse`
  - Route interception setup for `/r/LoginApi__login*`, `/r/SiteMapApi__getSiteMap`, `/data/menu-config.json`
  - `harbor` vs `default` login variant detection
  - `setup` callback support for custom route overrides
  - `addInitScript` for localStorage/sessionStorage clearing
- Add `MockAuthAdapter` export to `packages/e2e-shared/src/index.ts`
- Add unit tests for `engine.ts` (`getEngineType`, `createEngine`, `getEngine`, `resetEngine`)
- Add unit tests for `GraphQLClient` (query, mutation, error handling)
- Add unit tests for `RpcClient` (loginRpc, rpc, resetAuth, setAuthToken)
- `pnpm --filter @nop-chaos/e2e-shared typecheck` passes
- `pnpm --filter @nop-chaos/e2e-shared test` passes
- `pnpm typecheck` (root) passes

### Out Of Scope

- Spec file modifications (covered by Phase 1.3-1.7)
- Changes to `support/auth.ts` local file
- Integration tests for MockAuthAdapter (tested through spec migrations)
- MockAuthAdapter unit tests (the adapter is verified through spec execution)
- Adding test runner dependencies beyond Vitest (already configured)

## Execution Plan

### Phase 1 — Create MockAuthAdapter

Status: completed
Targets: `packages/e2e-shared/src/MockAuthAdapter.ts`, `packages/e2e-shared/src/index.ts`

- Item Types: `Decision | Proof`

- [x] Create `packages/e2e-shared/src/MockAuthAdapter.ts`:
  - Export `LoginVariant` and `LoginOptions` types matching `support/auth.ts`
  - Export `buildMockLoginResponse(username, roles?)` — generates mock JWT token responses
  - Export `defaultSiteMapResponse` and `defaultMenuResponse` constants
  - Export `login(page, options?)` — full mock login flow with route interception
  - Harbor variant auto-detection (check for password input)
  - `setup` callback support for custom route overrides
- [x] Export `login` from `packages/e2e-shared/src/index.ts`
- [x] Verify `pnpm --filter @nop-chaos/e2e-shared typecheck` passes

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [x] `MockAuthAdapter.ts` exists and exports all documented functions and types
- [x] `login` function signature matches current `support/auth.ts` (drop-in compatible)
- [x] `index.ts` re-exports `login`, `LoginVariant`, `LoginOptions`, `buildMockLoginResponse`, `defaultSiteMapResponse`, `defaultMenuResponse`
- [x] `pnpm --filter @nop-chaos/e2e-shared typecheck` passes
- [x] `pnpm --filter @nop-chaos/e2e-shared lint` passes (new code must pass lint)
- [x] No owner-doc update required (MockAuthAdapter is a new module following existing patterns)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — Add unit tests for engine.ts, GraphQLClient, RpcClient

Status: completed
Targets: `packages/e2e-shared/src/engine.test.ts`, `packages/e2e-shared/src/GraphQlClient.test.ts`, `packages/e2e-shared/src/RpcClient.test.ts`

- Item Types: `Proof | Follow-up`

- [x] Create `engine.test.ts` with focused tests:
  - `getEngineType()` reads `E2E_ENGINE` env var correctly
  - `createEngine('amis')` returns `AmisAdapter` instance
  - `createEngine('flux')` returns `FluxAdapter` instance
  - `getEngine()` returns cached singleton
  - `resetEngine()` clears cache
- [x] Create `GraphQlClient.test.ts` with focused tests:
  - `query()` sends correct GraphQL request
  - `mutate()` sends correct mutation
  - Error handling for non-200 responses
  - Error handling for GraphQL error response body
- [x] Create `RpcClient.test.ts` with focused tests:
  - `loginRpc()` sets auth token
  - `rpc()` sends correct RPC request with headers
  - `resetAuth()` clears stored token
  - `setAuthToken()` updates token mid-session
- [x] Verify `pnpm --filter @nop-chaos/e2e-shared test` passes (all new tests + any existing)
- [x] Verify `pnpm --filter @nop-chaos/e2e-shared typecheck` passes

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [x] `engine.test.ts` exists with 5+ focused tests covering all exported functions
- [x] `GraphQlClient.test.ts` exists with 4+ focused tests covering query, mutation, and error paths
- [x] `RpcClient.test.ts` exists with 4+ focused tests covering all exported functions
- [x] `pnpm --filter @nop-chaos/e2e-shared test` passes
- [x] `pnpm --filter @nop-chaos/e2e-shared typecheck` passes
- [x] `pnpm --filter @nop-chaos/e2e-shared lint` passes
- [x] No owner-doc update required (tests are self-documenting)
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [x] All 2 phases completed with Exit Criteria checked
- [x] `MockAuthAdapter.ts` exists and provides drop-in compatible `login()` API
- [x] `packages/e2e-shared/src/index.ts` exports all new public API surfaces
- [x] Unit tests for `engine.ts`, `GraphQLClient`, `RpcClient` exist and pass
- [x] `pnpm --filter @nop-chaos/e2e-shared typecheck` passes
- [x] `pnpm --filter @nop-chaos/e2e-shared test` passes
- [x] `pnpm typecheck` (root) passes
- [x] `pnpm build` (root) passes
- [x] `pnpm lint` passes
- [x] `pnpm test` (root) passes
- [x] No in-scope deferred items (deferred unit tests from Plan 1 are now in scope as Phase 2)
- [x] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- Consider extracting `harbor` variant detection into a configurable option — deferred as optimization candidate, not blocking spec migration
- Consider adding Playwright-based integration test for MockAuthAdapter in a follow-up — deferred as out-of-scope improvement, MockAuthAdapter is verified by spec migration in successor plans

## Closure

Status Note: All Phase 1 (MockAuthAdapter creation) and Phase 2 (unit tests) work completed. Live artifacts verified: `MockAuthAdapter.ts` (454 lines) with full `login()` drop-in API, 3 response builders, `LoginVariant`/`LoginOptions` types; 3 test files (33 new Vitest tests: engine 12, GraphQlClient 12, RpcClient 9) covering all exported functions, error paths, and edge cases. `pnpm typecheck` (28/28), `pnpm build` (15/15), `pnpm lint` (28/28), `pnpm test` (28/28, all 33 new tests green). Backward compatible — existing `support/auth.ts` imports unmodified.

Closure Audit Evidence:

- Auditor / Agent: independent subagent (closure audit session)
- Evidence: live code paths at `packages/e2e-shared/src/MockAuthAdapter.ts`, `packages/e2e-shared/src/engine.test.ts`, `packages/e2e-shared/src/GraphQlClient.test.ts`, `packages/e2e-shared/src/RpcClient.test.ts` verified; `index.ts` exports confirmed; `docs/logs/2026/07-20.md` updated with full verification results; roadmap item 1.8 marked done

Follow-up:

- No remaining plan-owned work; all in-scope items landed
- Deferred items captured in Non-Blocking Follow-ups above (optimization / out-of-scope)
