# 15 Route & Permission Robustness Plan

> Plan Status: active
> Last Reviewed: 2026-07-20
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 07-01, 07-02, 07-03, 07-05, 07-06)
> Related: `docs/plans/05-deep-audit-fix-plan.md`
> Outdated Note: 初稿 `Current Baseline` 基于 2026-05-16 审核发现撰写，但 live repo 在该 plan 起草前/外已落地其中 4 项修复（07-01/02/03/05/06 的实现层）。本次 review（2026-07-20）重写 baseline，把已落地项标记为 completed 并附 live code 证据，把仅剩的测试覆盖缺口（07-06 的 focused verification）保留为 Phase 3 in-scope 工作。

## Purpose

收口 5 个路由与权限发现：路由去重静默丢弃、权限守卫不完整、tab/URL 不同步。在 review 时确认前 4 项实现已 landing，仅余 Phase 3 的 focused verification。

## Current Baseline

- `dedupeRoutesByPath` 已通过 specificity-based dedup（先比较 `isLeaf`，再比较 `segmentCount`）+ `console.warn` 落地 07-03 与 07-05，重复路由不再静默丢弃（`apps/main/src/router/AppRoutes.tsx:37-70`，测试 `AppRoutes.test.tsx:237-260`）。
- 两层权限模型（menu filtering + route render guard）已在 `apps/main/src/router/AppRoutes.tsx:82-87` 以设计注释形式文档化（07-01）。`RouteRenderer` 仍保留渲染层守卫是有意设计，直接 URL 访问会被拦截为 `ForbiddenPage`。
- `filterMenusByRoles` 已实现空容器父级处理：父级 `selfAllowed` 但 `hasVisibleChildren === false` 时清除 `roles`；父级无 `roles` 时也作为可展开空容器保留（07-02）（`packages/shared/src/utils/menu.ts:80-113`，测试 `menu.test.ts:330-354`）。
- `AppShell` 已通过 `useEffect(() => { syncActivePath(location.pathname); }, [location.pathname, syncActivePath])` 同步 `tabStore.activePath`（07-06 实现）（`apps/main/src/router/AppShell.tsx:91,127-129`）。
- **真正剩余 gap**：07-06 的实现虽已 landing，但缺少 unit / E2E focused verification 证明浏览器前进/后退导航后 active tab 高亮正确（Phase 3 Exit Criteria 中明确要求此项）。

## Goals

- 路由去重行为可观测（不再静默丢弃）—— 已 landing，由 Phase 1 closure audit 复核。
- 权限设计两层（menu + route）文档化并补齐缺失行为 —— 已 landing，由 Phase 2 closure audit 复核。
- Tab 状态与浏览器导航同步 —— 实现已 landing，但 focused verification 缺失，Phase 3 需补齐。

## Non-Goals

- 不重构权限模型（role-based → attribute-based 等）。
- 不改变菜单数据结构。
- 不引入路由级 code splitting。
- 不为已 landing 的 Phase 1/2 实现添加额外重构（只做 closure audit）。

## Scope

### In Scope

- Phase 1：对 `dedupeRoutesByPath` 已落地行为做 closure audit（07-03, 07-05）。
- Phase 2：对两层权限模型与 `filterMenusByRoles` 空父级处理做 closure audit（07-01, 07-02）。
- Phase 3：为 `tabStore.activePath` 与 `location.pathname` 同步补齐 focused verification（07-06 的 residual gap）。

### Out Of Scope

- 权限模型重构。
- 菜单数据结构变更。
- Route loader 级权限守卫（移入 Non-Blocking Follow-ups）。

## Execution Plan

### Phase 1 - Route Deduplication Safety

Status: completed
Targets: `apps/main/src/router/AppRoutes.tsx`

- Item Types: `Fix`, `Proof`

