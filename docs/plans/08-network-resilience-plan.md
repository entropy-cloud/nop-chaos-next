# 08 Network Resilience Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Completed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-review/round-02-network-resilience.md`
> Related: `docs/plans/05-deep-audit-fix-plan.md`, `docs/plans/06-accessibility-and-i18n-contract-plan.md`

## Purpose

将 open-ended 审查中确认的网络弹性与错误反馈缺陷收口到单一 owner baseline：HTTP 请求具备最小超时/错误处理合同，关键页面在 loading/error/offline 场景下不再静默失败，mutation 失败对用户可见，关键异步路径具备取消或等价 cleanup 行为。

## Current Baseline

- `packages/shared/src/http/client.ts` 没有 timeout、网络错误转换或最小重试策略。
- `apps/main/src/services/schemaAsset.ts`、`apps/main/src/services/mockApi/menu.ts`、`apps/main/src/extensions/bootstrap.ts` 直接使用 raw `fetch`，绕过统一 HTTP client。
- `dashboard`、`plugins/management`、`master-detail/[id]` 等关键页面在 loading/error 场景下缺少用户可见反馈；`flow-editor/index` 当前 mutation `onError` 已存在，但列表页 loading/error UX 仍不完整。
- React Query 默认配置没有按错误类型区分 retry，也没有离线 UX 合同。
- 已确认的 mutation 错误吞掉问题集中在 `flow-editor/index.tsx` 与 `master-detail/index.tsx`。
- `FluxRouteRenderer` 与 `flow-editor/[id]` 这两条已确认热点异步路径仍使用 active-flag 模式而非真实取消；HTTP 401 失败时原始错误详情丢失，i18n 初始化加载失败路径也缺少明确处理。

## Goals

- 为共享 HTTP client 和 raw fetch 热点建立最小超时/错误处理合同。
- 为关键页面补齐 loading / error / offline 的用户可见反馈。
- 修复已确认的 mutation onError 缺口和 auth bootstrap 错误反馈问题。
- 让 in-scope 异步加载路径具备真实取消或等价的资源清理语义。
- 为上述行为补齐 focused tests 与必要文档同步。

## Non-Goals

- 不实现完整离线优先架构或请求队列。
- 不在本计划中重构全部数据获取模式到 Suspense。
- 不处理与网络无关的 a11y、i18n、demo、表单、样式治理。

## Scope

### In Scope

- `packages/shared/src/http/client.ts`
- `apps/main/src/services/http.ts`
- `apps/main/src/services/schemaAsset.ts`
- `apps/main/src/services/mockApi/menu.ts`
- `apps/main/src/extensions/bootstrap.ts`
- `apps/main/src/main.tsx`
- `apps/main/src/pages/dashboard/index.tsx`
- `apps/main/src/pages/flow-editor/index.tsx`
- `apps/main/src/pages/plugins/management/index.tsx`
- `apps/main/src/pages/data-management/master-detail/index.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`
- `apps/main/src/flux/FluxRouteRenderer.tsx`
- `apps/main/src/pages/flow-editor/[id]/index.tsx`
- `apps/main/src/hooks/useAuth.ts`
- `apps/main/src/config/i18n/index.ts`
- `docs/design/backend-integration.md`

### Out Of Scope

- 深层缓存策略重构与 React Query 全局架构迁移
- plugin shared module 的非网络类架构竞态
- 认证 token manager 的已由 `05` 号计划认领部分
- 广义的“全仓所有组件都创建 AbortController”治理；本计划仅认领 `FluxRouteRenderer` 与 `flow-editor/[id]` 两条已确认 active-flag 热点路径

## Execution Plan

### Phase 1 - HTTP client 与 raw fetch 合同

Status: completed
Targets: `packages/shared/src/http/client.ts` `apps/main/src/services/http.ts` `apps/main/src/services/schemaAsset.ts` `apps/main/src/services/mockApi/menu.ts` `apps/main/src/extensions/bootstrap.ts` `apps/main/src/config/i18n/index.ts` `apps/main/src/main.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 为共享 HTTP client 建立最小 timeout 合同，并将网络异常转换为用户层可消费的错误。
- [x] Fix: 统一 in-scope raw `fetch` 热点到共享 client 或与共享 client 等价的超时/错误处理合同。
- [x] Fix: 为 React Query 的默认 retry 行为建立明确基线，至少避免对已确认不应重试的错误类型保持完全未裁定状态。
- [x] Fix: 为 HTTP 401 / token 刷新失败路径保留最小可诊断错误信息，而不是完全丢弃原始失败详情。
- [x] Fix: 为 `apps/main/src/config/i18n/index.ts` 的资源加载失败路径建立明确处理合同。
- [x] Decision: 明确哪些非 API 资源请求允许保留 raw `fetch`，并写清必须满足的最低防护。
- [x] Proof: 为 timeout、网络错误、非 2xx 错误消息提取补 focused tests。

Exit Criteria:

- [x] in-scope 请求路径不再出现“无限挂起且无超时”的 confirmed defect。
- [x] raw `fetch` 热点已收敛到统一或等价合同。
- [x] React Query retry 基线、401 失败信息保留、i18n 资源加载失败路径已完成裁定并落地到代码。
- [x] HTTP 错误消息提取与网络异常路径有 focused tests。
- [x] `docs/design/backend-integration.md` 已记录新的请求错误处理/timeout 基线。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - 页面 loading/error/offline UX

Status: completed
Targets: `apps/main/src/main.tsx` `apps/main/src/pages/dashboard/index.tsx` `apps/main/src/pages/flow-editor/index.tsx` `apps/main/src/pages/plugins/management/index.tsx` `apps/main/src/pages/data-management/master-detail/index.tsx` `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: 为 in-scope 关键页面补充明确的 loading UI，而不是空白页面或“空数据即加载中”的假象。
- [x] Fix: 为 in-scope 关键页面补充 error UI 或等价错误反馈。
- [x] Fix: 为应用层提供最小 offline 状态提示，不再让离线时表现为静默失败。
- [x] Proof: 为至少 dashboard、flow list、master-detail detail 三条路径补 focused verification。

