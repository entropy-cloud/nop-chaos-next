# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] tokenManager.getValidToken 静默吞掉刷新失败错误回退到即将过期的旧 token

- **文件**: `packages/shared/src/auth/tokenManager.ts:186-190`
- **证据片段**:
  ```ts
  try {
    return await refreshPromise;
  } catch {
    return getAccessToken();
  }
  ```
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **异步操作**: getValidToken() 中对 refreshAccessToken() 的预检刷新
- **竞态场景**: token 即将过期 → 刷新失败 → 静默返回旧 token → 后续请求 401 → 再次触发刷新
- **用户可见故障**: 短暂请求失败或被踢回登录页
- **建议**: 在 catch 中添加日志记录
- **误报排除**: 回退旧 token 是有意降级策略，但缺少日志会掩盖刷新接口持续异常
- **复核状态**: 未复核

### [维度06-02] tokenManager 与 HTTP 客户端存在两层独立的刷新 Promise 去重

- **文件**: `packages/shared/src/http/client.ts:117` + `packages/shared/src/auth/tokenManager.ts:100`
- **证据片段**:
  ```ts
  // client.ts:117
  let refreshPromise: Promise<string> | null = null;
  // tokenManager.ts:100
  let refreshPromise: Promise<string> | null = null;
  ```
- **严重程度**: P2
- **问题类别**: 竞态
- **异步操作**: token 刷新流程
- **竞态场景**: 并发请求同时 401 → client 的 doRefreshToken() 和 tokenManager 各自独立去重 → 可能触发双重刷新
- **用户可见故障**: 通常无可见影响，但可能导致服务端 429
- **建议**: 统一刷新去重逻辑到单一层级
- **误报排除**: 两层 refreshPromise 变量互不知晓，是独立实现
- **复核状态**: 未复核

### [维度06-03] AmisPageRoute 缺少 AbortController 取消机制

- **文件**: `packages/amis-react/src/components/AmisPageRoute.tsx:22-35`
- **证据片段**:
  ```ts
  void adapter.pageProvider.getPage(schemaPath)
    .then((value) => { if (active) { setSchema(value); } })
    .catch((reason) => { if (active) { setError(reason); } });
  return () => { active = false; };
  ```
- **严重程度**: P3
- **问题类别**: 取消安全
- **异步操作**: adapter.pageProvider.getPage 异步加载 AMIS schema
- **竞态场景**: 用户切换路由 → 组件卸载 → active=false 阻止状态更新 → 但网络请求仍在飞行
- **用户可见故障**: 无直接故障（active 标志正确防护），但浪费带宽
- **建议**: 参考 FluxRouteRenderer 添加 AbortController
- **误报排除**: active 标志有效，但与 FluxRouteRenderer 模式不一致
- **复核状态**: 未复核

### [维度06-04] AmisSchemaPage 的 transformPageJson 缺少 AbortController

- **文件**: `packages/amis-react/src/components/AmisSchemaPage.tsx:63-92`
- **证据片段**:
  ```ts
  void transformPageJson(cloneSchema(schema))
    .then((nextSchema) => bindActions(nextSchema, page))
    .then((nextSchema) => { if (active) { setSchemaState({ ... }); } })
  ```
- **严重程度**: P3
- **问题类别**: 取消安全
- **异步操作**: transformPageJson + bindActions 异步转换 schema
- **竞态场景**: 快速切换 AMIS 页面 → 旧组件卸载 → CPU 操作继续执行
- **用户可见故障**: 大型 schema 可能短暂卡顿
- **建议**: 对 bindActions 内部的异步操作传递 signal
- **误报排除**: active 标志正确防护，纯 CPU 操作无法被 AbortController 取消
- **复核状态**: 未复核

### [维度06-05] useAuthBootstrap 缺少卸载取消机制

- **文件**: `apps/main/src/hooks/useAuth.ts:27-62`
- **证据片段**:
  ```ts
  const bootstrap = async () => {
    state.setBootstrapStatus('pending');
    const currentUser = await fetchCurrentUser(state.token);
    useAuthStore.getState().setSession({ ... });
  };
  void bootstrap();
  ```
- **严重程度**: P3
- **问题类别**: 取消安全
- **异步操作**: fetchCurrentUser 验证 token
- **竞态场景**: 组件卸载后请求完成仍调用 setSession（全局 store 操作）
- **用户可见故障**: 极端情况下用户被意外登出
- **建议**: 添加 AbortController（风险极低，此 hook 只在根布局挂载时执行一次）
- **误报排除**: didBootstrapAuth 标志确保全局只执行一次
- **复核状态**: 未复核

### [维度06-06] handleCopy 在 clipboard API 拒绝时未捕获异常

- **文件**: `apps/main/src/pages/ai-workbench/index.tsx:263-266`
- **证据片段**:
  ```ts
  const handleCopy = async (message: WorkbenchMessage) => {
    await navigator.clipboard.writeText(message.content);
    toast.success(t('aiWorkbench.copySuccess'));
  };
  ```
