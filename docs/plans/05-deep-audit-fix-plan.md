# 05 Deep-Audit 隐患修复计划

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Completed: 2026-05-15
> Source: docs/analysis/2026-05-15-deep-audit-next/summary.md
> Related: No related plans at drafting time

## Purpose

将 2026-05-15 深度审核确认的 98 个发现中，P0/P1 级隐患全部修复收口，P2 级隐患经裁定后分类处理（修复 / deferred / non-blocking），消除认证链路零测试、初始化白屏、插件故障隔离缺失三个跨维度风险模式。

## Current Baseline

- 12 维度 24+ 子 agent 独立审核已完成，98 个保留发现已确认
- P0（3 项）：bootstrap() 无 .catch()（06-01）、RouteRenderer 无 Error Boundary（06-02）、认证链路零测试（12-01）
- P1（19 项）：路由 / 插件 / 权限 / 扩展系统零测试；Error Boundary 缺失（PluginSlot）；rejected promise 永久缓存；Auth fetch 静默吞错误；Token 刷新静默吞错误；双 token 刷新去重；Flow mutation 无 onError；Extension systemPages 未接入路由；--destructive 变量未定义；harbor 缺少 --chart-1~5；PluginStore 双重持久化；PluginBridge 路由重建；窄 hooks 过宽订阅；bridgeSnapshot 级联重算；plugin-bridge 入口文件含实现细节；phantom deps；export * 无 API 门控；僵尸依赖；getBaseOrigin() 三处重复
- P2-P3 发现（除 scope 中已裁定的相关条目外）不在本计划 scope 内（见 Out Of Scope）；P2 隐患在本计划中逐条裁定（见 Goals）
- 已自动化的检查项：ESLint max-lines: 700、TypeScript strict、@typescript-eslint/ban-ts-comment、filterMenusByRoles 测试、validateMenuResponse 测试

## Goals

- 修复全部 3 项 P0 缺陷：初始化白屏、无 Error Boundary、认证零测试
- 修复全部 19 项 P1 缺陷
- 对 P2 隐患逐条裁定：修复或移入 Deferred But Adjudicated
- 消除三个跨维度风险模式：认证链路、插件故障隔离、plugin-bridge 包综合问题
- 为所有修复项添加 focused regression tests

## Non-Goals

- 不处理 P3 及以下的发现（组件使用一致性、目录结构优化、导出格式统一）
- 不在此 plan 中实施新的自动化 lint/CI 检查（仅修复现有发现；新增检查放入 Non-Blocking Follow-ups，由 successor 计划承接）
- 不重构 plugin-bridge 的 API 设计（仅修复入口文件职责、依赖声明、订阅精度）
- 不处理 extension 项目的 docs/logs 记录（遵守 AGENTS.md 边界规则）

## Scope

### In Scope

- `apps/main/src/main.tsx:38-44` — bootstrap() 错误处理
- `apps/main/src/router/RouteRenderer.tsx:11-25` — Error Boundary 添加
- `apps/main/src/router/AppRoutes.tsx` — extension systemPages 路由接入
- `packages/core/src/components/PluginSlot.tsx` — Error Boundary + 测试
- `apps/main/src/store/authStore.ts` — 测试
- `packages/shared/src/auth/tokenManager.ts` — 测试 + 双 token 刷新去重
- `apps/main/src/hooks/useAuth.ts` — 测试 + 错误处理修复
- `apps/main/src/router/pageRegistry.tsx` — 测试
- `packages/core/src/hooks/usePermissionGuard.ts` — 测试
- `packages/extension-host/src/` — 测试
- `packages/plugin-bridge/src/index.ts` — 入口文件重构、订阅精度优化、phantom/zombie deps
- `apps/main/src/App.tsx:67-114` — PluginBridge 路由重建、bridgeSnapshot 级联重算
- `apps/main/src/plugins/sharedModules.ts:61-80` — rejected promise 缓存修复
- `packages/shared/src/http/client.ts:84,157-167` — Token 刷新去重 + 错误处理
- `apps/main/src/pages/flow-editor/index.tsx:42-47` — Flow mutation onError
- `apps/main/src/store/pluginStore.ts:18-28` — 双重持久化修复
- `apps/main/src/styles/flux-spacing.css:200,258` — --destructive 变量定义
- `examples/extension-demo/src/harbor.css` — --chart-1~5 变量补全
- `packages/shared/src/index.ts` — export * API 门控
- `packages/shared/src/auth/tokenManager.ts` — getBaseOrigin() 去重（与 core 和 main 合并）
- 上述所有修复的 colocated 测试

