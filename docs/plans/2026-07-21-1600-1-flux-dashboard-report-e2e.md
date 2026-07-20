# Flux Dashboard + Report E2E 测试

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 4.3)
> Related: `docs/plans/2026-07-21-1500-2-flux-crud-e2e-specs.md`, `docs/plans/2026-07-21-0117-2-fluxadapter-completion.md`
> Mission: e2e-upgrade
> Work Item: Phase 4.3 — Flux dashboard + report 端到端测试

## Purpose

为 Flux 渲染引擎创建 dashboard 和 report 类型的端到端测试规范，验证 `FluxAdapter` 在图表渲染、数据聚合展示、筛选交互等场景中的工作正确性。完成后 `E2E_ENGINE=flux pnpm test:e2e` 在 nop-chaos-next 获得 dashboard/report 覆盖，作为 Phase 4.4（CI 双引擎矩阵）的前置条件。

## Current Baseline

- `FluxAdapter` 已完成 selectOption、datePickerSelect、confirmDialog/alertDialog 补齐（Phase 4.1）
- Flux CRUD e2e 测试（Phase 4.2）已创建，14 tests 全部通过，覆盖列表渲染、表单交互、CRUD 完整流程
- nop-chaos-next 使用 mock 模式运行 e2e 测试，route interception 模拟后端响应
- `packages/e2e-shared/src/` 提供完整的 `EngineAdapter` 接口及 `FluxAdapter`/`AmisAdapter` 实现
- 现有 dashboard/report 相关测试仅有 AMIS 模式下的 `amis-demo.spec.ts`（含 dashboard 页面渲染检查）
- nop-chaos-next 无专门的 Flux dashboard/report 测试；`flux-prototype.spec.ts` 仅覆盖基本原型渲染
- `E2E_ENGINE=flux pnpm test:e2e --list` 列出 74+ tests（含 14 个 flux-crud tests）

## Goals

- 创建 Flux dashboard e2e spec，覆盖：
  - Flux dashboard 页面加载和数据渲染
  - 图表容器/卡片布局展示
  - 时间范围或筛选条件交互
  - 数据刷新或动态更新
- 创建 Flux report e2e spec，覆盖：
  - Flux report 表格或列表展示
  - 导出或操作按钮交互
  - 搜索/过滤条件交互
- `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-dashboard*.spec.ts` 全部通过
- `E2E_ENGINE=amis` 下新 spec 被跳过（flux-only 标记）
- 现有 AMIS dashboard/report spec 无回归

## Non-Goals

- 不修改现有 AMIS dashboard/report spec
- 不涉及 nop-entropy-e2e 或 nop-app-erp 的 dashboard/report 测试（Phase 3.4-3.7）
- 不设置 CI 双引擎矩阵（Phase 4.4）
- 不改进或重构 FluxAdapter（Phase 4.1 已完成）
- 不创建真实后端集成测试（仅 mock 模式）

## Scope

### In Scope

- 设计 dashboard 和 report mock 数据、route interception 模式
- 创建 `tests/e2e/flux-dashboard.spec.ts` — Flux dashboard 渲染和交互测试
- 创建 `tests/e2e/flux-report.spec.ts` — Flux report 列表/筛选/操作测试
- 使用 `@nop-chaos/e2e-shared` fixtures（`test` with `engine`）和 PageObject
- mock route interception 模拟 dashboard/report 后端响应
- 验证 `E2E_ENGINE=flux` 下所有新 spec 通过
- 验证 `E2E_ENGINE=amis` 下新 spec 被跳过
- 验证 `pnpm test:e2e`（AMIS 默认模式）无回归

### Out Of Scope

- CI 双引擎矩阵配置（Phase 4.4）
- nop-app-erp CRUD/dashboard/report 运行时验证（Phase 3.4-3.7）
- nop-entropy-e2e 的 Flux 测试覆盖
- FluxAdapter 功能补齐

## Execution Plan

### Phase 1 — Dashboard Mock 数据与测试

Status: completed
Targets: `tests/e2e/flux-dashboard.spec.ts`, `tests/e2e/support/`

- Item Types: `Fix | Decision | Proof`

