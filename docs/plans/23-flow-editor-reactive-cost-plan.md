# 23 Flow Editor Reactive Cost Plan

> Plan Status: planned
> Last Reviewed: 2026-05-17
> Source: `docs/plans/22-current-deep-audit-remediation-plan.md` deferred item `Flow Editor Reactive Cost Containment`, plus `docs/analysis/2026-05-17-deep-audit-v1/05-reactive-precision.md` findings 05-06, 05-07, 05-09 and `summary.md` retained P2 list
> Related: `docs/plans/18-component-decomposition-plan.md`, `docs/plans/22-current-deep-audit-remediation-plan.md`

## Purpose

收口 flow editor 当前已复核保留的响应式热路径问题：context 高频 fan-out、memo 失效、以及 dirty 判定的高频序列化成本，在不改变公开行为的前提下降低编辑交互期间的非必要渲染与计算成本。

## Current Baseline

- `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts` 当前使用 16 个 `useState` 管理编辑器状态，`dirty` 在第 78-79 行通过 `JSON.stringify({ nodes, edges }) !== savedSnapshot` 在每次 render 计算。
- `apps/main/src/pages/flow-editor/[id]/useFlowEditorActions.ts` 当前将完整 `state` 对象作为 `editorActions` 的 `useMemo` 依赖（第 125-139 行），导致 state 任一字段变化时 `editorActions` 都重新生成。
- 同文件的 `editorActions` context 值还包含 `hoveredNodeId` / `hoveredEdgeId`，使 hover 这种高频交互可能 fan-out 到所有 context 消费者。
- 2026-05-17 summary 将这些项保留为 P2，但未纳入 Plan 22 的 blocking scope，因为它们不阻塞当前 retained P1 closure。

## Goals

- 收窄 flow editor actions/context 的高频依赖，避免无意义 memo 失效。
- 将 dirty 判定改成更低成本、可验证、不会改变外部行为的实现。
- 为这些内部性能收窄提供 focused proof，而不是只凭主观判断宣称“更快”。

## Non-Goals

- 不重构 flow editor 的整体状态架构为 Zustand 或 React Query。
- 不变更 flow editor 的页面 API、节点数据结构或交互语义。
- 不在本计划内做 UI 视觉改版、功能扩展、或 graph model 重构。

## Scope

### In Scope

- `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts`
- `apps/main/src/pages/flow-editor/[id]/useFlowEditorActions.ts`
- flow editor 相关 focused tests（现有或新增 colocated tests）

### Out Of Scope

- `apps/main/src/pages/flow-editor/[id]/index.tsx` 的大规模组件拆分
- graph persistence / save API 行为修改
- broad performance benchmarking infrastructure

## Execution Plan

### Phase 1 - Memo Dependency Narrowing

Status: planned
Targets: `apps/main/src/pages/flow-editor/[id]/useFlowEditorActions.ts`

- Item Types: `Fix | Proof`

- [ ] 将 `editorActions` 的 `useMemo` 依赖从整个 `state` 对象收窄为稳定 setter 与真实使用字段。
- [ ] 审核 `openNodeEditor` / `openEdgeEditor` / `duplicateNode` / `requestDelete` 等 callback 的依赖，移除无必要的对象级依赖。
- [ ] 添加 focused proof，至少验证 `editorActions` 在无关 state 变化时 identity 不变。

Exit Criteria:

- [ ] `useFlowEditorActions.ts` 中不存在 `editorActions` 依赖完整 `state` 对象的写法。
- [ ] focused tests 或等价 render proof 证明：无关 state 变化时 actions identity 不会变化。
- [ ] `pnpm --filter @nop-chaos/main exec vitest run src/pages/flow-editor/[id]/index.test.ts` 或新增等价 focused tests 通过。
- [ ] No owner-doc update required.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Hover Fan-Out Containment

Status: planned
Targets: `apps/main/src/pages/flow-editor/[id]/useFlowEditorActions.ts`, related consumers

- Item Types: `Fix | Decision | Proof`

- [ ] 裁定 hover 状态的最小 owner surface（拆分 context、局部 prop、或更窄 selector）。
- [ ] 实施最小改动方案，避免 hover 高频变化触发所有 actions context 消费者重渲染。
- [ ] 增加 focused proof，验证 hover 变化不会导致无关 consumer 跟随重渲染。

Exit Criteria:

- [ ] hover 状态不再通过会强制所有 consumer 同步更新的粗粒度 actions context 扩散。
- [ ] focused proof 明确记录 hover 改动前后的 render-count 或 identity 行为。
- [ ] `pnpm --filter @nop-chaos/main exec vitest run src/pages/flow-editor/[id]/index.test.ts` 或新增等价 focused tests 通过。
- [ ] No owner-doc update required.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Dirty Detection Cost Reduction

Status: planned
Targets: `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts`

- Item Types: `Fix | Proof`

- [ ] 将 `dirty` 判定从每次 render 裸 `JSON.stringify` 迁移到受控 memo、快照版本号、或等价低成本方案。
- [ ] 确保 dirty 语义与当前行为保持一致：加载后未改动为 false，节点/边变化后为 true，保存后回到 false。
- [ ] 添加 focused tests，验证 dirty 语义未回归。

Exit Criteria:

- [ ] `useFlowEditorState.ts` 中不再存在 render 期裸 `JSON.stringify({ nodes, edges }) !== savedSnapshot` 的实现。
- [ ] dirty 语义有 focused tests 覆盖加载、修改、保存后三类场景。
- [ ] `pnpm --filter @nop-chaos/main exec vitest run src/pages/flow-editor/[id]/index.test.ts` 或新增等价 focused tests 通过。
- [ ] No owner-doc update required.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] `editorActions` 的 memo 依赖已收窄
- [ ] hover fan-out 已被控制在更小的 owner surface 内
- [ ] dirty 判定不再依赖每 render 的全量序列化
- [ ] focused verification 已完成
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 若后续仍发现 flow editor 状态面过宽，再由 `docs/plans/18-component-decomposition-plan.md` owner 更大的结构拆分。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
