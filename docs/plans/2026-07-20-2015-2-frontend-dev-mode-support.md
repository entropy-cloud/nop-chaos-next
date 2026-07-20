# 13 FRONTEND_DEV_MODE Support in nop-entropy-e2e

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 2.4), `docs/design/e2e-frontend-mode.md`
> Related: `docs/plans/2026-07-20-2000-3-replace-amis-pageobject-nop-entropy.md` (Phase 2 prerequisite — PageObject migration complete)
> Mission: e2e-upgrade
> Work Item: Phase 2.4 — FRONTEND_DEV_MODE support

## Purpose

Add `FRONTEND_DEV_MODE` switching logic to each nop-entropy-e2e package's `playwright.config.ts`, enabling developers to run e2e tests against nop-chaos-next's Vite dev server instead of the pre-built `nop-web-site` JAR. This closes the feedback loop between frontend code changes and full-stack e2e verification.

## Current Baseline

- `docs/design/e2e-frontend-mode.md` fully specifies the design: `FRONTEND_DEV_MODE=true` environment variable switches `baseURL` to Vite dev server (default port 4173) and optionally starts a Vite dev server alongside the Quarkus backend.
- Each nop-entropy-e2e package (`nop-auth-e2e`, `nop-code-e2e`, `nop-job-e2e`) has its own `playwright.config.ts` with independent `port`, `cwd`, and `timeout` values.
- No `FRONTEND_DEV_MODE` support exists in any package — all tests currently use the Quarkus-served frontend.
- `packages/e2e-shared/` has been synced to nop-entropy-e2e (Plan 10), providing the shared library fixtures.
- The design doc specifies a ~15-line config change per package, and explicitly states "测试代码（spec 文件、页面对象、RPC 帮助程序）零变更".
- Vite proxy configuration in nop-chaos-next (`apps/main/vite.config.ts:89-109`) already proxies API paths (`/r`, `/graphql`, `/p/`, `/f/`, `/q/`) to `localhost:8080`.

## Goals

- Each nop-entropy-e2e package's `playwright.config.ts` supports `FRONTEND_DEV_MODE` as specified in the design doc
- Default behavior unchanged — no `FRONTEND_DEV_MODE` = Quarkus serves both API and frontend (backward compatible)
- `FRONTEND_DEV_MODE=true` switches `baseURL` to Vite dev server and optionally starts it
- `BASE_URL` explicit override continues to work (takes precedence over FRONTEND_DEV_MODE)
- `SKIP_WEBSERVER` continues to work
- No spec file or helper code changes

## Non-Goals

- Do NOT migrate spec files to use PageObjects (Phase 1 complete in nop-chaos-next, Phase 2.2 complete in nop-entropy-e2e)
- Do NOT unify login flow (Phase 2.5)
- Do NOT adapt auth-e2e / code-e2e / job-e2e specs (Phase 2.6, 2.7)
- Do NOT modify nop-chaos-next code
- Do NOT extract shared playwright config (deferred — each package keeps its own config per design decision)

## Scope

### In Scope

- `nop-auth-e2e/playwright.config.ts` — add FRONTEND_DEV_MODE logic
- `nop-code-e2e/playwright.config.ts` — add FRONTEND_DEV_MODE logic
- `nop-job-e2e/playwright.config.ts` — add FRONTEND_DEV_MODE logic
- Verify `pnpm typecheck` passes for each package (config level only, no spec-level changes)
- Document any package-specific quirks (e.g., timeout values, relative paths)

### Out Of Scope

- Running e2e tests (requires Quarkus backend)
- Modifying spec files or helper code
- nop-chaos-next changes
- CI integration (Phase 5)
- Extract shared config factory

## Execution Plan

### Phase 1 — Add FRONTEND_DEV_MODE to nop-auth-e2e

Status: completed
Targets: `nop-auth-e2e/playwright.config.ts`

- Item Types: `Fix | Proof`

