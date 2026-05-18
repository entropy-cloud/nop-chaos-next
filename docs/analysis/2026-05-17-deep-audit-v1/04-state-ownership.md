# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] pluginStore 双持久化通道：Zustand persist 与 mockApi seed storage 各写各的

- **文件**: `apps/main/src/store/pluginStore.ts:12,30-32` + `apps/main/src/services/mockApi/plugins.ts:4,43-48`
- **证据片段**:
  ```ts
  // pluginStore.ts:12
  const initialPlugins = getPluginSeeds();
  
  // pluginStore.ts:29-32
  {
    name: 'plugins:v1',
    storage: createJSONStorage(() => localStorage),
  }
  
  // plugins.ts:4,43-48
  const pluginStorageKey = 'plugins:manifests:v1';
  
  export function getPluginSeeds(): PluginManifest[] {
    return readStoredJson(pluginStorageKey, seedPluginManifests);
  }
  export function persistPluginSeeds(value: PluginManifest[]) {
    writeStoredJson(pluginStorageKey, value);
  }
  ```
- **严重程度**: P2
- **现状**: pluginStore 的数据同时存在于两个 localStorage 键中。初始化时从 `'plugins:manifests:v1'` 读取种子（通过 `getPluginSeeds()`），之后 Zustand persist 向 `'plugins:v1'` 写入。两个 key 永远不会互相同步：Zustand persist 只知道 `'plugins:v1'`，而 `getPluginSeeds()` 只读 `'plugins:manifests:v1'`。
- **风险**: 首次加载后，Zustand persist 的 merge 策略会用 `'plugins:v1'` 中的旧数据覆盖初始种子。如果用户清除了 `'plugins:manifests:v1'` 但保留了 `'plugins:v1'`，则会使用过时的持久化数据。如果 `persistPluginSeeds()` 在未来被调用（目前仅测试中使用），它会写入 `'plugins:manifests:v1'`，但 Zustand store 不会感知到这个变更。两份数据表达同一件事（插件列表清单），但维护在不同的 localStorage 键中。
- **建议**: (1) 移除 `getPluginSeeds()` 对独立 localStorage key 的读取逻辑，改为直接使用 `seedPluginManifests` 常量作为 fallback。(2) 或者让 pluginStore 不使用 Zustand persist，改为统一使用 `readStoredJson`/`writeStoredJson`，在 `updatePlugin`/`setPlugins` action 中调用 `persistPluginSeeds`。(3) 保留单一写入通道，消除 `'plugins:manifests:v1'` 和 `'plugins:v1'` 的歧义。
- **双状态详情**: `localStorage['plugins:manifests:v1']`（mockApi 层 seed storage）与 `localStorage['plugins:v1']`（Zustand persist）各持一份数据。
- **同步失败症状**: 用户在插件管理页面修改配置后刷新页面，如果 Zustand persist 的 `'plugins:v1'` 未正确写入，会回退到 `'plugins:manifests:v1'` 中的旧数据，配置丢失。
- **误报排除**: 这不是缓存策略。两个独立的持久化通道写入不同的 key，没有任何代码保证它们一致。
- **复核状态**: 未复核

---

### [维度04-02] pluginStore 初始化在模块加载时执行 I/O，Zustand persist 的 hydrate 可能被覆盖

- **文件**: `apps/main/src/store/pluginStore.ts:12-17`
- **证据片段**:
  ```ts
  // pluginStore.ts:12
  const initialPlugins = getPluginSeeds(); // 模块加载时立即执行 readStoredJson
  
  // pluginStore.ts:14-17
  export const usePluginStore = create<PluginStore>()(
    persist(
      (set) => ({
        plugins: initialPlugins, // 用 I/O 结果作为默认值
        // ...
      }),
      {
        name: 'plugins:v1',
        storage: createJSONStorage(() => localStorage),
        // 注意：没有 partialize，也没有自定义 merge
      },
    ),
  );
  ```