- **严重程度**: P2
- **问题类别**: 异常缺失处理
- **异步操作**: navigator.clipboard.writeText() 受限 API
- **竞态场景**: 用户点击复制 → writeText 抛出 NotAllowedError → unhandled promise rejection
- **用户可见故障**: 用户点击复制无反应，无错误提示
- **建议**: 添加 try-catch，失败时显示 toast 错误
- **误报排除**: clipboard API 在非 HTTPS、iframe 无权限等场景确实会 reject
- **复核状态**: 未复核

### [维度06-07] handleLogout 的降级策略合理但缺少注释

- **文件**: `apps/main/src/router/AppShell.tsx:173-193`
- **严重程度**: P3
- **问题类别**: 异常吞掉（部分）
- **现状**: 远程注销失败后仍执行本地注销和导航，是合理的降级策略
- **建议**: 当前实现逻辑正确，低优先级改进
- **误报排除**: 不是真正的异常吞掉
- **复核状态**: 未复核

### [维度06-08] amis-core ajax.ts executeSharedRequest 每次调用创建新 HTTP 客户端实例

- **文件**: `packages/amis-core/src/core/ajax.ts:285-307`
- **证据片段**:
  ```ts
  async function executeSharedRequest(options: HttpRequestOptions) {
    const adapter = getAmisRuntimeAdapter();
    if (adapter.request) { return adapter.request(options); }
    const client = createHttpClient({ ... });
    return client.request(options);
  }
  ```
- **严重程度**: P1
- **问题类别**: 竞态
- **异步操作**: 每次 AMIS 请求创建新 client → 新实例的 refreshPromise 为 null → 并发 401 各自独立刷新
- **竞态场景**: 多个 AMIS 组件并发请求 → 全部 401 → 每个创建新 client → N 个刷新请求
- **用户可见故障**: 多次登出、刷新 token 被消耗、服务端 429
- **建议**: 将 createHttpClient 实例提升为模块级单例
- **误报排除**: 主应用配置了 adapter.request 不走此分支，但作为公共包的默认路径需修复
- **复核状态**: 未复核

### [维度06-09] amis-core ajax.ts 401 响应后直接调用 handleLogout 无重试机制

- **文件**: `packages/amis-core/src/core/ajax.ts:378-390`
- **证据片段**:
  ```ts
  if ((response.status === 401 || payloadStatus === 401) && adapter.getAuthToken()) {
    handleLogout();
  }
  ```
- **严重程度**: P2
- **问题类别**: 竞态
- **异步操作**: AMIS 请求遇到 401 后直接登出，不尝试刷新
- **竞态场景**: token 即将过期 → AMIS 请求 401 → 直接登出 → 但 refresh token 可能仍有效
- **用户可见故障**: AMIS 页面用户被意外登出
- **建议**: 增加 token 刷新重试逻辑或确保 adapter.request 始终被设置
- **误报排除**: 主应用已配置 adapter.request，但公共包默认行为缺少刷新重试
- **复核状态**: 未复核

### [维度06-10] flux ensureFluxRuntime 缺少并发保护

- **文件**: `apps/main/src/flux/init.ts:1-11`
- **证据片段**:
  ```ts
  let didInitFluxRuntime = false;
  export async function ensureFluxRuntime() {
    if (didInitFluxRuntime) { return; }
    await import('@nop-chaos/flux/style.css');
    await import('../styles/flux-spacing.css');
    didInitFluxRuntime = true;
  }
  ```
- **严重程度**: P3
- **问题类别**: 竞态
- **异步操作**: 动态导入 CSS
- **竞态场景**: 两个 Flux 路由组件同时挂载 → 都调用 ensureFluxRuntime → 都执行完整 import
- **用户可见故障**: 无（浏览器去重 module import）
- **建议**: 参考 amis/init.ts 使用 Promise 缓存模式
- **误报排除**: Vite 模块去重机制掩盖了此问题
- **复核状态**: 未复核

### [维度06-11] dashboard 页面快速切换 range 时可能产生请求竞态

- **文件**: `apps/main/src/pages/dashboard/index.tsx:93-101`
- **严重程度**: P3
- **问题类别**: 取消安全
- **现状**: fetchDashboardData 未传递 signal，旧请求不被取消
- **建议**: 接入真实 API 时传递 React Query 的 signal
- **误报排除**: React Query 内部已处理 stale 请求的数据竞态
- **复核状态**: 未复核

## 正面发现

1. HTTP 客户端刷新去重（client.ts:126-139）正确实现
2. Flow 编辑器 AbortController 模式正确
3. FluxRouteRenderer AbortController 模式正确
4. QueryClient 全局配置合理
5. Extension 加载错误隔离良好
6. Bootstrap 全局错误兜底
7. amis/init.ts Promise 缓存正确
