# 维度 12：测试覆盖与质量

## 第 1 轮（初审）

### [维度12-01] packages/amis-react 零测试覆盖

- **文件**: packages/amis-react/src/ (6 个源文件，0 个测试)
- **严重程度**: P2
- **现状**: amis 低代码集成层完全无单元测试。env.ts 和 AmisSchemaPage.tsx 逻辑复杂度高。
- **建议**: 为 env.ts 添加测试（fetcher/locale/token 注入），为 AmisSchemaPage 添加测试。
- **误报排除**: 该包是 amis 页面渲染的唯一路径。
- **复核状态**: 未复核

### [维度12-02] themeStore、layoutStore、tabStore 无测试

- **文件**: apps/main/src/store/ (5 个 store，仅 2 个有测试)
- **严重程度**: P2
- **现状**: 三个核心 store（主题切换、侧边栏、Tab 管理）完全没有测试。
- **建议**: 参照 authStore.test.ts 模式添加测试。
- **误报排除**: Zustand store 状态变更直接影响 UI 行为。
- **复核状态**: 未复核

### [维度12-03] 核心 Hooks 层覆盖不足

- **文件**: apps/main/src/hooks/ (7 个 hook，仅 useAuth 有测试)
- **严重程度**: P2
- **现状**: useMenuConfig、useTabManagement、useTheme 等关键 hook 无测试。
- **建议**: 优先为 useMenuConfig 和 useTabManagement 添加测试。
- **误报排除**: hooks 是多层逻辑聚合点，E2E 难以精确验证。
- **复核状态**: 未复核

### [维度12-04] core 关键组件 PluginSlot/Sidebar/TabsBar 无测试

- **文件**: packages/core/src/components/ (7 个组件，仅 ErrorBoundary 有测试)
- **严重程度**: P2
- **现状**: PluginSlot（远程插件加载核心）和 Sidebar（导航核心）零测试。
- **建议**: 优先为 PluginSlot 添加集成测试。
- **误报排除**: PluginSlot 是插件系统渲染入口。
- **复核状态**: 未复核

### [维度12-05] amis-core 的 processor.ts/page.ts/registry.ts 无测试

- **文件**: packages/amis-core/src/page/ (部分模块无直接测试)
- **严重程度**: P3
- **现状**: 部分模块在 transform.test.ts/action.test.ts 中被间接覆盖。
- **建议**: 为 adapter/index.ts 和 url.ts 添加基础测试。
- **误报排除**: 间接覆盖存在但不完整。
- **复核状态**: 未复核

### [维度12-06] Vitest 配置不一致

- **文件**: examples 的 vitest.config.ts 使用独立配置 + globals: true
- **严重程度**: P2
- **现状**: examples 未使用共享配置工厂，且启用了 globals: true。
- **建议**: 统一使用 createSharedVitestConfig，移除 globals。
- **误报排除**: globals 允许不 import vitest，与项目其他部分不一致。
- **复核状态**: 未复核

### [维度12-07] usePermissionGuard 和 RouteRenderer 测试内联实现

- **文件**: `packages/core/src/hooks/usePermissionGuard.test.ts` + `apps/main/src/router/RouteRenderer.test.tsx`
- **严重程度**: P3
- **现状**: 在测试文件中重新定义被测函数的副本，而非导入实际实现。
- **建议**: 将纯逻辑提取到共享模块，hook 和测试都导入同一实现。
- **误报排除**: 测试验证的是简化副本，实际实现变化不会被捕获。
- **复核状态**: 未复核

### [维度12-08] detailFilters.test.ts 测试内联实现

- **文件**: `apps/main/src/pages/data-management/master-detail/detailFilters.test.ts`
- **严重程度**: P3
- **现状**: 测试文件内定义 containsIgnoreCase 并测试，但未导入实际实现。
- **建议**: 提取纯函数到 filterUtils.ts。
- **误报排除**: 过滤逻辑简单，风险较低。
- **复核状态**: 未复核

### [维度12-09] PluginSlot/Sidebar 零测试（深入补充）

- **文件**: packages/core/src/components/PluginSlot.tsx, Sidebar.tsx
- **严重程度**: P2
- **现状**: PluginSlot 是插件系统运行时渲染核心，Sidebar 涉及菜单树递归渲染。
- **建议**: 为 PluginSlot 添加 mock 测试覆盖 SystemJS/ESM/加载失败路径。
- **误报排除**: 是发现 12-04 的深入补充。
- **复核状态**: 未复核

### [维度12-10] E2E 测试中菜单 mock 数据重复定义

- **文件**: tests/e2e/ 中 4 个 spec 文件有独立的菜单 mock
- **严重程度**: P3
- **现状**: demoRoutesMenuResponse 在多个 spec 文件中重复定义。
- **建议**: 提取到 tests/e2e/support/menu-fixtures.ts。
- **误报排除**: 维护成本问题。
- **复核状态**: 未复核

### [维度12-11] plugin-bridge hook 层零测试

- **文件**: `packages/plugin-bridge/src/index.ts` (6 个 React hook) vs `index.test.ts` (仅测试 bridge 层)
- **严重程度**: P1
- **现状**: usePluginBridge 等 6 个 hook 完全未测试。useSyncExternalStore 的 subscribe/getSnapshot 配对正确性无验证。
- **建议**: 使用 renderHook 测试 hook 层，验证 subscribe unsubscribe 链路。
- **误报排除**: hook 是所有远程插件消费主应用状态的唯一接口。
- **复核状态**: 未复核

### [维度12-12] E2E 仅覆盖 Chromium 单浏览器

- **文件**: `playwright.config.ts:71-77`
- **严重程度**: P3
- **现状**: 仅 Chromium 一个项目。
- **建议**: 评估是否需要 Firefox/WebKit 覆盖。
- **误报排除**: 取决于目标用户群。
- **复核状态**: 未复核

### [维度12-13] amis-core action.test.ts adapter mock 重复 7 次

- **文件**: `packages/amis-core/src/page/action.test.ts` (295 行)
- **严重程度**: P2
- **现状**: 约 120 行是 adapter mock 重复代码。
- **建议**: 提取 createMockAdapter 到共享 test helper。
- **误报排除**: transform.test.ts 已有 createMockAdapter 工厂函数，但 action.test.ts 未使用。
- **复核状态**: 未复核

### [维度12-14] E2E 测试覆盖场景缺口

- **文件**: tests/e2e/ 全部 12 个 spec
- **严重程度**: P3
- **现状**: 缺少 Dashboard、AI Workbench、Settings、错误页面、主题切换、移动端的 E2E 覆盖。
- **建议**: 添加 dashboard.spec.ts、settings.spec.ts、theme-switch.spec.ts。
- **误报排除**: 当前 12 个 spec 覆盖了核心流程，但部分页面完全未覆盖。
- **复核状态**: 未复核
