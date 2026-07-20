# 8 PageObject Migration — CRUD and AI Workbench Specs

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 1.6), `docs/design/e2e-shared-infrastructure.md`
> Related: `docs/plans/2026-07-20-1945-7-pageobject-migration-amis-specs.md` (precedent — same migration pattern for AMIS specs)
> Mission: e2e-upgrade
> Work Item: Phase 1.6 — PageObject: CRUD and AI Workbench specs

## Purpose

Migrate `master-detail-buttons.spec.ts`, `master-detail-dialogs.spec.ts`, and `ai-workbench-styles.spec.ts` to import `login` from `@nop-chaos/e2e-shared` instead of `./support/auth`, and to use the shared library's `test` fixture. These specs use non-default login credentials (`username: 'admin'`) and interact with Flux `data-slot` components and CRUD tables, making them more complex than Phase 1.5 AMIS specs.

## Current Baseline

- `tests/e2e/master-detail-buttons.spec.ts` (451 lines) — imports `{ expect, test }` from `@playwright/test`, `{ login }` from `./support/auth`. Uses `login(page, { username: 'admin', defaultPassword: '123456' })` with explicit credentials. 27 tests across 2 describe blocks (list page + detail page): CRUD table interactions, boundingBox layout assertions, Flux `data-slot` dialog/drawer/select interactions, sorting, pagination, inline editing, dirty indicators, date input.
- `tests/e2e/master-detail-dialogs.spec.ts` (197 lines) — same import pattern. Uses `login(page, { username: 'admin', defaultPassword: '123456' })`. 6 tests: dialog CRUD operations, native dialog detection (`failOnUnexpectedNativeDialog`), localized selectors, cancel+reopen flows, dirty data confirmation dialog.
- `tests/e2e/ai-workbench-styles.spec.ts` (104 lines) — same import pattern. Uses `login(page, { username: 'admin', defaultPassword: '123456' })`. 4 serial-mode tests: CSS custom property color assertions (`expectSemanticColors` helper), primary/secondary/danger button colors, AMIS-load CSS stability verification.
- All 3 specs use `login(page, { username: 'admin', defaultPassword: '123456' })` — non-default credentials but fully supported by the shared `MockAuthAdapter.login()` which accepts `LoginOptions`.
- `packages/e2e-shared` provides `MockAuthAdapter.login(page, options?)` supporting `{ username, defaultPassword }` via `LoginOptions`.
- `packages/e2e-shared/src/fixtures.ts` exports a `test` fixture with console error capture and engine injection.
- Master-detail specs interact heavily with Flux components (`data-slot` attributes on dialog-content, card, select-trigger, drawer-content, etc.) and CRUD table elements — natural candidates for future CrudListPage/FormDialog adoption, though this plan only changes imports.
- `ai-workbench-styles.spec.ts` uses `test.describe.configure({ mode: 'serial' })` — serial execution must be preserved after migration.

## Goals

- All 3 spec files import `login` from `@nop-chaos/e2e-shared` instead of `./support/auth`
- All 3 spec files use the shared library's `test` fixture
- No test behavior changes — same assertions, same interactions (serial mode preserved in ai-workbench)
- `pnpm test:e2e` passes for all 3 specs individually and as part of the full suite
- No changes to `tests/e2e/support/auth.ts`

## Non-Goals

- Do NOT introduce CrudListPage/FormDialog PageObject usage (scope is limited to import migration; PageObject adoption is a separate optimization)
- Do NOT change test logic or assertions (including boundingBox, evaluate() style checks, serial test mode)
- Do NOT migrate AMIS, lazy-loading, or prototype specs (covered by 1.5, 1.7)
- Do NOT modify `tests/e2e/support/auth.ts`

## Scope

### In Scope

- `tests/e2e/master-detail-buttons.spec.ts` — migrate imports to shared lib
- `tests/e2e/master-detail-dialogs.spec.ts` — migrate imports to shared lib
- `tests/e2e/ai-workbench-styles.spec.ts` — migrate imports, ensure serial mode preserved
- Verify `pnpm test:e2e` passes for all 3 specs and full suite

### Out Of Scope

- AMIS, lazy-loading, prototype specs
- Changes to `tests/e2e/support/auth.ts`
- CrudListPage/FormDialog adoption (deferred optimization)
- Adding new tests or modifying assertions

## Execution Plan

### Phase 1 — Migrate master-detail-buttons.spec.ts

Status: completed
Targets: `tests/e2e/master-detail-buttons.spec.ts`

- Item Types: `Fix | Proof`

