# 维度 05：响应式订阅精度

## 第 1 轮（初审）

## 检查范围
- 已阅读：
  - `C:\can\nop\nop-chaos-next\docs\index.md`
  - `C:\can\nop\nop-chaos-next\AGENTS.md`
  - `C:\can\nop\nop-chaos-next\docs\design\plugin-system.md`
  - `C:\can\nop\nop-chaos-next\docs\bugs\32-plugin-bridge-unstable-snapshot-loop.md`
- 已初审代码范围：
  - `C:\can\nop\nop-chaos-next\apps\main\src\**\*.{ts,tsx}`
  - `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\**\*.{ts,tsx}`
  - `C:\can\nop\nop-chaos-next\packages\core\src\**\*.{ts,tsx}`
  - `C:\can\nop\nop-chaos-next\flux-lib\ui\src\**\*.{ts,tsx}`

### [维度05-01] `useAuth()` 将多个认证切片打包，导致消费者普遍过宽订阅
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\hooks\useAuth.ts:11-19`
- **证据片段**:
```ts
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const bootstrapStatus = useAuthStore((state) => state.bootstrapStatus);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  return { user, isAuthenticated, token, bootstrapStatus, login, logout };
}
```
- **严重程度**: P2
- **订阅位置**: `AppRoutes.tsx`、`RouteRenderer.tsx`、`AppShell.tsx`、`pages/auth/login/index.tsx`、`components/layout/SidebarUserMenu.tsx`、`components/layout/UserMenu.tsx`
- **订阅范围**: `user`、`isAuthenticated`、`token`、`bootstrapStatus`、`login`、`logout`
- **实际需要**: 多数消费者只需其中 1-3 项；例如 `RouteRenderer`/`UserMenu` 只需要 `user`，`LoginPage` 只需要 `login`
- **重渲染频率**: 任一认证态变化时都会波及所有 `useAuth()` 消费者，包括 bootstrap、token 变化、登录/登出后的整轮更新
- **建议**: 拆成细粒度 hook（如 `useAuthUser()`、`useAuthSession()`、`useAuthActions()`），或让调用方直接按需使用 `useAuthStore(selector)`
- **误报排除**: 问题不在“返回对象是否 memo”，而在 hook 内部已经建立了多路订阅；即使调用方只解构 `user`，仍会被 `token/bootstrapStatus` 更新带动重渲染
- **复核状态**: `未复核`

### [维度05-02] `RouteRenderer` 在所有路由类型上订阅整份插件列表
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\router\RouteRenderer.tsx:49-55`
- **证据片段**:
```ts
export function RouteRenderer({ item }: RouteRendererProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const plugins = usePluginStore((state) => state.plugins);
  const allowed = usePermissionGuard(user?.roles ?? [], item.roles);
  const title = item.title ?? t('common.loading');
  const Page = useMemo(() => getBuiltinPage(item.componentId), [item.componentId]);
```
- **严重程度**: P2
- **订阅位置**: `C:\can\nop\nop-chaos-next\apps\main\src\router\RouteRenderer.tsx`
- **订阅范围**: 整个 `plugins` 数组；且订阅发生在组件顶部，对 builtin/amis/flux/iframe/external 路由同样生效
- **实际需要**: 仅在 `item.pageType === 'plugin'` 时读取与当前 `item` 匹配的单个 manifest / `enabled` 状态
- **重渲染频率**: 任意插件启停、配置更新、列表替换时，当前激活路由的 `RouteRenderer` 都会重渲染，即使当前页面不是插件页
- **建议**: 将插件解析逻辑下沉到插件专用子组件；或使用精确 selector，仅订阅当前路由需要的目标 manifest
- **误报排除**: 这里不是“插件页本来就依赖插件状态”的正常更新；问题是非插件页也被同一个 store 订阅牵连
- **复核状态**: `未复核`

### [维度05-03] `usePluginManifest()` 订阅整份 bridge snapshot，受主题/用户/i18n 变化牵连
- **文件**: `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\index.ts:57-64`
- **证据片段**:
```ts
export function usePluginManifest(pluginId: string): PluginManifest | undefined {
  const snapshot = useSyncExternalStore(
    subscribeBridgeStore,
    getPluginBridgeSnapshot,
    getPluginBridgeSnapshot,
  );
  return snapshot.plugins.find((plugin) => plugin.id === pluginId);
}
```
- **严重程度**: P2
- **订阅位置**: `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\index.ts` 的 `usePluginManifest(pluginId)`
- **订阅范围**: 整个 `BridgeSnapshot`（`i18n`、`themeConfig`、`user`、`plugins`）
- **实际需要**: 仅当前 `pluginId` 对应的 manifest
- **重渲染频率**: 任意 bridge 扇出更新都会触发，包括语言切换、主题变化、用户变化，即使目标 plugin manifest 完全未变
- **建议**: 为 manifest 提供专用 `getSnapshot/subscribe`，或在 bridge 层做按 `pluginId` 的稳定 selector/cache，避免每次先取整份 snapshot 再 `find`
- **误报排除**: `docs/bugs/32-...` 已明确强调 `useSyncExternalStore` 快照稳定性；本项虽非无限循环，但仍属于“外部存储订阅粒度过粗”，会把无关 bridge 更新扩散到 manifest 消费者
- **复核状态**: `未复核`

