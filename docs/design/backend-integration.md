# 后端联调与网络弹性设计

> 本文档描述当前主应用与后端/资源请求的真实合同，包括 HTTP client、timeout、错误提取、取消安全、bootstrap 与 storage 行为。

---

## 1. 主 HTTP 合同

主应用统一 HTTP client 位于 `apps/main/src/services/http.ts`，基于 `@nop-chaos/shared` 的 `createHttpClient()`。

当前基线：

- 默认 timeout：15 秒，由 `getTimeoutMs: () => 15_000` 提供
- 自动注入 locale header：来自 `normalizeLanguageCode(i18n.language)`
- 自动读取 access token / refresh token：来自 `useAuthStore`
- 401 或 refresh 失败时：清理 managed tokens，并执行 `useAuthStore.getState().logout()`
- React Query 默认 retry：`apps/main/src/main.tsx` 中对 `401/403/404` 不重试，其余错误只重试 1 次

不应再在 in-scope 路径直接使用 raw `fetch` 绕过这些合同。

---

## 2. 错误与超时处理

当前请求层要求：

- 网络异常必须转换为普通 `Error`，供页面层 toast 或 error UI 消费
- 非 2xx 响应必须尽量保留后端 message；若没有 message，则退化为状态码错误
- 资源请求也必须具备等价的 timeout / abort / message 合同

已收口到共享 client 的热点路径包括：

- `apps/main/src/services/schemaAsset.ts`
- `apps/main/src/services/mockApi/menu.ts`
- `apps/main/src/extensions/bootstrap.ts`

---

## 3. Bootstrap 与 i18n 失败路径

应用启动入口：`apps/main/src/main.tsx`

当前 bootstrap 顺序：

1. `initializeI18n()`
2. `setI18nGetter((key) => i18n.t(key))`
3. `bootstrapExtensions()`
4. `renderApp()`

若上述任一步失败：

- 进入 DOM-based bootstrap fallback
- fallback 优先显示已初始化 i18n 文案；若 i18n 尚未就绪，退化为英文默认提示
- 错误 message 会直接展示给用户，避免“启动失败但无诊断信息”

---

## 4. 页面级 loading / error 基线

关键数据页必须满足：

- loading 时有可见提示，而不是空白或“空数据看起来像加载中”
- 首次请求失败时有可见 error UI 或 toast
- mutation 失败时有用户可见反馈

当前代表性实现：

- `apps/main/src/pages/dashboard/index.tsx`
- `apps/main/src/pages/plugins/management/index.tsx`
- `apps/main/src/pages/flow-editor/index.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`

特别约束：`master-detail/[id]` 首次请求失败时不能继续伪装成 loading；必须直接进入错误态。

---

## 5. 取消安全

本轮只对已确认热点路径建立取消合同，不扩张到全仓：

- `apps/main/src/flux/FluxRouteRenderer.tsx`
- `apps/main/src/pages/flow-editor/[id]/index.tsx`

当前基线：

- 使用 `AbortController`，而不是仅靠 active-flag 忽略卸载后的结果
- 路由或 schemaPath 变化时，旧请求结果不能覆盖新状态
- aborted 请求不应弹出错误 toast

---

## 6. Storage / Auth 一致性

当前 auth 相关存储路径已建立单一 owner key：`APP_STORAGE_KEYS.auth`

相关实现：

- `apps/main/src/store/authStore.ts`
- `apps/main/src/utils/storage.ts`
- `apps/main/src/services/mockApi/shared.ts`

当前合同：

- auth 默认使用 session scope；其余 mock/shared 数据默认使用 local scope，除非显式另行裁定
- `zustand persist`、storage helper 与 mock shared storage 需要保持同一 key/scope 口径
- bootstrap / unauthorized 失败后必须能清理 token 与认证态，避免刷新后重复复现无效 token

---

## 7. AMIS 动态代码边界

`apps/main/src/amis/adapter.ts` 当前仍存在：

- `compileFunction: (code, page) => new Function('page', \`return (${code})\`)(page)`

这不是通用脚本执行入口，而是为受信任 schema 场景保留的动态表达式能力。

当前 owner 裁定：

- 仅允许对受信任、受控来源的 AMIS schema 使用
- 不允许把终端用户任意输入直接送入 `compileFunction`
- lint 例外仅限 `apps/main/src/amis/adapter.ts` 与相关受控测试文件，不代表仓库允许任意 `new Function()` 扩散

如后续需要不受信任输入场景，必须单独立计划处理隔离执行或能力收缩，不在当前 baseline 内默认开放。

---

## 8. 联调检查清单

推荐先验证：

1. 登录、刷新恢复与 unauthorized 清理
2. 菜单与页面 schema 加载
3. 关键数据页 loading/error/mutation feedback
4. 断网、超时或 schemaPath 切换时的取消与错误可见性

最小验证命令：

- `pnpm --filter @nop-chaos/main typecheck`
- `pnpm --filter @nop-chaos/main exec vitest run src/main.test.ts src/flux/state.test.ts src/pages/data-management/master-detail/detailState.test.ts`
