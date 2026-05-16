# 16 Plugin Build & Bridge Runtime Plan

> Plan Status: completed
> Last Reviewed: 2026-05-16
> Completed: 2026-05-16
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 08-01, 08-03, 12-11)
> Related: `docs/plans/05-deep-audit-fix-plan.md`

## Purpose

修复 3 个插件构建与桥接运行时问题：Rollup 缺少 jsx-dev-runtime 外部化、bridge 注入时机在渲染后、plugin-bridge hooks 零测试。

## Current Baseline

- Rollup `external` 列表缺少 `react/jsx-dev-runtime`（08-01, P1），dev 构建导致 React 重复实例。
- `setPluginBridge` 在 `useEffect` 中调用（08-03, P2），首帧渲染无 bridge。
- plugin-bridge 7 个 React hooks 零测试（12-11, P1），`useSyncExternalStore` 配对正确性未验证。已有 `index.test.ts`（134 行）覆盖 store 层的 `setPluginBridge`/`getPluginBridge`/`subscribePluginBridge`/`getPluginBridgeSnapshot`，但 hooks 层未测试。

## Goals

- plugin-demo dev 构建不再 bundle `react/jsx-dev-runtime`。
- Bridge 在首帧渲染前可用。
- plugin-bridge hooks 有基础测试覆盖。

## Non-Goals

- 不重构 PluginBridge 初始化流程。
- 不添加 E2E 测试（仅 unit tests）。
- 不修改 plugin-demo 的 Rollup 配置结构。

## Scope

### In Scope

- `examples/plugin-demo/scripts/build-with-rollup.mjs` 外部化修复。
- `apps/main/src/App.tsx` bridge 注入时机修复。
- `packages/plugin-bridge/src/index.test.ts` hook 测试。

### Out Of Scope

- PluginBridge 架构重构。
- E2E plugin 加载测试。

## Execution Plan

### Phase 1 - Rollup External Fix

Status: planned
Targets: `examples/plugin-demo/scripts/build-with-rollup.mjs`

- Item Types: `Fix`

- [x] 1.1 在 `external` 数组中添加 `'react/jsx-dev-runtime'`（与 `'react/jsx-runtime'` 并列）
- [x] 1.2 验证 dev build 输出中不包含 jsx-dev-runtime 的内联 bundle

Exit Criteria:

- [x] `build-with-rollup.mjs` 的 `external` 包含 `'react/jsx-dev-runtime'`
- [x] `pnpm --filter @nop-chaos/plugin-demo build` 成功
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Bridge Injection Timing

Status: planned
Targets: `apps/main/src/App.tsx`

- Item Types: `Fix`, `Decision`

- [x] 2.1 将 `setPluginBridge` 调用从 `useEffect` 改为 `useLayoutEffect`（或等效的同步初始化），确保 bridge 在首次 paint 前可用
- [x] 2.2 验证首帧渲染时 bridge hooks 不再返回 fallback 值

Exit Criteria:

- [x] `App.tsx` 中 bridge 注入使用 `useLayoutEffect` 或同步初始化
- [x] `pnpm typecheck && pnpm build` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Plugin-Bridge Hook Tests

Status: planned
Targets: `packages/plugin-bridge/src/index.test.ts`

- Item Types: `Proof`

- [x] 3.1 使用 `renderHook` 测试 `usePluginBridge`：验证 subscribe/getSnapshot 配对、bridge 注入后 snapshot 更新
- [x] 3.2 测试 `usePluginNotifications`：验证读取 `bridge.notifications` 属性、fallback 对象结构正确
- [x] 3.3 测试 `usePluginBridgeSnapshot`：验证 snapshot 从 bridge store 读取、bridge 注入后 snapshot 更新
- [x] 3.4 测试 `usePluginThemeConfig`、`usePluginUser`、`usePluginManifest`、`usePluginI18n`：验证各 hook 从 bridge store 正确读取对应属性，fallback 值正确
- [x] 3.5 验证 `pnpm --filter @nop-chaos/plugin-bridge test` 通过

Exit Criteria:

- [x] `index.test.ts` 包含覆盖全部 7 个 hooks 的测试
- [x] `pnpm --filter @nop-chaos/plugin-bridge test` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] Rollup 不再 bundle jsx-dev-runtime（08-01）
- [x] Bridge 首帧可用（08-03）
- [x] plugin-bridge hooks 有测试覆盖（12-11）
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过（amis-react 预存问题除外）
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 未来可为 PluginSlot 添加加载超时机制（08-05 已在 Plan 05 中 deferred）。
- 未来可为 ErrorBoundary 添加崩溃恢复 UI（08-06 已在 Plan 05 中部分实现）。

## Closure

Status Note: All 3 phases completed. Rollup externalizes jsx-dev-runtime, bridge injection uses useLayoutEffect, 14 new hook tests (21 total) passing.

Closure Audit Evidence:

- Reviewer / Agent: opencode (automated execution)
- Evidence: All verification commands passed; 21/21 tests green; plugin-demo build output verified no jsx-dev-runtime inline.

Follow-up:

- PluginSlot 超时机制
- ErrorBoundary 崩溃恢复
