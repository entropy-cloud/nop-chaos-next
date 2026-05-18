# 对抗性审查 Round 02 — 跨边界契约断裂、Auth 双存储同步、React 性能热点

**日期**: 2026-05-17
**发现来源视角**: 跨边界信使（数据形状一致性）、时序攻击者（Token 刷新竞态）、React Compiler 观察者（渲染性能）

---

## 发现 1：HIGH — `BoundStore<T>` 类型声明了 selector 重载，但实现完全忽略 selector 参数

**在哪里**: `packages/plugin-bridge/src/types.ts:21-26`（类型声明）, `apps/main/src/App.tsx:49-51`（实际实现）

**是什么**: `BoundStore<T>` 类型声明了两个调用签名：

```typescript
type BoundStore<T> = {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
};
```

但实际实现只支持无参数调用：

```typescript
authStore: Object.assign(() => useAuthStore.getState(), {
  getState: useAuthStore.getState,
  subscribe: useAuthStore.subscribe,
}),
```

如果插件调用 `bridge.stores.authStore(state => state.user)`，TypeScript 类型检查通过（返回类型推导为 `User | null`），但运行时 selector 被静默忽略，返回完整的 store 状态对象（包含 `user`, `isAuthenticated`, `token`, `login`, `logout` 等全部字段）。

**为什么值得关心**: 这是一个类型系统与运行时的严重契约断裂。插件开发者按照类型定义使用 selector 模式时，会得到错误的数据且不会收到任何错误提示。这比普通的类型错误更危险，因为它"看起来正确"但运行时行为与预期完全不同。

**信心水平**: 确定

**影响范围**: `bridgeStores.authStore`、`bridgeStores.themeStore`、`bridgeStores.pluginStore` 三个 store 都有这个问题。测试文件 `packages/plugin-bridge/src/index.test.ts:38-41` 也没有测试 selector 形式。

---

## 发现 2：HIGH — AI Workbench 流式循环导致 80+ renders/sec，所有子组件重渲染

**在哪里**: `apps/main/src/pages/ai-workbench/index.tsx:126-270`

**是什么**: AI Workbench 页面有 13 个 `useState` 和 10+ 个函数（`updateSession`, `createSession`, `handleSwitchAssistant`, `handleDeleteSession`, `streamAssistantReply`, `handleSend`, `handleStop`, `handleRegenerate`, `handleCopy`, `loadOlderMessages`），全部是普通函数（未用 `useCallback` 包装）。

流式回复循环（lines 197-209）每 12ms 调用 `updateSession`，触发完整的 React 渲染周期：

```typescript
for (let index = 0; index < reply.length; index += 1) {
  updateSession(sessionId, (session) => ({ ... }));
  await new Promise((resolve) => window.setTimeout(resolve, 12));
}
```

每次 `updateSession` 调用 → `sessions` 数组重建 → `activeSession` 重新计算 → `contextSummary` (useMemo) 重新计算 → 全部子组件收到新函数引用 → 全部子组件重渲染。

**为什么值得关心**: 80+ renders/sec 的渲染频率下，ConversationPanel、SessionSidebar、ContextPanel 全部重渲染。每次渲染涉及 markdown 解析、消息列表渲染、scrollbar 计算等。在低端设备上会导致明显的 UI 卡顿和输入延迟（用户打字时 draft textarea 也在同一组件树中）。

**信心水平**: 确定

**建议**: 将 AI Workbench 状态提取为 Zustand store 或 `useReducer`，用 `useCallback` 包装函数，或将 ConversationPanel 的消息列表虚拟化。

---

## 发现 3：MEDIUM — Auth 双存储（authStore + tokenManager）在 Login 和 Logout 时不同步

**在哪里**: `apps/main/src/pages/auth/login/index.tsx:62`, `apps/main/src/router/AppShell.tsx:192`

**是什么**: Token 存储分为两层：

| 事件 | authStore 更新？ | tokenManager 更新？ |
|------|-----------------|-------------------|
| Login | YES | **NO** |
| Token refresh (HTTP client) | YES | YES |
| Token refresh (tokenManager proactive) | YES | YES |
| Manual logout | YES | **NO** |
| 401 unauthorized | YES | YES |

Login 时只更新 authStore，tokenManager 始终为空。这意味着 `getValidToken()` 的主动刷新路径无法工作（`isTokenExpiringSoon()` 检查的是 tokenManager 中的空数据）。系统靠 HTTP client 的 fallback `runtime.getAuthToken()`（读 authStore）来获取 token。

Logout 时只清除 authStore，tokenManager 的 Web Storage key `'auth:tokens:v1'` 仍然保留旧 token。

**为什么值得关心**: 两个独立的 token 存储系统从 login 开始就不同步。虽然当前靠 fallback 机制没有崩溃，但任何依赖 tokenManager 的代码路径（如主动 token 刷新、过期检查）都在操作过时或空的数据。Logout 后 stale token 残留在 sessionStorage 中也是安全隐患。

**信心水平**: 确定

---

## 发现 4：MEDIUM — 两个独立的 `refreshPromise` 单例允许重复刷新请求

**在哪里**: `packages/shared/src/auth/tokenManager.ts:100` 和 `packages/shared/src/http/client.ts:117`

**是什么**: tokenManager 和 HTTP client 各自维护自己的 `refreshPromise` 去重变量。如果主动刷新（通过 `getValidToken`）和被动 401 刷新同时触发，它们不会共享同一个 Promise，会发出两个独立的刷新请求。