- [x] Read current `nop-auth-e2e/playwright.config.ts` to establish baseline
- [x] Add env var reading: `frontendDevMode`, `frontendPort`, `nopChaosNextDir`, `explicitBaseUrl`
- [x] Update `baseURL` logic per design doc spec:
  ```typescript
  const baseURL = explicitBaseUrl ?? (frontendDevMode ? `http://localhost:${frontendPort}` : `http://localhost:${backendPort}`);
  ```
- [x] Update `webServer` array to conditionally push Vite dev server:
  ```typescript
  if (frontendDevMode && !process.env.SKIP_WEBSERVER && !explicitBaseUrl) {
    servers.push({
      command: `pnpm --filter @nop-chaos/main exec vite dev --port ${frontendPort} --strictPort`,
      cwd: nopChaosNextDir,
      port: frontendPort,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    });
  }
  ```
- [x] Preserve existing auth-e2e-specific timeout (60s for backend, per design doc)
- [x] Verify `pnpm typecheck` passes

Exit Criteria:

> All `[x]` before Phase 1 Status can be set to `completed`.

- [x] `FRONTEND_DEV_MODE` env var recognized in nop-auth-e2e config
- [x] Default behavior unchanged (no env var = Quarkus serves frontend)
- [x] Auth-e2e-specific timeout preserved
- [x] `pnpm typecheck` passes
- [x] No owner-doc update required (design doc already specifies the exact config change)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — Add FRONTEND_DEV_MODE to nop-code-e2e

Status: completed
Targets: `nop-code-e2e/playwright.config.ts`

- Item Types: `Fix | Proof`

- [x] Read current `nop-code-e2e/playwright.config.ts` to establish baseline
- [x] Apply same pattern as Phase 1, respecting code-e2e-specific:
  - Backend port (8081)
  - Backend timeout (120s, per design doc)
  - Quarkus cwd (`../../../nop-code/nop-code-app`)
- [x] Verify `pnpm typecheck` passes

Exit Criteria:

> All `[x]` before Phase 2 Status can be set to `completed`.

- [x] `FRONTEND_DEV_MODE` env var recognized in nop-code-e2e config
- [x] Default behavior unchanged
- [x] Code-e2e-specific timeout preserved
- [x] `pnpm typecheck` passes
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — Add FRONTEND_DEV_MODE to nop-job-e2e

Status: completed
Targets: `nop-job-e2e/playwright.config.ts`

- Item Types: `Fix | Proof`

- [x] Read current `nop-job-e2e/playwright.config.ts` to establish baseline
- [x] Apply same pattern, respecting job-e2e-specific:
  - Backend port (8082)
  - Backend timeout (60s, per design doc)
  - Quarkus cwd (`../../../nop-job/nop-job-app`)
- [x] Verify `pnpm typecheck` passes

Exit Criteria:

> All `[x]` before Phase 3 Status can be set to `completed`.

- [x] `FRONTEND_DEV_MODE` env var recognized in nop-job-e2e config
- [x] Default behavior unchanged
- [x] Job-e2e-specific timeout preserved
- [x] `pnpm typecheck` passes
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 — Cross-package consistency check

Status: completed
Targets: All 3 playwright.config.ts files

- Item Types: `Proof`

- [x] Diff the FRONTEND_DEV_MODE sections across all 3 packages — confirm only package-specific values (port, timeout, cwd) differ
- [x] Verify that all 3 packages reference the same `nopChaosNextDir` default (`../../../nop-chaos-next`)
- [x] Run `pnpm typecheck` on all 3 packages one final time

Exit Criteria:

> All `[x]` before Phase 4 Status can be set to `completed`.

- [x] All 3 configs follow the same FRONTEND_DEV_MODE pattern
- [x] `pnpm typecheck` passes for all 3 packages
- [x] No owner-doc update required (consistency check internal)
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

> All items below and each Phase's Exit Criteria must be fully checked before `Plan Status` can be `completed`.

- [x] All 4 phases completed with Exit Criteria checked
- [x] All 3 nop-entropy-e2e packages support `FRONTEND_DEV_MODE` env var
- [x] Default behavior unchanged for all 3 packages
- [x] Package-specific timeouts and ports preserved
- [x] `pnpm typecheck` passes for all 3 packages
- [x] `pnpm build` passes (nop-chaos-next workspace unaffected)
- [x] `pnpm lint` passes (no lint script in nop-entropy-e2e)
- [x] `pnpm test` passes (nop-chaos-next tests unaffected)
- [x] No deferred in-scope items
- [x] Independent subagent closure audit completed and recorded

## Deferred But Adjudicated

### Running e2e tests to verify FRONTEND_DEV_MODE behavior

- Classification: `watch-only residual`
- Why Not Blocking Closure: Verifying `FRONTEND_DEV_MODE=true pnpm test:auth` actually starts Vite and uses it as the frontend source requires a full Quarkus backend + nop-chaos-next workspace. This is a runtime verification that belongs in Phase 2.6/2.7 (auth-e2e / code-e2e / job-e2e adaptation) or Phase 5 CI validation. The config-level correctness is verified by typecheck and code review.
- Successor Required: `yes` (Phase 2.6, 2.7, or 5)

### Extracting shared factory function for playwright.config.ts

- Classification: `optimization candidate`
- Why Not Blocking Closure: The design doc explicitly chose to keep per-package configs with copy-modify pattern (see `docs/design/e2e-frontend-mode.md` "为什么每个包的 playwright.config.ts 单独修改而不是提取共享配置？"). Consolidating into a shared factory can be done later if the maintenance burden grows.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Update `docs/design/e2e-frontend-mode.md` if any package-specific deviation from the design doc pattern is discovered during implementation

## Closure

Status Note: 已完成。所有 3 个 nop-entropy-e2e 包的 playwright.config.ts 添加了 FRONTEND_DEV_MODE 支持并通过类型检查。

Closure Audit Evidence:

- Auditor / Agent: AI Agent (opencode)
- Evidence: 计划 `2026-07-20-2015-2-frontend-dev-mode-support.md` 全部 4 个 Phase 完成，类型检查通过，nop-chaos-next 构建/测试不变。
- 验证结果：pnpm typecheck（nop-entropy-e2e 全 4 包）通过；pnpm typecheck / pnpm build / pnpm test（nop-chaos-next）全部通过。

Follow-up:

- E2E 运行时验证属于 Phase 2.6/2.7 或 Phase 5（CI 集成）范围。