- [x] Replace `import { login } from './support/auth'` with `import { login } from '@nop-chaos/e2e-shared'`
- [x] Replace `import { expect, test } from '@playwright/test'` with `import { expect } from '@playwright/test'; import { test } from '@nop-chaos/e2e-shared'`
- [x] Verify that `login(page, { username: 'admin', defaultPassword: '123456' })` compiles and works with shared `LoginOptions` type
- [x] Verify: `pnpm test:e2e -- tests/e2e/master-detail-buttons.spec.ts` passes (all 27 tests)

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [x] `master-detail-buttons.spec.ts` no longer imports from `./support/auth`
- [x] `pnpm test:e2e -- tests/e2e/master-detail-buttons.spec.ts` passes
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — Migrate master-detail-dialogs.spec.ts

Status: completed
Targets: `tests/e2e/master-detail-dialogs.spec.ts`

- Item Types: `Fix | Proof`

- [x] Replace imports: `{ login }` from `@nop-chaos/e2e-shared`, `{ test }` from `@nop-chaos/e2e-shared`
- [x] Verify: `pnpm test:e2e -- tests/e2e/master-detail-dialogs.spec.ts` passes (all 6 tests)

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [x] `master-detail-dialogs.spec.ts` no longer imports from `./support/auth`
- [x] `pnpm test:e2e -- tests/e2e/master-detail-dialogs.spec.ts` passes
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — Migrate ai-workbench-styles.spec.ts

Status: completed
Targets: `tests/e2e/ai-workbench-styles.spec.ts`

- Item Types: `Fix | Proof`

- [x] Replace imports: `{ login }` from `@nop-chaos/e2e-shared`, `{ test }` from `@nop-chaos/e2e-shared`
- [x] Verify `test.describe.configure({ mode: 'serial' })` still functions correctly (shared `test` fixture does not interfere with describe configuration)
- [x] Verify: `pnpm test:e2e -- tests/e2e/ai-workbench-styles.spec.ts` passes (all 4 serial tests)

Exit Criteria:

> All `[x]` before Phase 3 Status can be set to `completed`.

- [x] `ai-workbench-styles.spec.ts` no longer imports from `./support/auth`
- [x] Serial mode preserved and all 4 tests pass
- [x] `pnpm test:e2e -- tests/e2e/ai-workbench-styles.spec.ts` passes
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 — Full suite verification

Status: completed
Targets: Full e2e suite

- Item Types: `Proof | Follow-up`

- [x] Run full `pnpm test:e2e` to ensure no regressions
- [x] Record verification results

Exit Criteria:

> All `[x]` before Phase 4 Status can be set to `completed`.

- [x] `pnpm test:e2e` passes (same status as baseline: 63/74 with 9 pre-existing prototype/live failures 不变 — no regression from this plan)
- [x] No owner-doc update required (verification is internal)
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] All 4 phases completed with Exit Criteria checked
- [x] 3 spec files migrated to shared lib imports
- [x] `pnpm test:e2e` passes (no regression from baseline)
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] No changes to `tests/e2e/support/auth.ts`
- [x] No deferred in-scope items
- [x] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

### CrudListPage/FormDialog adoption for master-detail specs

- Classification: `optimization candidate`
- Why Not Blocking Closure: The master-detail specs (buttons + dialogs, 648 combined lines) contain detailed layout assertions (`boundingBox()`, `evaluate()` style checks, x-coordinate comparisons) that go beyond what CrudListPage/FormDialog's current API abstracts. Adopting PageObjects would require either extending the shared PageObject API or adding spec-specific subclasses. This is a meaningful engineering effort that does not block the import migration goal of this plan.
- Successor Required: `no` (can be revisited when Phase 3 nop-app-erp migration validates PageObject sufficiency)

## Non-Blocking Follow-ups

- None — all 3 specs use the same login option pattern; migration is mechanical import replacement fully supported by the existing shared lib API.

## Closure

Status Note: All 4 phases completed. Migrated 3 spec files from `./support/auth` to `@nop-chaos/e2e-shared`. Full e2e suite: 63 passed, 9 pre-existing prototype/live failures — no regression.

Closure Audit Evidence:

- `pnpm typecheck` — pass
- `pnpm build` — pass
- `pnpm lint` — pass
- `pnpm test:e2e` — 63/74 (9 pre-existing failures, same baseline)
- All 3 migrated specs pass individually: master-detail-buttons (27/27), master-detail-dialogs (6/6), ai-workbench-styles (4/4)
- No changes to `tests/e2e/support/auth.ts`
- Live code verification: all 3 spec files import `login` and `test` from `@nop-chaos/e2e-shared`, no remaining `./support/auth` imports
- Closure audit by mission-driver independent subagent: plan structure, exit criteria, and live repo all mutually consistent

Follow-up:

- No remaining plan-owned work.