### [维度05-04] Flow 编辑器 Context value 受整份 `state` 依赖污染，导致 `editorActions` 每次渲染都换引用
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\pages\flow-editor\[id]\useFlowEditorActions.ts:125-139`
- **证据片段**:
```ts
const editorActions = useMemo<FlowEditorActions>(
  () => ({
    hoveredNodeId,
    hoveredEdgeId,
    openNodeEditor,
    openEdgeEditor,
    duplicateNode,
    requestDelete,
    selectNode: setSelectedNodeId,
    ...
    setHoveredNode: state.setHoveredNodeId,
    setHoveredEdge: state.setHoveredEdgeId,
  }),
  [duplicateNode, hoveredEdgeId, hoveredNodeId, openEdgeEditor, openNodeEditor, requestDelete, setSelectedEdgeId, setSelectedNodeId, state],
);
```
- **严重程度**: P1
- **订阅位置**: `FlowEditorActionsContext.Provider value={actions.editorActions}`，下游消费者见 `FlowNodeCard.tsx`、`FlowEdgeRenderer.tsx`
- **订阅范围**: 实际上被扩展到整份 `state`；只要 `useFlowEditorState()` 返回的新对象变化，`editorActions` 就会换引用
- **实际需要**: 仅 `hoveredNodeId`、`hoveredEdgeId`、少量稳定 setter / callback
- **重渲染频率**: Flow 编辑器内任意节点、边、选中态、面板开关等状态更新时，都可能导致 Context value 变化，进而牵连所有动作消费者重渲染
- **建议**: 不要把整份 `state` 放进 `useMemo` 依赖；先解构出稳定 setter（如 `setHoveredNodeId`/`setHoveredEdgeId`），必要时拆分为 hover context 与 command context
- **误报排除**: 这里已有 `useMemo`，但它被 `state` 这个“每次 render 都变的新对象”破坏；因此不是“已经 memo 过所以没问题”
- **复核状态**: `未复核`

### [维度05-05] `useTabManagement()` 额外订阅 `activePath`，但当前宿主调用方并未使用
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\hooks\useTabManagement.ts:9-18`
- **证据片段**:
```ts
const tabs = useTabStore((state) => state.tabs);
const activePath = useTabStore((state) => state.activePath);
const open = useTabStore((state) => state.openTab);
const activate = useTabStore((state) => state.setActivePath);
const close = useTabStore((state) => state.closeTab);
const closeOthers = useTabStore((state) => state.closeOtherTabs);
const closeAll = useTabStore((state) => state.closeAllTabs);

return useMemo(
  () => ({
```
- **严重程度**: P3
- **订阅位置**: `C:\can\nop\nop-chaos-next\apps\main\src\router\AppShell.tsx:62` 的 `const tabs = useTabManagement();`
- **订阅范围**: `tabs`、`activePath`、所有 tab action
- **实际需要**: `AppShell` 当前只消费 `tabs.tabs` 和若干 action；`activePath` 由 `location.pathname` 直接传给 `TabsBar`
- **重渲染频率**: 每次 active tab/path 同步时，即使 tab 列表和 action 没变，也会让 `useTabManagement()` 返回对象重新计算
- **建议**: 从该 hook 中移除未使用的 `activePath` 订阅，或拆成 `useTabsList()` / `useTabActions()`
- **误报排除**: 不是“activePath 总会跟着路由变化所以无所谓”；当前调用方已经直接使用 `location.pathname`，这条 store 订阅在宿主壳层是重复的
- **复核状态**: `未复核`

## 深挖第 2 轮追加

