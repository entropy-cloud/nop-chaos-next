# 对抗性审查 - 第 2 轮：网络弹性与错误处理

## 发现来源视角
10x 规模运维者 + 异常路径侦探

## 高严重度发现

### N1. HTTP 客户端没有超时、重试或网络错误处理
- **文件**: `packages/shared/src/http/client.ts:129-138`
- **问题**: `fetch()` 调用零防护：没有超时（无 `AbortSignal.timeout()`）、没有重试、没有网络错误处理。`request()` 方法（第 153 行）在 `doRequest()` 周围没有 try/catch。网络错误是致命的。
- **影响**: 服务挂起时请求永远挂起；网络断开时抛出未处理的 rejection。
- **信心**: 确定

### N2. 多处使用原始 `fetch` 绕过所有防护
- **文件**: 
  - `apps/main/src/services/schemaAsset.ts:*` — schema 加载跳过 HTTP client
  - `apps/main/src/services/mockApi/menu.ts:6` — 菜单配置使用原始 fetch
  - `apps/main/src/extensions/bootstrap.ts:127` — 扩展 i18n 加载使用原始 fetch
- **问题**: 这些直接调用 `fetch()` 完全绕过 HTTP client，意味着没有 token 刷新、没有 auth headers、没有 locale headers、没有超时控制。
- **影响**: schema 加载和菜单加载是应用 bootstrap 的关键路径，但无任何防护。
- **信心**: 确定

### N3. 关键页面完全缺少加载/错误 UI
- **文件**: 
  - `apps/main/src/pages/dashboard/index.tsx:93` — 无 loading 状态，无 error UI
  - `apps/main/src/pages/flow-editor/index.tsx:41` — `flowQuery.data ?? []` 渲染空列表
  - `apps/main/src/pages/data-management/master-detail/[id]/index.tsx:32` — `if (!draft) return null` 白屏
  - `apps/main/src/pages/plugins/management/index.tsx:30` — 无 loading 状态
- **影响**: 慢速网络下用户看到空页面或白屏，无任何反馈。网络失败时用户也看不到错误信息。
- **信心**: 确定

### N4. 完全缺少离线处理
- **文件**: 整个代码库
- **问题**: 零处 `navigator.onLine` 检查，零个 `online`/`offline` 事件监听器，无离线指示器，React Query 使用默认 `networkMode: 'online'`（无 UI 反馈）。
- **影响**: 用户离线时页面加载显示空状态或永久 spinner，无任何方式知道应用离线。
- **信心**: 确定

### N5. Mutation 缺少 onError，错误静默吞掉
- **文件**: 
  - `apps/main/src/pages/flow-editor/index.tsx:42-47` — `actionMutation` 无 `onError`
  - `apps/main/src/pages/data-management/master-detail/index.tsx:54-63` — `deleteMutation` 无 `onError`
- **影响**: 操作失败时用户零反馈。mutation 表面成功但数据已过期。
- **信心**: 确定

## 中严重度发现

### N6. 无组件创建 AbortController
- **文件**: 所有使用 fetch/HTTP client 的组件
- **问题**: HTTP client 接受 `signal?: AbortSignal`，但没有任何调用方创建 AbortController。卸载时正在进行的请求不被取消，浪费带宽和电量。
- **信心**: 确定

### N7. 手动 "active flag" 模式但不取消请求
- **文件**: 
  - `apps/main/src/pages/flow-editor/[id]/index.tsx:113-138`
  - `apps/main/src/flux/FluxRouteRenderer.tsx:40-63`
- **问题**: 使用 `active` flag 防止卸载后设置状态，但网络请求仍然完成。可能造成竞态条件。
- **信心**: 确定

### N8. Auth bootstrap 静默登出
- **文件**: `apps/main/src/hooks/useAuth.ts:38-48`
- **问题**: `fetchCurrentUser` 失败时静默调用 `logout()` 并重定向到登录页，无解释说明。
- **信心**: 确定

### N9. Token 刷新失败时丢弃原始 401 错误详情
- **文件**: `packages/shared/src/http/client.ts:164`
- **问题**: catch 块调用 `runtime.onUnauthorized?.()` 静默登出，原始 401 响应体丢弃。
- **信心**: 确定

## 总结
| 严重度 | 数量 | 关键领域 |
|--------|------|----------|
| 高 | 5 | 无超时/重试、原始 fetch 绕行、无 loading/error UI、无离线处理、mutation 错误吞掉 |
| 中 | 4 | 无 AbortController、active flag 半模式、静默登出、401 错误详情丢失 |
