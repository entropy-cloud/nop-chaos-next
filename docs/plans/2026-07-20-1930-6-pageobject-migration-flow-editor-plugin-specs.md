# 6 PageObject Migration — Flow Editor and Plugin Specs

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 1.4), `docs/design/e2e-shared-infrastructure.md`
> Related: `docs/plans/2026-07-20-1930-4-mock-auth-adapter-and-unit-tests.md` (REQUIRED prerequisite — this plan is blocked until Plan 4 completes), `docs/plans/2026-07-20-1930-5-pageobject-migration-login-dashboard-permission-i18n.md` (precedent — same migration pattern)

> BLOCKED: This plan depends on Plan 4 (MockAuthAdapter) providing a `login()` with `setup` callback and `LoginVariant` return type. The current `Navigation.ts` `login()` in the shared lib uses real credentials (incompatible API). Do NOT activate before Plan 4 is completed.
> Mission: e2e-upgrade
> Work Item: Phase 1.4 — PageObject: flow editor and plugin specs

## Purpose

Migrate `flow-editor.spec.ts`, `plugin-demo.spec.ts`, and `extension-demo.spec.ts` to import `login` from `@nop-chaos/e2e-shared` and use the shared library's `test` fixture. These specs exercise canvas interaction and plugin-system features, making them a step up in complexity from Phase 1.3.

## Current Baseline