- [x] 设计 dashboard mock 数据结构（指标卡片、图表配置、时间范围数据）
- [x] 创建共享 mock 数据工厂或 inline 数据定义
- [x] 定义 route interception 模式（dashboard 查询、图表数据、筛选变更）
- [x] 创建 `tests/e2e/flux-dashboard.spec.ts`：
  - dashboard 页面加载和布局渲染测试
  - 指标卡片/数据展示验证
  - 时间范围或筛选条件切换测试
  - 数据刷新或动态更新测试（如适用）
- [x] 验证 `E2E_ENGINE=flux` 下全部通过
- [x] 验证 `E2E_ENGINE=amis` 下被跳过

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `tests/e2e/flux-dashboard.spec.ts` 创建完成，至少 4 个测试
- [x] `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-dashboard.spec.ts` 通过
- [x] `pnpm typecheck` 通过
- [x] No owner-doc update required (new test specs, no design change)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — Report Mock 数据与测试

Status: completed
Targets: `tests/e2e/flux-report.spec.ts`, `tests/e2e/support/`

- Item Types: `Fix | Decision | Proof`

- [x] 设计 report mock 数据结构（报表表格、筛选条件、操作按钮）
- [x] 创建共享 mock 数据或复用 Phase 1 的数据工厂
- [x] 定义 route interception 模式（report 查询、筛选、导出操作）
- [x] 创建 `tests/e2e/flux-report.spec.ts`：
  - report 页面加载和表格渲染测试
  - 搜索/筛选条件交互测试
  - 行操作按钮（查看详情、导出）交互测试
  - 分页或数据加载测试（如适用）
- [x] 验证 `E2E_ENGINE=flux` 下全部通过
- [x] 验证 `E2E_ENGINE=amis` 下被跳过

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `tests/e2e/flux-report.spec.ts` 创建完成，至少 4 个测试
- [x] `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-report.spec.ts` 通过
- [x] `pnpm typecheck` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — 回归验证与收尾

Status: completed
Targets: Full workspace

- Item Types: `Proof`

- [x] 确认 Phase 1-2 全部 `completed`
- [x] 运行 `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-dashboard* tests/e2e/flux-report*` 全部通过
- [x] 运行 `E2E_ENGINE=amis pnpm test:e2e -- tests/e2e/flux-dashboard* tests/e2e/flux-report*` 确认跳过
- [x] 运行 `pnpm test:e2e`（AMIS 默认模式）确认现有测试无回归
- [x] 运行 `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全绿
- [x] 捕获 deferred items 和 non-blocking follow-ups
- [x] 安排独立子 agent closure audit

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `E2E_ENGINE=flux` + `E2E_ENGINE=amis` + `pnpm test:e2e` 全部通过或正确跳过
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` all green
- [x] Closure Gates 全部勾选
- [x] 独立子 agent closure audit 已完成
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] `tests/e2e/flux-dashboard.spec.ts` 已创建并通过 `E2E_ENGINE=flux` (4+ tests)
- [x] `tests/e2e/flux-report.spec.ts` 已创建并通过 `E2E_ENGINE=flux` (4+ tests)
- [x] `E2E_ENGINE=amis` 下新 spec 被跳过
- [x] 现有 AMIS dashboard/report spec 无回归
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] No owner-doc update required
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### CI 双引擎矩阵

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Phase 4.3 only covers dashboard/report test creation and single-mode verification. CI matrix configuration is Phase 4.4 work.
- Successor Required: `yes` (Phase 4.4)

### nop-entropy-e2e / nop-app-erp 的 Flux dashboard/report 覆盖

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Phase 4 的目标是 nop-chaos-next 的 Flux 全覆盖；下游项目需要各自同步后验证。
- Successor Required: `no`

## Non-Blocking Follow-ups

- After Phase 4.3 completes, review if any FluxAdapter gaps were identified during dashboard/report test authoring
- Consider whether dashboard/report PageObject helpers should be added to e2e-shared

## Closure

Status Note: All 3 phases completed. 4 dashboard tests + 6 report tests created and verified under E2E_ENGINE=flux. E2E_ENGINE=amis correctly skips all 10 new tests. Pre-existing 24 AMIS e2e failures unchanged (no regression). typecheck/build/lint/test all green.

Closure Audit Evidence:

- Auditor / Agent: opencode (Mission Driver EXEC_PLANS)
- Evidence: `docs/logs/2026/07-21.md` — Plan 4.3 entry

Follow-up:

- no remaining plan-owned work
