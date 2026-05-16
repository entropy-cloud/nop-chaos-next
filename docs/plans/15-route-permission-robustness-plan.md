# 15 Route & Permission Robustness Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-16
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 07-01, 07-02, 07-03, 07-05, 07-06)
> Related: `docs/plans/05-deep-audit-fix-plan.md`

## Purpose

修复 5 个路由与权限问题：路由去重静默丢弃、权限守卫不完整、tab/URL 不同步。

## Current Baseline

- `dedupeRoutesByPath` 静默丢弃后续同 path 路由（07-03, P1），扩展路由可能被无意覆盖。
- 权限守卫仅在 `RouteRenderer` 渲染层生效（07-01, P2），路由仍被匹配。
- 无权限父级菜单可见但不可达（07-02, P2），`filterMenusByRoles` 保留空父级。
- 动态路由参数（`:id`）被同路径去重误删风险（07-05, P2）。
- `tabStore.activePath` 与浏览器 URL 不同步（07-06, P2）。

## Goals

- 路由去重行为可观测（不再静默丢弃）。
- 权限设计两层（menu + route）文档化并补齐缺失行为。
- Tab 状态与浏览器导航同步。

## Non-Goals

- 不重构权限模型（role-based → attribute-based 等）。
- 不改变菜单数据结构。
- 不引入路由级 code splitting。

## Scope

### In Scope

- `dedupeRoutesByPath` 添加警告日志和动态路由保护。
- `ForbiddenPage` 导航行为改进。
- `filterMenusByRoles` 空父级处理。
- `tabStore` 与 URL 同步。

### Out Of Scope

- 权限模型重构。
- 菜单数据结构变更。

## Execution Plan

### Phase 1 - Route Deduplication Safety

Status: planned
Targets: `apps/main/src/router/AppRoutes.tsx`

- Item Types: `Fix`

- [ ] 1.1 修改 `dedupeRoutesByPath`：当丢弃重复路由时输出 `console.warn`，包含被丢弃路由的 `id` 和 `path`
- [ ] 1.2 对动态路由参数（path 含 `:`）的冲突，保留先注册者（first-writer-wins，与现有语义一致），仅添加 `console.warn`

Exit Criteria:

- [ ] `dedupeRoutesByPath` 在丢弃路由时输出 console.warn
- [ ] 动态路由使用 first-writer-wins 语义
- [ ] `pnpm typecheck && pnpm build` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - Permission Guard Documentation & Behavior

Status: planned
Targets: `apps/main/src/router/AppRoutes.tsx`, `packages/shared/src/utils/menu.ts`

- Item Types: `Decision`, `Fix`

- [ ] 2.1 在 `RouteRenderer` 和 `ForbiddenPage` 上方添加设计注释，说明当前两层权限模型（menu filtering + route render guard）是有意设计
- [ ] 2.2 修改 `filterMenusByRoles`：当父级有 `roles` 且通过 `selfAllowed` 保留，但所有子级被过滤掉（`hasVisibleChildren === false`）时，清除父级的 `roles` 使其作为导航容器；当父级无 `roles` 且所有子级被过滤掉时，保留该父级作为可展开的空容器（与有 `roles` 的父级清除后行为一致），不删除
- [ ] 2.3 验证 `pnpm typecheck && pnpm build` 通过

Exit Criteria:

- [ ] `RouteRenderer` 包含两层权限设计注释
- [ ] `filterMenusByRoles` 对空容器父级清除 `roles`
- [ ] `pnpm typecheck && pnpm build` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - Tab/URL Sync

Status: planned
Targets: `apps/main/src/store/tabStore.ts`, `apps/main/src/hooks/useTabManagement.ts`

- Item Types: `Fix`

- [ ] 3.1 在 `AppShell`（`apps/main/src/components/` 中的等效顶层 shell 组件）中添加 `useEffect`，监听 `location.pathname` 变化并同步到 `tabStore.activePath`
- [ ] 3.2 验证浏览器前进/后退后 active tab 正确高亮

Exit Criteria:

- [ ] `useTabManagement` 或 `AppShell` 中存在 pathname → tabStore 同步逻辑
- [ ] Unit 或 E2E 测试验证浏览器导航后 tab/URL 同步正确
- [ ] `pnpm typecheck && pnpm build` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [ ] `dedupeRoutesByPath` 不再静默丢弃（07-03, 07-05）
- [ ] 权限两层设计已文档化（07-01）
- [ ] 无权限空父级不再触发 403（07-02）
- [ ] tab/URL 同步已实现（07-06）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 未来可考虑路由级权限守卫（在 `Route` 的 `loader` 中拦截），减少 403 页面闪现。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- Route loader 权限守卫评估
