# Dashboard / Report / Business Action / Visual Spec Verification for nop-app-erp

> Plan Status: active
> Last Reviewed: 2026-07-21
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (items 3.5, 3.6, 3.7)
> Related: `docs/plans/2026-07-21-1700-2-crud-spec-verification-erp.md`, `docs/plans/2026-07-21-1000-2-nop-app-erp-shared-lib-sync-and-cleanup.md`
> Mission: e2e-upgrade
> Work Item: Phase 3.5 + 3.6 + 3.7 — Dashboard/report/business-action/orchestration/visual spec 验证

## Purpose

在 nop-app-erp 中运行非 CRUD 类的全部 E2E 测试（dashboards 21 + reports 44 + business-actions 94 + orchestration 10 + visual 9 = ~178 spec），验证共享库同步后这些 spec 仍然全部通过。这是 nop-app-erp 迁移的全部运行时验证收口。

## Current Baseline

### 已完成（live repo 可验证）

- 共享库同步（Phase 3.1+3.2）和 Navigation 统一（Phase 3.3）已完成，`npx playwright test --list` 列出 614 tests 无 import 错误
- nop-app-erp 仓库在 `../nop-app-erp/` 可访问
- 非 CRUD spec 在 nop-app-erp 中的实际分布（已验证 live repo）：
  - `tests/e2e/dashboards/` — 21 spec（注意：目录名复数 `dashboards`，非 `dashboard`）
  - `tests/e2e/reports/` — 44 spec（注意：目录名复数 `reports`，非 `report`）
  - `tests/e2e/business-actions/` — 94 spec（注意：目录名 `business-actions`，非 `business-action`）
  - `tests/e2e/orchestration/` — 10 spec
  - `tests/e2e/visual/` — 9 spec（roadmap 标 11，实际 9）
- visual regression spec 依赖 Playwright screenshot 快照比较

### 依赖前序计划

- Phase 3.4（计划 `docs/plans/2026-07-21-1700-2-crud-spec-verification-erp.md`）需先完成，确认 nop-app-erp CRUD 工作流可运行
- nop-app-erp 后端（Quarkus uber-jar port 8080）启动流程在 Phase 3.4 中定义

### 已知风险

- dashboard/report spec 涉及图表和数据可视化组件，可能依赖特定数据集
- visual 首次运行可能需要生成 baseline 快照（`--update-snapshots`）

## Goals

- 全部 ~178 个非 CRUD spec 通过（每个失败项已归因：共享库 regression vs 预存环境/数据问题）
- 运行 `E2E_ENGINE=flux npx playwright test tests/e2e/dashboards/ tests/e2e/reports/` 至少 smoke 级别通过
- 如有共享库导致的 regression，已定位并修复
- 更新 roadmap 标记 Phase 3.5、3.6、3.7 为完成

## Non-Goals

- 不重复运行 CRUD spec（Phase 3.4 已覆盖）
- 不修改共享库或 nop-app-erp 测试代码本身（除 regression 修复外）
- 不创建新 spec
- 不修改 spec 代码本身（除 regression 修复外）

## Scope

### In Scope

- 确认 Phase 3.4 后端环境仍可用（否则重新启动）
- 按目录分组运行各非 CRUD spec：
  - `npx playwright test tests/e2e/dashboards/`（21 spec）
  - `npx playwright test tests/e2e/reports/`（44 spec）
  - `npx playwright test tests/e2e/business-actions/`（94 spec）
  - `npx playwright test tests/e2e/orchestration/`（10 spec）
  - `npx playwright test tests/e2e/visual/`（9 spec）
- 对每个失败项分析根因（共享库 regression / 预存环境 / 数据依赖 / baseline 缺失）
- 修复共享库引入的 regression（如有），本地适配层覆盖或回退
- 记录 visual spec 中 baseline 快照的首次创建策略（`--update-snapshots`）
- 更新 roadmap

### Out Of Scope

- CRUD spec（Phase 3.4）
- CI 配置（Phase 5.3）
- 创建新 spec 或增加测试覆盖
- nop-app-erp 数据集准备（数据依赖项视为预存环境问题）

## Execution Plan

### Phase 1 — 环境准备 + Dashboards + Reports spec

Status: planned
Targets: `../nop-app-erp/tests/e2e/dashboards/`, `../nop-app-erp/tests/e2e/reports/`

- Item Types: `Proof | Fix`

