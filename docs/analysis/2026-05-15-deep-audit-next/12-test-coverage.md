# 维度 12：测试覆盖与质量

## 第 1 轮（初审）

### [维度12-01] 认证流程（authStore + tokenManager + useAuth）— 核心安全零测试

- **文件**: `apps/main/src/store/authStore.ts`, `packages/shared/src/auth/tokenManager.ts`, `apps/main/src/hooks/useAuth.ts`
- **严重程度**: P0
- **类别**: 覆盖缺口
- **现状**: authStore(138行,含persist/token刷新/partialize)、tokenManager.ts(212行,含JWT解码/过期判断/刷新竞态/多种存储后端)、useAuth.ts(bootstrap逻辑)全无测试。
- **风险**: 认证是整个应用入口守卫。刷新竞态、持久化异常、bootstrap断裂直接导致用户无法登录。
- **建议**: 为 authStore 覆盖所有 action 和 partialize 分支；tokenManager.ts 覆盖所有存储后端和边界条件；useAuthBootstrap 通过 renderHook 测试。

### [维度12-02] 路由分发（pageRegistry + RouteRenderer + AppShell）— 零测试

- **文件**: `apps/main/src/router/pageRegistry.tsx`, `RouteRenderer.tsx`, `AppRoutes.tsx`, `AppShell.tsx`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 全部 4 个路由模块均无测试。pageRegistry 实现了 builtin page lazy load 注册、扩展覆盖机制、getSystemPage 回退链。
- **风险**: 扩展覆盖机制或 systemPage 查找出错导致白屏或菜单无响应。
- **建议**: 为 pageRegistry 覆盖 builtin 查找、扩展覆盖、getSystemPage 回退链。

### [维度12-03] PluginSlot 组件和插件加载 — 核心扩展点零测试

- **文件**: `packages/core/src/components/PluginSlot.tsx`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: host 渲染远程插件的核心入口组件，无单元测试。
- **风险**: 插件加载故障路径（失败/超时/无效manifest）无法在 CI 中发现。
- **建议**: 覆盖正常加载、超时 fallback、错误 fallback、unmount 清理。

### [维度12-04] 扩展系统（extension-host）— 零测试

- **文件**: `packages/extension-host/src/`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: @nop-chaos/extension-host 包 3 个源文件，0 测试。处理扩展加载、菜单合并、运行时注册。
- **风险**: mergeExtensionMenus 和 setLoadedExtensions 跨包被 apps/main 依赖，出错破坏菜单合并。
- **建议**: 覆盖 loadExtensions、mergeExtensionMenus、runtime API 边界。

### [维度12-05] 权限守卫（usePermissionGuard）— 权限核心零测试

- **文件**: `packages/core/src/hooks/usePermissionGuard.ts`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 12行 hook 有 3 个逻辑分支但零测试。filterMenusByRoles 有测试但运行时 hook 层缺乏验证。
- **风险**: 权限判断错误导致越权或误拦。
- **建议**: 通过 renderHook 覆盖无 requiredRoles、空 roles、多角色交集、大小写敏感。

### [维度12-06] Zustand store（themeStore/pluginStore/tabStore/layoutStore）— 全部零测试

- **文件**: `apps/main/src/store/`
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 4 个 zustand store 均无测试。管理主题持久化、插件列表持久化、多标签导航、布局状态。
- **风险**: themeStore normalizeThemeId、tabStore closeTab 回退、pluginStore updatePlugin persist 等逻辑裸露。
- **建议**: 每个 store 覆盖创建默认状态、调用 action 验证变更、persist partialize 行为。

### [维度12-07] tokenManager.ts — 认证基础设施无测试

- **文件**: `packages/shared/src/auth/tokenManager.ts:1-212`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 212 行，3 种存储后端实现、JWT 解码、过期判断、刷新竞态控制，全无测试。
- **风险**: JWT 解码异常、过期判断 buffer、刷新竞态、存储异常——认证链断裂。
- **建议**: 覆盖每种存储后端、合法/非法/空 token、边界时间点、刷新重入控制。

### [维度12-08] amis-react 包 — 4 个组件零测试

- **文件**: `packages/amis-react/src/components/`
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 5 个源文件（含 4 个组件）0 测试。AMIS 页面渲染组件涉及 schema fetch、amis render、三态渲染。
- **建议**: 为 AmisLoadingView/AmisErrorView 添加渲染测试，为 AmisPageRoute 覆盖正常/异常/空 schema。

### [维度12-09] 多数包缺少 vitest.config.ts，运行环境一致性无法保证

- **文件**: 多个包根目录
- **严重程度**: P2
- **类别**: 一致性
- **现状**: vitest.workspace.ts 模式为 `packages/*/vitest.config.ts`，但 shared/core/plugin-bridge/amis-core/amis-react/extension-host/apps/main 均无 vitest.config.ts。
- **风险**: 部分包测试被静默跳过或环境不一致（React 组件无 jsdom）。
- **建议**: 为每个含 React 组件的包创建 vitest.config.ts（环境: jsdom），纯逻辑包至少创建基本配置。

### [维度12-10] ai-workbench/index.test.ts 测试范围过窄

- **文件**: `apps/main/src/pages/ai-workbench/index.test.ts:1-18`
- **严重程度**: P3
- **类别**: 覆盖缺口
- **现状**: 仅 18 行，测试了单个辅助函数的单一 happy-path。
- **建议**: 扩展覆盖 ContextPanel 和 ConversationPanel 的渲染。

### [维度12-11] detailFilters.test.ts 测试覆盖不足

- **文件**: `apps/main/src/pages/data-management/master-detail/detailFilters.test.ts:1-13`
- **严重程度**: P3
- **类别**: 覆盖缺口
- **现状**: 13 行，仅验证 filter 数据结构存在性。
- **建议**: 覆盖 filter 解析、序列化、与 URL query 同步。

### [维度12-12] E2E 测试缺少主题切换和权限菜单场景

- **文件**: `tests/e2e/`
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 12 个 E2E spec 覆盖核心流程，但缺少主题切换、角色菜单过滤、插件管理 CRUD、标签页管理、错误页面。
- **建议**: 新增主题切换 E2E、权限菜单过滤 E2E、标签页管理 E2E。

### [维度12-13] plugin-bridge 缺乏跨组件数据传播测试

- **文件**: `packages/plugin-bridge/src/index.test.ts:1-101`
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 测试 API 调用签名但未测试跨组件 bridge 数据传播。
- **建议**: 使用 renderHook + act 模拟跨组件 bridge 使用场景。

### [维度12-14] master-detail-buttons.spec.ts 457 行接近拆分阈值

- **文件**: `tests/e2e/master-detail-buttons.spec.ts:1-457`
- **严重程度**: P3
- **类别**: 跨域
- **现状**: 457 行，2 个 describe 块，16 个测试用例。结构清晰但接近 500 行阈值。
- **建议**: 超过 500 行时拆分为 list 和 detail 两个 spec 文件。
