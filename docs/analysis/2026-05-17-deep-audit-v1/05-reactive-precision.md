# 维度 05：响应式订阅精度

## 第 1 轮（初审）

### [维度05-01] App.tsx 对 pluginStore 整个 plugins 数组做顶层订阅，但实际只桥接到 bridge

- **文件**: `apps/main/src/App.tsx:20`
- **证据片段**:
```typescript
19:   const themeConfig = useThemeStore((state) => state.themeConfig);
20:   const plugins = usePluginStore((state) => state.plugins);
21:   const user = useAuthStore((state) => state.user);
```
- **严重程度**: 非问题（selector 已精确到单字段）
- **订阅位置**: `App()` 组件第 19-21 行
- **订阅范围**: 分别订阅 `themeConfig`、`plugins`、`user` 三个独立的 store slice
- **实际需要**: 构建 bridgeSnapshot 和 pluginBridge 的合法依赖
- **重渲染频率**: plugins 变化时 App 重渲染，但 App 只返回 `<AppRoutes />`，影响可控
- **建议**: 不需要改动
- **误报排除**: selector 已是单字段级别，非整个 store 解构
- **复核状态**: 未复核

---

### [维度05-02] pluginBridge 对象依赖 location.pathname 导致每次路由变化都重建整个 bridge

- **文件**: `apps/main/src/App.tsx:75-113`
- **证据片段**:
```typescript
75:   const pluginBridge = useMemo(
76:     () => ({
77:       i18n,
78:       notifications: { ... },
79:       navigate: (to, options) => navigate(to, options),
80:       stores: bridgeStores,
81:       getCurrentUser: () => useAuthStore.getState().user,
82:       getCurrentPath: () => location.pathname,
83:       getThemeConfig: () => pluginThemeConfig,
...
106:       getSnapshot: () => bridgeSnapshot,
107:     }),
108:     [bridgeSnapshot, bridgeStores, location.pathname, navigate, pluginThemeConfig],
109:   );
```
- **严重程度**: P1
- **订阅位置**: `App()` 组件第 75-113 行
- **订阅范围**: `pluginBridge` 的 useMemo 依赖了 `location.pathname`
- **实际需要**: `getCurrentPath` 只是 getter，被调用时才读取
- **重渲染频率**: 每次路由切换都重建 bridge → `setPluginBridge` → 级联通知所有插件消费者重渲染
- **建议**: 将 `getCurrentPath: () => location.pathname` 改为 `getCurrentPath: () => window.location.pathname`，将 location 从 useMemo 依赖中移除
- **误报排除**: `useLayoutEffect` 每次都调用 `setPluginBridge`，级联重渲染是真实的结构性问题
- **复核状态**: 未复核

---

### [维度05-03] bridgeSnapshot 包含 plugins 数组引用，plugins 任意变更触发全量 snapshot 更新

- **文件**: `apps/main/src/App.tsx:65-73`
- **证据片段**:
```typescript
65:   const bridgeSnapshot = useMemo(
66:     () => ({
67:       i18n,
68:       themeConfig: pluginThemeConfig,
69:       user,
70:       plugins,
71:     }),
72:     [pluginThemeConfig, plugins, user],
73:   );
```
- **严重程度**: P2
- **订阅位置**: `App()` 组件第 65-73 行
- **订阅范围**: 整个 `plugins` 数组作为值包含
- **实际需要**: 插件消费者只需查找特定 plugin
- **重渲染频率**: 任意 plugin 属性变化时所有 bridge 消费者重渲染
- **建议**: 当前 plugins 数量有限，影响可控。如未来增长可拆分独立 subscribe/getSnapshot
- **误报排除**: bridge 粗粒度 snapshot 是有意设计，且 plugins 变更频率极低
- **复核状态**: 未复核

---

### [维度05-04] usePluginNotifications 不使用 useSyncExternalStore，不响应 bridge 变化

