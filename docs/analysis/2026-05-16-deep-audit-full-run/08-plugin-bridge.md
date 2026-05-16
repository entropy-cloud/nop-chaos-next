# 维度 08：插件桥接与共享模块

## 第 1 轮（初审）

### [维度08-01] Rollup 构建缺少 react/jsx-dev-runtime 外部化

- **文件**: `examples/plugin-demo/scripts/build-with-rollup.mjs:22-37`
- **证据片段**:
  ```js
  external: [
      '@nop-chaos/plugin-bridge',
      'react/jsx-runtime',
      // 缺少: 'react/jsx-dev-runtime'
  ],
  ```
- **严重程度**: P1
- **现状**: host 注册了 react/jsx-dev-runtime 到 SystemJS，但 Rollup external 遗漏了它。dev 模式构建会将 jsx-dev-runtime 打包进产物。
- **风险**: React 实例不一致，可能导致 hooks 失效、context 断裂。
- **建议**: 在 external 数组添加 'react/jsx-dev-runtime'。
- **误报排除**: jsx: 'automatic' 配置在 dev 模式下使用 jsx-dev-runtime。
- **复核状态**: 未复核

### [维度08-02] usePluginNotifications 未使用 useSyncExternalStore

- **文件**: `packages/plugin-bridge/src/index.ts:71-79`
- **严重程度**: P1
- **现状**: 直接读取 getPluginBridge()?.notifications，未通过 useSyncExternalStore 订阅 bridge 变更。bridge 注入后组件不会重渲染。
- **风险**: 远程插件首次加载后通知功能静默不可用。
- **建议**: 使用 useSyncExternalStore 包装。
- **误报排除**: 其他所有 hook 都正确使用了 useSyncExternalStore。
- **复核状态**: 未复核

### [维度08-03] bridge 注入时机在组件渲染之后

- **文件**: `apps/main/src/App.tsx:113-115`
- **严重程度**: P2
- **现状**: setPluginBridge 在 useEffect 中调用，首帧 bridge 不可用。
- **风险**: 首帧所有 bridge hooks 返回 fallback 值。
- **建议**: 提前到 bootstrap 阶段或使用 useLayoutEffect。
- **误报排除**: useSyncExternalStore 会在 bridge 注入后触发重渲染，但引入不必要闪烁。
- **复核状态**: 未复核

### [维度08-04] subscribeBridgeSnapshot 重复订阅导致双次重渲染

- **文件**: `packages/plugin-bridge/src/index.ts:12-20`
- **严重程度**: P2
- **现状**: 同时订阅 subscribePluginBridge 和 bridge.subscribe，store 变更时触发两次 listener。
- **风险**: 高频状态更新时性能开销翻倍。
- **建议**: 只使用 subscribePluginBridge 作为唯一订阅来源。
- **误报排除**: App.tsx 已在 store 变更时重建 pluginBridge 并调用 setPluginBridge。
- **复核状态**: 未复核

### [维度08-05] PluginSlot 缺少加载超时机制

- **文件**: `packages/core/src/components/PluginSlot.tsx:27-51`
- **严重程度**: P2
- **现状**: 远程模块加载无超时保护，CDN 故障时用户永远看到 Loading。
- **建议**: 添加可配置超时（如 30 秒）。
- **误报排除**: 对比 React Query 有 retry 和超时策略。
- **复核状态**: 未复核

### [维度08-06] ErrorBoundary 不支持崩溃恢复

- **文件**: `packages/core/src/components/ErrorBoundary.tsx:16-49`
- **严重程度**: P2
- **现状**: 插件渲染异常后无恢复机制，必须刷新整个页面。
- **建议**: 添加重试按钮或 key 变化触发重建。
- **误报排除**: 插件作为远程动态内容更容易崩溃，更需要恢复机制。
- **复核状态**: 未复核

### [维度08-07] 共享模块虚拟路径依赖 system.set() 隐式行为

- **文件**: `apps/main/src/plugins/sharedModules.ts:22-37`
- **严重程度**: P3
- **现状**: import map 指向虚拟路径 /nop-shared/xxx.js，依赖 system.set() 同步注入。
- **建议**: 添加开发模式日志确认注册成功。
- **误报排除**: 当前功能正常。
- **复核状态**: 未复核

### [维度08-08] plugin-demo peerDependencies 使用 workspace:* 协议

- **文件**: `examples/plugin-demo/package.json:30-33`
- **严重程度**: P3
- **现状**: workspace:* 在 monorepo 外无法解析。
- **建议**: 改为具体版本号或版本范围。
- **误报排除**: 作为示例项目，风险有限。
- **复核状态**: 未复核

### [维度08-09] 构建产物仅 SystemJS 格式

- **文件**: `examples/plugin-demo/scripts/build-with-rollup.mjs:47-51`
- **严重程度**: P3
- **现状**: 仅输出 .system.js 格式，不支持 ESM 直接加载。
- **建议**: 当前架构合理，作为架构建议记录。
- **误报排除**: systemjs.ts 支持 ESM 回退但 plugin-demo 未提供 ESM 产物。
- **复核状态**: 未复核

### [维度08-10] devDependencies 与 peerDependencies 大量重复

- **文件**: `examples/plugin-demo/package.json:14-43`
- **严重程度**: P3
- **现状**: 所有 peerDependencies 也在 devDependencies 中声明。
- **建议**: 考虑只保留 peerDependencies 或文档说明双重声明意图。
- **误报排除**: pnpm 会优先使用 peerDependencies 版本。
- **复核状态**: 未复核

## 正面发现

- 共享依赖版本一致性良好
- bridge subscribe/getSnapshot 正确桥接 Zustand store
