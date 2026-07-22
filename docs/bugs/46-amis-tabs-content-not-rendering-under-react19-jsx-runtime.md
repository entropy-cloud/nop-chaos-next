# 46 AMIS Tabs Dialog Form Content Not Rendering Under React 19 jsx-runtime

## Problem

- 在 nop-chaos-next 前端（端口 4173）中，NopAuthUser 用户管理的新增/编辑对话框使用 AMIS Tabs 布局（"基本信息"/"扩展信息"），但 Tab 内容始终为空——`cxd-Form-item` 数量为 0，表单字段不渲染
- 同样使用 nop-chaos-next 生产构建的 nop-web-site（端口 8080）Tabs 渲染正常
- 简单表单（无 Tabs，如角色管理的新增对话框）在两个前端均正常
- 通过 Playwright e2e 测试确认：RPC 调用、页面导航、简单 CRUD 操作均正常，仅涉及 AMIS Tabs + `tab.tab` 格式表单的场景失败

## Diagnostic Method

- **诊断难度**：高。问题不是超时或网络错误，而是 AMIS 渲染链路中 schema 正确但组件无输出，多项假设被验证后又推翻
- **排查路径**：
  1. 先用 `dumpPageStructure` 诊断工具确认 dialog 存在、Tabs 结构正确、但 `activePaneChildren` 为 0
  2. 检查 React fiber 树，发现 TabComponent 的 `hasEntered=true`、`mountOnEnter=false`、`isActive=true`，Tab 本身状态正常但 `childrenCount=0`
  3. 检查 `tab.tab` 内容——schema 数组完整存在，有 8 个 form item（group/input-text/select 等）
  4. 对比后端直接返回的原始 page JSON 和传给 `renderAmis` 的 schema——`tab` 属性正确保留
  5. **剔除 `transformPageJson`**——跳过 transform 后问题依旧
  6. **对比生产构建 vs 开发模式**——`pnpm preview` 打包后同样失败，排除 Vite HMR/dev 模式问题
  7. **对比新旧 `libs/` tgz 文件**——git 回溯发现 commit `28ec07a`（Plan 30）替换了 AMIS tgz，回退到旧版 tgz 后 Tabs 正常
  8. **diff 新版/旧版 tgz 中的 Root.js**——确认真实改动仅有 `renderChild` 函数中 `createElement(Comp, props)` → `jsx(Comp, props)` 的转换
- **关键证据**：旧版 tgz（commit 28ec07a^）用 `createElement` → Tabs 正常；新版 tgz（commit 28ec07a）用 `jsx` → Tabs 不渲染

## Root Cause

- **近端原因**：Plan 30（`normalizeEsmJsxRuntime` 后处理插件）把 `amis-core/esm/Root.js` 中 `renderChild` 函数的命令式 `createElement(Comp, props)` 调用转为 `jsx(Comp, props)`
- **根本原因**：React 19 的 `jsx()`（来自 `react/jsx-runtime`）和 `React.createElement()` 在创建无 children 元素的场景下有行为差异。`renderChild` 是 AMIS 递归渲染子 schema 的核心入口，所有 Tabs/CRUD/Dialog 的 schema 子内容都通过此函数创建 SchemaRenderer 实例。`jsx(Comp, props)` 创建的 SchemaRenderer 元素在 React 19 的 reconciler 中丢失了子渲染能力
- 具体差异点：React 19 的 `jsx()` 在开发模式下对 `props` 做了 `Object.freeze()`，且 `jsx()` 不传递 `children` 参数（`createElement` 通过额外参数传入 children）。当 `renderChild` 创建无 children 的 SchemaRenderer 时，`jsx()` 创建的元素与 `createElement()` 创建的元素在 reconciler 中处理方式不同

## Fix

- 方案方向：`createElement` 在 React 19 中已废弃（只应在 classic JSX transform 中使用），正确做法是保持 `jsx` 路线，但为 `renderChild` 场景加一个兼容包装
- 创建 Vite 插件 `fixAmisRenderChild`（`packages/amis-react/src/vite-fix-amis-render-child.ts`），在 `transform` 阶段拦截 `amis-core/esm/Root.js`，将 `renderChild` 函数中的 `jsx(Comp,` 调用替换为兼容包装函数 `_amisReactCompatShim`
- 包装函数 `_amisReactCompatShim(type, config)` 手动创建 `ReactElement`，确保 `key` 正确提取、`props` 保留所有属性（包括 `ref`）、且符合 React 19 的元素结构
- 此插件注册在 Vite config 的 `pre` 阶段，确保在构建（build）和服务（serve）时均生效

## Tests

- 修复后通过 Playwright e2e 验证：`tests/diagnose.spec.ts`（nop-entropy-e2e 临时诊断文件）确认 `formItems: 21`、`inputs: 11`、`activePaneChildren: 8`
- 全量回归验证：`pnpm typecheck` 28/28、`pnpm test` 28/28（898 tests）全部通过

## Affected Files

- `libs/amis-core-6.13.1-fix.0.tgz` — tango 文件中 `package/esm/Root.js` 的 `renderChild` 函数
- `packages/amis-react/src/vite-fix-amis-render-child.ts` — 新增 Vite 插件修复

## Notes For Future Refactors

- Plan 30 的 `normalizeEsmJsxRuntime` 插件仅应在 JSX 编译产物（`.tsx` → `.js` 转换中由 rollup-plugin-typescript 残留的 createElement）上运行，不应触及 AMIS 源码中本就命令式编写的 `createElement` 调用
- 如果 `amis-react19` 重建 tgz，需确保 `Root.js` 中 `renderChild` 的 `createElement` 不被 `normalizeEsmJsxRuntime` 转换——此处的 `createElement` 是命令式 API，不是 JSX 编译产物
- 如果未来 React 19 的 `jsx-runtime` 更新后消除了 `jsx()` 与 `createElement()` 在无 children 场景下的差异，可移除 `fixAmisRenderChild` 插件