- **文件**: `packages/plugin-bridge/src/index.ts:71-79`
- **证据片段**:
```typescript
71: export function usePluginNotifications(): PluginBridgeNotifications {
72:   return (
73:     getPluginBridge()?.notifications ?? {
74:       success: () => undefined,
75:       error: () => undefined,
76:       info: () => undefined,
77:     }
78:   );
79: }
```
- **严重程度**: P1
- **订阅位置**: `usePluginNotifications()` hook 定义
- **订阅范围**: 完全没有订阅，直接同步读取 globalThis 上的 bridge
- **实际需要**: 插件组件需要响应 bridge 注入
- **重渲染频率**: 永远不会因 bridge 注入而重渲染
- **建议**: 改为 `useSyncExternalStore(subscribePluginBridge, getNotifications, getNotifications)` 确保响应 bridge 变化
- **误报排除**: 实际时序上 bridge 大概率已注入，但从契约完整性看行为与其他 bridge hooks 不一致
- **复核状态**: 未复核

---

### [维度05-05] usePluginManifest 每次 getSnapshot 都执行 .find()，subscribe 粒度过粗

- **文件**: `packages/plugin-bridge/src/index.ts:58-65`
- **证据片段**:
```typescript
58: export function usePluginManifest(pluginId: string): PluginManifest | undefined {
59:   const snapshot = useSyncExternalStore(
60:     subscribeBridgeStore,
61:     getPluginBridgeSnapshot,
62:     getPluginBridgeSnapshot,
63:   );
64:   return snapshot.plugins.find((plugin) => plugin.id === pluginId);
65: }
```
- **严重程度**: P2
- **订阅位置**: `usePluginManifest` hook
- **订阅范围**: 订阅整个 bridge store，然后 `.find()` 特定 plugin
- **实际需要**: 只需要特定 pluginId 对应的单个 PluginManifest
- **重渲染频率**: 每次 bridge store 任何状态变化都触发重渲染
- **建议**: 当前 plugins 数量极少且 `.find()` 返回原引用，Object.is 可拦截。未来增长时再优化
- **误报排除**: `.find()` 返回数组中的原始引用，不是新对象
- **复核状态**: 未复核

---

### [维度05-06] FlowEditorActionsContext.Provider 的 value 包含高频 hover 值

- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowEditorActions.ts:125-138`
- **证据片段**:
```typescript
125:   const editorActions = useMemo<FlowEditorActions>(
126:     () => ({
127:       hoveredNodeId,
128:       hoveredEdgeId,
129:       openNodeEditor,
130:       openEdgeEditor,
131:       duplicateNode,
132:       requestDelete,
133:       selectNode: setSelectedNodeId,
134:       selectEdge: setSelectedEdgeId,
135:       setHoveredNode: state.setHoveredNodeId,
136:       setHoveredEdge: state.setHoveredEdgeId,
137:     }),
138:     [duplicateNode, hoveredEdgeId, hoveredNodeId, openEdgeEditor, openNodeEditor, requestDelete, setSelectedEdgeId, setSelectedNodeId, state],
139:   );
```
- **严重程度**: P2
- **订阅位置**: FlowEditorPageInner Provider
- **订阅范围**: Context value 包含 `hoveredNodeId` 和 `hoveredEdgeId`
- **实际需要**: 子组件（FlowNodeCard 等）需要访问 hover 状态
- **重渲染频率**: 每次鼠标 hover 节点/边时所有 Context 消费者重渲染
- **建议**: 将高频 hover 值从 Context 拆分到独立 state 或 zustand
- **误报排除**: FlowNodeCard 数量 10-50 个，hover 频率极高，是实际性能问题
- **复核状态**: 未复核

---

### [维度05-07] useFlowEditorActions 的 editorActions useMemo 依赖了整个 state 对象

- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowEditorActions.ts:138`
- **证据片段**: (同 05-06)
- **严重程度**: P2
- **订阅位置**: `useFlowEditorActions()` hook 第 125-139 行
- **订阅范围**: useMemo 依赖包含 `state`（整个 FlowEditorState）
- **实际需要**: 只需要 `state.setHoveredNodeId` 和 `state.setHoveredEdgeId`
- **重渲染频率**: `state` 对象每次渲染都变，useMemo 完全失效
- **建议**: 将 `state` 从依赖中移除，只依赖 setter（useState setter 引用稳定）
- **误报排除**: `state` 包含 nodes/edges 等高频变化值，导致 useMemo 无效
- **复核状态**: 未复核

---

### [维度05-08] useFlowEditorState 返回值未经 memo，每次创建新对象

- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts:181-220`
- **证据片段**:
```typescript
181:   return {
182:     flowDocument,
183:     nodes,
184:     edges,
...
220:   };
```
- **严重程度**: P2
- **订阅位置**: `useFlowEditorState()` hook 返回值
- **订阅范围**: 包含 30+ 字段的对象字面量，每次新引用
- **实际需要**: 调用方通过解构取值
- **重渲染频率**: 返回值引用不稳定，配合 05-07 形成连锁问题
- **建议**: 修复 05-07（不依赖整个 state）比 memo 返回值更有效
- **误报排除**: 如果消费方都解构使用则不需要 memo，但 05-07 将整个 state 放入了 useMemo 依赖
- **复核状态**: 未复核

---

### [维度05-09] useFlowEditorState 中 dirty 使用 JSON.stringify 每次渲染执行

- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts:78-79`
- **证据片段**:
```typescript
78:   const dirty =
79:     initialized && JSON.stringify({ nodes, edges }) !== savedSnapshot;
```
- **严重程度**: P2
- **订阅位置**: `useFlowEditorState()` 第 78-79 行
- **订阅范围**: 每次渲染都计算的派生值
- **实际需要**: 只需在 nodes/edges 变化时重计算
- **重渲染频率**: 拖拽节点每帧都可能触发 JSON.stringify
- **建议**: 改为 `useMemo(() => initialized && JSON.stringify({ nodes, edges }) !== savedSnapshot, [initialized, nodes, edges, savedSnapshot])`
- **误报排除**: flow editor 拖拽非常频繁，对 50+ 节点序列化有实际开销
- **复核状态**: 未复核

---

### [维度05-10] AppShell.tsx 对 layoutStore 做 8 次独立 selector 调用

- **严重程度**: 非问题（Zustand 最佳实践）
- **复核状态**: 未复核

---

### [维度05-11] useAuth 中 6 个独立 selector 调用

- **严重程度**: 非问题（auth 变化极低频）
- **复核状态**: 未复核

---

### [维度05-12] useTabManagement useMemo 依赖高频 tabs

- **严重程度**: 非问题（tabs 变化时重计算是正确行为）
- **复核状态**: 未复核

---

### [维度05-13] RouteRenderer 中 plugins 订阅粒度粗

- **严重程度**: P3（单实例、低频变更）
- **复核状态**: 未复核

---

### [维度05-14] PluginMountPanel render 中 .filter()

- **严重程度**: P3（无 memo 需求，低频变更）
- **复核状态**: 未复核

---

### [维度05-15] PluginSlot useEffect 依赖 beforeLoad，设计脆弱

- **文件**: `packages/core/src/components/PluginSlot.tsx:31-51`
- **证据片段**:
```typescript
31:   useEffect(() => {
32:     let active = true;
33:     const requestUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
34:
35:     void Promise.resolve(beforeLoad?.())
36:       .then(() => loadRemoteComponent(requestUrl))
...
51:   }, [beforeLoad, url]);
```
- **严重程度**: P2
- **订阅位置**: `PluginSlot` 组件第 31-51 行
- **建议**: 使用 ref 模式稳定 beforeLoad 引用，effect 只依赖 url
- **误报排除**: 当前唯一调用方传入稳定模块函数，实际安全
- **复核状态**: 未复核

---

### [维度05-16] TabsBar 中 tabs useEffect 导致 ResizeObserver 反复重建

- **文件**: `packages/core/src/components/TabsBar.tsx:169-199`
- **证据片段**:
```typescript
169:   useEffect(() => {
...
189:     const resizeObserver = new ResizeObserver(() => updateScrollState());
190:     resizeObserver.observe(viewport);
191:     resizeObserver.observe(content);
192:     window.addEventListener('resize', updateScrollState);
194:     return () => {
196:       resizeObserver.disconnect();
197:       window.removeEventListener('resize', updateScrollState);
198:     };
199:   }, [tabs]);
```
- **严重程度**: P2
- **订阅位置**: `TabsBar` 第 169-199 行
- **建议**: 事件监听器只在 mount/unmount 设置，tabs 变化只调用 `updateScrollState()`
- **误报排除**: 每次 tab 操作都重建 ResizeObserver 是不必要的
- **复核状态**: 未复核

---

### [维度05-17] useFlowPersistence callbacks 依赖高频 nodes/edges

- **严重程度**: P3（消费方无 memo 需求）
- **复核状态**: 未复核

---

### [维度05-18] useFlowEditorActions callbacks 依赖高频 nodes/edges

- **严重程度**: P3（同 05-17）
- **复核状态**: 未复核
