# 5 PageObject Migration — Login, Dashboard, Permission, i18n Specs

> Plan Status: active
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 1.3), `docs/design/e2e-shared-infrastructure.md`
> Related: `docs/plans/2026-07-20-1930-4-mock-auth-adapter-and-unit-tests.md` (REQUIRED prerequisite — this plan is blocked until Plan 4 completes)
> Mission: e2e-upgrade
> Work Item: Phase 1.3 — PageObject: login + dashboard + permission + i18n specs

## Purpose

Migrate `login.spec.ts`, `sidebar-user-menu.spec.ts`, `permission.spec.ts`, and `i18n-persistence.spec.ts` to import `login` from `@nop-chaos/e2e-shared` instead of `./support/auth`, and to use the shared library's `test` fixture. These are the simplest specs and serve as the first migration batch.

## Current Baseline

- `tests/e2e/login.spec.ts` (21 lines) — imports `{ expect, test }` from `@playwright/test`, imports `{ login }` from `./support/auth`. Single test: login, verify dashboard URL and sidebar
- `tests/e2e/sidebar-user-menu.spec.ts` (53 lines) — same import pattern. 4 tests: opens menu, navigates to settings/theme/language, logout clears session
- `tests/e2e/permission.spec.ts` (107 lines) — same import pattern. Also defines `restrictedSiteMapResponse` and `restrictedMenuResponse` and passes `setup` callback to `login()` to override route intercept. 1 test: checks restricted menus hidden and direct URL returns 403
- `tests/e2e/i18n-persistence.spec.ts` (162 lines) — same import pattern. Uses `addInitScript` to set language preference before login, passes `setup` callback for Flux-enabled menu routes. 2 tests: English labels persist after navigation/logout
- `packages/e2e-shared` currently exports two login functions with incompatible APIs:
  - `Navigation.ts` `login(page, baseUrl?)` — real credential-based login (return type `void`, no `setup` callback, no mock interception). This is NOT compatible with the mock-login pattern used by these 4 specs.
  - Plan 4 (`2026-07-20-1930-4-mock-auth-adapter-and-unit-tests.md`) will add `MockAuthAdapter.ts` with a drop-in compatible `login(page, options?)` that returns `LoginVariant` and supports `setup` callbacks. **This plan is blocked until Plan 4 is completed.**
- `packages/e2e-shared/src/fixtures.ts` exports a `test` fixture with console error capture and engine injection — available for use once MockAuthAdapter resolves the login API mismatch
- All 4 specs currently pass with `pnpm test:e2e` using `./support/auth`

## Goals

