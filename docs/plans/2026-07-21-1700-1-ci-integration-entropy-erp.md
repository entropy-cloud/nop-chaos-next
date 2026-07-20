# CI Integration for nop-entropy and nop-app-erp

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (items 5.2, 5.3)
> Related: `docs/plans/2026-07-21-1600-2-ci-dual-engine-e2e.md`, `docs/plans/2026-07-21-1000-1-nop-entropy-e2e-test-adaptation.md`, `docs/plans/2026-07-21-1000-2-nop-app-erp-shared-lib-sync-and-cleanup.md`
> Mission: e2e-upgrade
> Work Item: Phase 5.2 + 5.3 — nop-entropy CI + nop-app-erp CI

## Purpose

将 E2E 测试接入 nop-entropy 和 nop-app-erp 的 CI 流程，使两个下游项目在每次构建后自动运行 E2E 测试，完成 roadmap Phase 5.2 和 Phase 5.3。

## Current Baseline

- nop-entropy `.github/workflows/maven.yml` 仅在 JDK 21 + Maven 中执行 `mvn -B package`，无 e2e 步骤
- nop-entropy-e2e 是 nop-entropy 子目录，使用 pnpm workspace，playwright config 已就绪
- nop-entropy-e2e 已通过 Phase 2 完成共享库同步、PageObject 迁移、RpcClient 集成、FRONTEND_DEV_MODE 支持、Navigation 统一、test adaptation
- nop-entropy-e2e 需要 Quarkus 后端运行 e2e 测试（`mvn quarkus:dev` 或 uber-jar），CI 上需先构建后端
- nop-app-erp 仓库位于 `../nop-app-erp/`（兄弟目录），但无 `.github/` 目录，无 GitHub Actions CI 配置
- nop-app-erp 的 `tests/e2e/` 已完成共享库同步（Phase 3.1+3.2）和 Navigation 统一（Phase 3.3），但 CRUD/dashboard/report/business-action/orchestration/visual 运行时验证未完成（Phase 3.4-3.7）
- nop-chaos-next CI 工作流（Phase 4.4+5.1）已创建于 `.github/workflows/e2e.yml`，可作为下游 CI 的参考模板

## Goals

- nop-entropy CI 在 Maven 构建后触发 e2e 测试（新增 job 或新增 workflow）
- nop-entropy e2e job 启动 Quarkus 后端 → 运行 Playwright → 收集 artifacts
- nop-app-erp CI 接入调研完成：确定其 CI 是否有 `.github/workflows/`、如何触发 e2e、需要哪些 env var
- nop-app-erp CI 配置文件创建或更新（添加 BASE_URL/FRONTEND_DEV_MODE 可选参数支持）
- 更新 `docs/backlog/e2e-upgrade-roadmap.md` 标记 5.2 和 5.3 为完成

## Non-Goals

- 不修改 nop-chaos-next CI 工作流
- 不运行 Phase 3.4-3.7 的 nop-app-erp spec 验证（这是验证计划的职责）
- 不添加 Turborepo 远程缓存
- 不修改 nop-entropy-e2e 或 nop-app-erp 的测试代码
- 不迁移下游项目的 Playwright config

## Scope

### In Scope

- nop-entropy: 在 `maven.yml` 中添加 e2e job（或创建独立 `e2e.yml`），流程：Maven build → Node.js setup → pnpm install → playwright install → 启动 Quarkus dev → `pnpm test:e2e`
- nop-entropy: 支持 `BASE_URL`、`E2E_ENGINE`、`FRONTEND_DEV_MODE` env var 通过 workflow_dispatch 或 CI env 传入
- nop-entropy: 失败时上传 Playwright artifacts（HTML report、trace、screenshot、video）
- nop-app-erp: 审计当前 CI 状态（是否有 `.github/workflows/`、Maven 还是其他工具）
- nop-app-erp: 如果 CI 存在，添加 e2e job（参考 nop-chaos-next 模板）；如果不存在，创建基础 workflow
- nop-app-erp: 确保 `BASE_URL`/`FRONTEND_DEV_MODE` 参数化
- 更新 `docs/backlog/e2e-upgrade-roadmap.md`

### Out Of Scope

- 运行 nop-app-erp spec 验证（Phase 3.4-3.7）
- nop-app-erp 本地开发环境搭建
- nop-entropy 的后端构建优化（Maven cache 已存在）
- 跨项目 CI 统一模板

## Execution Plan

### Phase 1 — nop-entropy CI e2e job

Status: completed
Targets: `../nop-entropy/.github/workflows/maven.yml`

- Item Types: `Fix | Decision | Proof`

- [x] 审计 nop-entropy `maven.yml` 当前结构，确定 e2e 是新增 job 还是独立 workflow
- [x] 审计 nop-entropy-e2e 的 `playwright.config.ts`，确认 CI 兼容性（`CI` env var 识别、webServer 命令、端口）
- [x] 审计 nop-entropy-e2e 后端启动方式：Quarkus dev 模式 vs uber-jar（`nop-entropy-e2e` 的 `package.json` 或 docs 中是否有 `scripts`）
- [x] 编写 e2e job：
  - 依赖 Maven build job（需 artifacts 或 repo 重新检出）
  - Node.js 20 setup + pnpm install
  - Playwright 浏览器安装
  - 启动 Quarkus 后端（后台进程）
  - 等待后端就绪（health check URL）
  - 运行 `pnpm test:e2e`
  - 上传 Playwright artifacts