### [维度05-06] `usePluginNotifications()` 订阅整条 bridge 更新链，导致仅需通知能力的插件消费者被主题/用户/插件变化牵连
- **文件**: `packages/plugin-bridge/src/index.ts:70-75`；`apps/main/src/App.tsx:83-116`
- **证据片段**:
```ts
return useSyncExternalStore(
  subscribeBridgeStore,
  () => getPluginBridge()?.notifications ?? FALLBACK_NOTIFICATIONS,
  () => getPluginBridge()?.notifications ?? FALLBACK_NOTIFICATIONS,
);
const pluginBridge = useMemo(() => ({
  notifications: { success: (message: string) => toast.success(message), error: (message: string) => toast.error(message), info: (message: string) => toast(message) },
  getSnapshot: () => bridgeSnapshot,
}), [bridgeSnapshot, bridgeStores, pluginThemeConfig]);
```
- **严重程度**: P2
- **订阅位置**: `examples/plugin-demo/src/index.tsx:17`、`examples/extension-demo/src/pages/ExtensionLoginPage.tsx:38`
- **订阅范围**: `subscribeBridgeStore` 驱动的整条 bridge 变更流；实际返回的是 `notifications`，但其引用会随 host 侧 `pluginBridge` 重建而变化
- **实际需要**: 稳定的 `success/error/info` 通知函数引用，而不是随 `themeConfig/user/plugins/i18n` 更新一起刷新的 bridge 派生对象
- **重渲染频率**: 主题切换、用户变化、插件列表变化、语言变化等任一 bridge 更新时，所有 `usePluginNotifications()` 消费者都会重渲染
- **建议**: 将 `notifications` 提升为稳定引用，或为通知能力提供不依赖整份 bridge 更新流的专用 getter / hook
- **误报排除**: 通知能力本身不依赖 `bridgeSnapshot`，但当前实现把它错误地绑在整条 bridge 变更链上
- **复核状态**: `未复核`

### [维度05-07] `AppShell` 的 tab 注册 effect 依赖 `currentMenu` 对象，语言切换会触发无意义的 tab store 写入
- **文件**: `apps/main/src/router/AppShell.tsx:66-88`；`apps/main/src/store/tabStore.ts:30-37`
- **证据片段**:
```ts
useEffect(() => {
  if (!currentMenu) return;
  registerTab({ path: location.pathname, title: currentMenu.title ?? currentMenu.id, icon: currentMenu.icon, closable: location.pathname !== getCurrentHomePath() });
}, [currentMenu, location.pathname, registerTab]);

openTab: (tab) =>
  set((state) => ({
    activePath: tab.path,
    tabs: state.tabs.some((item) => item.path === tab.path) ? state.tabs : [...state.tabs, tab],
  })),
```
- **严重程度**: P2
- **订阅位置**: `apps/main/src/router/AppShell.tsx:62` 的 `const tabs = useTabManagement();`，以及下游 `TabsBar`
- **订阅范围**: `currentMenu` 对象引用变化会触发 `registerTab()`；`openTab()` 又会写入 `activePath/tabs` store，即使目标 tab 已存在
- **实际需要**: 仅在路由路径或 tab 元数据真正变化时注册/更新 tab，而不是随着 `t()` 本地化重算出的 `currentMenu` 对象变化重复写 store
- **重渲染频率**: 语言切换、菜单本地化重算、菜单树对象重建时都会触发一次额外 tab store 写入，并波及 `useTabManagement()`/`TabsBar` 订阅者
- **建议**: effect 仅依赖稳定原语；同时在 `openTab()` 中对“tab 已存在且 activePath 未变”场景直接跳过 `set`
- **误报排除**: 当前 `openTab()` 在 tab 已存在时仍会执行 store 写入，造成一次额外广播，属于可避免的响应式噪音
- **复核状态**: `未复核`

## 维度复核结论

- [维度05-01]: 保留 (P2)。`useAuth()` 仍同时订阅多个认证切片，而多数调用方只需其子集。
- [维度05-02]: 保留 (P2)。`RouteRenderer` 仍对所有路由类型无条件订阅整份 `plugins`。
- [维度05-03]: 降级 (P3)。`usePluginManifest()` 仍订阅整份 `BridgeSnapshot`，但语言切换等影响范围较初审表述更窄。
- [维度05-04]: 保留 (P1)。`useFlowEditorActions.ts` 的 `editorActions` 依赖整个 `state`，Context value 持续换引用。
- [维度05-05]: 保留 (P3)。`useTabManagement()` 仍额外订阅未被宿主使用的 `activePath`。
- [维度05-06]: 降级 (P3)。`usePluginNotifications()` 仍绑定整条 bridge 订阅链，但影响面比初审更小。
- [维度05-07]: 驳回。语言切换触发 tab 标题同步本身有业务意义，不足以单列为缺陷。

## 子项复核结论

- [维度05-04]: 子项复核通过。`editorActions` 仍依赖整份 `state`，导致 `FlowEditorActionsContext` value 持续换引用并扩散重渲染。
