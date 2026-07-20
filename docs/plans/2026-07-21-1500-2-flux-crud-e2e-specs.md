# Flux CRUD 端到端测试

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 4.2)
> Related: `docs/plans/2026-07-21-0117-2-fluxadapter-completion.md`
> Mission: e2e-upgrade
> Work Item: Phase 4.2 — Flux CRUD 端到端测试

## Purpose

为 Flux 渲染引擎创建一组端到端 CRUD 测试规范，验证 `FluxAdapter` 在真实 CRUD 流程中的工作正确性。测试覆盖列表渲染、表单填写、新增、编辑、删除等核心 CRUD 操作在 Flux 模式下的行为。这些 spec 将成为后续 Phase 4.3（dashboard/report）和 Phase 4.4（CI 双引擎矩阵）的前置条件。

## Current Baseline

- `FluxAdapter` 已完成方法补齐（Phase 4.1）：`selectOption` 支持多字段、级联、搜索、回退；`datePickerSelect` 支持日历交互和原生 date input 填充；新增 `confirmDialog()` / `alertDialog()` 特殊对话框方法
- `E2E_ENGINE=flux pnpm test:e2e --list` 显示 74 个测试可发现，其中 `flux-prototype.spec.ts` 覆盖基本的 Flux 渲染测试
- nop-chaos-next 现有 CRUD 相关 spec：`master-detail-buttons.spec.ts`（27 tests）、`master-detail-dialogs.spec.ts`（6 tests）使用 AMIS 选择器，尚不支持 Flux 引擎切换
- `playwright.config.ts` 支持 `E2E_ENGINE` env var 注入到 webServer 环境
- `packages/e2e-shared/src/fixtures.ts` 的 `test` fixture 支持 `engine` 参数（`getEngine()` 根据 `E2E_ENGINE` 创建适配器）
- nop-chaos-next 的 e2e 测试在 mock 模式下运行（无后端、route interception），共有 23+ spec，其中 9 个有预存失败（prototype/live 测试）
- `packages/e2e-shared/src/` 提供完整的 `CrudListPage`、`FormDialog`、`BasePage` PageObject 层次

## Goals

- 创建一组 Flux CRUD e2e spec（至少 3 个测试文件），覆盖：
  - Flux CRUD 列表渲染和分页
  - Flux 表单字段填写（文本、下拉选择、日期选择）
  - Flux CRUD 新增/编辑/删除流程
- `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-crud*.spec.ts` 全部通过
- `E2E_ENGINE=amis pnpm test:e2e -- tests/e2e/flux-crud*.spec.ts` 跳过或不运行（标记为 flux-only）
- 现有 AMIS CRUD spec 不受影响（`master-detail-buttons.spec.ts`、`master-detail-dialogs.spec.ts` 保持 27+6 passed）

## Non-Goals

- 不修改现有 AMIS CRUD spec（它们保持 AMIS-only 模式）
- 不覆盖 dashboard/report/visual spec（Phase 4.3）
- 不设置 CI 双引擎矩阵（Phase 4.4）
- 不改进或重构 FluxAdapter（Phase 4.1 已完成）
- 不修改 nop-entropy-e2e 或 nop-app-erp 的测试代码

## Scope

### In Scope

- 创建 `tests/e2e/flux-crud-form.spec.ts` — Flux 表单字段交互测试：文本输入、下拉选择（单选/多选）、日期选择、提交按钮
- 创建 `tests/e2e/flux-crud-list.spec.ts` — Flux CRUD 列表测试：表格渲染、行操作（编辑/删除按钮）、新增按钮、数据加载
- 创建 `tests/e2e/flux-crud-flow.spec.ts` — Flux CRUD 完整流程测试：打开列表 → 新增 → 填写表单 → 提交 → 验证列表更新 → 编辑 → 验证 → 删除 → 验证
- 使用 `@nop-chaos/e2e-shared` 的 fixtures（`test` with `engine`）和 PageObject（`CrudListPage`、`FormDialog`）
- 使用 mock route interception 模拟后端响应（与现有 nop-chaos-next mock 模式一致）
- 验证 `E2E_ENGINE=flux` 下所有新 spec 通过
- 验证 `E2E_ENGINE=amis` 下新 spec 被跳过（`test.skip` 或 conditionally）

### Out Of Scope

- Flux dashboard/report e2e 测试（Phase 4.3）
- CI 双引擎矩阵配置（Phase 4.4）
- 真实的 Flux prototye 测试（`flux-prototype.spec.ts` 已经是独立的 prototype 验证）
- nop-entropy-e2e 或 nop-app-erp 的 Flux 测试

## Execution Plan

### Phase 1 — Mock 数据准备

Status: completed
Targets: `tests/e2e/flux-crud-form.spec.ts`, `tests/e2e/flux-crud-list.spec.ts`, `tests/e2e/flux-crud-flow.spec.ts`

- Item Types: `Fix | Decision`

- [x] 设计模拟 CRUD 实体的数据结构（字段、类型、验证规则），使其同时适用于 AMIS 和 Flux 渲染
- [x] 创建共享的 mock 数据工厂函数（或在各 spec 中分别定义）
- [x] 定义 route interception 模式（列表查询 / 新增 / 编辑 / 删除对应的 GraphQL 或 REST mock 端点）
- [x] 确认 mock 响应格式与 `CrudListPage` 和 `FormDialog` 的行为期望一致

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Mock 数据结构和 interception 模式已定义
- [x] Flux 渲染下 mock 数据格式已验证（可以参考 `flux-prototype.spec.ts` 的 mock 模式）
- [x] `No owner-doc update required` (new test specs, no design change)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — Flux 表单字段测试

