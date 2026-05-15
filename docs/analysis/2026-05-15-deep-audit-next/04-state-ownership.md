# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] PluginStore 双重持久化：Zustand persist + 手动 localStorage

- **文件**: `apps/main/src/store/pluginStore.ts:18-28` + `apps/main/src/services/mockApi/plugins.ts:43-48`
- **证据片段**:
  ```ts
  // pluginStore.ts:18-28
  setPlugins: (plugins) => {
    persistPluginSeeds(plugins);   // 手动写入 localStorage key "plugins:manifests:v1"
    set({ plugins });
  },
  ```
  ```ts
  // plugins.ts:43-52
  export function getPluginSeeds(): PluginManifest[] {
    return readStoredJson(pluginStorageKey, seedPluginManifests);
  }
  ```
  ```ts
  // pluginStore.ts:31-34
  persist({ name: 'plugins:v1', ... })
  ```
- **严重程度**: P1
- **现状**: 同一份 plugin manifest 数据通过 Zustand persist（key `plugins:v1`）和手动 `persistPluginSeeds()`（key `plugins:manifests:v1`）两条独立路径写入 localStorage。
- **风险**: 初始化时两个 key 数据不一致导致静默覆盖；`fetchPluginList()` 读取 `plugins:manifests:v1` 绕过 Zustand store。
- **建议**: 统一为单一持久化渠道：移除 Zustand persist 或移除手动 `persistPluginSeeds()`。
- **双状态详情**: Zustand store plugins 数组 ↔ localStorage key `plugins:manifests:v1`
- **同步失败症状**: 插件管理页面修改后刷新，部分修改丢失

### [维度04-02] PluginBridge 在每次路由导航时被重建，通知所有插件订阅者

- **文件**: `apps/main/src/App.tsx:77-110`
- **证据片段**:
  ```tsx
  const pluginBridge = useMemo(
    () => ({
      getCurrentPath: () => location.pathname,
      subscribe: (listener) => { ... },
      getSnapshot: () => bridgeSnapshot,
    }),
    [bridgeSnapshot, bridgeStores, location.pathname, navigate, pluginThemeConfig, plugins, user],
  );
  useEffect(() => { setPluginBridge(pluginBridge); }, [pluginBridge]);
  ```
- **严重程度**: P1
- **现状**: `pluginBridge` 的 `useMemo` 依赖包含 `location.pathname`，每次路由导航都重建 bridge 对象，触发所有订阅者。
- **风险**: 插件组件无论是否关心路由变化都收到通知；随插件数量增长成本线性上升。
- **建议**: 将 `getCurrentPath` 改为惰性读取当前 location，而非在创建 bridge 时捕获。
- **双状态详情**: 无（bridge 对象身份不稳定问题）
- **同步失败症状**: 插件组件在路由切换时闪烁或不必要重渲染

### [维度04-03] Master-Detail 详情页：React Query 数据经 useEffect 同步到本地 useState

- **文件**: `apps/main/src/pages/data-management/master-detail/[id]/index.tsx:52-61`
- **证据片段**:
  ```tsx
  useEffect(() => {
    if (!detailQuery.data) return;
    const next = normalizeOrder(detailQuery.data);
    setDraft(next);
    setSavedState(normalizeOrder(detailQuery.data));
  }, [detailQuery.data]);
  ```
- **严重程度**: P2
- **现状**: `detailQuery.data`（React Query 缓存）通过 useEffect 同步到本地 `draft` state。eslint-disable 注解承认风险。
- **风险**: React Query 自动 refetch 后静默覆盖用户编辑；`draft` 和 `detailQuery.data` 表达同一份数据。
- **建议**: 用 `useMemo` 从 `detailQuery.data` 派生，或收紧触发条件只在 `id` 变化时重置。
- **双状态详情**: `draft` (useState) ↔ `detailQuery.data` (React Query cache)
- **同步失败症状**: 用户正在编辑表单时被静默重置为服务端数据

### [维度04-04] Flow Editor 编辑页：fetched 数据经 useEffect 同步到本地 useState

- **文件**: `apps/main/src/pages/flow-editor/[id]/index.tsx:113-138`
- **证据片段**:
  ```tsx
  useEffect(() => {
    let active = true;
    void fetchFlowDetail(id).then((payload) => {
      if (!active) return;
      setFlowDocument(payload);
      setNodes(cloneNodes(normalizedNodes));
      setEdges(cloneEdges(normalizedEdges));
    });
    return () => { active = false; };
  }, [fitView, id, initializeHistory]);
  ```
