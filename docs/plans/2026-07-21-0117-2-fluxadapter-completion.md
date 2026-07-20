# FluxAdapter Method Completion

> Plan Status: active
> Last Reviewed: 2026-07-21
> Source: `docs/backlog/e2e-upgrade-roadmap.md` item 4.1
> Mission: e2e-upgrade
> Work Item: Phase 4.1 — FluxAdapter 完善

## Purpose

Complete the `FluxAdapter` implementation so that all `EngineAdapter` interface methods work robustly for Flux-rendered UIs. The current `FluxAdapter` covers the full method surface but has gaps in `selectOption`, date input interaction, and special dialog handling that prevent it from being a drop-in replacement for `AmisAdapter` in complex CRUD scenarios.

## Current Baseline

- `FluxAdapter` implements all 11 `EngineAdapter` interface methods and passes type-checking.
- `selectOption` uses `getByRole('option')` for single-option selection but does not handle: multi-field selection (`_fieldLabels.length > 1`), cascading selects, or searchable dropdowns.
- `dateInputByLabel` returns `page.getByLabel(labelText)` but does not include date picker interaction (calendar open, date selection).
- No special dialog support: confirmation dialogs, alert dialogs, or custom modal patterns that are not the standard CRUD form dialog are not handled.
- `AmisAdapter` has the same interface but benefits from AMIS's consistent CSS class structure, making its selectors more predictable.
- There are dedicated PoC test spec files at `tests/e2e/flux-prototype.spec.ts` and `tests/e2e/amis-prototype.spec.ts` that exercise basic Flux rendering.

## Goals

- `FluxAdapter.selectOption` handles multiple field labels, cascading selects, and searchable dropdowns.
- `FluxAdapter.dateInputByLabel` includes date picker interaction (open calendar → select date).
- `FluxAdapter.dialog` or new helper method handles special dialogs (confirmation, alert, custom modals).
- `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-prototype.spec.ts` passes (flux-relevant prototype spec).

## Non-Goals

- Not adding new `EngineAdapter` interface methods (interface stays stable for now).
- Not creating Flux-specific e2e test specs (Phase 4.2–4.3).
- Not modifying `AmisAdapter` behavior.
- Not setting up CI double-engine matrix (Phase 4.4).

## Scope

### In Scope

- `selectOption` — multi-field support, cascading drop-downs, searchable selects.
- `dateInputByLabel` — calendar interaction (open, navigate, select date).
- Special dialogs — confirmation dialogs (`确定`/`取消`), alert dialogs (`确定`), custom modal patterns matching `[data-slot="dialog-surface"]` variations.
- Unit tests or focused Playwright snippets proving each improvement.
- `pnpm typecheck && pnpm build && pnpm test` in nop-chaos-next workspace.

### Out Of Scope

- New e2e specs exercising Flux CRUD flows (Phase 4.2).
- Flux dashboard/report specs (Phase 4.3).
- CI double-engine configuration (Phase 4.4).
- `AmisAdapter` improvements or refactoring.

## Execution Plan

### Phase 1 — Audit FluxAdapter gap against nop-app-erp's original local implementation

Status: planned
Targets: `packages/e2e-shared/src/FluxAdapter.ts`, `tests/e2e/flux-prototype.spec.ts`, existing AmisAdapter patterns

- Item Types: `Fix | Decision | Proof`

- [ ] Review current `FluxAdapter` methods against the `EngineAdapter` interface
- [ ] Identify specific gaps where FluxAdapter behavior differs from AmisAdapter for the same method
- [ ] Check nop-app-erp's original local FluxAdapter (history from sync) for any additional helper methods or patterns

Exit Criteria:

> Gap analysis documented, prioritized by impact on common CRUD+dialog flows.

- [ ] Gap analysis recorded in `Current Baseline` and prioritized in Phase 2–4 sections
- [ ] No owner-doc update required (design doc already describes dual-engine pattern at the interface level, not per-method specifics)
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 — Improve selectOption

Status: planned
Targets: `packages/e2e-shared/src/FluxAdapter.ts`

