# 维度 05：响应式订阅精度

## 第 1 轮（初审）

### [维度05-01] Plugin-bridge 窄 hooks 过宽订阅 BridgeSnapshot 全量

- **文件**: `packages/plugin-bridge/src/index.ts:134-156`
- **证据片段**:
  ```ts
  export function usePluginBridgeSnapshot(): BridgeSnapshot {
    return useSyncExternalStore(
      subscribeBridgeSnapshot, getPluginBridgeSnapshot, getPluginBridgeSnapshot,
    );
  }
  export function usePluginThemeConfig(): ThemeConfig {
    return usePluginBridgeSnapshot().themeConfig;
  }
  ```
- **严重程度**: P1
- **订阅位置**: `usePluginBridgeSnapshot()` 第 134 行；窄 hooks 第 142-156 行
- **订阅范围**: BridgeSnapshot 全量 { i18n, themeConfig, user, plugins } — 四个独立关注点
- **实际需要**: 每个窄 hook 仅需对应字段
- **重渲染频率**: 每次任一路径发生变化。用户切换插件开关时所有插件中的 usePluginUser() 和 usePluginThemeConfig() 消费者都会重渲染。
- **建议**: 每个窄 hook 使用独立的 useSyncExternalStore 调用，getSnapshot 仅返回所需字段。

### [维度05-02] App.tsx bridgeSnapshot → pluginBridge 级联重算

- **文件**: `apps/main/src/App.tsx:67-114`
- **证据片段**:
  ```tsx
  const bridgeSnapshot = useMemo(
    () => ({ i18n, themeConfig: pluginThemeConfig, user, plugins }),
    [pluginThemeConfig, plugins, user],
  );
  const pluginBridge = useMemo(
    () => ({ subscribe: ..., getSnapshot: () => bridgeSnapshot }),
    [bridgeSnapshot, bridgeStores, location.pathname, navigate, pluginThemeConfig, plugins, user],
  );
  useEffect(() => { setPluginBridge(pluginBridge); }, [pluginBridge]);
  ```
- **严重程度**: P1
- **订阅位置**: App.tsx bridge 聚合层
- **订阅范围**: bridgeSnapshot 在 pluginThemeConfig || plugins || user 变化时重建；pluginBridge 在 bridgeSnapshot 变化时重建；setPluginBridge 通知所有桥订阅者。
- **实际需要**: 每个桥订阅者只关心自己的 slice，但任何 store 变化都通知所有桥订阅者。
- **级联效应**: authStore → bridgeSnapshot → pluginBridge → setPluginBridge → 所有订阅者
- **重渲染频率**: 用户每次操作（主题切换、用户信息变更、插件开关）触发链式通知所有插件。
- **建议**: getSnapshot 使用 selector 机制；支持字段级订阅 subscribe(field, listener)。

### [维度05-03] App.tsx pluginBridge useMemo 依赖 location.pathname

- **文件**: `apps/main/src/App.tsx:77-109`
- **证据片段**:
  ```tsx
  const pluginBridge = useMemo(
    () => ({
      getCurrentPath: () => location.pathname,
      subscribe: ...,
      getSnapshot: () => bridgeSnapshot,
    }),
    [bridgeSnapshot, bridgeStores, location.pathname, navigate, pluginThemeConfig, plugins, user],
  );
  ```
- **严重程度**: P2
- **订阅位置**: App.tsx pluginBridge useMemo 依赖数组
- **订阅范围**: location.pathname 作为 useMemo 依赖
- **实际需要**: getCurrentPath 是函数，应在被调用时读取当前路径
- **重渲染频率**: 每次路由导航 → pluginBridge 重算 → setPluginBridge → 所有插件桥订阅者重渲染
- **建议**: getCurrentPath 改为调用 window.location.pathname，消除对 location state 的依赖。

### [维度05-04] useFlowHistory undo/redo 回调依赖于 history 数组

- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowHistory.ts:34-48`
- **证据片段**:
  ```ts
  const undo = useCallback((): FlowStateSnapshot | null => {
    if (historyIndexRef.current <= 0) return null;
    return history[historyIndexRef.current - 1] ?? null;
  }, [history]);
  ```
- **严重程度**: P2
- **订阅位置**: useFlowHistory undo/redo useCallback
- **订阅范围**: 整个 history 数组作为依赖
- **实际需要**: 只需通过 ref 读取最新 history 值
- **重渲染频率**: 每次编辑（创建新的 history 条目）undo/redo 回调重建 → handleUndo/handleRedo 重建 → 键盘事件监听器卸载+重新注册。
- **建议**: 使用 historyRef 模式替代闭包中的 history 数组。

### [维度05-05] useFlowKeyboardShortcuts useEffect 依赖过宽

- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowKeyboardShortcuts.ts:38-105`
- **证据片段**:
  ```ts
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { ... };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyState, clipboardNode, edges, handleRedo, handleUndo, nodes, selectedEdgeId, selectedNode, selectedNodeId, setClipboardNode, setSelectedNodeId, t]);
  ```
- **严重程度**: P2
- **订阅位置**: useFlowKeyboardShortcuts useEffect
- **订阅范围**: 11 个依赖项，包括每次编辑变化的 nodes/edges/handleUndo/handleRedo
- **实际需要**: 键盘监听器只绑定一次，通过 ref 读取最新值
- **重渲染频率**: 每次节点/边编辑 → keydown 监听器卸载并重新注册
- **建议**: 将 onKeyDown 中读取的值存储到 refs 中，效果依赖空数组 []。

### [维度05-06] FlowEditorPageInner 组件超 500 行

- **文件**: `apps/main/src/pages/flow-editor/[id]/index.tsx:1-569`
- **严重程度**: P3
- **订阅位置**: 组件体积
- **现状**: 全文件 569 行，超过 >500 行需评估拆分的门槛。包含 25+ useState、8 useCallback、5 useMemo、3 useEffect。
- **建议**: 将节点/边编辑操作提取为 useFlowEditing hook；将工具栏/检查器交互提取为子组件。

### [维度05-07] 全局无 React.memo 使用

- **文件**: 全仓库
- **严重程度**: P3
- **订阅位置**: 组件级别
- **现状**: 仓库中所有组件均为未记忆化的函数组件。在正确的 selector 和 useMemo 模式下不是问题。
- **建议**: 不强制添加 memo，但未来若发现特定子树性能问题应优先检查 context value 稳定性。
