# 维度 08：插件桥接与共享模块

## 第 1 轮（初审）

### [维度08-01] 插件渲染无 ErrorBoundary，崩溃穿透至整个应用

- **文件**: `packages/core/src/components/PluginSlot.tsx:70`
- **严重程度**: P1
- **类别**: 故障隔离
- **现状**: PluginSlot 直接渲染 `<Component />`，无 ErrorBoundary 包裹。全局搜索 ErrorBoundary 零匹配。
- **风险**: 任何插件组件渲染异常穿透到 React 根节点，导致整个 AppShell 崩溃白屏。
- **建议**: 在 PluginSlot 内包裹 `<Component />` 位置添加 ErrorBoundary，回退到友好错误信息且不破坏 shell 元素。

### [维度08-02] ensurePluginExtraSharedModules 的 rejected promise 被缓存

- **文件**: `apps/main/src/plugins/sharedModules.ts:61-80`
- **严重程度**: P1
- **类别**: 故障隔离
- **现状**: `??=` 将 import('recharts') 的 Promise 分配给模块级变量。如果 reject，该 rejected promise 被永久缓存，永不重试。
- **风险**: recharts 首次加载因网络抖动失败后，所有依赖 recharts 的插件永久显示错误，用户必须刷新页面。
- **建议**: 在 `.then(...)` 后添加 `.catch(...)` 重置 `pluginExtraModulesPromise = null` 允许重试。

### [维度08-03] PluginSlot 缺少加载超时机制

- **文件**: `packages/core/src/components/PluginSlot.tsx:30-50`
- **严重程度**: P2
- **类别**: 契约完整性
- **现状**: useEffect 中无超时逻辑，loadRemoteComponent 可能挂起永不 resolve/reject；cleanup 仅设 active=false。
- **风险**: 用户看到永久的 loading 状态，无法自动恢复或获得反馈。
- **建议**: 添加 setTimeout 超时逻辑（如 30 秒），超时后设置错误状态并显示"插件加载超时"。

### [维度08-04] 注册的共享模块缺少 ESM fallback proxy 文件

- **文件**: `apps/main/src/plugins/sharedModules.ts:22-37`, `apps/main/public/nop-shared/`
- **严重程度**: P2
- **类别**: SystemJS 配置
- **现状**: 15个注册共享模块中，`public/nop-shared/` 下只有 8 个 .js 文件。react-dom、zustand、@tanstack/react-query、i18next、react-i18next、lucide-react、sonner 缺少 ESM proxy 文件。
- **风险**: 使用 ESM 格式的插件加载时因 404 失败。
- **建议**: 为每个注册的共享模块创建对应的 ESM proxy 文件或将生成自动化。

### [维度08-05] PluginBridge 在每次路由导航时重建

- **文件**: `apps/main/src/App.tsx:77-110`
- **严重程度**: P2
- **类别**: 契约完整性
- **现状**: pluginBridge useMemo 依赖包含 location.pathname，每次路由导航重建 bridge 对象，setPluginBridge 通知所有订阅者。
- **风险**: 导航性能随插件数量增长线性退化。
- **建议**: getCurrentPath 改为惰性获取，移除 location.pathname 的依赖。

### [维度08-06] plugin-bridge dependencies 中存在未使用的依赖

- **文件**: `packages/plugin-bridge/package.json:8-14`
- **严重程度**: P3
- **类别**: 依赖版本
- **现状**: react-dom、sonner、i18next 在 dependencies 但源码未直接使用。
- **风险**: 增加插件开发者困惑和 node_modules 大小。
- **建议**: 将未使用的依赖移到 devDependencies 或直接移除。

### [维度08-07] plugin-demo peerDependencies 缺少 react 和 react-dom

- **文件**: `examples/plugin-demo/package.json:30-42`
- **严重程度**: P3
- **类别**: 依赖版本
- **现状**: plugin-demo 使用 JSX 但 peerDependencies 中无 react 和 react-dom。
- **风险**: 包管理器不会警告 react 缺失，导致运行时 JSX 解析失败或重复实例。
- **建议**: 将 react 和 react-dom 添加到 peerDependencies。

### [维度08-08] plugin-demo peerDependencies 包含 systemjs

- **文件**: `examples/plugin-demo/package.json:41`
- **严重程度**: P3
- **类别**: 依赖版本
- **现状**: peerDependencies 包含 systemjs，但插件源码不调用任何 SystemJS API。
- **风险**: 虚高的 peerDependencies 导致不必要的依赖解析约束。
- **建议**: 从 peerDependencies 移除 systemjs。