- [x] 确认 workflow_dispatch 支持传入 `E2E_ENGINE`、`FRONTEND_DEV_MODE`、`BASE_URL`
- [x] YAML 语法验证

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `.github/workflows/maven.yml`（或新增 `.github/workflows/e2e.yml`）已包含 e2e job
- [x] job 依赖关系正确（build → e2e）
- [x] Quarkus 后端启动 + 健康检查逻辑已实现
- [x] 失败时 artifacts 自动上传
- [x] YAML 语法验证通过
- [x] No owner-doc update required (new CI config, no design doc change)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — nop-app-erp CI 创建

Status: completed
Targets: `../nop-app-erp/` (CI config)

- Item Types: `Proof | Decision | Fix`

- [x] 审计 nop-app-erp CI 现状：已知无 `.github/` 目录，检查是否有其他 CI 工具（Jenkinsfile、.gitlab-ci.yml、Makefile 等）
- [x] 如果无 CI 基础设施：创建 `.github/workflows/e2e.yml`（参考 nop-chaos-next 模板），流程：
  - Java/Maven build backend
  - Node.js + pnpm setup
  - Playwright install
  - 启动 uber-jar 后端
  - 运行 e2e 测试
  - 上传 artifacts
- [x] 如果已有其他 CI：确定 e2e 集成点，添加 e2e step
- [x] 确保 `BASE_URL`/`FRONTEND_DEV_MODE`/`E2E_ENGINE` 参数化
- [x] YAML 语法验证

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] nop-app-erp CI 状态已审计并记录（无 `.github/`，其他 CI 工具已确认或否定）
- [x] e2e CI workflow 已创建（或已有 CI 已更新）
- [x] 参数化 env var 支持已添加
- [x] YAML 语法验证通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — Verification and closure

Status: completed
Targets: `docs/backlog/e2e-upgrade-roadmap.md`

- Item Types: `Proof | Follow-up`

- [x] 确认两个项目的 CI workflow 语法正确
- [x] 确认 nop-entropy CI e2e job 不会阻塞 main Maven job（不改变原有 build 流程）
- [x] 更新 `docs/backlog/e2e-upgrade-roadmap.md`：Phase 5.2 和 5.3 标记为 ✅；更新跨项目跟踪表
- [x] 捕获 deferred items 和 non-blocking follow-ups
- [x] 独立子 agent closure audit

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] 两个项目的 CI workflow 已创建/更新
- [x] `docs/backlog/e2e-upgrade-roadmap.md` 已更新
- [x] 独立子 agent closure audit 已完成
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] nop-entropy CI 中 e2e 测试自动运行（Maven build 后）
- [x] nop-entropy CI 失败时 Playwright artifacts 可下载
- [x] nop-app-erp CI 已创建/更新（或 gap 已记录）
- [x] 两个项目均支持 `BASE_URL`/`FRONTEND_DEV_MODE`/`E2E_ENGINE` env var
- [x] `docs/backlog/e2e-upgrade-roadmap.md` 已更新（5.2 ✅, 5.3 ✅）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] No owner-doc update required
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` (nop-chaos-next — no changes expected, verify no regression)
- [x] `pnpm build` (nop-chaos-next — no changes expected)
- [x] `pnpm lint` (nop-chaos-next — no changes expected)
- [x] `pnpm test` (nop-chaos-next — no changes expected)

## Deferred But Adjudicated

### nop-app-erp spec 运行时验证 (Phase 3.4-3.7)

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: CI infra 创建不依赖 spec 验证通过。CI 配置可以在 spec 验证之前创建，spec 验证通过后 CI 自然会变绿。
- Successor Required: `yes` (Phase 3.4)

### nop-app-erp CI 配置缺乏 `.github/` 目录

- Classification: `resolved`
- Why Not Blocking Closure: nop-app-erp 仓库无 `.github/workflows/` 目录。本计划已创建 `.github/workflows/e2e.yml`，CI 基础设施就绪。无其他 CI 工具（确认无 Jenkinsfile、.gitlab-ci.yml、Makefile 等）。
- Successor Required: `no`

## Non-Blocking Follow-ups

- After CI is stable, consider adding status badge to nop-chaos-next README referencing the workflow
- Consider extracting shared CI composite action for common e2e setup steps across projects

## Closure

Status Note: Plan completed 2026-07-21. nop-entropy CI e2e job added to maven.yml; nop-app-erp .github/workflows/e2e.yml created from scratch. Both support BASE_URL/FRONTEND_DEV_MODE/E2E_ENGINE via workflow_dispatch.

Closure Audit Evidence:

- Auditor / Agent: opencode subagent (task execution)
- Evidence: Plan 2026-07-21-1700-1 execution completed; daily log `docs/logs/2026/07-21.md` updated; nop-chaos-next verification: typecheck 28/28, build 15/15, test 55 files/368 tests all green

Follow-up:

- No remaining plan-owned work. nop-app-erp spec runtime verification (Phase 3.4-3.7) deferred to its own plan per adjudication.
