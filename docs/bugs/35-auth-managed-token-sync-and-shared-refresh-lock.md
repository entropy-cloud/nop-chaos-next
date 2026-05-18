# 35 Auth Managed Token Sync And Shared Refresh Lock

## Problem

- 登录后 `authStore` 已有 token，但 shared `tokenManager` 仍然为空，主动刷新路径与过期判断读取到的是旧状态。
- 登出时 `authStore` 清空了认证态，但 managed token storage 仍可能残留 refresh token。
- `tokenManager` 与 shared HTTP client 各自维护独立的 refresh lock，主动刷新与 401 重试并发时可能同时发出两次 refresh 请求。

## Diagnostic Method

- 先对照 `apps/main/src/services/http.ts`、`apps/main/src/store/authStore.ts` 与 `packages/shared/src/auth/tokenManager.ts` 的 token 读写路径，确认 login/logout/refresh 三条时序并不一致。
- 再检查 `packages/shared/src/http/client.ts` 与 `packages/shared/src/auth/tokenManager.ts`，发现两个模块各自维护 `refreshPromise` 单例，没有共享去重状态。
- 用现有单测覆盖面反查，确认之前只有“各自内部能去重”的测试，没有覆盖跨层竞争刷新。

## Root Cause

- auth 状态同时存在于 `authStore` 和 shared managed token storage，但 login/logout 只更新了 Zustand store，没有维持双向同步。
- token 刷新去重逻辑写在两个模块内部，缺少 shared owner，因此不同入口的 refresh 无法互斥。

## Fix

- `authStore.login()` 现在在写入 Zustand state 的同时同步 managed token storage；`authStore.logout()` 统一清理 managed tokens。
- `tokenManager` 暴露共享 refresh promise 访问器，HTTP client 改为复用这把 shared refresh lock，而不再维护自己的一份单独单例。
- 保持现有主应用 HTTP 合同不变，只修正跨层状态一致性和重复 refresh 风险。

## Tests

- `apps/main/src/store/authStore.test.ts` - 验证 login 会同步 managed tokens，logout 会清理 managed tokens。
- `packages/shared/src/auth/tokenManager.test.ts` - 验证共享 refresh promise 访问器行为。
- `packages/shared/src/http/client.test.ts` - 保持 401 refresh 去重回归覆盖。

## Affected Files

- `apps/main/src/store/authStore.ts`
- `packages/shared/src/auth/tokenManager.ts`
- `packages/shared/src/http/client.ts`
- `apps/main/src/store/authStore.test.ts`
- `packages/shared/src/auth/tokenManager.test.ts`

## Notes For Future Refactors

- 不要再引入第二套独立 refresh lock；所有 refresh 去重必须经过 shared owner。
- 若后续要继续收敛 auth 存储，优先减少 owner 数量，而不是继续靠 fallback 兼容两个来源。