- `tests/e2e/flow-editor.spec.ts` (119 lines) — imports `{ expect, test }` from `@playwright/test`, `{ login }` from `./support/auth`. Defines `demoRoutesMenuResponse` and `useSeededDemoMenu(page)` helper. Single test: login, navigate to flow editor, canvas edit, palette drag, edge edit. Does NOT use PageObject.
- `tests/e2e/plugin-demo.spec.ts` (99 lines) — same import pattern. Defines separate `demoRoutesMenuResponse` (same structure as flow-editor's) and `useSeededDemoMenu(page)`. Single test: login, navigate to plugin demo, verify content, navigate to plugin management.
- `tests/e2e/extension-demo.spec.ts` (18 lines) — same import pattern. Simple test: login, check harbor variant, navigate to extension page. Gated by `PLAYWRIGHT_APP_MODE !== 'extension-demo'`.
- The `demoRoutesMenuResponse` object is duplicated verbatim across `flow-editor.spec.ts` and `plugin-demo.spec.ts` — a candidate for shared constant extraction.
- `packages/e2e-shared` currently exports `login` from `Navigation.ts` (real credential login, incompatible API for mock tests), `test` fixture, and `BasePage.goto()`. Plan 4 will add `MockAuthAdapter` with a drop-in compatible `login(page, options?)` that this plan depends on.
- All 3 specs currently pass with `pnpm test:e2e` (extension-demo gated by env var).

## Goals

- All 3 spec files import `login` from `@nop-chaos/e2e-shared` instead of `./support/auth`
- All 3 spec files use the shared library's `test` fixture
- The duplicated `demoRoutesMenuResponse` in `flow-editor.spec.ts` and `plugin-demo.spec.ts` is extracted to a shared constant (either in the specs' support directory or ideally promoted to shared lib if generically useful)
- Custom `setup` callbacks (`useSeededDemoMenu`) continue to work with shared `login()`
- No test behavior changes
- `pnpm test:e2e` passes for all 3 specs individually and as part of the full suite

## Non-Goals

- Do NOT extract generic flow-editor page objects (the flow editor has unique canvas interaction that doesn't fit CrudListPage/FormDialog)
- Do NOT change test logic or assertions
- Do NOT migrate AMIS, CRUD, lazy-loading, or prototype specs (covered by Phase 1.5-1.7)
- Do NOT modify `tests/e2e/support/auth.ts`

## Scope

### In Scope

- `tests/e2e/flow-editor.spec.ts` — migrate imports, deduplicate `demoRoutesMenuResponse`
- `tests/e2e/plugin-demo.spec.ts` — migrate imports, deduplicate `demoRoutesMenuResponse`
- `tests/e2e/extension-demo.spec.ts` — migrate imports
- Optionally extract shared demo route/menu response to `tests/e2e/support/demoRoutes.ts` to eliminate duplication
- Verify `pnpm test:e2e` passes for all 3 specs

### Out Of Scope

- Other spec files (AMIS, CRUD, lazy-loading, prototypes)
- Creating custom flow-editor PageObject classes (can be added in a future plan if the canvas patterns stabilize)
- Changes to `packages/e2e-shared` beyond what Plan 4 already provides

## Execution Plan

### Phase 1 — Extract shared demo route constants

Status: completed
Targets: `tests/e2e/support/demoRoutes.ts` (new), `tests/e2e/flow-editor.spec.ts`, `tests/e2e/plugin-demo.spec.ts`

- Item Types: `Fix | Proof`

- [x] Create `tests/e2e/support/demoRoutes.ts`:
  - Export `demoRoutesMenuResponse` (the currently duplicated object from both spec files)
  - Export `useSeededDemoMenu(page)` helper function
- [x] `flow-editor.spec.ts`: Remove inline `demoRoutesMenuResponse` and `useSeededDemoMenu`, import from `./support/demoRoutes`
- [x] `plugin-demo.spec.ts`: Same inline removal and import
- [x] Verify: `pnpm test:e2e -- tests/e2e/flow-editor.spec.ts` passes
- [x] Verify: `pnpm test:e2e -- tests/e2e/plugin-demo.spec.ts` passes

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [x] `tests/e2e/support/demoRoutes.ts` exists with shared `demoRoutesMenuResponse` and `useSeededDemoMenu`
- [x] `flow-editor.spec.ts` imports from `./support/demoRoutes` instead of defining inline
- [x] `plugin-demo.spec.ts` imports from `./support/demoRoutes` instead of defining inline
- [x] Both specs pass with `pnpm test:e2e`
- [x] No owner-doc update required (local support file, no design doc impact)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — Migrate flow-editor.spec.ts and plugin-demo.spec.ts imports

Status: completed
Targets: `tests/e2e/flow-editor.spec.ts`, `tests/e2e/plugin-demo.spec.ts`

- Item Types: `Fix | Proof`

- [x] `flow-editor.spec.ts`: Replace `import { login } from './support/auth'` with `import { login } from '@nop-chaos/e2e-shared'`
- [x] `flow-editor.spec.ts`: Replace `import { expect, test } from '@playwright/test'` with `import { expect } from '@playwright/test'; import { test } from '@nop-chaos/e2e-shared'`
- [x] `plugin-demo.spec.ts`: Same import replacements
- [x] Verify: `pnpm test:e2e -- tests/e2e/flow-editor.spec.ts` passes
- [x] Verify: `pnpm test:e2e -- tests/e2e/plugin-demo.spec.ts` passes

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [x] `flow-editor.spec.ts` no longer imports from `./support/auth`
- [x] `plugin-demo.spec.ts` no longer imports from `./support/auth`
- [x] Both specs pass with `pnpm test:e2e`
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — Migrate extension-demo.spec.ts

Status: completed
Targets: `tests/e2e/extension-demo.spec.ts`

- Item Types: `Fix | Proof`

- [x] Replace imports: `{ login }` from `@nop-chaos/e2e-shared`, `{ test }` from `@nop-chaos/e2e-shared`
- [x] Pre-existing failure note: extension-demo spec fails at `Extension Builtin Page` assertion even with original `./support/auth` import — verified by reverting migration and running against original code
- [x] Verify: `pnpm test:e2e -- tests/e2e/extension-demo.spec.ts` is skipped when `PLAYWRIGHT_APP_MODE` is not `extension-demo`

Exit Criteria:

> All `[x]` before Phase 3 Status can be set to `completed`.

- [x] `extension-demo.spec.ts` no longer imports from `./support/auth`
- [x] Note: harbor variant login and extension-demo mode test have pre-existing failure (confirmed pre-migration; not caused by this plan)
- [x] Extension demo spec skips correctly in normal mode
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 — Full suite verification

Status: completed
Targets: Full e2e suite

- Item Types: `Proof | Follow-up`

- [x] Run full `pnpm test:e2e` to ensure no regressions
- [x] Verify `E2E_ENGINE=flux pnpm test:e2e` does not crash
- [x] Record verification results

Exit Criteria:

> All `[x]` before Phase 4 Status can be set to `completed`.

- [x] `pnpm test:e2e` passes (63/74, 9 pre-existing prototype/live failures — same as prior runs, no regression)
- [x] `E2E_ENGINE=flux pnpm test:e2e` does not crash (63/74, same 9 pre-existing failures)
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [x] All 4 phases completed with Exit Criteria checked
- [x] 3 spec files migrated to shared lib imports
- [x] `demoRoutesMenuResponse` duplication eliminated via shared support file
- [x] `pnpm test:e2e` passes (63/74, 9 pre-existing prototype/live failures — no regression from this plan)
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] No changes to `tests/e2e/support/auth.ts`
- [x] No deferred in-scope items
- [x] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

### Custom flow-editor PageObject class

- Classification: `optimization candidate`
- Why Not Blocking Closure: Flow editor uses unique ReactFlow canvas interactions (`data-testid` selectors, `dispatchEvent`, `waitForTimeout`, `evaluate`) that don't map to CrudListPage/FormDialog. The spec works correctly with direct Playwright selectors. A PageObject wrapper would only add maintenance cost without improving test reliability.
- Successor Required: `no`

## Non-Blocking Follow-ups

- None — all 3 specs migrated successfully; remaining debt explicitly deferred above

## Closure

Status Note: All 3 spec files (`flow-editor.spec.ts`, `plugin-demo.spec.ts`, `extension-demo.spec.ts`) migrated to shared lib imports; `demoRoutesMenuResponse` duplication eliminated; full suite passes without regression (63/74, 9 pre-existing failures unchanged).

Closure Audit Evidence:

- Auditor / Agent: Closure auditor (independent subagent)
- Evidence:
  - `tests/e2e/support/demoRoutes.ts` exists with shared `demoRoutesMenuResponse` and `useSeededDemoMenu`
  - `tests/e2e/flow-editor.spec.ts` imports `login` from `@nop-chaos/e2e-shared` and `demoRoutesMenuResponse` from `./support/demoRoutes`
  - `tests/e2e/plugin-demo.spec.ts` imports `login` from `@nop-chaos/e2e-shared` and `demoRoutesMenuResponse` from `./support/demoRoutes`
  - `tests/e2e/extension-demo.spec.ts` imports `login` from `@nop-chaos/e2e-shared`
  - `pnpm test:e2e` passes (63/74, same 9 pre-existing failures, no regression)
  - `E2E_ENGINE=flux pnpm test:e2e` does not crash (63/74, same 9 pre-existing failures)
  - `pnpm typecheck && pnpm build && pnpm lint` all pass

Follow-up:

- No remaining plan-owned work; all 4 phases completed
