# 维度 11：类型安全与契约质量

## 第 1 轮（初审）

### [维度11-1] 公共接口零 JSDoc 文档

- **文件**: `packages/shared/src/types/*.ts`, `packages/plugin-bridge/src/index.ts`
- **证据片段**:
  ```ts
  // packages/shared/src/types/menu.ts
  export interface MenuItem {
    id: string;
    title?: string;
    titleKey?: string;
    path: string;
    icon?: string;
    children?: MenuItem[];
    badge?: string;
    pageType: 'builtin' | 'plugin' | 'amis' | 'flux' | 'iframe' | 'external';
    componentId?: string;
    pluginUrl?: string;
    schemaPath?: string;
    frameSrc?: string;
    externalUrl?: string;
    roles?: string[];
    sort?: number;
    hideInMenu?: boolean;
  }
  ```
- **严重程度**: P2
- **分类**: 文档
- **现状**: shared/types/ 下所有类型文件、PluginBridge 接口（9 方法、5 属性）、ShellRuntimeConfig 均不含 JSDoc。整个 packages/、apps/main/src/、examples/ 源码中未发现 JSDoc。
- **真实风险**: MenuItem.pageType 有 6 个可能字面量值未解释区别；MenuItem.badge 预期格式未说明；ShellExtension（18 字段）互斥条件未记录；插件开发者须猜测语义。
- **建议**: 优先为 shared/types/（公共 API）和 plugin-bridge/src/index.ts（插件集成点）添加 JSDoc。
- **误报排除**: TS 类型提供部分文档，但跨包边界和外部开发者使用的接口不够。

### [维度11-2] ExtensionLoginPage 中 `as unknown as Partial<AuthStoreWithActions>` 脆弱类型假设

- **文件**: `examples/extension-demo/src/pages/ExtensionLoginPage.tsx:55`
- **证据片段**:
  ```ts
  function getAuthStoreActions() {
    const bridge = getPluginBridge();
    if (!bridge) return undefined;
    return bridge.stores.authStore.getState() as unknown as Partial<AuthStoreWithActions>;
  }
  ```
- **严重程度**: P2
- **分类**: 可疑
- **现状**: 将 `getState()` 返回值断言为包含 `login` action 的类型。Zustand 的 `getState()` 确实返回完整 store（状态+action），但依赖内部实现细节。
- **真实风险**: 如果 authStore 实现变化或中间件对状态序列化，`getState()` 上可用属性可能变化；类型强制转换跳过所有检查。
- **建议**: 在 PluginBridgeStores 的 authStore 类型中添加显式 login action 类型，或在 PluginBridge 上添加 `login` 方法。
- **误报排除**: 位于 examples/extension-demo/ 演示代码中，作为插件开发参考，不良模式可能被复制。

### [维度11-3] AmisSchemaPage 中 `as unknown as never` 三重断言

- **文件**: `packages/amis-react/src/components/AmisSchemaPage.tsx:122-124`
- **证据片段**:
  ```tsx
  {renderAmis(
    transformedSchema as unknown as never,
    renderProps as unknown as never,
    env as unknown as never,
  )}
  ```
- **严重程度**: P3
- **分类**: 可疑（合理）
- **现状**: renderAmis 来自第三方 amis 库，类型签名不完整。公共 props 表面已正确使用 unknown 类型。
- **真实风险**: 低。这是第三方库集成的标准边界。
- **建议**: 添加注释说明 why never 是约定的边界。
- **误报排除**: AGENTS.md 指出 amis schema 场景的 any/unknown 是合理的。

### [维度11-4] eslint.config.js 中禁用 `@typescript-eslint/no-explicit-any`

- **文件**: `eslint.config.js:92`
- **证据片段**:
  ```js
  '@typescript-eslint/no-explicit-any': 'off',
  ```