```typescript
// tokenManager.ts:100
let refreshPromise: Promise<string> | null = null;

// client.ts:117
let refreshPromise: Promise<string> | null = null;
```

**为什么值得关心**: 并发场景：1) 请求 A 通过 `getValidToken` 触发主动刷新；2) 请求 B 几乎同时收到 401 触发被动刷新。两次刷新请求同时发出，第二次可能因旧 refresh token 已被服务端轮换而失败。

**信心水平**: 很可能

---

## 发现 5：MEDIUM — 取消的请求被转换为通用失败而非静默忽略

**在哪里**: `packages/shared/src/http/client.ts:177-179`（AbortError 转换）, `packages/amis-core/src/core/ajax.ts:179-181`（只捕获 DOMException）

**是什么**: Shared HTTP client 将所有 `AbortError` 转换为普通 `Error`：

```typescript
// client.ts:177-179
if (error instanceof Error && error.name === 'AbortError') {
  throw error.cause instanceof Error ? error.cause : createTimeoutError(timeoutMs);
}
```

但 amis-core 的 `normalizeNetworkError` 只重新抛出 `DOMException` 类型的 `AbortError`：

```typescript
// ajax.ts:179-181
if (error instanceof DOMException && error.name === 'AbortError') {
  throw error;
}
```

由于 client.ts 已经将 `DOMException` 转换为普通 `Error`，这个检查永远不会匹配。用户取消的 amis 请求变成通用失败结果（`status: -1, msg: "请求失败，请稍后再试"`）而非被静默忽略。

**信心水平**: 确定

---

## 发现 6：MEDIUM — 401 时 double logout

**在哪里**: `packages/shared/src/http/client.ts:205-222` 和 `apps/main/src/amis/adapter.ts:50-53`

**是什么**: 当 401 且无 refresh token 时，shared HTTP client 调用 `runtime.onUnauthorized()` → `logout()`。然后 amis adapter 的 `request` 包装器检查到 401，再次调用 `useAuthStore.getState().logout()`：

```typescript
// client.ts:218
runtime.onUnauthorized?.();  // 第一次 logout

// adapter.ts:50-53
if (response.status === 401) {
  useAuthStore.getState().logout();  // 第二次 logout
  navigate('/auth/login', { replace: true });
}
```

**为什么值得关心**: 虽然 Zustand 的 `set()` 是幂等的（设置相同值不会触发额外通知），但 `logout()` 的实现是 `set({ ...initialState, bootstrapStatus: 'anonymous' })`，每次调用都会创建新的 `initialState` 对象。两次连续调用意味着两个订阅通知被发出。

**信心水平**: 确定

---

## 发现 7：MEDIUM — Flow Editor 事件处理器破坏 ReactFlow 内部 memoization

**在哪里**: `apps/main/src/pages/flow-editor/[id]/index.tsx:141-154`

**是什么**: `onPaneClick`、`onNodeClick`、`onEdgeClick` 都是内联箭头函数，每次渲染创建新引用：

```typescript
onPaneClick={() => { state.setSelectedNodeId(null); state.setSelectedEdgeId(null); }}
onNodeClick={(nodeId) => { state.setSelectedNodeId(nodeId); state.setSelectedEdgeId(null); }}
onEdgeClick={(edgeId) => { state.setSelectedEdgeId(edgeId); state.setSelectedNodeId(null); }}
```

这些被传递给 `FlowCanvas` → ReactFlow。`@xyflow/react` 对 props 做浅比较来优化渲染，新函数引用会破坏其内部 memoization。

**为什么值得关心**: 对比同文件的 `FlowCanvas` 组件（lines 57-77），其 drag/drop handler 使用了正确的 "latest ref" 模式保持引用稳定。click handler 应该使用相同模式。

**信心水平**: 很可能

---

## 发现 8：MEDIUM — AMIS adapter logout 不清除 tokenManager、不调用服务端 logout

**在哪里**: `apps/main/src/amis/adapter.ts:94-96`

**是什么**:

```typescript
logout: () => {
    useAuthStore.getState().logout();
    navigate('/auth/login', { replace: true });
},
```

不清除 tokenManager 存储，不调用服务端 `logoutRequest()` 使旧 token 失效。

**为什么值得关心**: AMIS 页面内的 401 触发 logout 时，tokenManager 残留 stale token，服务端 token 未被显式注销。这与发现 3 的双存储同步问题叠加。

**信心水平**: 确定

---

## 发现 9：LOW — `useMenuConfigQuery` 在 App.tsx 和 AppRoutes.tsx 中重复订阅

**在哪里**: `apps/main/src/App.tsx:26`, `apps/main/src/router/AppRoutes.tsx:48`

**是什么**: 两个文件都调用了 `useMenuConfigQuery()`。App.tsx 的调用不使用返回值，仅用于提前触发 fetch。虽然 React Query 按 key 去重不会发出重复请求，但两个 observer 订阅同一 query 会略微增加内存使用。

**信心水平**: 确定

---

## 发现 10：LOW — Proactive token refresh 静默吞掉错误

**在哪里**: `packages/shared/src/auth/tokenManager.ts:186-189`

**是什么**:

```typescript
try {
    return await refreshPromise;
} catch {
    return getAccessToken();  // 返回可能已过期的 token！
}
```

刷新失败时无日志、无通知、无指标，返回 stale token。下次 API 调用大概率 401。

**信心水平**: 确定
