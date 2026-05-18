# 维度 07：路由、权限与页面注册

## 第 1 轮（初审）

### [维度07-01] 错误页面硬编码 /dashboard 而非使用动态 homePath

- **文件**: `apps/main/src/pages/errors/403.tsx:22`, `apps/main/src/pages/errors/404.tsx:22`, `apps/main/src/pages/errors/500.tsx:22`
- **证据片段**:
```tsx
// 403.tsx:22
<Button onClick={() => navigate('/dashboard')}>{t('common.backHome')}</Button>
// 404.tsx:22
<Button onClick={() => navigate('/dashboard')}>{t('common.backHome')}</Button>
// 500.tsx:22
<Button onClick={() => navigate('/dashboard')}>{t('common.backHome')}</Button>
```
- **严重程度**: P2
- **现状**: 三个错误页面的"返回首页"按钮硬编码跳转 `/dashboard`，未读取实际 `homePath`
- **风险**: extension 场景下首页非 /dashboard 时，用户从错误页返回到无效路径，可能触发 404 死循环
- **建议**: 通过 `useMenuConfigQuery` 获取实际 homePath，或从 store/context 读取
- **误报排除**: systemMenus.ts 的 fallback 链表明 homePath 是动态的
- **复核状态**: 未复核

---

### [维度07-02] closeAllTabs 硬编码 /dashboard 而非使用动态 homePath

- **文件**: `apps/main/src/hooks/useTabManagement.ts:36-39`
- **证据片段**:
```ts
closeAllTabs: () => {
  closeAll();
  navigate('/dashboard');
},
```
- **严重程度**: P2
- **现状**: `useTabManagement.closeAllTabs` 和 `tabStore.homeTab` 都硬编码 `/dashboard`
- **风险**: extension 覆盖首页路径后，关闭全部 tab 导航到错误页面
- **建议**: 从 `menuQuery.data?.home` 读取实际首页路径
- **误报排除**: 非误报。extension 场景下 home 可以是任意路径
- **复核状态**: 未复核

---

### [维度07-03] 系统页面路由未受权限守卫保护

- **严重程度**: P3（合理的设计选择——错误页面不应受权限限制）
- **复核状态**: 未复核

---

### [维度07-04] iframe 渲染缺少 sandbox 属性

- **文件**: `apps/main/src/router/RouteRenderer.tsx:109-114`
- **证据片段**:
```tsx
<iframe className="h-[calc(100vh-11rem)] w-full" src={item.frameSrc} title={title} />
```
- **严重程度**: P1
- **现状**: iframe 渲染时未设置 `sandbox` 属性
- **风险**: iframe 内容可执行顶层导航、访问同源 cookie、弹出窗口。frameSrc 指向外部域时是真实安全风险
- **建议**: 添加 `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` 等最小权限属性
- **误报排除**: 作为通用框架代码，缺少 sandbox 是结构性遗漏
- **复核状态**: 未复核

---

### [维度07-05] flattenMenus 包含父节点导致 dedupeRoutesByPath 丢弃子路由

- **文件**: `apps/main/src/router/AppRoutes.tsx:49-54` + `packages/shared/src/utils/menu.ts:27-38`
- **证据片段**:
```ts
// menu.ts — flattenMenus 先 push 父节点再 push 子节点
export function flattenMenus(items: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children?.length) {
      result.push(...flattenMenus(item.children));
    }
  }
  return result;
}

// AppRoutes.tsx — dedupeRoutesByPath 保留第一个
const items = dedupeRoutesByPath(
  flattenMenus(filterMenusByRoles(sortMenus(menuQuery.data?.items ?? []), user?.roles ?? [])),
);
```
- **严重程度**: P2
- **现状**: 父子共享路径时子路由被静默丢弃。当前碰巧正确（componentId 一致），但非结构性保证
- **风险**: 未来父子 componentId 不同时子路由静默丢失
- **建议**: `dedupeRoutesByPath` 应保留叶子节点而非第一个；或在 `flattenMenus` 阶段不包含有 children 的容器节点
- **误报排除**: 当前数据使父子 componentId 一致，但这是脆弱的隐性契约
- **复核状态**: 未复核

---

### [维度07-06] tabStore 持久化在登出后残留 stale tab 数据

- **文件**: `apps/main/src/store/tabStore.ts:58-62`
- **严重程度**: P3
- **建议**: authStore.logout 时同步清理 tabStore
- **误报排除**: 权限守卫保护了渲染，不会泄露内容
- **复核状态**: 未复核

---

### [维度07-07] AppShell currentMenu 查找使用过滤后菜单

- **严重程度**: 非问题（行为符合两层权限模型设计）
- **复核状态**: 未复核

---

### [维度07-08] registerBuiltinPages 无冲突检测

- **严重程度**: P3
- **建议**: 对覆盖系统关键页面打印 console.warn
- **复核状态**: 未复核

---

### [维度07-09] homePath 为 '/' 时的边缘行为

- **严重程度**: P3（仅在 API 完全失败时触发，且有 shellFallback 保护）
- **复核状态**: 未复核

---

### [维度07-10] 无 roles 父节点保留空子节点列表

- **严重程度**: P3
- **建议**: 可考虑隐藏所有子节点被过滤后的空菜单分组
- **复核状态**: 未复核
