# 对抗性审查 Round 04 — 全屏状态 Desync、ErrorBoundary 永久锁死、Tab Store 边界行为

**日期**: 2026-05-17
**发现来源视角**: 异常路径侦探（ErrorBoundary 恢复）、时序攻击者（全屏状态竞态）、组合爆炸测试者（Tab + 路由交叉）

---

## 发现 1：MEDIUM — 全屏状态在 `requestFullscreen` 失败后永久 desync

**在哪里**: `apps/main/src/router/AppShell.tsx:128-136`

**是什么**: `setWorkspaceFullscreen(true)` 在 `requestFullscreen()` Promise resolve 之前就被调用：

```typescript
setWorkspaceFullscreen(true);  // line 128: 乐观设置

if (document.fullscreenEnabled && typeof shellElement.requestFullscreen === 'function') {
  try {
    await shellElement.requestFullscreen();
  } catch {
    return;   // ← state 仍然是 true，没有任何纠正
  }
}
```

如果浏览器拒绝全屏请求（缺少用户手势、iframe 策略限制、浏览器全屏被禁用），catch 块静默返回，不纠正状态。`fullscreenchange` 事件监听器（lines 93-101）只在浏览器实际转换全屏状态时触发，`requestFullscreen` 失败不会触发事件。

此外，如果 `document.fullscreenEnabled` 为 `false`（line 129 的 guard 失败），状态也被设为 `true` 但没有全屏操作发生。

**为什么值得关心**: UI 显示全屏指示器（退出按钮、全屏样式），但窗口是正常大小。用户第一次按按钮"没反应"，第二次按才会重置为正常。这违反了最小惊讶原则。

**信心水平**: 确定

**修复**: 在 catch 中回滚状态：`setWorkspaceFullscreen(false)`。

---

## 发现 2：MEDIUM — ErrorBoundary 是永久错误陷阱，无恢复机制

**在哪里**: `packages/core/src/components/ErrorBoundary.tsx`

**是什么**: ErrorBoundary 通过 `getDerivedStateFromError` 捕获错误，但：

1. 没有 `resetErrorBoundary` 回调（对比 `react-error-boundary` 的标准模式）
2. 没有 `key` 重置策略
3. `hasError` 状态永远不会被重置为 `false`
4. 默认 fallback（line 41）直接显示原始 `error.message`（如 `"Cannot read properties of undefined (reading 'map')"`）

**调用位置**:
- `RouteRenderer.tsx:149` — 包裹所有路由内容。任何页面的渲染错误会锁定该路由直到用户导航到不同路由触发组件重新挂载。
- `PluginSlot.tsx:72` — 包裹插件组件。如果插件渲染时抛出异常，该 slot 永久锁定。

**为什么值得关心**: 用户在某个页面遇到一次性渲染错误（如瞬态数据异常导致 `.map()` 失败）后，即使数据已恢复，该页面仍显示错误画面。唯一的恢复方式是刷新整个页面。

**信心水平**: 确定

---

## 发现 3：LOW-MEDIUM — `closeTab` 对不存在的路径返回 `/dashboard`，导致意外导航

**在哪里**: `apps/main/src/store/tabStore.ts:35-49`

**是什么**: 当 `closeTab` 收到不匹配任何现有 tab 的路径时：

```typescript
closeTab: (path) => {
  let nextPath = homeTab.path;  // 默认 '/dashboard'
  set((state) => {
    const currentIndex = state.tabs.findIndex((item) => item.path === path);
    // currentIndex = -1 对不存在的路径
    const nextTabs = state.tabs.filter(...);  // 未过滤任何内容
    const candidate = nextTabs[currentIndex] ?? nextTabs[currentIndex - 1] ?? homeTab;
    // nextTabs[-1] = undefined, nextTabs[-2] = undefined, 落到 homeTab
    nextPath = candidate.path;  // '/dashboard'
    return { tabs: nextTabs, activePath: ... };
  });
  return nextPath;  // '/dashboard'
};
```

`useTabManagement.closeTab` 消费这个返回值并调用 `navigate(nextPath)`，导致意外导航到 Dashboard。

Store 状态本身不受影响（tabs 不变），但导航行为出乎意料。

**为什么值得关心**: 正常 UI 操作不会触发（TabsBar 只为现有 tab 显示关闭按钮），但任何程序化调用者或未来代码如果传入未验证的路径，会得到意外的导航行为。且 `tabStore.ts` **零测试覆盖**，这个边界行为完全未受保护。

**信心水平**: 确定

---

## 发现 4：INFO — Tab Store 零测试覆盖

**在哪里**: `apps/main/src/store/tabStore.ts`

**是什么**: 该文件没有对应的 `*.test.ts` 文件，也没有任何测试文件导入它。考虑到：
- persist middleware（localStorage 序列化）
- 基于索引的导航逻辑（`nextTabs[currentIndex]` 在过滤后数组上使用原始索引）
- 与路由系统的命令式同步

这是一个回归风险较高的无测试模块。

**信心水平**: 确定
