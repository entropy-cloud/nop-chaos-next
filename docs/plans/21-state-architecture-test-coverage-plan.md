# 21 State Architecture & Test Coverage Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 04-03, 12-01, 12-13)
> Related: `docs/plans/05-deep-audit-fix-plan.md`

## Purpose

修复 3 个状态架构与测试覆盖问题：React Query + Zustand 双源冗余、amis-react 零测试、adapter mock 重复。

## Current Baseline

- `plugins/management/index.tsx` 用 React Query 和 Zustand 同时维护 plugin 列表（04-03, P2），sync `useEffect` 仅在 `plugins.length === 0` 时触发。
- `packages/amis-react/` 6 个源文件零测试（12-01, P2）。
- `amis-core/action.test.ts` 中 ~120 行 adapter mock 代码重复 7 次（12-13, P2），`transform.test.ts` 已有 `createMockAdapter` factory 但未复用。

## Goals

- 插件列表使用单一数据源。
- amis-react 关键模块有基础测试。
- 测试 mock 代码去重。

## Non-Goals

- 不重构所有 store 为 React Query（仅处理 plugin 列表）。
- 不追求 amis-react 100% 覆盖率。
- 不重写 amis-core 测试架构。

## Scope

### In Scope

- `apps/main/src/pages/plugins/management/index.tsx` 数据源统一。
- `packages/amis-react/src/` 添加基础测试。
- `packages/amis-core/src/page/action.test.ts` mock 去重。

### Out Of Scope

- 全局 React Query 迁移。
- amis-react 完整测试覆盖。
- 其他测试覆盖问题（12-02, 12-03, 12-04 已在 Plan 05 中部分覆盖）。

## Execution Plan

### Phase 1 - Plugin List Single Source

Status: completed
Targets: `apps/main/src/pages/plugins/management/index.tsx`

- Item Types: `Fix`, `Decision`

- [x] 1.1 评估两种数据源：保留 React Query（服务端状态最佳实践）或 Zustand（本地持久化需求）。决策标准：若插件列表仅从服务端获取且无离线需求，移除 Zustand 管理层。
- [x] 1.2 根据决策移除冗余数据源，确保 plugin 列表仅从一个来源读取
- [x] 1.3 验证 `pnpm --filter @nop-chaos/main typecheck && pnpm --filter @nop-chaos/main build` 通过

Exit Criteria:

- [x] `usePluginStore` 相关的 plugin 列表读取已从 `plugins/management/index.tsx` 移除，或 `useQuery` 已移除（取决于 Phase 1.1 的决策结果）
- [x] `pnpm --filter @nop-chaos/main typecheck && pnpm --filter @nop-chaos/main build` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - amis-react Basic Tests

Status: completed
Targets: `packages/amis-react/src/`

- Item Types: `Proof`

- [x] 2.1 为 `env.ts` 添加测试：验证 fetcher 注入、locale 配置、token 注入
- [x] 2.2 为 `AmisSchemaPage.tsx` 添加测试：验证 loading/error/success 渲染路径
- [x] 2.3 验证 `pnpm --filter @nop-chaos/amis-react test` 通过

Exit Criteria:

- [x] `amis-react` 包含至少 2 个测试文件（env.test.ts, AmisSchemaPage.test.tsx）
- [x] 注：6 个 amis-react 源文件中剩余 4 个（barrel、route、loading、error views）未添加测试，这些文件是薄包装层，测试优先级可接受
- [x] `pnpm --filter @nop-chaos/amis-react test` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Test Mock Deduplication

Status: completed
Targets: `packages/amis-core/src/page/action.test.ts`, `packages/amis-core/src/page/transform.test.ts`

- Item Types: `Fix`

- [x] 3.1 将 `transform.test.ts` 的 `createMockAdapter` factory 提取到共享 test helper 文件（如 `packages/amis-core/src/test-helpers/mockAdapter.ts`），factory 接受 `overrides` 参数（如 `resolveAction`、`compileFunction` 等），以满足 `action.test.ts` 和 `transform.test.ts` 两个文件的差异化需求
- [x] 3.2 更新 `action.test.ts` 使用共享 factory，删除 7 处重复的 mock 定义
- [x] 3.3 验证 `pnpm --filter @nop-chaos/amis-core test` 通过

Exit Criteria:

- [x] `action.test.ts` 不包含重复的 mock adapter 定义
- [x] 共享 `createMockAdapter` 存在于 test helper 文件
- [x] `pnpm --filter @nop-chaos/amis-core test` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 插件列表为单一数据源（04-03）
- [x] amis-react 有基础测试覆盖（12-01）
- [x] adapter mock 已去重（12-13）
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 未来可评估将更多 store 从 Zustand 迁移到 React Query（仅限纯服务端状态场景）。

## Closure

Status Note: All three phases are complete and closure has been re-audited against the live repository. The plugin management page now uses Zustand as the single list source, `amis-react` has focused env/page tests, the shared `createMockAdapter()` factory is reused by `action.test.ts` and `transform.test.ts`, and workspace `typecheck` / `build` / `lint` / `test` are all green.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit (current session)
- Evidence: initial execution recorded in `docs/logs/2026/05-16.md` Session 5; live re-audit confirmed `apps/main/src/pages/plugins/management/index.tsx` is Zustand-only, `packages/amis-react/src/env.test.ts` + `src/components/AmisSchemaPage.test.tsx` exist, `packages/amis-core/src/test-helpers/mockAdapter.ts` is reused by `action.test.ts` and `transform.test.ts`, and workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass on 2026-05-17.

Follow-up:

- Store → React Query migration evaluation
