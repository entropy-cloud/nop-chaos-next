# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] HTTP client 401 重试后仍返回 401 时无上限保护

- **文件**: `packages/shared/src/http/client.ts:200-225`
- **证据片段**:
```typescript
async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const token = options.withAuth === false ? runtime.getAuthToken() : await getValidToken();
  let response = await doRequest<T>(options, token);

  if (response.status === 401 && options.withAuth !== false) {
    const refreshToken = runtime.getRefreshToken?.();
    if (refreshToken) {
      try {
        const newToken = await doRefreshToken();
        response = await doRequest<T>(options, newToken);
        return response;
      } catch (error: unknown) {
        runtime.clearTokens?.();
        runtime.onUnauthorized?.();
        throw new Error(
          `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    } else {
      runtime.onUnauthorized?.();
    }
  }

  return response;
}
```
- **严重程度**: P1
- **问题类别**: 竞态
- **异步操作**: HTTP client 401 token refresh + retry
- **竞态场景**: 请求用旧 token → 401 → 刷新成功 → 用新 token 重试 → 服务端仍返回 401 → `request()` 直接返回 401 response 不抛异常
- **用户可见故障**: 持续 401 状态，不断触发 logout 再刷新循环
- **建议**: 重试后如果仍为 401，应主动调用 `onUnauthorized` 并抛出异常
- **误报排除**: `refreshPromise` 保证了并发请求共享刷新，但重试仍 401 时没有兜底
- **复核状态**: 未复核

---

### [维度06-02] amis-core 的 401 处理不经过 refresh，直接 logout

- **文件**: `packages/amis-core/src/core/ajax.ts:390-403`
- **证据片段**:
```typescript
if ((response.status === 401 || payloadStatus === 401) && adapter.getAuthToken()) {
  handleLogout();
}
```
- **严重程度**: P1
- **问题类别**: 契约漂移
- **异步操作**: amis 内部 ajax 请求遇到 401 时直接 logout，不尝试 refresh token
- **竞态场景**: 用户在 amis 页面操作 → token 时钟偏差导致 401 → amis 直接 logout → 用户被踢出。同时非 amis 请求遇到 401 会走 refresh 流程成功续期
- **用户可见故障**: amis 页面突然被登出，非 amis 页面同样场景不会触发登出
- **建议**: amis-core 的 HTTP client 应配置 `refreshAccessToken`，或走已配置 refresh 的 `mainHttpClient` 路径
- **误报排除**: amis-core 自己的 client 没有 refresh 能力，与主 client 行为不一致
- **复核状态**: 未复核

---

### [维度06-03] useAuthBootstrap 模块级标志不随 HMR 重置

- **文件**: `apps/main/src/hooks/useAuth.ts:7-9,27-32`
- **证据片段**:
```typescript
const authBootstrapState = { didBootstrapAuth: false };
useEffect(() => {
  if (authBootstrapState.didBootstrapAuth) return;
  authBootstrapState.didBootstrapAuth = true;
  const bootstrap = async () => { ... };
  void bootstrap();
}, []);
```
- **严重程度**: P2
- **问题类别**: 竞态
- **建议**: 使用 `useRef` 或 store 管理 bootstrap 状态
- **误报排除**: 生产环境无影响，但框架代码应考虑开发环境可靠性
- **复核状态**: 未复核

---

### [维度06-04] PluginSlot 的 beforeLoad 无取消保护，卸载后仍加载远程模块

- **文件**: `packages/core/src/components/PluginSlot.tsx:31-50`
- **证据片段**:
```typescript
void Promise.resolve(beforeLoad?.())
  .then(() => loadRemoteComponent(requestUrl))
  .then((resolved) => { if (active) setComponent(() => resolved); })
  .catch((reason: unknown) => { if (active) setError(...); });
```
- **严重程度**: P2
- **问题类别**: 取消安全
- **竞态场景**: 导航到插件页 A → beforeLoad 开始 → 快速离开 → loadRemoteComponent 仍执行但 setComponent 被跳过
- **用户可见故障**: 无 UI 错误，但资源浪费
- **建议**: 当前 best-effort 可接受，文档中注明限制
- **误报排除**: `active` 标志阻止了 state 写入
- **复核状态**: 未复核

---

### [维度06-05] AmisPageRoute 无 AbortController 取消保护

- **文件**: `packages/amis-react/src/components/AmisPageRoute.tsx:18-40`
- **证据片段**:
```typescript
void adapter.pageProvider.getPage(schemaPath)
  .then((value) => { if (active) setSchema(value); })
  .catch((reason: unknown) => { if (active) setError(...); });
```
- **严重程度**: P2
- **问题类别**: 取消安全
- **建议**: 与 `FluxRouteRenderer` 保持一致使用 AbortController
- **误报排除**: 同项目 FluxRouteRenderer 已采用 AbortController，AmisPageRoute 是遗漏
- **复核状态**: 未复核

---

### [维度06-06] AmisSchemaPage schema transform 无取消保护

- **严重程度**: P3
- **问题类别**: 取消安全
- **复核状态**: 未复核

---

### [维度06-07] 登录页面表单无并发表单提交防护

- **文件**: `apps/main/src/pages/auth/login/index.tsx:56-71`
- **严重程度**: P2
- **问题类别**: 竞态
- **建议**: handleSubmit 入口处检查 submitting 状态
- **误报排除**: React 19 batching 使竞态窗口极小
- **复核状态**: 未复核

---

### [维度06-08] ensurePluginExtraSharedModules Promise 缓存已正确处理失败重试

- **严重程度**: 非问题（catch 中正确重置 promise）
- **复核状态**: 未复核

---

### [维度06-09] loadExtensions 失败后继续加载其他 extension

- **严重程度**: P3（合理的设计权衡）
- **复核状态**: 未复核

---

### [维度06-10] tokenManager.getValidToken 刷新失败静默降级为旧 token

- **文件**: `packages/shared/src/auth/tokenManager.ts:180-191`
- **证据片段**:
```typescript
try {
  return await refreshPromise;
} catch {
  return getAccessToken();
}
```
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **建议**: catch 块中增加 console.warn 日志
- **误报排除**: 降级策略合理但缺少可观测性
- **复核状态**: 未复核

---

### [维度06-11] bootstrap() 顶层异常处理合理

- **严重程度**: 非问题
- **复核状态**: 未复核

---

### [维度06-12] AmisSchemaPage effect schema 引用依赖

- **严重程度**: P3
- **复核状态**: 未复核
