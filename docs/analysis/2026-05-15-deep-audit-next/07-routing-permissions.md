# 维度 07：路由、权限与页面注册

## 第 1 轮（初审）

### [维度07-01] Extension `systemPages` 覆盖机制未接入实际路由渲染

- **文件**: `apps/main/src/router/AppRoutes.tsx:56-67,81-83`, `apps/main/src/router/RouteRenderer.tsx:59-61,130-132`
- **证据片段**:
  ```tsx
  // AppRoutes.tsx:56-67 — LoginPage 直接导入使用
  <Route path="/auth/login" element={<LoginPage />} />
  // RouteRenderer.tsx:59-61 — ForbiddenPage 直接导入
  if (!allowed) { return <ForbiddenPage />; }
  ```
- **严重程度**: P1
- **现状**: extension 声明 `systemPages: { login: 'custom-login' }` 时，`getSystemPageComponentId('login')` 返回正确，但 `AppRoutes.tsx` 和 `RouteRenderer.tsx` 直接使用硬编码组件，不走 `getSystemPage` 查找。
- **风险**: Extension 的系统页面覆盖声明在这些入口完全失效，extension 开发者无法预期地发现自定义登录页等不生效。
- **建议**: 将硬编码的 LoginPage/ForbiddenPage/ServerErrorPage/NotFoundPage 替换为 `getSystemPage('login') ?? LoginPage` 模式。

### [维度07-02] `dedupeRoutesByPath` 静默丢弃重复路径的路由条目

- **文件**: `apps/main/src/router/AppRoutes.tsx:15-28`
- **证据片段**:
  ```ts
  function dedupeRoutesByPath(items: ReturnType<typeof flattenMenus>) {
    const seenPaths = new Set<string>();
    return items.filter((item) => {
      const normalized = normalizePath(item.path);
      if (seenPaths.has(normalized)) { return false; }
      seenPaths.add(normalized);
      return true;
    });
  }
  ```
- **严重程度**: P2
- **现状**: 深度优先展平后 Set 去重仅保留第一个出现的路径。extension 添加的自定义菜单若路径冲突会被静默丢弃，无警告。
- **风险**: Extension 开发者添加的菜单被无声丢弃；跨包边界契约漂移。
- **建议**: 在丢弃分支增加 `console.warn`；考虑在 `mergeExtensionMenus` 层面检测路径冲突。

### [维度07-03] Tab Store 持久化导致跨会话"幽灵标签"

- **文件**: `apps/main/src/store/tabStore.ts:58-61`, `apps/main/src/router/AppShell.tsx:73-84`
- **证据片段**:
  ```ts
  // tabStore.ts — persist middleware
  persist({ name: 'tabs:v1', storage: createJSONStorage(() => localStorage) })
  // AppShell.tsx:73-84 — 不清理旧标签
  useEffect(() => {
    if (!currentMenu) { return; }
    registerTab({...});
  }, [currentMenu, location.pathname, registerTab]);
  ```
- **严重程度**: P2
- **现状**: 标签持久化在 localStorage，菜单配置跨 session 变更后旧标签指向不存在的路径，点击后渲染 NotFoundPage。
- **风险**: 后台配置频繁变更时高频出现，但不影响认证/权限安全。
- **建议**: 初始化时检查 tabs 中的路径是否仍在当前菜单扁平路径集合中，移除无效标签。

### [维度07-04] RouteRenderer 的插件分辨率回退路径无日志

- **文件**: `apps/main/src/router/RouteRenderer.tsx:31-39`
- **证据片段**:
  ```ts
  function resolvePluginManifest(item, plugins) {
    return plugins.find((plugin) => plugin.id === item.componentId) ??
           plugins.find((plugin) => plugin.id === item.id) ??
           plugins.find((plugin) => plugin.url === item.pluginUrl);
  }
  ```
- **严重程度**: P2
- **现状**: 三级 find 链，第一优先未匹配时静默回退，无日志说明降级原因。
- **风险**: 插件加载失败时难以区分"ID 不匹配"和"插件未注册"。
- **建议**: 在第一优先未匹配时增加 console.warn。

### [维度07-05] filterMenusByRoles 保留的有权限父节点在路由层产生可导航 403 路径

- **文件**: `packages/shared/src/utils/menu.ts:80-106`, `apps/main/src/router/RouteRenderer.tsx:59-61`
- **证据片段**:
  ```ts
  const selfAllowed = userRoles.some((role) => allowed.has(role));
  if (selfAllowed || hasVisibleChildren) {
    result.push({ ...item, children: filteredChildren });
  }
  ```
- **严重程度**: P2
- **现状**: 父节点因有可见子节点被保留即使自身角色不匹配，其 path 被注册为独立路由。RouteRenderer 二次检查返回 403，但路由入口存在。
- **风险**: 用户可在无导航上下文的 403 页面卡住；攻击者可确认受保护路径存在。
- **建议**: 考虑对"因子节点保留"的父节点不设置 path 可导航，或返回重定向而非 403。

### [维度07-06] registerBuiltinPages 无冲突告警

- **文件**: `apps/main/src/extensions/bootstrap.ts:101-103`, `apps/main/src/router/pageRegistry.tsx:54-56`
- **证据片段**:
  ```ts
  for (const page of pages) {
    contributedBuiltinPageRegistry[page.componentId] = page.component;  // 后者覆盖前者
  }
  ```
- **严重程度**: P3
- **现状**: 两个 extension 声明相同 componentId 时后者静默覆盖前者，无日志。
- **风险**: 多 extension 部署时页面覆盖不可见。
- **建议**: 在覆盖分支增加 console.warn。

### [维度07-07] mergeExtensionMenus 的 overrideMenus 模式不保留原始 home 路径

- **文件**: `packages/extension-host/src/runtime.ts:199-203`
- **证据片段**:
  ```ts
  if (extension.overrideMenus) {
    items = [...extMenus];
    home = extMenus[0]?.path ?? home;
    continue;
  }
  ```
- **严重程度**: P3
- **现状**: overrideMenus 时将 home 暴力设置为扩展菜单数组第一个路径，即使此路径并非设计为首页。
- **风险**: Extension 开发者若未正确排列 menus 顺序可能导致首页不正确。
- **建议**: 优先检查 extMenus 中是否有显式 `isHome` 标记的条目。
