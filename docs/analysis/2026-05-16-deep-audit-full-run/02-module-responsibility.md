# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

### [维度02-01] flow-editor/[id]/index.tsx — 573行，巨型页面组件承担 7 项可分离职责

- **文件**: `apps/main/src/pages/flow-editor/[id]/index.tsx` (全文件 573 行)
- **证据片段**:
  ```
  职责 A: 状态声明与派生计算 — 行 63-95 (14 个 useState)
  职责 B: 数据加载与初始化 — 行 113-142 (AbortController)
  职责 C: 节点/边增删改查逻辑 — 行 169-349
  职责 D: 历史/撤销重做 — 行 351-369
  职责 E: 保存/恢复/导出 — 行 255-285 + 423-433
  职责 F: 拖放/事件处理器 — 行 387-407
  职责 G: JSX 渲染 — 行 458-564
  ```
- **严重程度**: P2
- **现状**: 文件 573 行，超过 500 行评估阈值。FlowEditorPageInner 约 500 行函数体。
- **风险**: 可维护性下降，纯逻辑单元无法独立测试。
- **建议**: 提取 useFlowEditorState、useFlowEditorActions、useFlowPersistence、useFlowDragDrop 四个 hooks，主文件降至 ~200 行。
- **误报排除**: 目录内已存在拆分文件（useFlowHistory.ts 等），但主文件未贯彻。
- **复核状态**: 未复核

### [维度02-02] packages/amis-core/src/core/graphql.ts — 555行，混合 4 种职责

- **文件**: `packages/amis-core/src/core/graphql.ts` (全文件 555 行)
- **证据片段**: 类型守卫(70行) + 参数转换(80行) + 过滤器构建(160行, toFilter 单函数 67行) + 查询构建(140行)
- **严重程度**: P2
- **现状**: 文件 555 行，包含 4 种可分离职责。纯函数模块，函数间耦合较低。
- **风险**: toFilter 67 行单函数，扩展时继续膨胀。
- **建议**: 拆分为 graphqlFilter.ts、graphqlArgs.ts、graphqlRegistry.ts。
- **误报排除**: 纯函数模块，当前规模在阈值附近，但内聚性较低。
- **复核状态**: 未复核

### [维度02-03] dashboard/index.tsx — 532行，6 个图表组件全部内联

- **文件**: `apps/main/src/pages/dashboard/index.tsx` (全文件 532 行)
- **证据片段**: 6 个 recharts 图表全部内联渲染，无 components/ 子目录
- **严重程度**: P2
- **现状**: 典型"仪表盘巨型页面"模式，DashboardPage 函数体 456 行。
- **风险**: 修改任一图表需阅读整个文件。
- **建议**: 提取 TrendAreaChart、ComposedChartCard 等 7 个子组件到 components/ 目录，主页面降至 ~150 行。
- **误报排除**: 目录仅有一个文件，未做任何拆分。
- **复核状态**: 未复核

### [维度02-04] plugin-bridge/index.ts 包含 hooks 实现逻辑

- **文件**: `packages/plugin-bridge/src/index.ts` (79 行)
- **严重程度**: P3
- **现状**: index.ts 包含 6 个 useSyncExternalStore hooks + 3 个辅助函数 + 2 个常量，违反仓库 index 仅做 re-export 惯例。
- **建议**: 提取 hooks.ts，index 改为纯 re-export。
- **误报排除**: 对比 core(12行)、amis-core(27行) 的纯 re-export 模式。
- **复核状态**: 未复核

### [维度02-05] amis-core/ajax.ts — 409行，接近阈值

- **文件**: `packages/amis-core/src/core/ajax.ts` (409 行)
- **严重程度**: P3
- **现状**: 低于 500 行阈值但高于 300 行。Blob 下载(~90行)可独立提取。
- **建议**: 观察项，可选拆分 blobDownload.ts。
- **误报排除**: 409 < 500 阈值。
- **复核状态**: 未复核

### [维度02-06] theme-tokens/index.ts 仅 export {}

- **文件**: `packages/theme-tokens/src/index.ts` (1 行)
- **严重程度**: P3
- **现状**: 纯 CSS 包，TS 入口无实质导出。
- **建议**: 添加注释说明或导出令牌名常量。
- **误报排除**: CSS-only 包是合法模式。
- **复核状态**: 未复核