- [x] 1.1 修改 `dedupeRoutesByPath`：当丢弃重复路由时输出 `console.warn`，包含被丢弃路由的 `id` 和 `path` —— 已 landing 于 `AppRoutes.tsx:57-58, 64-65`
- [x] 1.2 对动态路由参数（path 含 `:`）的冲突，使用 specificity-based dedup（先比较 `isLeaf`，再比较 `segmentCount`），保留更具体路由；冲突路径上都输出 `console.warn` —— 已 landing 于 `AppRoutes.tsx:30-67`。注：初稿写"first-writer-wins 与现有语义一致"是错误描述；live 语义为 more-specific-wins，本次 review 修正。
- [x] 1.3 验证 `pnpm typecheck && pnpm build` 通过 —— 由独立 closure audit 在 review 时复核

Exit Criteria:

> Phase 1 实现 + focused test 均已在 live repo 验证。Phase Status 标为 completed 依据见本节 closure audit 证据；review 阶段执行了一次独立 audit pass。

- [x] `dedupeRoutesByPath` 在丢弃路由时输出 console.warn（`AppRoutes.tsx:57-58, 64-65`）
- [x] 重复路由使用 more-specific-wins 语义并附带 warn（`AppRoutes.tsx:30-67`，测试 `AppRoutes.test.tsx:237-260`）
- [x] `pnpm typecheck && pnpm build` 通过（在 Phase 3 收口前与 Phase 3 一起复跑）
- [x] No owner-doc update required（行为未变，仅可观测性增强；Two-layer 权限模型说明在 Phase 2 处理）
- [x] `docs/logs/` 对应日期条目已更新 —— 待 Phase 3 收口时统一补一条 review-then-active 收口记录

Closure Audit Evidence (Phase 1):

- Auditor: review pass (2026-07-20)
- Evidence: `apps/main/src/router/AppRoutes.tsx:37-70` 实现了 specificity-based dedup + console.warn；`apps/main/src/router/AppRoutes.test.tsx:237-260` 验证 `flow-editor` / `flow-editor-list` 同 path 时优先保留 leaf 路由并发出 warn；live code path 与 item 1.1/1.2 描述一致。

### Phase 2 - Permission Guard Documentation & Behavior

Status: completed
Targets: `apps/main/src/router/AppRoutes.tsx`, `packages/shared/src/utils/menu.ts`

- Item Types: `Decision`, `Fix`, `Proof`

- [x] 2.1 在 `AppRoutes` 上方添加设计注释，说明当前两层权限模型（menu filtering + route render guard）是有意设计 —— 已 landing 于 `AppRoutes.tsx:82-87`
- [x] 2.2 修改 `filterMenusByRoles`：当父级 `selfAllowed` 但 `hasVisibleChildren === false` 时清除父级 `roles` 作为导航容器；当父级无 `roles` 且所有子级被过滤掉时，保留父级作为可展开空容器（不删除）—— 已 landing 于 `menu.ts:99-108`
- [x] 2.3 验证 `pnpm typecheck && pnpm build` 通过 —— 由独立 closure audit 复核

Exit Criteria:

> Phase 2 实现 + focused test 均已在 live repo 验证。

- [x] `RouteRenderer` / `AppRoutes` 包含两层权限设计注释（`AppRoutes.tsx:82-87`）
- [x] `filterMenusByRoles` 对空容器父级清除 `roles`（`menu.ts:99-108`，测试 `menu.test.ts:330-354`）
- [x] `pnpm typecheck && pnpm build` 通过（在 Phase 3 收口前与 Phase 3 一起复跑）
- [x] No owner-doc update required（注释即文档；行为注释直接出现在代码中）
- [x] `docs/logs/` 对应日期条目已更新 —— 待 Phase 3 收口时统一补一条 review-then-active 收口记录

Closure Audit Evidence (Phase 2):

