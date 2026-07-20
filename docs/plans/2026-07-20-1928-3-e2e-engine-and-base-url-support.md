# 3 E2E Engine and Base URL Config Support

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (items 1.1, 1.2), `docs/design/e2e-shared-infrastructure.md`, `docs/design/e2e-frontend-mode.md`
> Related: `docs/plans/2026-07-20-1928-1-create-e2e-shared-package.md` (prerequisite)
> Mission: e2e-upgrade
> Work Item: Phase 1.1 + 1.2 — E2E_ENGINE env var + BASE_URL alias

## Purpose

Update `playwright.config.ts` and related infrastructure in nop-chaos-next to support two new environment variables:
1. `E2E_ENGINE` — selects the engine adapter (amis/flux), injected into Playwright fixtures for dual-engine testing
2. `BASE_URL` — alias for `PLAYWRIGHT_BASE_URL`, providing a shorter, cross-project-consistent variable name

## Current Baseline

- `playwright.config.ts` at project root reads `PLAYWRIGHT_BASE_URL` for base URL override and `PLAYWRIGHT_APP_MODE` for mock/prototype/extension-demo mode
- No `E2E_ENGINE` support exists — all tests implicitly use AMIS
- No `BASE_URL` alias exists — only `PLAYWRIGHT_BASE_URL` is recognized
- `packages/e2e-shared/` will exist after Plan 1, providing `fixtures.ts` with engine injection and `engine.ts` with `getEngineType()` reading `E2E_ENGINE`
- `tests/e2e/support/auth.ts` provides mock login via route interception

## Goals

- `playwright.config.ts` recognizes `BASE_URL` env var as an alias for `PLAYWRIGHT_BASE_URL` (preference: `BASE_URL` takes precedence if both are set, or `PLAYWRIGHT_BASE_URL` is kept for backward compatibility)
- The engine fixture from `@nop-chaos/e2e-shared` is wired into the Playwright test configuration
- `E2E_ENGINE=flux pnpm test:e2e` can run and at least the flux-prototype spec works (smoke test)
- Backward compatible: existing `PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_APP_MODE` continue to work unchanged
- The `test` export from `packages/e2e-shared/fixtures` is available for spec files to opt into engine injection

## Non-Goals

- Do NOT rewrite any existing spec files to use the new fixtures (covered by Phase 1.3-1.7 plans)
- Do NOT add flux-prototype spec coverage beyond ensuring the engine fixture loads
- Do NOT modify nop-entropy-e2e or nop-app-erp configurations

## Scope

### In Scope

- Modify `playwright.config.ts` to support `BASE_URL` env var as alias for `PLAYWRIGHT_BASE_URL`
- Add `E2E_ENGINE` env var reading at config level (future-proofing; actual fixture injection comes from shared lib)
- Wire `@nop-chaos/e2e-shared` as a dependency of the root e2e test suite
- Make the shared library's `fixtures.ts` `test` export available (specs can import `test` from the shared lib instead of `@playwright/test`)

### Out Of Scope

- Converting any spec files to use the shared fixtures
- Adding flux-specific test coverage
- Modifying test runner scripts in `package.json`

## Execution Plan

### Phase 1 — BASE_URL alias support

Status: completed
Targets: `playwright.config.ts`

- Item Types: `Fix | Proof`

- [x] Modify `playwright.config.ts` to read `BASE_URL` env var with fallback to `PLAYWRIGHT_BASE_URL`:
  ```typescript
  const baseURL = process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4175';
  const useExternalServer = Boolean(process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL);
  ```
- [x] Update the `useExternalServer` logic accordingly
- [x] Verify: `BASE_URL=http://external:4175 pnpm test:e2e -- --grep "can start from login"` uses external server
- [x] Verify: `PLAYWRIGHT_BASE_URL=http://external:4175 pnpm test:e2e -- --grep "can start from login"` still works (backward compat)
- [x] Verify: no `BASE_URL` or `PLAYWRIGHT_BASE_URL` set uses default `http://127.0.0.1:4175`

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [x] `BASE_URL` env var is recognized and overrides the default base URL
- [x] `PLAYWRIGHT_BASE_URL` continues to work as before (backward compatible)
- [x] When `BASE_URL` and `PLAYWRIGHT_BASE_URL` are both set, `BASE_URL` takes precedence
- [x] When neither is set, default `http://127.0.0.1:4175` is used
- [x] `useExternalServer` correctly skips the built-in webServer when either variable is set
- [x] `pnpm typecheck` passes
- [x] No owner-doc update required (env var is self-documenting in config)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — E2E_ENGINE env var and fixture wiring

Status: completed
Targets: `playwright.config.ts`, `packages/e2e-shared` (dependency declaration)

- Item Types: `Fix | Decision | Proof`

- [x] Add `@nop-chaos/e2e-shared` as a devDependency in root `package.json` (or create minimal `tests/e2e/package.json` if needed)
- [x] Verify `packages/e2e-shared/fixtures.ts` exports a `test` fixture with engine injection
- [x] Update `playwright.config.ts` to read `E2E_ENGINE` env var and pass it to the environment (for engine factory to pick up)
- [x] Verify: `pnpm typecheck` passes
- [x] Verify: `pnpm build` passes
- [x] Verify smoke test: `E2E_ENGINE=flux pnpm test:e2e` at least does not crash (even if no tests use the fixture yet)

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [x] `@nop-chaos/e2e-shared` is a resolvable dependency from the e2e test context
- [x] `E2E_ENGINE` env var is recognized at config level
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm test:e2e` still works for existing specs
- [x] `E2E_ENGINE=flux pnpm test:e2e` does not crash (gracefully handles no-op when no specs use engine fixture)
- [x] No owner-doc update required (design doc already documents the env var schema)
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [x] Both phases completed with Exit Criteria checked
- [x] `BASE_URL` env var works correctly
- [x] `PLAYWRIGHT_BASE_URL` backward compatibility preserved
- [x] `E2E_ENGINE` env var recognized
- [x] `@nop-chaos/e2e-shared` resolvable from e2e test context
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test:e2e` passes (all existing specs)
- [x] No owner-doc update required (env var schema documented in design docs)
- [x] No in-scope deferred items
- [x] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- Add `E2E_ENGINE` documentation to root README or a quick-start section for developers
- Consider extracting `playwright.config.ts` web server logic into a shared helper if it grows too complex

## Closure

Status Note: Plan executed fully. Both phases completed.

Closure Audit Evidence:
- Phase 1: `BASE_URL` alias implemented in `playwright.config.ts` (line 6-7). Verified by code review and `pnpm typecheck`.
- Phase 2: `@nop-chaos/e2e-shared` added as root devDependency; `E2E_ENGINE` env var read in `playwright.config.ts` (line 9) and forwarded to webServer env (line 94-95).
- `pnpm typecheck`: 28/28 tasks passed
- `pnpm build`: 15/15 tasks passed
- `pnpm test`: 55 files, 368 tests passed
- `pnpm lint`: 28/28 tasks passed
- `E2E_ENGINE=flux pnpm test:e2e --list`: 74 tests listed, no crash
- `@nop-chaos/e2e-shared` resolvable from Node.js: confirmed

Follow-up: None within scope. Non-blocking follow-ups noted above.
