# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] 顶层 bootstrap() 缺乏错误处理 — 应用静默渲染失败

- **文件**: `apps/main/src/main.tsx:38-44`
- **证据片段**:
  ```ts
  async function bootstrap() {
    await initializeI18n();
    await bootstrapExtensions();
    renderApp();
  }
  void bootstrap();
  ```
- **严重程度**: P0
- **问题类别**: 异常吞掉
- **异步操作**: 应用初始化序列：initializeI18n() → bootstrapExtensions() → renderApp()
- **竞态场景**: 单路径失败级联。若 initializeI18n() 抛出，bootstrapExtensions() 和 renderApp() 均不执行。
- **用户可见故障**: 白屏，无错误信息，无 fallback UI。
- **建议**: 添加 .catch() 处理：`void bootstrap().catch((error) => { ... document.getElementById('root')!.textContent = 'Application failed to load.'; })`

### [维度06-02] 无 React Error Boundary — 懒加载组件失败崩溃整个应用

- **文件**: `apps/main/src/router/RouteRenderer.tsx:11-25`（lazy factories）、`apps/main/src/main.tsx:25-36`（React tree，无 ErrorBoundary）
- **证据片段**:
  ```tsx
  const AmisRouteRenderer = lazy(async () => {
    const [{ ensureAmisRuntime }, module] = await Promise.all([
      import('../amis/init'),
      import('../amis/AmisRouteRenderer'),
    ]);
    await ensureAmisRuntime();
    return { default: module.AmisRouteRenderer };
  });
  ```
  全局搜索 ErrorBoundary 零匹配。
- **严重程度**: P0
- **问题类别**: 应用崩溃 / 异常吞掉
- **异步操作**: 动态 import() 和 ensureAmisRuntime() / ensureFluxRuntime() 在 React.lazy() 工厂函数中
- **竞态场景**: 用户导航到 AMIS/Flux 路由 → 懒加载 chunk 失败（404/超时）→ React lazy 拒绝 → 无 Error Boundary → React 卸载整个树
- **用户可见故障**: 白屏崩溃，整个 React 树卸载
- **建议**: 在 React 树的 App.tsx 或 main.tsx 层包裹 Error Boundary，展示 fallback UI 并提供重试按钮。

### [维度06-03] Auth Bootstrap 静默吞掉 fetchCurrentUser 错误

- **文件**: `apps/main/src/hooks/useAuth.ts:38-48`
- **证据片段**:
  ```ts
  try {
    state.setBootstrapStatus('pending');
    const currentUser = await fetchCurrentUser(state.token);
    useAuthStore.getState().setSession({ ... });
  } catch {
    useAuthStore.getState().logout();
  }
  ```
- **严重程度**: P1
- **问题类别**: 异常吞掉
- **异步操作**: fetchCurrentUser(state.token)
- **竞态场景**: 应用加载时，存储的 token 过期或服务器不可达，catch 块静默调用 logout() 零日志。
- **用户可见故障**: 用户看到登录页，无任何解释说明会话为何失效。
- **建议**: 至少添加 console.error 日志；考虑对非过期 token 错误显示 toast。

### [维度06-04] Token 刷新错误在 HTTP 客户端中静默吞掉

- **文件**: `packages/shared/src/http/client.ts:157-167`
- **证据片段**:
  ```ts
  if (response.status === 401 && options.withAuth !== false) {
    const refreshToken = runtime.getRefreshToken?.();
    if (refreshToken) {
      try {
        const newToken = await doRefreshToken();
        response = await doRequest<T>(options, newToken);
        return response;
      } catch {
        runtime.clearTokens?.();
        runtime.onUnauthorized?.();
      }
    }
  }
  ```
- **严重程度**: P1
- **问题类别**: 异常吞掉
- **异步操作**: doRefreshToken()
- **竞态场景**: 多个并发请求 401，doRefreshToken 去重成功但刷新请求本身失败 → 错误静默吞掉
- **用户可见故障**: 用户被登出，无任何错误说明
- **建议**: 记录错误日志后再调用 onUnauthorized()。

### [维度06-05] 两个独立的 Token 刷新去重机制可能导致重复刷新