- All 4 spec files import `login` from `@nop-chaos/e2e-shared` instead of `./support/auth`
- All 4 spec files use the shared library's `test` fixture for console error capture
- Specs that use `setup` callbacks (permission, i18n-persistence) continue to work with shared `login()` — the shared API supports the same `setup` parameter
- No test behavior changes — same assertions, same page interactions
- `pnpm test:e2e` passes for all 4 specs individually and as part of the full suite
- `E2E_ENGINE=flux pnpm test:e2e` does not crash (these specs don't use engine fixture directly, but the shared `test` fixture provides it)
- No changes to `tests/e2e/support/auth.ts` (local file stays for other spec files not yet migrated)

## Non-Goals

- Do NOT migrate other spec files (covered by Phase 1.4-1.7 plans)
- Do NOT change test logic or assertions
- Do NOT add CrudListPage/FormDialog usage (these specs don't exercise CRUD tables or dialogs)
- Do NOT modify `tests/e2e/support/auth.ts`

## Scope

### In Scope

- `tests/e2e/login.spec.ts` — migrate imports to shared lib
- `tests/e2e/sidebar-user-menu.spec.ts` — migrate imports to shared lib
- `tests/e2e/permission.spec.ts` — migrate imports, ensure custom `setup` callback still functions
- `tests/e2e/i18n-persistence.spec.ts` — migrate imports, ensure `addInitScript` + custom `setup` callback still functions
- Verify `pnpm test:e2e` passes

### Out Of Scope

- Other spec files (flow-editor, plugin-demo, extension-demo, AMIS, CRUD, lazy-loading, prototypes)
- Changes to `tests/e2e/support/auth.ts`
- Adding new tests
- Adding shared lib unit tests (covered by Plan 4)

## Execution Plan

### Phase 1 — Migrate login.spec.ts and sidebar-user-menu.spec.ts

Status: planned
Targets: `tests/e2e/login.spec.ts`, `tests/e2e/sidebar-user-menu.spec.ts`

- Item Types: `Fix | Proof`

- [ ] `login.spec.ts`: Replace `import { login } from './support/auth'` with `import { login } from '@nop-chaos/e2e-shared'`
- [ ] `login.spec.ts`: Replace `import { expect, test } from '@playwright/test'` with `import { expect } from '@playwright/test'; import { test } from '@nop-chaos/e2e-shared'`
- [ ] `sidebar-user-menu.spec.ts`: Same import replacements
- [ ] Verify: `pnpm test:e2e -- tests/e2e/login.spec.ts` passes
- [ ] Verify: `pnpm test:e2e -- tests/e2e/sidebar-user-menu.spec.ts` passes

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [ ] `login.spec.ts` no longer imports from `./support/auth`
- [ ] `sidebar-user-menu.spec.ts` no longer imports from `./support/auth`
- [ ] Both specs pass with `pnpm test:e2e`
- [ ] No owner-doc update required (spec migration follows established pattern)
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 — Migrate permission.spec.ts

Status: planned
Targets: `tests/e2e/permission.spec.ts`

- Item Types: `Fix | Proof`

- [ ] Replace imports: `{ login }` from `@nop-chaos/e2e-shared`, `{ test }` from `@nop-chaos/e2e-shared`
- [ ] Verify `setup` callback still works with shared `login()` — the custom `page.route` calls for `restrictedSiteMapResponse` and `restrictedMenuResponse` must continue to override the defaults
- [ ] Verify: `pnpm test:e2e -- tests/e2e/permission.spec.ts` passes

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [ ] `permission.spec.ts` no longer imports from `./support/auth`
- [ ] Custom route interception via `setup` callback works with shared `login()`
- [ ] `pnpm test:e2e -- tests/e2e/permission.spec.ts` passes
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 — Migrate i18n-persistence.spec.ts

Status: planned
Targets: `tests/e2e/i18n-persistence.spec.ts`

- Item Types: `Fix | Proof`

- [ ] Replace imports: `{ login }` from `@nop-chaos/e2e-shared`, `{ test }` from `@nop-chaos/e2e-shared`
- [ ] Verify `addInitScript` + `setup` callback (`useFluxEnabledMenu`) still works with shared `login()`
- [ ] Verify: `pnpm test:e2e -- tests/e2e/i18n-persistence.spec.ts` passes

Exit Criteria:

> All `[x]` before Phase 3 Status can be set to `completed`.

- [ ] `i18n-persistence.spec.ts` no longer imports from `./support/auth`
- [ ] `addInitScript` + custom `setup` callback works with shared `login()`
- [ ] `pnpm test:e2e -- tests/e2e/i18n-persistence.spec.ts` passes
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 — Full suite verification

Status: planned
Targets: All migrated specs + full e2e suite

- Item Types: `Proof | Follow-up`

- [ ] Run full `pnpm test:e2e` to ensure no regressions in non-migrated specs
- [ ] Verify `E2E_ENGINE=flux pnpm test:e2e` does not crash (graceful no-op for non-engine specs)
- [ ] Record verification results

Exit Criteria:

> All `[x]` before Phase 4 Status can be set to `completed`.

- [ ] `pnpm test:e2e` passes (all 23+ specs, including the 4 migrated ones)
- [ ] `E2E_ENGINE=flux pnpm test:e2e` does not crash
- [ ] No owner-doc update required (verification is internal)
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [ ] All 4 phases completed with Exit Criteria checked
- [ ] 4 spec files migrated to shared lib imports
- [ ] `pnpm test:e2e` passes
- [ ] `pnpm typecheck` passes (no import resolution issues)
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] No changes to `tests/e2e/support/auth.ts`
- [ ] No deferred in-scope items
- [ ] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- None — all 4 specs migrated successfully; no remaining debt for this scope
