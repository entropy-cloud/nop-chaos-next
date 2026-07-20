# 10 Sync Shared Library to nop-entropy-e2e

> Plan Status: active
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 2.1), `docs/design/e2e-shared-infrastructure.md`, `docs/design/e2e-frontend-mode.md`
> Related: `docs/plans/2026-07-20-1928-2-create-e2e-shared-sync-script.md` (REQUIRED prerequisite — creates the sync script), `docs/plans/2026-07-20-2000-1-pageobject-migration-lazy-loading-prototype-specs.md` (REQUIRED prerequisite — completes Phase 1)
> Mission: e2e-upgrade
> Work Item: Phase 2.1 — Sync shared lib to nop-entropy-e2e

## Purpose

Run the `scripts/sync-e2e-shared.sh` script to copy `packages/e2e-shared/src/` to `nop-entropy-e2e/packages/e2e-shared/`, creating or updating the shared library in the target project. This is the prerequisite for all Phase 2 work (replacing PageObjects, adding FRONTEND_DEV_MODE, unifying login, adapting specs).

## Current Baseline

- `scripts/sync-e2e-shared.sh` exists and is executable (Plan 2). It copies `packages/e2e-shared/src/` to a target directory, generates `package.json`, and writes `e2e-shared-version.txt`.
- `packages/e2e-shared/` is fully implemented with 13 source files (`index.ts`, `types.ts`, `engine.ts`, `AmisAdapter.ts`, `FluxAdapter.ts`, `Page.ts`, `CrudListPage.ts`, `FormDialog.ts`, `GraphQlClient.ts`, `RpcClient.ts`, `Navigation.ts`, `MockAuthAdapter.ts`, `fixtures.ts`) plus 3 test files. All typecheck/build/test pass.
- Phase 1 is completed (7/8 items done pending 1.7).
- nop-entropy-e2e project is expected as a sibling directory at `../nop-entropy/nop-entropy-e2e/` — this follows the sibling directory convention documented in `docs/design/e2e-shared-infrastructure.md`.
- nop-entropy-e2e currently has its own local `packages/e2e-shared/` with `LoginPage`, `BasePage`, `AmisCrudPage`, and RPC helpers. These are AMIS-only and lack dual-engine support.
- The sync script is designed to copy source files without overwriting project-specific files.

## Goals

- `packages/e2e-shared/src/` is synced to `../nop-entropy/nop-entropy-e2e/packages/e2e-shared/` (or the configured target path)
- The target project has a valid `package.json` with `@nop-chaos/e2e-shared` dependency declarations pointing back to the source
- `e2e-shared-version.txt` is written with the current version from `packages/e2e-shared/package.json`
- No project-specific files (spec files, `_helper.ts`, `playwright.config.ts`) are overwritten
- The sync is idempotent — running it twice produces the same result
- nop-chaos-next's workspace health is unchanged (no files modified in this project)

## Non-Goals

- Do NOT modify any nop-entropy-e2e spec files or config files (covered by Phase 2.2-2.7)
- Do NOT run any tests in nop-entropy-e2e (execution of e2e tests comes after migration)
- Do NOT integrate the sync into CI pipelines

## Scope

### In Scope

- Verify `scripts/sync-e2e-shared.sh` is executable and functional
- Identify the correct target path for nop-entropy-e2e (sibling directory at `../nop-entropy/nop-entropy-e2e/packages/e2e-shared/`)
- Run the sync script against the target path
- Verify the synced files exist and have correct content
- Verify the target project's `package.json` is correctly generated/updated
- If the target directory does not exist or the sync fails, document the issue and provide resolution steps

### Out Of Scope

- Any changes to nop-entropy-e2e spec files or test configuration
- Verifying nop-entropy-e2e test suite passes (that is Phase 2.2-2.7 work)
- Modifying the sync script itself (should work as-is from Plan 2)
- CI integration

## Execution Plan

### Phase 1 — Verify sync script and target path

Status: planned
Targets: `scripts/sync-e2e-shared.sh`, `../nop-entropy/nop-entropy-e2e/packages/e2e-shared/`

- Item Types: `Proof | Fix`

- [ ] Run `./scripts/sync-e2e-shared.sh` without arguments to verify usage message
- [ ] Check if `../nop-entropy/nop-entropy-e2e/packages/e2e-shared/` exists as a directory
- [ ] If not found, check for alternate paths: `../nop-entropy-e2e/`, `../nop-entropy/packages/e2e-shared/`, or search for `nop-entropy-e2e` in sibling directories
- [ ] Record the actual target path determined
- [ ] Verify the target directory is writable and has the expected structure (existing local `e2e-shared` package)

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [ ] Target path confirmed and writable
- [ ] Existing local e2e-shared files at the target are identified (to confirm they will be overlaid by sync)
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 — Run sync and verify

Status: planned
Targets: `../nop-entropy/nop-entropy-e2e/packages/e2e-shared/` (or alternate path)

- Item Types: `Proof`

- [ ] Run `./scripts/sync-e2e-shared.sh <target-path>` to sync the shared lib
- [ ] Verify all source files from `packages/e2e-shared/src/` are present at the target: `index.ts`, `types.ts`, `engine.ts`, `AmisAdapter.ts`, `FluxAdapter.ts`, `Page.ts`, `CrudListPage.ts`, `FormDialog.ts`, `GraphQlClient.ts`, `RpcClient.ts`, `Navigation.ts`, `MockAuthAdapter.ts`, `fixtures.ts`
- [ ] Verify the target has `e2e-shared-version.txt` with version matching `packages/e2e-shared/package.json`
- [ ] Verify the target has a valid `package.json`
- [ ] Verify existing project-specific files (spec files, `_helper.ts`, `playwright.config.ts`) are NOT overwritten or deleted
- [ ] Run the sync a second time — verify it is idempotent (no errors, no duplicate files)

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [ ] All 13 source files synced successfully
- [ ] Version marker written correctly
- [ ] `package.json` is valid
- [ ] No project-specific files lost
- [ ] Idempotent second run confirmed
- [ ] No owner-doc update required (sync script behavior is documented in design doc)
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [ ] All 2 phases completed with Exit Criteria checked
- [ ] Shared lib synced to nop-entropy-e2e target path
- [ ] Version marker and package.json present
- [ ] No project-specific files overwritten
- [ ] `pnpm typecheck` passes (nop-chaos-next workspace unaffected)
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] No in-scope deferred items
- [ ] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

### Cannot locate nop-entropy-e2e target directory

- Classification: `watch-only residual`
- Why Not Blocking Closure: If the sibling directory `../nop-entropy/nop-entropy-e2e/` does not exist at execution time, Phase 1 will document the finding. The sync can be rerun when the target is available. This does not block the closure of this plan as long as the issue is documented and the sync was attempted.
- Successor Required: `yes` (if target not found, create a follow-up plan for when the project is available)

## Non-Blocking Follow-ups

- Consider adding the sync target paths to `scripts/sync-e2e-shared.sh` as default arguments (e.g., `--target nop-entropy`)
- Consider adding a CI check that verifies nop-entropy-e2e sync is not stale

## Closure

Status Note: (to be filled at completion)

Closure Audit Evidence:

- (to be filled at completion)

Follow-up:

- (to be filled at completion)