- **文件**: `packages/shared/src/http/client.ts:84` + `packages/shared/src/auth/tokenManager.ts:100`
- **证据片段**:
  ```ts
  // client.ts:84
  let refreshPromise: Promise<string> | null = null;
  async function doRefreshToken(): Promise<string> {
    if (refreshPromise) return refreshPromise;
    // ...
  }
  // tokenManager.ts:100
  let refreshPromise: Promise<string> | null = null;
  export async function getValidToken(): Promise<string | undefined> {
    if (isTokenExpiringSoon() && getRefreshToken()) {
      if (!refreshPromise) { refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; }); }
    }
  }
  ```
- **严重程度**: P1
- **问题类别**: 竞态
- **异步操作**: Token 刷新
- **竞态场景**: HTTP 客户端 401 触发 client.doRefreshToken()，同时 getValidToken() 在临近过期时也触发 refreshAccessToken() — 两套独立的 refreshPromise 变量，导致两个并发刷新请求。
- **用户可见故障**: 重复刷新违反后端 rate limit 或非重复 token 策略导致认证失败。
- **建议**: 集中化 token 刷新去重到单一位置。

### [维度06-06] Flow Editor Mutation 包裹所有操作但无逐操作错误处理

- **文件**: `apps/main/src/pages/flow-editor/index.tsx:42-47`
- **证据片段**:
  ```ts
  const actionMutation = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: () => { void flowQuery.refetch(); },
    // 无 onError!
  });
  ```
- **严重程度**: P1
- **问题类别**: 异常吞掉
- **异步操作**: duplicate/delete/toggle flow 操作
- **竞态场景**: 用户点击 duplicate → mutation 执行 → 服务器错误 → mutation 无 onError → 用户认为操作成功
- **用户可见故障**: 操作失败无任何反馈，数据不更新
- **建议**: 添加 onError 处理，如 `onError: (error) => { toast.error(error.message); }`

### [维度06-07] `void refetch()` 丢弃错误

- **文件**: `apps/main/src/pages/flow-editor/index.tsx:45`, `apps/main/src/pages/dashboard/index.tsx:179` 等 5 处
- **证据片段**:
  ```tsx
  onSuccess: () => { void flowQuery.refetch(); }
  onClick={() => void dashboardQuery.refetch()}
  ```
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **异步操作**: 手动或 mutation 后查询 refetch
- **竞态场景**: 用户按"刷新" → refetch 失败（网络错误）→ 错误静默丢弃
- **用户可见故障**: 数据保持陈旧，无错误反馈
- **建议**: 至少添加 `.catch((error) => { console.error('Refetch failed:', error); })`

### [维度06-08] 从组件 useEffect 到 HTTP 客户端无 AbortSignal 传播

- **文件**: `packages/shared/src/http/client.ts:134`（signal 支持已就绪但调用方未传递）
- **证据片段**:
  ```ts
  // client.ts:134 — signal 已传到 fetch
  signal: options.signal,
  // 但没有任何组件或 queryFn 提供 signal
  ```
- **严重程度**: P2
- **问题类别**: 取消安全
- **异步操作**: 所有从 React 组件触发的 HTTP 请求
- **竞态场景**: 用户从页面 A 导航到页面 B → 页面 A 的 HTTP 请求继续完成 → 浪费带宽；老请求完成时用 active flag 防护但竞态窗口仍存在。
- **用户可见故障**: 无（仅资源浪费）
- **建议**: React Query queryFn 中使用 `({ signal })`；effect 中使用 AbortController。

### [维度06-09] ensurePluginExtraSharedModules 在 pluginExtraModulesPromise 上存在过期闭包竞态

- **文件**: `apps/main/src/plugins/sharedModules.ts:61-79`
- **证据片段**:
  ```ts
  async function ensurePluginExtraSharedModules() {
    if (didRegisterPluginExtraModules) return;
    pluginExtraModulesPromise ??= import('recharts').then((rechartsModule) => {
      registerSharedModules(pluginExtraSharedModules);
      didRegisterPluginExtraModules = true;
    });
    await pluginExtraModulesPromise;
  }
  ```
- **严重程度**: P2
- **问题类别**: 竞态
- **异步操作**: import('recharts')
- **竞态场景**: 第一次调用在 line 62 检查通过但 line 66 的 ??= 尚未执行时，第二次调用进入 → 两个调用都看到 pluginExtraModulesPromise 为 null → 两个 import('recharts') 发出。
- **用户可见故障**: 极低风险，import map 重复注册但一般幂等。
- **建议**: 将 pluginExtraModulesPromise ??= ... 放在 line 62 之前，或在 line 62 后增加对 pluginExtraModulesPromise 的检查。
