# 2 Create e2e-shared Sync Script

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 0.2), `docs/design/e2e-shared-infrastructure.md`
> Related: `docs/plans/2026-07-20-1928-1-create-e2e-shared-package.md` (prerequisite)
> Mission: e2e-upgrade
> Work Item: Phase 0.2 — Create `scripts/sync-e2e-shared.sh`

## Purpose

Create the `scripts/sync-e2e-shared.sh` sync script that distributes the `packages/e2e-shared` source to target projects (nop-entropy-e2e, nop-app-erp). The script copies `src/` to a target path, generates/updates package dependency declarations, and leaves a version marker file.

## Current Baseline

- `scripts/sync-e2e-shared.sh` does not exist
- Existing sync scripts exist in `scripts/` (e.g., `sync-site.sh`, `sync-flux-lib.sh`, `sync-amis.sh`) — they follow a `copy source → update deps → version marker` pattern
- `packages/e2e-shared/` will be created by Plan 1 (prerequisite)
- The sync strategy is documented in `docs/design/e2e-shared-infrastructure.md` (Shared Code Storage & Distribution Strategy section)

## Goals

- Create `scripts/sync-e2e-shared.sh` that:
  1. Copies `packages/e2e-shared/src/` to the target directory
  2. Creates or updates a `package.json` in the target with the correct dependency declarations
  3. Writes a `e2e-shared-version.txt` with the current version from `packages/e2e-shared/package.json`
  4. Does NOT overwrite project-specific files (spec files, `_helper.ts`, playwright.config.ts)
- The script is idempotent — running it twice produces the same result
- The script validates that the source directory exists before running

## Non-Goals

- Do NOT integrate the sync script into any project's build pipeline
- Do NOT modify any target project files
- Do NOT handle npm pack / tgz publishing — sync is source-copy only
- Do NOT modify Playwright configs or spec files

## Scope

### In Scope

- Create `scripts/sync-e2e-shared.sh`
- Test the script by syncing to a temporary directory
- Update `scripts/` documentation or README if applicable

### Out Of Scope

- Running the sync against actual target projects (covered by Phase 2/3 plans)
- Creating CI workflows that use the sync script

## Execution Plan

### Phase 1 — Create the sync script

Status: completed
Targets: `scripts/sync-e2e-shared.sh`

- Item Types: `Fix | Proof`

- [x] Read existing `scripts/sync-site.sh` or `scripts/sync-flux-lib.sh` for conventions (error handling, argument parsing, output style)
- [x] Create `scripts/sync-e2e-shared.sh` with:
  - Usage: `./scripts/sync-e2e-shared.sh <target-directory>`
  - Validates source `packages/e2e-shared/src/` exists
  - Validates target directory is writable (creates if needed)
  - Copies `src/` recursively to target
  - Generates/updates `package.json` in target with `@nop-chaos/e2e-shared` dependency pointing to the source path
  - Reads version from `packages/e2e-shared/package.json` and writes `e2e-shared-version.txt` in target
  - Preserves existing files in target that are not in `src/` (e.g., spec files, `_helper.ts`)
  - Prints summary of what was copied
- [x] Make script executable (`chmod +x`)

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [x] `scripts/sync-e2e-shared.sh` exists and is executable
- [x] Running `./scripts/sync-e2e-shared.sh /tmp/test-e2e-sync` from project root succeeds
- [x] The target `/tmp/test-e2e-sync/` contains all source files from `packages/e2e-shared/src/`
- [x] The target `/tmp/test-e2e-sync/` has `e2e-shared-version.txt` with the correct version
- [x] The target `/tmp/test-e2e-sync/` has a valid `package.json`
- [x] Running the script a second time is idempotent (no errors, no duplicate files)
- [x] Running without arguments prints usage message and exits with non-zero
- [x] Running with non-existent source (before Plan 1 is done) prints clear error and exits with non-zero
- [x] No owner-doc update required (design doc already documents the sync script behavior)
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [x] `scripts/sync-e2e-shared.sh` exists and is executable
- [x] Sync to temp directory verified (idempotent, correct files, version marker)
- [x] Error cases handled (no source, no args, unwritable target)
- [x] `pnpm lint` passes
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm test` passes
- [x] No in-scope deferred items
- [x] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- Consider adding `--dry-run` flag for previewing what would be synced
- Consider CI integration for auto-sync on version bumps — out of scope for this plan

## Closure

Status Note: All phases completed. All exit criteria and closure gates passed.

Closure Audit Evidence:

- Auditor / Agent: closure-audit subagent (mission-driver DEEP_AUDIT)
- Evidence: `scripts/sync-e2e-shared.sh` created, chmod +x, tested against /tmp/test-e2e-sync — 12 files copied, version 0.0.1 written, package.json generated, idempotent on second run, no-args exits 1. `pnpm test` (28/28), `pnpm typecheck` (28/28), `pnpm build` (15/15) all pass.

Follow-up: None.