Status: completed
Targets: `tests/e2e/flux-crud-form.spec.ts`

- Item Types: `Fix`

- [x] 实现文本输入字段测试：`input[type="text"]` / `textarea` / `input[type="number"]` 在 Flux 下的交互
- [x] 实现下拉选择测试：单选 `selectOption`、多字段标签 `selectOption(fieldLabels, optionTexts)`、级联选择（如适用）
- [x] 实现日期选择测试：`datePickerSelect` 日历选择、回退到 `input[type="date"]` 填充
- [x] 实现表单提交/重置测试：submit button、form field 验证
- [x] 验证 `E2E_ENGINE=flux` 下全部通过
- [x] 验证 `E2E_ENGINE=amis` 下被跳过

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `tests/e2e/flux-crud-form.spec.ts` 创建完成
- [x] `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-crud-form.spec.ts` 通过
- [x] `pnpm typecheck` 通过
- [x] `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — Flux CRUD 列表测试

Status: completed
Targets: `tests/e2e/flux-crud-list.spec.ts`

- Item Types: `Fix`

- [x] 实现列表渲染测试：验证表格可见、行数正确、数据加载
- [x] 实现行操作测试：验证编辑按钮和删除按钮可见并可点击
- [x] 实现新增按钮测试：验证新增按钮可见，点击后可打开表单
- [x] 使用 `CrudListPage` 的 `navigate()`、`waitForList()`、`findRowByText()`、`getAddButton()`、`editRow()`、`deleteRow()`
- [x] 验证 `E2E_ENGINE=flux` 下全部通过

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `tests/e2e/flux-crud-list.spec.ts` 创建完成
- [x] `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-crud-list.spec.ts` 通过
- [x] `pnpm typecheck` 通过
- [x] `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 — Flux CRUD 完整流程测试

Status: completed
Targets: `tests/e2e/flux-crud-flow.spec.ts`

- Item Types: `Fix`

- [x] 实现完整 CRUD 流程测试：打开列表 → 点击新增 → 填写表单 → 提交 → 验证列表更新
- [x] 实现编辑流程测试：选择行 → 编辑 → 修改字段 → 提交 → 验证列表更新
- [x] 实现删除流程测试：选择行 → 删除 → 确认 → 验证行从列表中消失
- [x] 使用 `CrudListPage` + `FormDialog` 的组合 API，模拟真实用户操作序列
- [x] 验证 `E2E_ENGINE=flux` 下全部通过

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `tests/e2e/flux-crud-flow.spec.ts` 创建完成
- [x] `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-crud-flow.spec.ts` 通过
- [x] `pnpm typecheck` 通过
- [x] `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

### Phase 5 — 回归验证

Status: completed
Targets: todo list above + full workspace

- Item Types: `Proof`

- [x] 确认 Phase 1-4 全部 `completed`
- [x] 运行 `E2E_ENGINE=flux pnpm test:e2e -- tests/e2e/flux-crud*.spec.ts` 全部通过 (14/14)
- [x] 运行 `E2E_ENGINE=amis pnpm test:e2e -- tests/e2e/flux-crud*.spec.ts` 确认跳过 (14/14)
- [x] 运行 `pnpm test:e2e`（AMIS 默认模式）确认现有 33/33 CRUD 结果无回归（master-detail-buttons + master-detail-dialogs）
- [x] 运行 `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全绿（typecheck 28/28, lint 28/28, test 55 files/368 tests）
- [x] 捕获 deferred items 和 non-blocking follow-ups
- [x] 安排独立子 agent closure audit

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] 全量验证通过
- [x] Closure Gates 全部勾选
- [x] 独立子 agent closure audit 已完成
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 3 个 flux-crud spec 文件已创建并通过 `E2E_ENGINE=flux` 测试 (14/14)
- [x] `E2E_ENGINE=amis` 下新 spec 被跳过 (14/14)
- [x] 现有 AMIS CRUD spec（master-detail-buttons + master-detail-dialogs）无回归 (33/33)
- [x] `pnpm test:e2e` 全量 74 个测试用例（23+ spec 文件）中至少 65 通过（当前 baseline 水平，无新增 regression）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] No owner-doc update required (new test specs, no design change)
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` (28/28)
- [x] `pnpm build` (15/15)
- [x] `pnpm lint` (28/28)
- [x] `pnpm test` (55 files, 368 tests)

## Deferred But Adjudicated

### Flux dashboard / report e2e 测试

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Phase 4.2 only covers CRUD flows. Dashboard and report testing is Phase 4.3, which depends on CRUD coverage being in place first.
- Successor Required: `yes` (Phase 4.3)

### CI 双引擎矩阵

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: CI configuration for dual-engine testing is Phase 4.4 work, which depends on Flux CRUD coverage (4.2) being complete.
- Successor Required: `yes` (Phase 4.4)

## Non-Blocking Follow-ups

- After Phase 4.2 and 4.3, consider adding a flux-specific `playwright.config.ts` fixture that defaults to `E2E_ENGINE=flux` for CI
- Review FluxAdapter test coverage gaps discovered during real CRUD spec authoring (if any)

## Closure

Status Note: 2026-07-21 — All 5 phases completed. 14 flux CRUD tests created and passing. Full workspace verification (typecheck, build, lint, test) all green.

Closure Audit Evidence:

- Auditor / Agent: opencode (nop-ralph-loop)
- Evidence: E2E_ENGINE=flux 14/14 passed, E2E_ENGINE=amis 14/14 skipped, AMIS CRUD 33/33 unchanged, pnpm typecheck/build/lint/test all green

Follow-up:

- Phase 4.3 (Flux dashboard + report tests) and Phase 4.4 (CI dual-engine matrix) are successors per roadmap
