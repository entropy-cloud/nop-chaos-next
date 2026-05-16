# 18 Component Decomposition Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-16
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 02-01, 02-02, 02-03)
> Related: `docs/plans/01-code-quality-improvement-plan.md`

## Purpose

拆分 3 个超 500 行的文件，将巨型组件/模块分解为职责单一的子模块。

## Current Baseline

- `flow-editor/[id]/index.tsx` 573 行，7 职责（02-01, P2）。
- `amis-core/graphql.ts` 555 行，4 职责（02-02, P2）。
- `dashboard/index.tsx` 532 行，6 个图表全部内联（02-03, P2）。

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

Status: planned
Targets: `apps/main/src/pages/dashboard/index.tsx`

- Item Types: `Decision`

- [ ] 1.1 提取 `TrendAreaChart`、`ComposedChartCard` 等图表组件到 `apps/main/src/pages/dashboard/components/` 目录
- [ ] 1.2 页面文件降至 ~150 行（仅保留布局和 props 传递）

Exit Criteria:

- [ ] `dashboard/index.tsx` 行数 ≤ 200
- [ ] 图表组件存在于 `dashboard/components/`
- [ ] `pnpm --filter @nop-chaos/main typecheck && pnpm --filter @nop-chaos/main build` 通过
- [ ] `pnpm test` 通过（含更新后的 import 路径）
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - Flow Editor Hook Extraction

Status: planned
Targets: `apps/main/src/pages/flow-editor/[id]/index.tsx`

- Item Types: `Decision`

- [ ] 2.1 提取 `useFlowEditorState`（state 管理）
- [ ] 2.2 提取 `useFlowEditorActions`（CRUD、undo/redo）
- [ ] 2.3 提取 `useFlowPersistence`（保存/加载）
- [ ] 2.4 提取 `useFlowDragDrop`（拖拽处理）
- [ ] 2.5 页面文件降至 ~200 行

Exit Criteria:

- [ ] `flow-editor/[id]/index.tsx` 行数 ≤ 250
- [ ] 至少 4 个 hooks 提取到 `hooks/` 子目录
- [ ] `pnpm --filter @nop-chaos/main typecheck && pnpm --filter @nop-chaos/main build` 通过
- [ ] `pnpm test` 通过（含更新后的 import 路径）
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - GraphQL Module Split

Status: planned
Targets: `packages/amis-core/src/core/graphql.ts`

- Item Types: `Decision`

- [ ] 3.1 提取 `graphqlFilter.ts`（toFilter 及相关类型守卫）
- [ ] 3.2 提取 `graphqlArgs.ts`（参数转换逻辑）
- [ ] 3.3 保留 `graphql.ts` 作为注册表和入口（~150 行）
- [ ] 3.4 验证 `pnpm --filter @nop-chaos/amis-core build` 通过

Exit Criteria:

- [ ] `graphql.ts` 行数 ≤ 200
- [ ] `graphqlFilter.ts` 和 `graphqlArgs.ts` 存在
- [ ] `pnpm --filter @nop-chaos/amis-core build` 通过
- [ ] `pnpm test` 通过（含更新后的 import 路径）
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [ ] 3 个文件均降至目标行数以下（dashboard ≤200, flow-editor ≤250, graphql ≤200）
- [ ] 运行时行为无变化
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 未来可进一步拆分 flow-editor 中的 JSX 模板到子组件。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- Flow editor JSX 模板子组件化