- **严重程度**: P2
- **现状**: `getPluginSeeds()` 在模块顶层（import 时）同步执行 `readStoredJson`，从 localStorage 读取数据作为 `initialPlugins`。之后 Zustand persist 的 hydrate 机制会从 `'plugins:v1'` 读取并 merge。两个问题：(1) 模块加载时就做了 I/O；(2) `readStoredJson` 读取的 key 是 `'plugins:manifests:v1'`，而 Zustand hydrate 读的是 `'plugins:v1'`，hydrate 的结果会覆盖 `initialPlugins`。
- **风险**: 在 SSR 或测试环境中，模块加载时的 localStorage 访问可能失败。`initialPlugins` 的计算结果在 hydrate 之后被完全丢弃，造成无谓的 I/O。缺少显式 `partialize` 与其他 store 不一致。
- **建议**: (1) 将 `initialPlugins` 改为 `seedPluginManifests`（静态常量），不再在模块加载时做 I/O。(2) 添加 `partialize: (state) => ({ plugins: state.plugins })` 保持与其他 store 一致的策略。(3) 如果需要从 localStorage 初始化，让 Zustand persist 的 hydrate 机制负责。
- **双状态详情**: 模块加载时 `readStoredJson('plugins:manifests:v1')` 的结果 vs Zustand hydrate 从 `'plugins:v1'` 读取的结果。hydrate 后者覆盖前者。
- **同步失败症状**: 在 `'plugins:v1'` 有旧数据而 `'plugins:manifests:v1'` 有新种子数据的场景中，用户看到的永远是旧数据，种子数据更新无法生效。
- **误报排除**: 这不是合理的"用 seed fallback 再 hydrate 覆盖"策略。如果 hydrate 总是覆盖 seed，那 seed 的 I/O 是浪费。
- **复核状态**: 未复核

---

### [维度04-03] FluxRouteRenderer 的 resolvedSchemaPath 是 props-to-state 同步链

- **文件**: `apps/main/src/flux/FluxRouteRenderer.tsx:21,42-44,46-68`
- **证据片段**:
  ```ts
  // Line 21
  const [resolvedSchemaPath, setResolvedSchemaPath] = useState(schemaPath);
  const [schema, setSchema] = useState<FluxSchema | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Line 42-44
  const hasStaleState = shouldResetFluxState(resolvedSchemaPath, schemaPath);
  const visibleSchema = hasStaleState ? null : schema;
  const visibleError = hasStaleState ? null : error;
  
  // Line 46-68 (useEffect 中同步 props 到 state)
  useEffect(() => {
    const controller = new AbortController();
    void fetchFluxPage(schemaPath, controller.signal)
      .then((value) => {
        setResolvedSchemaPath(schemaPath);
        setSchema(value);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setResolvedSchemaPath(schemaPath);
        setSchema(null);
        setError(reason instanceof Error ? reason.message : t('flux.page.loadFailed'));
      });
    return () => { controller.abort(...) };
  }, [schemaPath, t]);
  ```
- **严重程度**: P3
- **现状**: `resolvedSchemaPath` 是一个 useState，它的值在 fetch 完成后才同步为 `schemaPath`（props）。在此之前，`hasStaleState` 检测到不一致并将 schema/error 置空。这本质上是一个"旧数据清空 + 新数据加载"的过渡机制，用 state 跟踪上一次成功 fetch 的 path。
- **风险**: 此模式虽然在此场景下功能正确，但引入了三个 state（`resolvedSchemaPath`、`schema`、`error`）来表达一个异步加载状态，可以用 `useReducer` 或 React Query 的 `queryKey` 更简洁地处理。
- **建议**: 当前实现在功能上是正确的（abort controller 保护了竞态），不建议立即重构。如果未来 Flux 路由数量增加或 schema 加载更复杂，考虑用 React Query 替代手动 fetch + useState 模式。
- **双状态详情**: `schemaPath`（prop / 路由参数）与 `resolvedSchemaPath`（state）表达"当前应该加载哪个 schema"和"已成功加载的 schema 路径"。
- **同步失败症状**: 在 schema 加载中切换路由，用户短暂看到 loading 状态后显示新内容。当前通过 hasStaleState 正确处理，不会有实际可见的故障。
- **误报排除**: 此模式虽然"不够优雅"，但功能正确且已处理了竞态。`resolvedSchemaPath` 承载了"上次成功加载的路径"这个语义，不完全等同于直接复制 props。
- **复核状态**: 未复核