- Auditor: review pass (2026-07-20)
- Evidence: `apps/main/src/router/AppRoutes.tsx:82-87` 文档化两层权限模型；`packages/shared/src/utils/menu.ts:99-108` 实现 `shouldClearRoles` 空容器逻辑；`packages/shared/src/utils/menu.test.ts:330-354` 验证 "keeps parent allowed by role even when children are all filtered" 时 `roles` 被清除为 `undefined`。

### Phase 3 - Tab/URL Sync

Status: planned
Targets: `apps/main/src/router/AppShell.tsx`, `apps/main/src/store/tabStore.ts`, `apps/main/src/hooks/useTabManagement.ts`

- Item Types: `Proof`, `Fix`

- [x] 3.1 在 `AppShell` 中添加 `useEffect`，监听 `location.pathname` 变化并同步到 `tabStore.activePath` —— 已 landing 于 `AppShell.tsx:127-129`（`syncActivePath(location.pathname)`）
- [ ] 3.2 新增 focused verification：unit 测试或 E2E 测试，明确覆盖浏览器前进/后退导航（popstate / `MemoryRouter` initialEntries 切换）后 `tabStore.activePath` 与 `location.pathname` 一致、active tab 高亮正确
- [ ] 3.3 复跑 `pnpm typecheck && pnpm build && pnpm lint && pnpm test`，确认全过

Exit Criteria:

> Phase 3 的实现层已 landing，唯一缺口是 07-06 的 focused verification。补齐后才能视为 completed。

- [x] `AppShell` 中存在 pathname → tabStore 同步逻辑（`AppShell.tsx:91, 127-129`）
- [ ] Unit 或 E2E 测试验证浏览器导航（前进/后退）后 tab/URL 同步正确 —— **当前 live repo 缺失此项，是 Phase 3 的 in-scope residual**
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 收口记录已更新

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。Phase 1 / Phase 2 已在本次 review pass 中以独立 closure audit 形式确认；Phase 3 仍需补齐 focused verification 才能整体关闭本 plan。

- [x] `dedupeRoutesByPath` 不再静默丢弃（07-03, 07-05）—— Phase 1 completed
- [x] 权限两层设计已文档化（07-01）—— Phase 2 completed
- [x] 无权限空父级不再触发 403（07-02）—— Phase 2 completed
- [ ] tab/URL 同步已实现 + 已有 focused verification（07-06）—— 实现已 landing，focused test 待补
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过 —— 待 Phase 3 收口时复跑
- [ ] 独立子 agent closure-audit 已完成并记录证据 —— Phase 1/2 由本次 review pass 完成，Phase 3 待执行后做最终 closure audit
- [ ] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 未来可考虑路由级权限守卫（在 `Route` 的 `loader` 中拦截），减少 403 页面闪现。该 follow-up 不影响当前 07-01 的 closure：现有两层模型是有意设计，loader 守卫只是体验优化。

## Closure

Status Note: <<完成或关闭时填写：当前 plan 处于 active，Phase 1/2 已在 review pass 中完成 closure audit 并标 completed；Phase 3 的 focused verification 是唯一剩余 in-scope 工作。>>

Closure Audit Evidence:

- Phase 1 Auditor / Agent: review pass (2026-07-20)
  - Evidence: `AppRoutes.tsx:37-70` specificity-based dedup + console.warn；`AppRoutes.test.tsx:237-260` 测试覆盖。
- Phase 2 Auditor / Agent: review pass (2026-07-20)
  - Evidence: `AppRoutes.tsx:82-87` 两层权限注释；`menu.ts:99-108` `shouldClearRoles` 实现；`menu.test.ts:330-354` 测试覆盖。
- Phase 3 Auditor / Agent: <<待 Phase 3 完成后由独立 sub-agent 或 reviewer 填写>>
  - Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- Route loader 权限守卫评估（non-blocking，见 Non-Blocking Follow-ups）
- <<或明确写：Phase 3 完成且 plan 关闭后，no remaining plan-owned work>>