- **严重程度**: P2
- **现状**: `fetchFlowDetail` 结果通过 useEffect 同步到 `flowDocument`、`nodes`、`edges` 等多个本地 state。
- **风险**: 页面参数 id 不变但重新请求时无条件重置所有编辑；`nodes`、`edges`、`flowDocument` 三份 state + `savedSnapshot` 表达同一份文档状态，冗余度极高。
- **建议**: 将核心文档状态统一为 useReducer，fetched 数据作为初始化 dispatch 来源。
- **双状态详情**: `flowDocument`+`nodes`+`edges` (3x useState) ↔ `fetchFlowDetail` 响应
- **同步失败症状**: 保存成功后获取新数据时本地编辑被重置

### [维度04-05] Extension `bootstrapExtensions()` 无重复调用防护

- **文件**: `apps/main/src/extensions/bootstrap.ts:145-172`
- **证据片段**:
  ```ts
  export async function bootstrapExtensions(): Promise<LoadedExtension[]> {
    registerHostSharedModules();
    const sources = getExtensionSources();
    // 没有 didBootstrap 防护...
    const loaded = await loadExtensions({ sources, context: { logger } });
    applyExtensionDefinitions(loaded);  // 重复调用会重复注册
    setLoadedExtensions(loaded);
    applyDocumentBranding(loaded);
  }
  ```
- **严重程度**: P2
- **现状**: bootstrapExtensions() 没有任何模块级标记或防重入机制，而 useAuthBootstrap() 有 didBootstrapAuth 防护。
- **风险**: 重复调用时 extensions 的 setup() 钩子被重复执行；applyExtensionDefinitions 会重复注册主题、语言、样式表和页面。
- **建议**: 在 bootstrapExtensions() 顶部添加 `let didBootstrap = false;` 检查并去重。
- **双状态详情**: 无（重复执行问题）
- **同步失败症状**: 组件注册逻辑多次执行，可能造成内存泄露、重复样式

### [维度04-06] `useShellConfig()` Hook 基于模块级可变状态，无响应订阅

- **文件**: `apps/main/src/hooks/useShellConfig.ts:1-5` + `packages/extension-host/src/runtime.ts:73-117`
- **证据片段**:
  ```ts
  // useShellConfig.ts
  export function useShellConfig() {
    return getShellRuntimeConfig();  // 静态快照，没有订阅
  }
  ```
  ```ts
  // runtime.ts
  let shellRuntimeConfig: ShellRuntimeConfig = defaultShellRuntimeConfig;
  export function setShellRuntimeConfig(config: ShellRuntimeConfig) {
    shellRuntimeConfig = { ... };  // 没有通知机制
  }
  ```
- **严重程度**: P3
- **现状**: `useShellConfig()` 直接调用 `getShellRuntimeConfig()` 返回模块级变量的浅拷贝快照，没有 `useSyncExternalStore` 或 `subscribe` 机制。
- **风险**: 当前只在启动时设置一次，不影响正确性；但未来若支持动态 extension 热加载，该 Hook 无法响应配置变化。
- **建议**: 如需动态更新能力，改用 Zustand store 承载或添加 `useSyncExternalStore`。
- **双状态详情**: 无（非响应性问题）
- **同步失败症状**: 目前无；未来动态 extension 加载后 UI 不会刷新

### [维度04-07] Plugin bridge snapshot 中 `user` 和 `plugins` 是快照引用

- **文件**: `apps/main/src/App.tsx:67-75`
- **证据片段**:
  ```tsx
  const bridgeSnapshot = useMemo(
    () => ({ i18n, themeConfig: pluginThemeConfig, user, plugins }),
    [pluginThemeConfig, plugins, user],
  );
  // getSnapshot: () => bridgeSnapshot,
  ```
- **严重程度**: P3
- **现状**: `getSnapshot` 返回 `useMemo` 产生的对象引用而非惰性读取。
- **风险**: React 冻结 `bridgeSnapshot` 更新时，`getSnapshot()` 返回过期快照。
- **建议**: 将 `getSnapshot` 改为惰性读取，从 store 实时获取。
- **双状态详情**: `bridgeSnapshot` memo 化快照 ↔ 实际 store 数据
- **同步失败症状**: 极罕见时序窗口中插件可能拿到过期的 user/plugins 数据