- Item Types: `Fix`

- [ ] Handle `_fieldLabels.length > 1` for multi-field selection (iterate labels, select each option in sequence)
- [ ] Handle cascading selects (select parent option first, wait for child options to load, then select child)
- [ ] Handle searchable dropdowns (type in search input, select filtered option)
- [ ] Add fallback: if `getByRole('option')` fails, try `getByTestId` / `getByText` / `locator('li, [role="option"]')`
- [ ] Add unit test coverage in `packages/e2e-shared/` for selectOption edge cases

Exit Criteria:

> `selectOption` handles single field, multi-field, cascading, and searchable dropdown scenarios. Type-check passes.

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (new unit tests + existing)
- [ ] `No owner-doc update required` (interface unchanged)
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 — Improve dateInputByLabel

Status: planned
Targets: `packages/e2e-shared/src/FluxAdapter.ts`

- Item Types: `Fix`

- [ ] Implement date picker interaction: click input/button to open calendar, navigate to target month/year, select target date
- [ ] Use native `input[type="date"]` fill as fallback where calendar interaction is unreliable
- [ ] Add unit test coverage for dateInputByLabel

Exit Criteria:

> `dateInputByLabel` opens calendar and selects a date (or fills native date input). Type-check passes.

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (new tests + existing)
- [ ] `No owner-doc update required` (interface unchanged)
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 — Add special dialog support

Status: planned
Targets: `packages/e2e-shared/src/FluxAdapter.ts`

- Item Types: `Fix`

- [ ] Audit special dialog patterns in nop-app-erp CRUD specs: confirmation dialogs (`确定`/`取消`), alert dialogs (`确定`), custom modals
- [ ] Add `confirmDialog()`, `alertDialog()` helper methods to FluxAdapter (public, separate from `dialog()`)
- [ ] Add focused unit tests for each dialog type

Exit Criteria:

> FluxAdapter exposes helper methods for confirmation and alert dialogs. Type-check passes.

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `No owner-doc update required` (interface unchanged; helper methods are additive)
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 5 — Verification and closure

Status: planned
Targets: todo list above

- Item Types: `Proof`

- [ ] Confirm all 4 implementation phases are `completed`
- [ ] Run `pnpm test:e2e -- grep flux-prototype` to verify basic Flux rendering still works
- [ ] Capture deferred items and non-blocking follow-ups
- [ ] Schedule independent subagent closure audit

Exit Criteria:

> Plan closure-ready.

- [ ] All Phase 1–4 Exit Criteria met
- [ ] Run `scripts/sync-e2e-shared.sh` to sync updated shared lib
- [ ] `npx playwright test --list` in downstream projects confirms no import errors (or note as unobtainable without their full workspace)
- [ ] Closure Gates all checked
- [ ] Independent subagent closure audit completed and recorded
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [ ] All `FluxAdapter` method gaps identified in Phase 1 are addressed
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (new unit tests + existing)
- [ ] `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-prototype.spec.ts` passes (or known gaps recorded in Deferred)
- [ ] No in-scope live defects or contract drifts remain
- [ ] No owner-doc update required (interface unchanged)
- [ ] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

### Full Flux CRUD e2e test coverage

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: This plan only improves the adapter methods. End-to-end CRUD testing with Flux is Phase 4.2–4.3 work. The adapter improvements are a prerequisite, not the outcome.
- Successor Required: `yes` (Phase 4.2, 4.3)

### CI double-engine matrix

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: CI configuration for dual-engine testing is Phase 4.4 work, which depends on Flux coverage being in place.
- Successor Required: `yes` (Phase 4.4)

## Non-Blocking Follow-ups

- Consider refactoring shared selectOption/dateInput helpers into a configurable strategy pattern if AmisAdapter and FluxAdapter share more common interaction logic
- After Phase 4.2–4.3, revisit FluxAdapter dialog handling for any gaps discovered during real CRUD testing

## Closure

Status Note: *(to be filled at completion)*

Closure Audit Evidence: *(to be filled at completion)*

Follow-up:
- *(to be filled at completion)*