Exit Criteria:

- [x] in-scope 页面在 loading、error、offline 场景下均有用户可见反馈。
- [x] `master-detail/[id]` 不再通过 `return null` 呈现空白加载状态。
- [x] focused verification 覆盖至少三条代表性页面路径。
- [x] `docs/design/backend-integration.md` 已同步记录页面数据状态反馈基线。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Mutation 与 auth 异常反馈

Status: completed
Targets: `apps/main/src/pages/flow-editor/index.tsx` `apps/main/src/pages/data-management/master-detail/index.tsx` `apps/main/src/hooks/useAuth.ts`

- Item Types: `Fix | Proof`

- [x] Fix: 为已确认缺少 `onError` 的 mutation 路径补齐错误反馈，并保留 `flow-editor/index` 当前已落地的 `onError` 行为基线。
- [x] Fix: 为 `useAuth.ts` 的 bootstrap 失败提供明确用户反馈与 token 清理裁定。
- [x] Proof: 为 mutation 错误反馈与 auth bootstrap 错误路径补 focused tests。

Exit Criteria:

- [x] in-scope mutation 失败时用户可见错误反馈。
- [x] auth bootstrap 失败不再停留在不透明状态。
- [x] focused tests 覆盖 mutation 与 auth 错误路径。
- [x] `docs/design/backend-integration.md` 已同步 mutation 错误反馈与 auth bootstrap 失败处理基线
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - 取消安全与 active-flag 清理

Status: completed
Targets: `apps/main/src/flux/FluxRouteRenderer.tsx` `apps/main/src/pages/flow-editor/[id]/index.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: 将 in-scope active-flag 异步加载路径改为真实取消或明确等价 cleanup 合同。
- [x] Proof: 为 unmount 后取消/忽略结果的行为补 focused verification。

Exit Criteria:

- [x] in-scope 页面不再仅依赖 active-flag 模式来规避卸载后 setState。
- [x] focused verification 证明取消或等价 cleanup 行为成立。
- [x] `docs/design/backend-integration.md` 已同步 in-scope 取消安全基线
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复或被明确移出当前 scope
- [x] in-scope 请求路径具备最小 timeout / error / loading / offline 合同
- [x] mutation 与 auth 异常路径对用户可见
- [x] 必要 focused verification 已完成
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Full Offline-First / Queue Architecture

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划只收口最小 offline UX 与错误反馈合同，不实现完整离线优先架构。
- Successor Required: `no`
- Successor Path: N/A

### Repo-Wide AbortController Adoption

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划只修复 source review 中已确认的两条 active-flag 热点路径，不扩张为全仓异步取消模式重构。
- Successor Required: `no`
- Successor Path: N/A

## Closure

Status Note: 已完成 shared HTTP client/timeout/error contract、offline banner、关键页面 loading/error/offline UX、mutation/auth 错误反馈、取消安全与 focused proof，并在独立 closure audit 与全量验证后确认无剩余 in-scope blocker，可关闭。

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit in current session
- Evidence: 审核曾将 `apps/main/src/main.tsx`、`apps/main/src/pages/dashboard/index.tsx`、`apps/main/src/pages/flow-editor/index.tsx`、`apps/main/src/pages/plugins/management/index.tsx`、`apps/main/src/pages/data-management/master-detail/[id]/index.tsx`、`apps/main/src/flux/FluxRouteRenderer.tsx`、`docs/design/backend-integration.md` 识别为 blocker；这些项已全部收口，并在本轮通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build` 复验。补充证据包括 `apps/main/src/components/layout/OfflineBanner.tsx`、`OfflineBanner.test.tsx`、`detailState.test.ts`、`state.test.ts` 与 `main.test.ts`。

Follow-up:

- 无。
