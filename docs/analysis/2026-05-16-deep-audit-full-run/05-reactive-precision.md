# 维度 05：响应式订阅精度

## 第 1 轮（初审）

### [维度05-01] pluginBridge 在每次路由导航时完整重建并级联通知所有订阅者

- **文件**: `apps/main/src/App.tsx:77-115`
- **证据片段**:
  ```ts
  const pluginBridge = useMemo(
    () => ({
      getCurrentPath: () => location.pathname,  // ← 捕获了 location.pathname
      subscribe: (listener: () => void) => {
        const unsubscribeTheme = useThemeStore.subscribe(listener);
        const unsubscribeAuth = useAuthStore.subscribe(listener);
        const unsubscribePlugins = usePluginStore.subscribe(listener);
        // ...
      },
      getSnapshot: () => bridgeSnapshot,
    }),
    [bridgeSnapshot, bridgeStores, location.pathname, navigate, pluginThemeConfig],
  );
  ```
- **严重程度**: P1
- **订阅位置**: `App.tsx:77` 的 pluginBridge useMemo
- **订阅范围**: pluginBridge 的 useMemo 依赖中包含 `location.pathname`，每次路由导航重建整个 bridge 对象
- **实际需要**: `getCurrentPath()` 是命令式 getter，不需要作为响应式值参与 useMemo 依赖
- **重渲染频率**: 每次路由导航，所有通过 `usePluginBridge()` 订阅的组件重新渲染
- **建议**: 将 getCurrentPath 改为通过 ref 读取最新 pathname，移除 location.pathname 对 useMemo 的依赖
- **误报排除**: pluginBridge 是公开 API 核心对象，每次导航触发全量重建是可感知的性能退化
- **复核状态**: 未复核

### [维度05-02] usePluginNotifications 绕过 useSyncExternalStore 直接读取外部状态

- **文件**: `packages/plugin-bridge/src/index.ts:71-79`
- **证据片段**:
  ```ts
  export function usePluginNotifications(): PluginBridgeNotifications {
    return getPluginBridge()?.notifications ?? {
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
    };
  }
  ```
- **严重程度**: P2
- **订阅位置**: `packages/plugin-bridge/src/index.ts:71`
- **订阅范围**: 直接调用 `getPluginBridge()?.notifications` 读取外部全局状态，未通过 useSyncExternalStore 建立订阅
- **实际需要**: 应在 bridge 变化后返回真实的 notifications 对象
- **重渲染频率**: 永远不会因 bridge 变化而重渲染（无订阅）
- **建议**: 改为通过 usePluginBridge() 获取 bridge，再读取 notifications
- **误报排除**: 跨包公开 API 的契约问题，延迟初始化场景下会静默返回 fallback
- **复核状态**: 未复核

### [维度05-03] Bridge subscribe 回调非选择性通知——任一 store 变化触发全部消费者评估

- **文件**: `apps/main/src/App.tsx:93-107` + `packages/plugin-bridge/src/index.ts:22-24`
- **证据片段**:
  ```ts
  subscribe: (listener: () => void) => {
    const unsubscribeTheme = useThemeStore.subscribe(listener);
    const unsubscribeAuth = useAuthStore.subscribe(listener);
    const unsubscribePlugins = usePluginStore.subscribe(listener);
    // ...
  },
  ```
- **严重程度**: P2
- **订阅位置**: App.tsx subscribe 实现被 usePluginThemeConfig、usePluginUser、usePluginManifest、usePluginI18n 共用
- **订阅范围**: 所有细粒度 hook 共享同一个 subscribe，任一 store 变化触发全部 listener
- **实际需要**: usePluginThemeConfig 仅关心 theme；usePluginUser 仅关心 auth user
- **重渲染频率**: useSyncExternalStore 的引用比较挡住了大部分无效重渲染，但每次 store 变化都执行所有 subscriber 回调
- **建议**: 为每个数据域提供独立的 subscribe/getSnapshot 对
- **误报排除**: useSyncExternalStore 的引用比较确实挡住了大部分无效重渲染，但架构限制了未来精细化优化
- **复核状态**: 未复核

### [维度05-04] useEffect 依赖数组包含冗余的 bridgeSnapshot

- **文件**: `apps/main/src/App.tsx:113-115`
- **证据片段**:
  ```ts
  useEffect(() => {
    setPluginBridge(pluginBridge);
  }, [pluginBridge, bridgeSnapshot]);
  ```
- **严重程度**: P3
- **订阅位置**: App.tsx:115
- **订阅范围**: pluginBridge useMemo 依赖已包含 bridgeSnapshot
- **实际需要**: 仅依赖 pluginBridge 即可
- **重渲染频率**: 不增加执行次数（bridgeSnapshot 变化时 pluginBridge 也必然变化）
- **建议**: 移除 bridgeSnapshot 依赖
- **误报排除**: 冗余依赖违反 React hooks 最小依赖原则
- **复核状态**: 未复核

### [维度05-05] usePluginManifest 订阅全量快照仅查找单个插件

- **文件**: `packages/plugin-bridge/src/index.ts:58-65`
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
- **严重程度**: P3
- **订阅位置**: `packages/plugin-bridge/src/index.ts:59`
- **订阅范围**: 订阅完整 bridge 快照（i18n、themeConfig、user、plugins），仅使用 plugins 中的单个元素
- **实际需要**: 仅需特定 pluginId 的 PluginManifest
- **重渲染频率**: theme 或 user 变化导致快照引用变化时触发一次无效重渲染
- **建议**: 为 plugins 数据域提供独立 subscribe/getSnapshot
- **误报排除**: bridge 快照变化频率本身不高，影响面有限
- **复核状态**: 未复核

## 正面发现

1. Zustand selector 模式一致且精确：所有 store 消费者均使用窄 selector
2. React.lazy 全部在模块顶层
3. Context Provider value 均已 memo 化
4. useMemo/useCallback 无 void 返回值
5. Bug 32 和 Bug 34 修复已收敛
