# 维度 07：路由、权限与页面注册

## 第 1 轮（初审）

### [维度07-01] 权限守卫仅作用于 RouteRenderer 内部渲染，不阻止路由匹配

- **文件**: `apps/main/src/router/AppRoutes.tsx:92-99`
- **证据片段**:
  ```ts
  {menuQuery.isSuccess
    ? items.map((item) => (
        <Route
          key={item.id}
          path={normalizePath(item.path)}
          element={<RouteRenderer item={item} />}
        />
      ))
    : null}
  ```
- **严重程度**: P2
- **现状**: filterMenusByRoles 允许无权限父级在有权限子级时被保留，父级路由被注册但 RouteRenderer 内部 usePermissionGuard 返回 ForbiddenPage。
- **风险**: 用户通过 URL 直接访问受限父级路径时看到 403 页面而非被拒绝路由匹配。
- **建议**: 考虑在 ForbiddenPage 分支 Navigate 到安全页面，或在文档中明确这一行为。
- **误报排除**: 双层检查确保不渲染受限内容，只是路由层未做硬拦截。
- **复核状态**: 未复核

### [维度07-02] filterMenusByRoles 保留无权限父级导致菜单可见但页面不可达

- **文件**: `packages/shared/src/utils/menu.ts:80-107`
- **证据片段**:
  ```ts
  if (selfAllowed || hasVisibleChildren) {
    result.push({ ...item, children: filteredChildren });
  }
  ```
- **严重程度**: P2
- **现状**: 父级因 hasVisibleChildren 被保留，但其 roles 字段仍为受限角色。用户在侧边栏可见父级但点击看到 403。
- **风险**: 菜单可见性与页面可达性不一致。
- **建议**: 保留父级时清空其 roles 字段，或在 RouteRenderer 中对分组容器不做权限检查。
- **误报排除**: 测试仅验证了保留行为，未验证渲染时权限一致性。
- **复核状态**: 未复核

### [维度07-03] dedupeRoutesByPath 静默丢弃路径重复项，extension 路由可能被覆盖

- **文件**: `apps/main/src/router/AppRoutes.tsx:21-34`
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
- **严重程度**: P1
- **现状**: 去重逻辑仅按路径字符串去重，静默丢弃后出现的同路径路由。extension 菜单可能引入不同 id 但相同 path 的菜单，被静默丢弃。
- **风险**: extension 定义的同路径路由被 builtin 路由覆盖并丢弃，extension 功能不可达。
- **建议**: 路径重复时后者覆盖前者（Map 行为），或添加 console.warn。
- **误报排除**: systemMenus 的 mergeMenuItems 已做 id 级合并，但 extension 菜单追加时可能引入同路径不同 id。
- **复核状态**: 未复核

### [维度07-04] builtin pageType 未匹配 componentId 时显示 ServerErrorPage 语义不准确

- **文件**: `apps/main/src/router/RouteRenderer.tsx:132-134`
- **证据片段**:
  ```ts
  if (!Page) {
    return <ServerErrorPage />;
  }
  ```
- **严重程度**: P3
- **现状**: componentId 在 builtinPageRegistry 中找不到时显示 500 错误页面，实际是配置错误。
- **建议**: 改为专用 "Page Not Configured" 页面。
- **误报排除**: validateMenuResponse 不验证 componentId 是否在注册表中存在。
- **复核状态**: 未复核

### [维度07-05] 动态路由参数在 extension 覆盖场景下可能被去重逻辑误删

- **文件**: `apps/main/src/router/AppRoutes.tsx:17-19, 96`
- **严重程度**: P2
- **现状**: `:id` 动态路由在同路径去重时，extension 版本可能被 builtin 版本覆盖。
- **建议**: dedupeRoutesByPath 添加开发模式日志。
- **误报排除**: React Router v6 正确支持 `:param` 语法，注册本身无误。
- **复核状态**: 未复核

### [维度07-06] tabStore.activePath 与 location.pathname 在浏览器导航时不同步

- **文件**: `apps/main/src/store/tabStore.ts:27-33` + `apps/main/src/hooks/useTabManagement.ts:24-27`
- **证据片段**:
  ```ts
  // tabStore.ts
  openTab: (tab) => set((state) => ({
    activePath: tab.path,
    tabs: state.tabs.some((item) => item.path === tab.path) ? state.tabs : [...state.tabs, tab],
  })),
  setActivePath: (path) => set({ activePath: path }),
  ```
- **严重程度**: P2
- **现状**: AppShell 中 TabsBar 使用 location.pathname 作为 activePath，但 tabStore 内部 activePath 仅在 openTab/setActivePath 被调用时更新。浏览器后退时 tabStore.activePath 可能与 URL 不一致。
- **风险**: closeTab 时跳转目标可能不正确。
- **建议**: 在 AppShell 的 useEffect 中同步 tabStore.activePath。
- **误报排除**: TabsBar UI 层面正确（用 location.pathname），但 store 状态不一致是真实问题。
- **复核状态**: 未复核

### [维度07-07] closeTab 对 closable===false 的 tab 不做短路保护

- **文件**: `apps/main/src/store/tabStore.ts:35-49`
- **严重程度**: P3
- **现状**: closeTab 尝试关闭 closable: false 的 tab 时不会移除它但会计算 nextPath 并可能触发不必要导航。
- **建议**: 在 closeTab 开头检查 closable === false 则直接返回。
- **误报排除**: TabsBar 不为不可关闭 tab 显示关闭按钮，正常使用不会触发。
- **复核状态**: 未复核

### [维度07-08] menuApi 中 withAuth: false 但手动传递 token

- **文件**: `apps/main/src/services/menuApi.ts:16-28`
- **严重程度**: P3
- **现状**: withAuth: false + 手动 token 绕过了 ajaxFetch 的认证拦截器。
- **建议**: 使用 withAuth: true 或添加注释说明原因。
- **误报排除**: 可能是后端接口特殊要求，但缺少注释。
- **复核状态**: 未复核

### [维度07-09] extractRoles 将 permissions/permissionList 映射为 roles 语义不精确

- **文件**: `apps/main/src/services/menuMapper.ts:117-142`
- **严重程度**: P3
- **现状**: 为兼容旧版后端将 permissions 字段直接映射为 roles。
- **建议**: 在代码注释中说明映射策略。
- **误报排除**: 合理的兼容策略，但缺少文档。
- **复核状态**: 未复核

### [维度07-10] contributedBuiltinPageRegistry 无清理机制

- **文件**: `apps/main/src/router/pageRegistry.tsx:49-57`
- **严重程度**: P3
- **现状**: 模块级变量 registerBuiltinPages 只做追加/覆盖，HMR 场景下移除的页面注册仍残留。
- **建议**: 提供 clearContributedBuiltinPages 或 unregisterBuiltinPage 函数。
- **误报排除**: 仅影响开发环境 HMR。
- **复核状态**: 未复核
