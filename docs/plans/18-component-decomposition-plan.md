# 18 Component Decomposition Plan

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 02-01, 02-02, 02-03), refreshed by live-repo audit 2026-07-20
> Related: `docs/plans/01-code-quality-improvement-plan.md`

## Purpose

拆分 3 个超 500 行的文件，将巨型组件/模块分解为职责单一的子模块。

## Current Baseline

（以下行数来自 2026-07-20 live-repo audit）

- `dashboard/index.tsx` **171 行**（目标 ≤200）✅ — 6 个图表组件已拆分到 `dashboard/components/`（CategoryPieChart, ChannelStackedChart, ComposedChartCard, EventsCard, PerformanceRadarChart, TrendAreaChart + chartUtils）
- `flow-editor/[id]/index.tsx` **222 行**（目标 ≤250）✅ — 已拆分出 7 个 hooks（useFlowEditorState, useFlowEditorActions, useFlowPersistence, useFlowDragDrop, useFlowHistory, useFloatingToolbarVisibility, useFlowKeyboardShortcuts）+ 6 个组件 + types/constants/utils/context
- `packages/amis-core/src/core/graphql.ts` **175 行**（目标 ≤200）✅ — 已拆分出 graphqlArgs.ts + graphqlFilter.ts（均含独立测试文件）

## Goals

- 每个文件降至目标行数以下：dashboard ≤200，flow-editor ≤250，graphql ≤200。
- 每个提取的子模块有单一明确职责。
- 不改变任何运行时行为。

## Non-Goals

- 不改变组件 API 或 props 接口。
- 不优化渲染性能。
- 不改变图表配置。

## Scope

### In Scope

- 3 个文件的拆分重构。
- 提取 hooks、子组件、工具函数到同目录 `components/` 或 `hooks/` 子目录。

### Out Of Scope

- 跨文件重构。
- 性能优化。
- 新功能添加。

## Execution Plan

### Phase 1 - Dashboard Chart Extraction

Status: completed
Targets: `apps/main/src/pages/dashboard/index.tsx`

- Item Types: `Decision`

- [x] 1.1 提取 `TrendAreaChart`、`ComposedChartCard` 等图表组件到 `apps/main/src/pages/dashboard/components/` 目录
- [x] 1.2 页面文件降至 ~150 行（仅保留布局和 props 传递）

Exit Criteria:

- [x] `dashboard/index.tsx` 行数 ≤ 200（实际 171）
- [x] 图表组件存在于 `dashboard/components/`
- [x] `pnpm --filter @nop-chaos/main typecheck && pnpm --filter @nop-chaos/main build` 通过
- [x] `pnpm test` 通过（含更新后的 import 路径）
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Flow Editor Hook Extraction

Status: completed
Targets: `apps/main/src/pages/flow-editor/[id]/index.tsx`

- Item Types: `Decision`

- [x] 2.1 提取 `useFlowEditorState`（state 管理）
- [x] 2.2 提取 `useFlowEditorActions`（CRUD、undo/redo）
- [x] 2.3 提取 `useFlowPersistence`（保存/加载）
- [x] 2.4 提取 `useFlowDragDrop`（拖拽处理）
- [x] 2.5 页面文件降至 ~200 行（实际 222）

Exit Criteria:

- [x] `flow-editor/[id]/index.tsx` 行数 ≤ 250（实际 222）
- [x] 至少 4 个 hooks 提取到 `hooks/` 子目录（实际 7 个 hooks）
- [x] `pnpm --filter @nop-chaos/main typecheck && pnpm --filter @nop-chaos/main build` 通过
- [x] `pnpm test` 通过（含更新后的 import 路径）
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - GraphQL Module Split

Status: completed
Targets: `packages/amis-core/src/core/graphql.ts`

- Item Types: `Decision`

- [x] 3.1 提取 `graphqlFilter.ts`（toFilter 及相关类型守卫）
- [x] 3.2 提取 `graphqlArgs.ts`（参数转换逻辑）
- [x] 3.3 保留 `graphql.ts` 作为注册表和入口（~150 行，实际 175）
- [x] 3.4 验证 `pnpm --filter @nop-chaos/amis-core build` 通过

Exit Criteria:

- [x] `graphql.ts` 行数 ≤ 200（实际 175）
- [x] `graphqlFilter.ts` 和 `graphqlArgs.ts` 存在（含配套测试文件）
- [x] `pnpm --filter @nop-chaos/amis-core build` 通过
- [x] `pnpm test` 通过（含更新后的 import 路径）
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 3 个文件均降至目标行数以下（dashboard 171 ≤200, flow-editor 222 ≤250, graphql 175 ≤200）
- [x] 运行时行为无变化
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 未来可进一步拆分 flow-editor 中的 JSX 模板到子组件。

## Closure

Status Note: 所有三个 Phase 已由 Mission Driver 验证通过。代码行数均在目标范围内，类型检查/构建/测试/ lint 全部通过。

Closure Audit Evidence:

- Reviewer / Agent: Mission Driver (opencode agent)
- Evidence: Plan executed via Mission Driver EXEC_PLANS (2026-07-20). Verification: dashboard 171 lines ✅, flow-editor 222 lines ✅, graphql 175 lines ✅; `pnpm typecheck && pnpm build && pnpm lint && pnpm test` all green.

Follow-up:

- Flow editor JSX 模板子组件化