- **严重程度**: P1
- **分类**: 可疑（自动化安全网缺口）
- **现状**: no-explicit-any 规则被设为 'off'。当前代码库含零个 any（通过纪律而非强制），新代码可能悄悄引入 any。
- **真实风险**: CI 不会发现 any 的回归；与 AGENTS.md "避免 any" 的规则矛盾。
- **建议**: 切换为 'warn' 或 'error' 并附解释注释。
- **误报排除**: 可能因合理原因被禁用，但当前已零 any，没有理由不强制执行。

### [维度11-5] 三个源文件超过 500 行阈值

- **文件**: `apps/main/src/pages/flow-editor/[id]/index.tsx` (569 行), `packages/amis-core/src/core/graphql.ts` (555 行), `apps/main/src/pages/dashboard/index.tsx` (525 行)
- **证据片段**:（行数统计）
- **严重程度**: P3
- **分类**: 可疑
- **现状**: 三个文件超过 500 行但均未超过 700 行强制拆分阈值。
- **真实风险**: 低。graphql.ts 是按函数模块化组织的；flow-editor 和 dashboard 可受益于提取子组件/钩子。
- **建议**: flow-editor 提取 useFlowEditor 钩子和子组件；dashboard 提取图表为独立组件。
- **误报排除**: 大小指南是指导性而非强制性的。

### [维度11-6] AppShell.tsx 中 CSS 自定义属性 `as string` 断言

- **文件**: `apps/main/src/router/AppShell.tsx:234-236`
- **证据片段**:
  ```tsx
  ['--sidebar-width' as string]: sidebarCollapsed ? sidebarCollapsedWidth : sidebarWidth,
  ```
- **严重程度**: P3
- **分类**: 可疑
- **现状**: React CSSProperties 类型不识别 `--*` 自定义属性，使用 `as string` 作为标准变通。
- **真实风险**: 可忽略。无运行时影响。
- **建议**: 引入 `CssCustomProperties` 类型扩展或辅助函数。
- **误报排除**: React 类型限制的有据可查变通方法。

### [维度11-7] catch 块中 `unknown` 使用合规

- **文件**: 多处（AmisSchemaPage.tsx:78, PluginSlot.tsx:41, loadExtensions.ts:63 等）
- **严重程度**: 无发现
- **分类**: 合规确认
- **现状**: 所有检查的 catch 块正确使用 `unknown` 类型，错误规范化模式到位：`error instanceof Error ? error.message : 'Fallback message'`。
- **建议**: 无。现行做法符合 AGENTS.md。

### [维度11-8] FlowNodePayload 中 `Record<string, unknown>` 交集类型可收紧

- **文件**: `apps/main/src/services/mockApi/types.ts:89-94`
- **证据片段**:
  ```ts
  export type FlowNodePayload = Record<string, unknown> & {
    label: string;
    description: string;
    kind: FlowNodeKind;
    config: Record<string, string>;
  };
  ```
- **严重程度**: P3
- **分类**: 可疑
- **现状**: Record<string, unknown> 交集意味着除四个已知字段外还接受任何字符串键。
- **真实风险**: 低。与外部编辑器持久化格式配合使用时，这是向前兼容的常见模式。
- **建议**: 添加注释解释为什么开放结束签名是必要的。
- **误报排除**: Mock API 数据的开放结束 Record 是合理设计选择。

---

## any 使用统计（按包分组）

| 包 | 合理 | 可疑 | 危险 | 总计 |
|---|---|---|---|---|
| 所有包 | 0 | 0 | 0 | 0 |

代码库零显式 any。tsconfig strict: true 启用 noImplicitAny。

## 类型断言链

8 个多重断言链（`as unknown as X`），集中在 amis 库边界、测试代码、动态图标解析。无类型设计缺陷问题。

## @ts-expect-error / @ts-ignore

零使用。ESLint ban-ts-comment 规则已启用。

## 跨包类型一致性

所有验证的共享类型（MenuItem、AuthState、ThemeConfig、AppTab、User、PluginManifest）与其消费位置完美匹配。