---

### [维度04-04] pluginBridge.getSnapshot() 返回 useMemo 快照引用，传播链过长

- **文件**: `apps/main/src/App.tsx:65-73,106` + `packages/plugin-bridge/src/index.ts:42-48`
- **证据片段**:
  ```ts
  // App.tsx:65-73
  const bridgeSnapshot = useMemo(
    () => ({
      i18n,
      themeConfig: pluginThemeConfig,
      user,
      plugins,
    }),
    [pluginThemeConfig, plugins, user],
  );
  
  // App.tsx:106 (in pluginBridge useMemo)
  getSnapshot: () => bridgeSnapshot,
  
  // plugin-bridge/src/index.ts:42-48
  export function usePluginBridgeSnapshot(): BridgeSnapshot {
    return useSyncExternalStore(
      subscribeBridgeSnapshot,
      getPluginBridgeSnapshot,
      getPluginBridgeSnapshot,
    );
  }
  ```
- **严重程度**: P2
- **现状**: pluginBridge 的 snapshot 通过 useMemo 创建，传播链路为：Zustand store 变化 → App.tsx re-render → useMemo 重新计算 bridgeSnapshot → pluginBridge 重新计算 → setPluginBridge → 全局 listener → useSyncExternalStore 重新 getSnapshot。链条非常长，中间任何一环断裂都会导致 plugin 侧看到过时数据。
- **风险**: 当 `location.pathname` 变化但 store 数据不变时，`pluginBridge` 会因 `location.pathname` 依赖而重新创建，触发所有 plugin 的重新渲染。整个传播链条比直接 store subscribe + getSnapshot 更脆弱。
- **建议**: (1) 考虑让 `getSnapshot` 直接从 store 的 `getState()` 读取最新数据，而不是依赖 useMemo 缓存。(2) 或者将 bridge snapshot 的构建从 React 渲染周期中移出，改为在 store subscribe listener 中直接构建并缓存。(3) 在 `pluginBridge` 的 useMemo 依赖中移除 `location.pathname`。
- **双状态详情**: Zustand store（authStore/themeStore/pluginStore）中的数据 vs pluginBridge 的 `bridgeSnapshot` 中的同名数据。两者通过 React 渲染周期同步。
- **同步失败症状**: 在高频 store 更新场景下（例如快速切换主题），plugin iframe 中看到的 themeConfig 可能落后于 host shell 中的实际值一个渲染周期。
- **误报排除**: 这不是合理的"最终一致"缓存策略，因为 plugin 在 iframe 中运行，bridge 是它唯一的真相来源。
- **复核状态**: 未复核

---

### [维度04-05] useFlowEditorState 持有 15 个 useState，dirty 计算在每次渲染时执行 JSON.stringify

- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts:61-76,78-79`
- **证据片段**:
  ```ts
  // Line 61-76: 15 个 useState
  const [flowDocument, setFlowDocument] = useState<FlowDocument | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [edgePanelOpen, setEdgePanelOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [clipboardNode, setClipboardNode] = useState<FlowNode | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Line 78-79: 每次渲染都做 JSON.stringify
  const dirty = initialized && JSON.stringify({ nodes, edges }) !== savedSnapshot;
  ```
- **严重程度**: P2
- **现状**: `useFlowEditorState` 用 16 个 useState 管理整个 flow editor 的状态。其中 `dirty` 标志在每次渲染时通过 `JSON.stringify({ nodes, edges })` 计算并与 `savedSnapshot`（也是一个 JSON 字符串）比较。这意味着每次渲染都执行两次 `JSON.stringify`。
- **风险**: `JSON.stringify` 在 nodes/edges 较大时（例如 100+ 节点的流程图）会成为性能瓶颈，每次渲染都执行。16 个独立的 useState 导致 hook 的返回值接口庞大（FlowEditorState 有 30+ 个字段），增加使用者的认知负担。dirty 计算与 savedSnapshot 的"双状态"模式中字符串比较是 O(n) 操作。
- **建议**: (1) 将 `dirty` 计算优化为使用 ref 跟踪变更计数，或使用浅比较 key 字段而非全量 JSON.stringify。(2) 考虑使用 `useReducer` 替代多个 useState，将状态管理集中化。(3) 或者将 flow editor 的状态迁移到 Zustand store 中。
- **双状态详情**: `nodes`/`edges`（当前编辑中的节点和边）与 `savedSnapshot`（上次保存时的 JSON 字符串快照）。两者表达同一份数据在不同时间点的状态。
- **同步失败症状**: 无可见故障。dirty 判断在功能上是正确的。
- **误报排除**: dirty/savedSnapshot 模式是"编辑器中的脏检测"经典模式，在这个场景下是合理的。但 JSON.stringify 的性能问题和 16 个 useState 的可维护性问题是真实的维护成本。
- **复核状态**: 未复核

---

### [维度04-06] useMenuConfigQuery 在三处独立调用，缺少共享 selector 层

- **文件**: `apps/main/src/hooks/useMenuConfig.ts:6-15` + `apps/main/src/router/AppRoutes.tsx:48` + `apps/main/src/router/AppShell.tsx:62` + `apps/main/src/pages/auth/login/index.tsx:45`
- **证据片段**:
  ```ts
  // useMenuConfig.ts:6-15
  export function useMenuConfigQuery(enabled = true) {
    const userId = useAuthStore((state) => state.user?.id);
    const token = useAuthStore((state) => state.token);
    return useQuery<MenuResponse>({
      queryKey: ['menus', userId ?? 'anonymous', token ? 'token' : 'no-token'],
      queryFn: fetchMenuConfig,
      enabled,
      staleTime: 5 * 60 * 1000,
    });
  }
  
  // AppRoutes.tsx:48
  const menuQuery = useMenuConfigQuery(isAuthenticated && !bootstrapPending);
  
  // AppShell.tsx:62
  const menuQuery = useMenuConfigQuery();
  
  // login/index.tsx:45
  const menuQuery = useMenuConfigQuery(false);
  ```
- **严重程度**: P3
- **现状**: `useMenuConfigQuery` 在三处被调用（AppRoutes、AppShell、LoginPage）。由于 React Query 的 deduplication 机制（相同 queryKey 共享同一个请求），不会产生重复网络请求。
- **风险**: 三处独立调用没有通过统一的 context 或 hook 共享处理 menuQuery 的 loading/error 状态，导致每处各自处理 loading/error UI。
- **建议**: 当前设计在功能上正确，React Query 的 deduplication 保证了没有重复请求。如果未来需要在更多组件中使用菜单数据，考虑创建 `useMenuItems()` selector hook，统一处理 loading/error 逻辑。
- **双状态详情**: 无真正的双状态。React Query 缓存是唯一的数据源，三处调用共享同一份缓存。
- **同步失败症状**: 无。React Query 的 deduplication 和缓存机制保证了数据一致性。
- **误报排除**: 这不是问题，只是代码组织上的改进建议。
- **复核状态**: 未复核

---

### [维度04-07] bridge 的 subscribe 机制存在双重通知路径

- **文件**: `packages/plugin-bridge/src/index.ts:12-20` + `apps/main/src/App.tsx:91-104,111-113`
- **证据片段**:
  ```ts
  // plugin-bridge/src/index.ts:12-20
  function subscribeBridgeSnapshot(listener: () => void): () => void {
    const unsubscribeBridge = subscribePluginBridge(listener);
    const unsubscribeSnapshot = getPluginBridge()?.subscribe(listener) ?? (() => undefined);
    return () => { unsubscribeSnapshot(); unsubscribeBridge(); };
  }
  
  // App.tsx:91-104 (pluginBridge.subscribe)
  subscribe: (listener: () => void) => {
    const handleLanguageChange = () => listener();
    i18n.on?.('languageChanged', handleLanguageChange);
    const unsubscribeTheme = useThemeStore.subscribe(listener);
    const unsubscribeAuth = useAuthStore.subscribe(listener);
    const unsubscribePlugins = usePluginStore.subscribe(listener);
    return () => { ... };
  },
  
  // App.tsx:111-113
  useLayoutEffect(() => {
    setPluginBridge(pluginBridge);
  }, [pluginBridge, bridgeSnapshot]);
  ```
- **严重程度**: P2
- **现状**: 当 bridge 侧数据变化时，通知路径如下：
  1. **路径 A**: Zustand store 变化 → App.tsx re-render → useMemo 重新计算 pluginBridge → `setPluginBridge()` → `subscribePluginBridge` 的 listener 触发 → `useSyncExternalStore` 重新 getSnapshot。
  2. **路径 B**: Zustand store 变化 → `pluginBridge.subscribe` 中的 `useXxxStore.subscribe(listener)` → listener 触发 → `useSyncExternalStore` 重新 getSnapshot。
  路径 A 和路径 B 在同一次 store 变化中都会触发。这意味着一次 store 变化会触发两次 listener 通知。
- **风险**: 双重通知不会导致 UI 错误（`useSyncExternalStore` 的引用比较会去重），但会增加不必要的 listener 调用次数。如果 plugin 侧的 listener 执行昂贵操作，双重通知会导致短暂的性能抖动。
- **建议**: `subscribeBridgeSnapshot` 应该只订阅一条路径。推荐只保留 `subscribePluginBridge`（全局 bridge 替换通知），移除 `getPluginBridge()?.subscribe`，因为 store 变化已经通过 React re-render → `setPluginBridge` 路径传递。
- **双状态详情**: Zustand store 的状态 vs pluginBridge 的 snapshot。两者通过 React 渲染周期同步，同时又有直接 subscribe 路径。
- **同步失败症状**: 在极端高频更新场景下（例如快速连续切换主题多次），plugin 侧可能出现短暂的闪烁或多余的渲染。
- **误报排除**: 这不是"最终一致"的合理策略。双重通知路径是无意为之的设计。
- **复核状态**: 未复核

---

### [维度04-08] useAuthBootstrap 的 module-level flag 在 HMR 下不会重置

- **文件**: `apps/main/src/hooks/useAuth.ts:7-9,27-32`
- **证据片段**:
  ```ts
  // Line 7-9
  const authBootstrapState = {
    didBootstrapAuth: false,
  };
  
  // Line 27-32
  useEffect(() => {
    if (authBootstrapState.didBootstrapAuth) {
      return;
    }
    authBootstrapState.didBootstrapAuth = true;
    const bootstrap = async () => { ... };
    void bootstrap();
  }, []);
  ```
- **严重程度**: P3
- **现状**: `authBootstrapState.didBootstrapAuth` 是模块级别的标志，确保 bootstrap 只执行一次。在开发模式下，如果 `useAuth.ts` 被 HMR 热更新，模块会被重新执行，`authBootstrapState` 会被重新创建。
- **风险**: 在开发环境中，HMR 期间可能出现 bootstrap 重复执行（如果模块在 bootstrap 进行中被替换）。在生产环境中无影响（无 HMR）。
- **建议**: 考虑在 Zustand store 中维护 `didBootstrapAuth` 标志，而非用模块级变量。这样即使模块被 HMR 替换，store 状态也会被保留。
- **双状态详情**: 无双状态。这是关于 bootstrap 的幂等性保证，不涉及数据重复。
- **同步失败症状**: 在开发环境中，HMR 后可能出现多余的 `fetchCurrentUser` 请求。
- **误报排除**: 这不是"状态所有权"问题，但与"单一事实来源"相关——bootstrap 是否执行应该有单一的记录来源。
- **复核状态**: 未复核

---

### [维度04-09] master-detail 详情页 draft/savedState 与 React Query cache 构成三级数据链

- **文件**: `apps/main/src/pages/data-management/master-detail/[id]/index.tsx:37-42,58-86`
- **证据片段**:
  ```ts
  // Line 37-42
  const detailQuery = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => fetchOrderDetail(id),
  });
  const [draft, setDraft] = useState<OrderRecord | null>(null);
  const [savedState, setSavedState] = useState<OrderRecord | null>(null);
  
  // Line 58-86: useEffect 同步 React Query data → draft + savedState
  useEffect(() => {
    savedStateRef.current = savedState;
  }, [savedState]);
  
  useEffect(() => {
    if (!detailQuery.data) return;
    const next = normalizeOrder(detailQuery.data);
    // ...同步逻辑...
  }, [detailQuery.data]);
  ```
- **严重程度**: P2
- **现状**: 订单详情数据存在三个层级：(1) React Query cache (`detailQuery.data`)：从服务器获取的最新数据；(2) savedState（useState）："已确认保存"的版本；(3) draft（useState）：用户正在编辑的版本。同步链路为：React Query data → useEffect → savedState + draft。
- **风险**: 三级数据链增加了维护者的认知负担，任何一级的不同步都可能导致"保存后数据回退"或"脏检测误判"。如果 `detailQuery` 的 `staleTime` 过短导致自动 refetch，而用户正在编辑，useEffect 会重新执行同步逻辑。
- **建议**: (1) 当前实现是可工作的，但如果编辑场景变得更复杂，建议将 draft 管理抽离为独立的 hook 或 reducer。(2) 考虑将 `savedState` 合并到 draft 中（draft + baseSnapshot），减少一个状态层级。(3) 为 `detailQuery` 添加显式的 `staleTime`，避免编辑过程中自动 refetch 导致的冲突。
- **双状态详情**: React Query cache (`detailQuery.data`)、`savedState`（已保存的基线）、`draft`（编辑中的副本）共同表达同一份订单数据在三个时间点的状态。
- **同步失败症状**: 如果用户在编辑过程中触发了 detailQuery refetch（例如切换 tab 后回来），且 refetch 返回了旧缓存，dirty flag 可能被错误地清零。
- **误报排除**: 这不是简单的缓存策略。三级数据链中的每一级都有独立的语义。但在当前实现中，三级之间的同步通过一个 useEffect 完成，没有原子性保证。
- **复核状态**: 未复核

---

### [维度04-10] AI Workbench 页面用 12 个 useState 管理全部状态，无持久化，页面刷新丢失所有会话

- **文件**: `apps/main/src/pages/ai-workbench/index.tsx:29-42`
- **证据片段**:
  ```ts
  const [sessions, setSessions] = useState<WorkbenchSession[]>(seedWorkbenchSessions);
  const [activeSessionId, setActiveSessionId] = useState(seedWorkbenchSessions[0].id);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [contextEnabled, setContextEnabled] = useState(true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<AssistantOption['id']>(
    seedWorkbenchSessions[0].assistantId,
  );
  const [switchMode, setSwitchMode] = useState<'current' | 'new'>('current');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [historyLoadedIds, setHistoryLoadedIds] = useState<string[]>([]);
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  ```
- **严重程度**: P3
- **现状**: AI Workbench 页面的所有状态（会话列表、消息历史、搜索、流式状态等）都存储在组件级的 useState 中。页面刷新后所有会话和消息丢失。`sessions` 初始化为 `seedWorkbenchSessions`（硬编码种子数据）。AI Workbench 是唯一一个用纯 useState 管理核心业务数据的页面。
- **风险**: 用户在与 AI 助手的对话中刷新页面，所有对话历史丢失。12 个 useState 增加了组件的复杂度（396 行），未来维护成本高。与其他页面的数据管理模式不一致。
- **建议**: (1) 将 `sessions` 和 `activeSessionId` 迁移到 Zustand store（带 persist），或使用 React Query 管理会话数据。(2) 将 UI 状态保留为 useState。(3) 考虑使用 useReducer 替代多个 useState。
- **双状态详情**: 无双状态（只有一份，在 useState 中）。但这是"缺少持久化的状态"，而非"双状态"问题。
- **同步失败症状**: 页面刷新后用户看到种子数据，所有之前的对话消失。
- **误报排除**: 这可能是 MVP 阶段的有意设计（mock 阶段不需要持久化）。但作为审计发现，需要记录为技术债。
- **复核状态**: 未复核