### Out Of Scope

- P3 发现：组件使用一致性（维度10）、目录结构优化（维度02 P3）、导出格式统一（维度01-03/03-06）
- 为 plugin-bridge 引入新的 API 设计或 breaking changes
- extension 项目的独立文档维护（`docs/`、`logs/`、`bugs/` 等）
- 新增 CI 自动化检查脚本的开发（仅建议，不在此 plan 中实施）

## Execution Plan

### Phase 1 — P0 致命缺陷修复：初始化与故障隔离

Status: completed
Targets: `apps/main/src/main.tsx` `apps/main/src/router/RouteRenderer.tsx` `packages/core/src/components/PluginSlot.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: `main.tsx:38-44` bootstrap() 添加 `.catch()` 处理，初始化失败时显示 fallback UI 而非白屏
- [x] Fix: `RouteRenderer.tsx` 添加 Error Boundary，包裹 `<Routes>` 渲染，lazy 组件崩溃时不卸载整个 React 树
- [x] Fix: `PluginSlot.tsx:70` 添加 Error Boundary，单个插件渲染崩溃不影响宿主
- [x] Proof: 为上述三处 Error Boundary 添加 focused unit tests 验证 fallback 行为

Exit Criteria:

- [x] `main.test.tsx` mock bootstrap() 抛出异常，断言 fallback UI 被渲染而非白屏
- [x] RouteRenderer 内 lazy 组件 throw 时，Error Boundary 捕获并显示 fallback
- [x] PluginSlot 内单个插件 crash 不扩散到宿主
- [x] 三个修复点均有 focused tests 覆盖
- [x] No owner-doc update required（纯代码修复，无设计变更）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — P0 致命缺陷修复：认证链路测试

Status: completed
Targets: `apps/main/src/store/authStore.ts` `packages/shared/src/auth/tokenManager.ts` `apps/main/src/hooks/useAuth.ts`

- Item Types: `Fix | Proof`

- [x] Fix: `useAuth.ts:38-48` Auth fetch 静默吞错误修复，失败时 setState 反映错误状态
- [x] Proof: 为 `authStore` 添加 colocated vitest tests（login/logout/session 状态转换 + 错误路径）
- [x] Proof: 为 `tokenManager` 添加 colocated vitest tests（token 存储/刷新/过期判断 + 错误路径）
- [x] Proof: 为 `useAuth` 添加 colocated vitest tests（成功/失败/loading 状态）

Exit Criteria:

- [x] `useAuth` 不再静默吞错误，调用方可捕获错误状态
- [x] authStore 测试覆盖：成功路径、空 token、过期 token、API 失败
- [x] tokenManager 测试覆盖：存储/读取/刷新/多 tab 同步
- [x] 认证链路（authStore + tokenManager + useAuth）整体功能验证通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — P1 依赖与入口治理：plugin-bridge 包综合问题

Status: completed
Targets: `packages/plugin-bridge/package.json` `packages/plugin-bridge/src/index.ts`

- Item Types: `Fix | Decision`

- [x] Fix: `plugin-bridge/package.json` phantom deps（`react`, `zustand` 等运行时依赖）移入 `peerDependencies`
- [x] Fix: `plugin-bridge/package.json` zombie deps 清理
- [x] Fix: `plugin-bridge/src/index.ts` 入口文件重构：public API 仅暴露 bridge hooks/types，实现细节移至内部模块
- [x] Fix: `plugin-bridge/src/index.ts` 窄 hooks 过宽订阅优化（useBridgeStore 等按需选择特定 slice，避免全量订阅）
- [x] Decision: 确认重构后的入口文件不破坏 host/plugin 两侧的 import 路径

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/plugin-bridge typecheck` 通过
- [x] `pnpm --filter @nop-chaos/plugin-bridge build` 通过
- [x] `pnpm typecheck` 通过（无因入口变更导致的跨包编译错误）
- [x] plugin-bridge 的 public API 表面仅包含 bridge hooks/types，无内部实现泄漏
- [x] 依赖声明符合 monorepo 规范（runtime deps 在 peerDependencies，dev deps 在 devDependencies）
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 — P1 异常吞掉修复：HTTP 层与 UI 层

Status: completed
Targets: `packages/shared/src/http/client.ts` `packages/shared/src/auth/tokenManager.ts` `apps/main/src/pages/flow-editor/index.tsx` `apps/main/src/plugins/sharedModules.ts`

- Item Types: `Fix | Proof`

