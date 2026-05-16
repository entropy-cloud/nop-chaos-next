# 17 Network & Async Safety Extension Plan

> Plan Status: done
> Last Reviewed: 2026-05-16
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 06-06, 06-08)
> Related: `docs/plans/08-network-resilience-plan.md`

## Purpose

修复 2 个异步安全问题：amis-core HTTP 客户端单例化、clipboard API 异常处理。

## Current Baseline

- `executeSharedRequest` 每次调用创建新 HTTP 客户端实例（06-08, P1），每个实例有独立 `refreshPromise`，并发 401 触发 N 次刷新。
- `navigator.clipboard.writeText()` 未捕获异常（06-06, P2），非 HTTPS 环境下导致 unhandled rejection。

## Goals

- HTTP 客户端单例化，确保并发请求共享同一个刷新 Promise。
- clipboard 调用包裹在 try-catch 中。

## Non-Goals

- 不重构 amis-core 的 HTTP 客户端架构。
- 不添加离线支持。

## Scope

### In Scope

- `packages/amis-core/src/core/ajax.ts` 客户端单例化。
- `apps/main/src/pages/ai-workbench/index.tsx` clipboard 异常处理。

### Out Of Scope

- amis-core HTTP 客户端架构重构。
- 其他异步安全问题（06-01, 06-02, 06-09 已在 Plan 05/08 中修复）。

## Execution Plan

### Phase 1 - HTTP Client Singleton

Status: done
Targets: `packages/amis-core/src/core/ajax.ts`, `packages/amis-core/src/core/__tests__/ajax.test.ts`

- Item Types: `Fix`

- [x] 1.1 将 `createHttpClient` 改为懒初始化单例模式：使用 `let _client: ReturnType<typeof createHttpClient> | null = null; function getClient() { if (!_client) { _client = createHttpClient({...}); } return _client; }`，避免在模块加载时捕获过期 adapter state。`executeSharedRequest` 改为调用 `getClient()`
- [x] 1.2 在 `packages/amis-core/src/core/__tests__/ajax.test.ts` 中添加并发刷新测试：mock `refreshAccessToken` 返回慢 Promise，触发 3 个并发 401 请求，验证 refresh 仅调用一次

Exit Criteria:

- [x] `ajax.ts` 中 `createHttpClient` 仅通过懒初始化调用一次
- [x] 并发刷新测试通过：3 个并发 401 请求仅触发 1 次 `refreshAccessToken`
- [x] `pnpm --filter @nop-chaos/amis-core build` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Clipboard Error Handling

Status: done
Targets: `apps/main/src/pages/ai-workbench/index.tsx`

- Item Types: `Fix`

- [x] 2.1 将 `navigator.clipboard.writeText()` 包裹在 try-catch 中，catch 时显示 toast 错误提示
- [x] 2.2 验证非 HTTPS 环境下不再有 unhandled rejection

Exit Criteria:

- [x] `ai-workbench/index.tsx` 的 clipboard 调用包含 try-catch
- [x] `pnpm typecheck && pnpm build` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] HTTP 客户端为懒初始化单例（06-08）
- [x] clipboard 调用有 try-catch（06-06）
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

（无）

## Closure

Status Note: All items completed. HTTP client singleton + clipboard try-catch landed.

Closure Audit Evidence:

- Reviewer / Agent: opencode (glm-5.1)
- Evidence: `docs/logs/2026/05-16.md` Session 1; all exit criteria checked

Follow-up:

- no remaining plan-owned work