- [ ] 确认后端仍可访问（Phase 3.4 已启动），否则重新启动
- [ ] 运行 `npx playwright test tests/e2e/dashboards/`（21 spec）
- [ ] 记录 dashboards 结果：通过数、失败数、失败原因
- [ ] 运行 `npx playwright test tests/e2e/reports/`（44 spec）
- [ ] 记录 reports 结果：通过数、失败数、失败原因
- [ ] 如发现共享库 regression：定位并修复（适配层或共享库）

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 21 个 dashboards spec 运行完成，失败已归因
- [ ] 44 个 reports spec 运行完成，失败已归因
- [ ] 如有共享库 regression 已修复
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 — Business actions + Orchestration spec

Status: planned
Targets: `../nop-app-erp/tests/e2e/business-actions/`, `../nop-app-erp/tests/e2e/orchestration/`

- Item Types: `Proof | Fix`

- [ ] 运行 `npx playwright test tests/e2e/business-actions/`（94 spec）
- [ ] 记录 business-actions 结果：通过数、失败数、失败原因
- [ ] 运行 `npx playwright test tests/e2e/orchestration/`（10 spec）
- [ ] 记录 orchestration 结果：通过数、失败数、失败原因
- [ ] 如发现共享库 regression：定位并修复

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 94 个 business-actions spec 运行完成，失败已归因
- [ ] 10 个 orchestration spec 运行完成，失败已归因
- [ ] 如有共享库 regression 已修复
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 — Visual regression spec

Status: planned
Targets: `../nop-app-erp/tests/e2e/visual/`

- Item Types: `Proof | Decision`

- [ ] 确认实际 visual spec 文件数（`ls ../nop-app-erp/tests/e2e/visual/*.spec.ts | wc -l`，已知 road map 标 11 但实际为 9）
- [ ] 运行 `npx playwright test tests/e2e/visual/`
- [ ] 分析结果：如果首次运行失败（snapshot baseline 不存在），使用 `--update-snapshots` 生成 baseline
- [ ] 记录 visual 结果：通过数、失败数、baseline 生成情况
- [ ] 如发现共享库 regression（如页面结构变化导致快照 diff）：定位并修复

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 全部 visual spec 运行完成，失败已归因
- [ ] baseline 快照管理策略已记录（首次生成 vs 后续维持）
- [ ] 如有共享库 regression 已修复
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 — 验证与收口

Status: planned
Targets: `docs/backlog/e2e-upgrade-roadmap.md`

- Item Types: `Proof | Follow-up`

- [ ] 确认所有 ~178 个 spec 全部通过或仅预存问题
- [ ] Flux engine smoke 测试已记录
- [ ] 更新 `docs/backlog/e2e-upgrade-roadmap.md`：Phase 3.5、3.6、3.7 标记为 ✅；更新跨项目跟踪表
- [ ] 捕获 deferred items 和 non-blocking follow-ups
- [ ] 独立子 agent closure audit

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 所有 Phase 1-3 Exit Criteria 已满足
- [ ] `docs/backlog/e2e-upgrade-roadmap.md` 已更新
- [ ] 独立子 agent closure audit 已完成
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [ ] 全部 ~178 个非 CRUD spec 通过（或每个失败项已明确归因，非共享库引入）
- [ ] Flux engine dashboards/reports smoke 验证结果已记录
- [ ] visual spec baseline 快照管理策略已记录
- [ ] `docs/backlog/e2e-upgrade-roadmap.md` 已更新（3.5 ✅, 3.6 ✅, 3.7 ✅）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck` (nop-chaos-next — no changes expected, verify no regression)
- [ ] `pnpm build` (nop-chaos-next — no changes expected)
- [ ] `pnpm lint` (nop-chaos-next — no changes expected)
- [ ] `pnpm test` (nop-chaos-next — no changes expected)

## Deferred But Adjudicated

### Flux 引擎在 nop-app-erp 全覆盖

- Classification: `watch-only residual`
- Why Not Blocking Closure: Flux 引擎在 nop-chaos-next 中已完成全面测试（Phase 4.2-4.3）。nop-app-erp 的 Flux 引擎覆盖率取决于业务页面的 Flux 渲染器推进情况，不属于当前的 spec 验证收口范围。
- Successor Required: `no`

### nop-app-erp CI 配置 (Phase 5.3)

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: CI 配置由 Phase 5.3 计划（`docs/plans/2026-07-21-1700-1-ci-integration-entropy-erp.md`）覆盖，本计划仅做 spec 运行时验证。
- Successor Required: `yes` (Phase 5.3)

## Non-Blocking Follow-ups

- After all nop-app-erp spec verification completes, consider running full `npx playwright test` (all ~614 tests) once to confirm no residual issues
- Document any data-preparation steps needed for dashboard/report spec playback

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者>>
- Evidence: <<task id / daily log>>

Follow-up:

- <<明确写 no remaining plan-owned work>>