- [x] Fix: `client.ts:84` + `tokenManager.ts:100` 双 token 刷新去重（添加 pending promise 缓存，并发请求共享同一个刷新 promise）
- [x] Fix: `client.ts:157-167` Token 刷新失败时不再静默吞错误，抛出明确异常
- [x] Fix: `apps/main/src/pages/flow-editor/index.tsx:42-47` Flow mutation 添加 onError 处理（toast 通知用户）
- [x] Fix: `apps/main/src/plugins/sharedModules.ts:61-80` rejected promise 永久缓存修复：缓存 pending promise 而非 resolved value，失败后允许重试
- [x] Proof: 为 token 刷新去重逻辑添加 focused tests

Exit Criteria:

- [x] 并发请求在 token 过期时只触发一次 refresh 调用
- [x] token 刷新失败时，所有等待请求都收到明确错误
- [x] flow-editor mutation 失败时用户看到 toast 通知
- [x] sharedModules 中失败的模块加载可重试，不被永久缓存
- [x] `pnpm test` 通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 5 — P1 CSS 变量修复

Status: completed
Targets: `apps/main/src/styles/flux-spacing.css` `examples/extension-demo/src/harbor.css`

- Item Types: `Fix`

- [x] Fix: `flux-spacing.css:200,258` 添加 `--destructive` 变量定义（参考 design tokens 体系取值）
- [x] Fix: `examples/extension-demo/src/harbor.css` 补全 `--chart-1` 到 `--chart-5` CSS 变量定义

Exit Criteria:

- [x] `grep -r -- 'var(--destructive)' apps/main/src/styles/` 确认生效且 `pnpm lint` 无 CSS 变量警告
- [x] `grep -r -- '--chart-[1-5]' examples/extension-demo/src/harbor.css` 确认五个变量均定义
- [x] `pnpm lint` 通过（无未定义 CSS 变量警告）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 6 — P1 测试覆盖补齐：路由 / 权限 / 扩展系统

Status: completed
Targets: `apps/main/src/router/pageRegistry.tsx` `packages/core/src/hooks/usePermissionGuard.ts` `apps/main/src/router/RouteRenderer.tsx` `packages/extension-host/src/` `apps/main/src/router/AppRoutes.tsx`

- Item Types: `Fix | Proof`

- [x] Proof: 为 `pageRegistry.tsx` 添加 colocated vitest tests（page 注册/解析/未匹配 fallback）
- [x] Proof: 为 `usePermissionGuard.ts` 添加 colocated vitest tests（有权限/无权限/loading）
- [x] Proof: 为 `RouteRenderer.tsx` 添加 colocated vitest tests（路由匹配、Error Boundary 触发）
- [x] Proof: 为 `extension-host/src/` 添加基础 vitest tests（扩展加载/生命周期）
- [x] Fix: `AppRoutes.tsx` 将 extension systemPages 接入路由渲染（当前缺失）
- [x] Proof: 验证 extension 路由接入后与现有 builtin 路由不冲突

Exit Criteria:

- [x] pageRegistry、usePermissionGuard、RouteRenderer 各有 colocated 测试，覆盖主要路径和错误路径
- [x] extension-host 基础测试覆盖扩展加载和生命周期
- [x] extension systemPages 在路由中可正常访问
- [x] `pnpm test` 通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 7 — P1 PluginStore 与 PluginBridge 性能修复

Status: completed
Targets: `apps/main/src/store/pluginStore.ts` `apps/main/src/App.tsx` `packages/plugin-bridge/src/index.ts`

- Item Types: `Fix | Proof`

- [x] Fix: `pluginStore.ts:18-28` 消除双重持久化（只保留一份持久化逻辑）
- [x] Fix: `App.tsx:77-110` PluginBridge 路由重建优化：避免 plugin route 变更时全量重建
- [x] Fix: `App.tsx:67-114` bridgeSnapshot 级联重算优化：使用 `useShallow` 或 selector 避免非必要重渲染
- [x] Proof: 为 pluginStore 添加 focused tests 验证持久化单一路径

Exit Criteria:

- [x] pluginStore 持久化无重复写入
- [x] bridge 状态变更不触发无关 React 组件重渲染
- [x] plugin route 变更不导致无关路由重建
- [x] `pnpm test` 通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 8 — P1 模块导出与代码去重

Status: completed
Targets: `packages/shared/src/index.ts` `packages/shared/src/auth/tokenManager.ts` `packages/core/src/` `apps/main/src/services/`

- Item Types: `Fix | Decision`

- [x] Fix: `shared/src/index.ts` export * 添加 API 门控（显式列举 public exports）
- [x] Fix: 三个包中的 `getBaseOrigin()` 重复实现合并到 `packages/shared`，其余包引用统一入口
- [x] Decision: 确认合并后无包间循环依赖

Exit Criteria:

- [x] `packages/shared/src/index.ts` 显式导出列表定义清晰，无内部函数泄漏
- [x] `getBaseOrigin()` 仅存在于 `packages/shared` 一处，其余引用者从 shared 导入
- [x] `pnpm typecheck && pnpm build` 通过
- [x] `pnpm test` 通过
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 全部 3 项 P0 缺陷已修复并有 focused tests 覆盖
- [x] 全部 19 项 P1 缺陷已修复或裁定处理
- [x] 认证链路测试覆盖通过，无静默吞错误
- [x] 插件系统有 Error Boundary 保护，单插件崩溃不扩散
- [x] bootstrap() 初始化失败不导致白屏
- [x] plugin-bridge 包依赖声明正确、入口职责清晰、订阅精度达标
- [x] 所有 CSS 变量引用完整
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过（注：`@nop-chaos/extension-host` undeclared import 为 pre-existing issue，非本计划引入）
- [x] `pnpm lint` 通过
- [x] `pnpm test` 通过
- [x] 相关 `docs/logs/` 已更新

## Deferred But Adjudicated

### PluginSlot 加载超时机制

- Classification: `optimization candidate`
- Why Not Blocking Closure: P2 项，当前 Error Boundary 已防止单插件崩溃扩散；超时是体验优化而非故障隔离必需项
- Successor Required: `no`
- Successor Path: N/A

### 新增 CI 自动化检查脚本

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 审核报告建议但非当前 live defect；现有 lint/typecheck 门禁已覆盖主要红线
- Successor Required: `yes`
- Successor Path: `docs/plans/` — 后续可另立计划

## Non-Blocking Follow-ups

- 新增 ESLint `no-explicit-any: 'warn'` 规则评估
- 依赖声明检查脚本自动化
- ESM proxy 文件完整性 CI 检查
- CSS 变量引用 CI 检查
- P3 组件使用一致性渐进治理（维度10）
- P3 目录结构优化（维度02）

## Closure

Status Note: All 8 phases completed. P0 (3 items) and P1 (19 items) defects fully addressed. A final independent closure audit in this session rechecked the plan gates against current repo state, and the remaining late-session regressions were fixed before re-running `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`. No in-scope live defect or contract drift remains.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit in current session
- Evidence:
  - Phase 1-8 evidence remains as listed below and in `docs/logs/2026/05-15.md`
  - Final closure audit also caught and verified fixes for `examples/plugin-demo/scripts/build-with-rollup.mjs`, `examples/extension-demo/src/pages/ExtensionLoginPage.tsx`, and `apps/main/src/flux/FluxRouteRenderer.tsx`
  - Verification rerun passed: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`
  - Phase 1: `main.tsx` bootstrap `.catch()` with DOM fallback, `ErrorBoundary` class component in `@nop-chaos/core`, wrapping in `RouteRenderer` + `PluginSlot`, tests in `main.test.ts` + `ErrorBoundary.test.tsx`
  - Phase 2: `useAuth.ts` sets `bootstrapStatus: 'error'` on catch, `authStore.test.ts` (7 tests), `tokenManager.test.ts` (9 tests), `useAuth.test.ts` (3 tests)
  - Phase 3: `plugin-bridge/package.json` peerDeps moved, `types.ts` + `bridge.ts` extracted, narrow hooks with `useSyncExternalStore` selectors
  - Phase 4: `client.ts` throws explicit error on 401 retry, `sharedModules.ts` resets promise cache on failure, `flow-editor/index.tsx` mutation `onError` with toast
  - Phase 5: `--destructive: var(--danger)` in `index.css`, `--chart-1` to `--chart-5` in `harbor.css`
  - Phase 6: `pageRegistry.test.ts` (5 tests), `usePermissionGuard.test.ts` (4 tests), `extension-host/index.test.ts` (7 tests), `AppRoutes.tsx` system page overrides via `getSystemPage()`
  - Phase 7: `pluginStore.ts` removed duplicate `persistPluginSeeds` calls, `App.tsx` bridge uses `getState()` instead of reactive deps, `pluginStore.test.ts` (3 tests)
  - Phase 8: `shared/src/index.ts` explicit named exports, `getBaseOrigin()` exported from `shared/src/http/url.ts`, consumers updated

Follow-up:

- Pre-existing issue: `@nop-chaos/extension-host` undeclared import in `apps/main` needs separate plan to add the dependency declaration
- Non-blocking follow-ups listed above remain valid
- No remaining plan-owned work
