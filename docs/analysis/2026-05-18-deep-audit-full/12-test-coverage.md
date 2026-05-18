# 维度 12：测试覆盖与质量

## 第 1 轮（初审）

已按要求先阅读 `C:\can\nop\nop-chaos-next\docs\index.md` 与 `C:\can\nop\nop-chaos-next\AGENTS.md`，并基于以下范围完成维度 12 第 1 轮初审：

- `C:\can\nop\nop-chaos-next\apps\*\src\**\*.test.*`
- `C:\can\nop\nop-chaos-next\packages\*\src\**\*.test.*`
- `C:\can\nop\nop-chaos-next\flux-lib\ui\src\**\*.test.*`
- `C:\can\nop\nop-chaos-next\tests\e2e\**\*.spec.ts`

## 测试覆盖统计（按包/目录）

| 范围 | 测试文件数 |
|---|---:|
| `C:\can\nop\nop-chaos-next\apps\main` | 39 |
| `C:\can\nop\nop-chaos-next\packages\amis-core` | 8 |
| `C:\can\nop\nop-chaos-next\packages\amis-react` | 2 |
| `C:\can\nop\nop-chaos-next\packages\core` | 5 |
| `C:\can\nop\nop-chaos-next\packages\extension-host` | 1 |
| `C:\can\nop\nop-chaos-next\packages\plugin-bridge` | 1 |
| `C:\can\nop\nop-chaos-next\packages\shared` | 5 |
| `C:\can\nop\nop-chaos-next\packages\tailwind-preset` | 0 |
| `C:\can\nop\nop-chaos-next\packages\theme-tokens` | 0 |
| `C:\can\nop\nop-chaos-next\flux-lib\ui` | 0 |
| `C:\can\nop\nop-chaos-next\tests\e2e` | 13 |

补充结论：
- 零测试包/目录：
  - `C:\can\nop\nop-chaos-next\packages\tailwind-preset`
  - `C:\can\nop\nop-chaos-next\packages\theme-tokens`
  - `C:\can\nop\nop-chaos-next\flux-lib\ui`
- 未发现 `packages/ui` 实际目录；当前 `@nop-chaos/ui` 实包位于 `C:\can\nop\nop-chaos-next\flux-lib\ui`
- 框架模式整体一致：
  - 单测均为 Vitest `*.test.ts(x)`
  - E2E 均为 Playwright `*.spec.ts`
  - 未发现单测中混入 `@playwright/test`，也未发现 E2E 中混入 `vitest`
- 未发现独立的 Vitest `setupFiles` / Playwright `globalSetup`；当前共享初始化压力主要集中在 `tests/e2e/support/auth.ts`

---

### [维度12-01] `flux-lib/ui` 作为共享 UI 主包零测试
- **文件**: `C:\can\nop\nop-chaos-next\flux-lib\ui\src\index.ts:1-67`
- **证据片段**:
```ts
export * from './components/ui/accordion.js';
export * from './components/ui/alert.js';
export * from './components/ui/alert-dialog.js';
export * from './components/ui/aspect-ratio.js';
export * from './components/ui/avatar.js';
export * from './components/ui/badge.js';
export * from './components/ui/breadcrumb.js';
export * from './components/ui/button.js';
```
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: `@nop-chaos/ui` 实际实现位于 `flux-lib/ui`，导出了大量通用 UI 组件与工具，但本轮范围内未发现任何 `src/**/*.test.*`。
- **建议**: 先补最容易回归的共享能力测试：`cn()/icon-utils/i18n getter/toast bridge`，再补高风险交互组件（dialog/dropdown/sidebar/tabs/select）。
- **误报排除**: `tailwind-preset`、`theme-tokens` 属于轻量配置/常量包，零测试风险低于 `flux-lib/ui`；这里指向的是实际承载 UI 面的大包。
- **复核状态**: `未复核`

### [维度12-02] `RouteRenderer` 关键分支覆盖不足，插件加载 E2E 仅覆盖 happy path
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\router\RouteRenderer.tsx:73-156; C:\can\nop\nop-chaos-next\apps\main\src\router\RouteRenderer.test.tsx:45-114; C:\can\nop\nop-chaos-next\tests\e2e\plugin-demo.spec.ts:72-99`
- **证据片段**:
```ts
if (item.pageType === 'plugin' && item.pluginUrl) {
  const manifest = resolvePluginManifest(item, plugins);

  if (!manifest?.enabled) {
    return /* plugin disabled view */;
  }

  return <PluginSlot beforeLoad={ensurePluginSharedModules} title={title} url={item.pluginUrl} />;
}
```
```ts
function resolvePluginManifest(
  item: MenuItem,
  plugins: Array<{ id: string; url: string; enabled: boolean }>,
) {
  return (
    plugins.find((plugin) => plugin.id === item.componentId) ??
```
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 实现里含有插件启停、AMIS、Flux、iframe、external、builtin fallback、403/500 等多分支；现有单测只校验了本地重写的 `resolvePluginManifest` 和 iframe sandbox，未直接覆盖真实导出函数及多数分支。E2E 仅验证插件 demo 正常加载与回跳管理页。
- **建议**: 增补单测覆盖：
  1. 插件禁用视图
  2. `PluginSlot` 调用 `beforeLoad`
  3. `Page` 缺失回落 `ServerErrorPage`
  4. `external`/`amis`/`flux` 分支
  5. 403 分支
  同时补 2 条 E2E：插件禁用、插件加载失败/超时。
- **误报排除**: 现有 `plugin-demo.spec.ts` 只证明 happy path 正常，不等于插件加载失败、禁用、fallback、权限分支已被覆盖。
- **复核状态**: `未复核`

### [维度12-03] 认证关键流缺少真实 hook / E2E 覆盖，当前测试在复制逻辑
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\hooks\useAuth.ts:22-64; C:\can\nop\nop-chaos-next\apps\main\src\hooks\useAuth.test.ts:65-94; C:\can\nop\nop-chaos-next\tests\e2e\login.spec.ts:4-20`
- **证据片段**:
```ts
const bootstrap = async () => {
  const state = useAuthStore.getState();

  if (!state.token) {
    state.setBootstrapStatus('anonymous');
    return;
  }
```
```ts
async function simulateBootstrap() {
  const mod = await import('../services/authApi');
  const state = useAuthStore.getState();

  if (!state.token) {
    state.setBootstrapStatus('anonymous');
    return;
  }
```
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: `useAuthBootstrap` 有模块级 `didBootstrapAuth`、成功恢复 session、失败 logout+toast 等关键行为；测试没有真正挂载 hook，而是手写 `simulateBootstrap()` 复制实现。E2E 只有“成功登录进入 dashboard”，没有失败登录、会话恢复、bootstrap 异常流。
- **建议**: 用真实 hook 测试替代逻辑复制；补 E2E：
  1. 已有 token 时恢复 session
  2. `fetchCurrentUser` 失败后跳回匿名态/提示
  3. 登录失败反馈
- **误报排除**: `authStore.test.ts` 只覆盖 store 行为，不覆盖 `useEffect`、单次 bootstrap 门闩、toast 与真实异步流程。
- **复核状态**: `未复核`

### [维度12-04] 权限守卫测试未测试真实 hook，只在复写纯函数
- **文件**: `C:\can\nop\nop-chaos-next\packages\core\src\hooks\usePermissionGuard.ts:3-11; C:\can\nop\nop-chaos-next\packages\core\src\hooks\usePermissionGuard.test.ts:3-30`
- **证据片段**:
```ts
export function usePermissionGuard(userRoles: string[], requiredRoles?: string[]): boolean {
  return useMemo(() => {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
```
```ts
function checkPermission(userRoles: string[], requiredRoles?: string[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 现有测试没有调用 `usePermissionGuard` 本体，而是新写了一个 `checkPermission`。这会让未来 hook 依赖、memo 依赖数组或参数处理变化时，测试仍可能“绿”。
- **建议**: 用 `renderHook` 或最小 React harness 直接测试 `usePermissionGuard`，并补边界：`requiredRoles` 引用变化、空数组、重复角色、大小写策略。
- **误报排除**: 虽然已有 `permission.spec.ts` 覆盖了一个菜单/直链权限场景，但它不能替代 hook 级回归保护。
- **复核状态**: `未复核`

### [维度12-05] Playwright 共享认证辅助文件膨胀，已成为事实上的巨大 setup
- **文件**: `C:\can\nop\nop-chaos-next\tests\e2e\support\auth.ts:17-169; C:\can\nop\nop-chaos-next\tests\e2e\support\auth.ts:359-418`
- **证据片段**:
```ts
const defaultSiteMapResponse = {
  status: 0,
  data: {
    children: [
      {
        id: 'dashboard',
        displayName: 'Dashboard',
```
```ts
await page.route('**/r/LoginApi__login?*', async (route) => {
  // ...
});
await page.route('**/r/SiteMapApi__getSiteMap', async (route) => {
  // ...
});
await page.route('**/data/menu-config.json', async (route) => {
  // ...
});
```
- **严重程度**: P2
- **类别**: setup膨胀
- **现状**: 该文件 448 行，集成了默认菜单、默认 sitemap、登录 mock、storage 清理、路由拦截、分支登录模式，几乎承担了全套共享 fixture/setup 责任。
- **建议**: 拆成 `fixtures/menu.ts`、`fixtures/auth.ts`、`helpers/login.ts`、`helpers/storage.ts`；让 spec 显式组合所需 fixture，降低单点膨胀。
- **误报排除**: 仓库中虽未发现单独 `globalSetup`，但此文件已承担类似职责，属于“事实上的 setup 膨胀”。
- **复核状态**: `未复核`

### [维度12-06] `plugin-bridge` 测试未清理全局 unsubscribe 句柄，存在隔离性隐患
- **文件**: `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\bridge.ts:33-38; C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\index.test.ts:21-23; C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\index.test.ts:110-114`
- **证据片段**:
```ts
const BRIDGE_UNSUBSCRIBE_KEY = '__NOP_PLUGIN_BRIDGE_UNSUBSCRIBE__';

export function setPluginBridge(bridge: PluginBridge) {
  const host = getHost();
  host[BRIDGE_UNSUBSCRIBE_KEY]?.();
  host[BRIDGE_KEY] = bridge;
```
```ts
const hostKey = '__NOP_PLUGIN_BRIDGE__';
const listenersKey = '__NOP_PLUGIN_BRIDGE_LISTENERS__';

beforeEach(() => {
  delete (globalThis as typeof globalThis & { [hostKey]?: PluginBridge })[hostKey];
  delete (globalThis as typeof globalThis & { [listenersKey]?: Set<() => void> })[listenersKey];
});
```
- **严重程度**: P2
- **类别**: 隔离性
- **现状**: 实现保存了 `__NOP_PLUGIN_BRIDGE_UNSUBSCRIBE__`，但测试 `beforeEach` 只清理 bridge 与 listeners，不清理 unsubscribe 句柄。未来若订阅实现变化，更容易出现跨用例残留。
- **建议**: 测试中一并删除 `__NOP_PLUGIN_BRIDGE_UNSUBSCRIBE__`，并补一条断言：bridge 替换时旧订阅确实被解绑。
- **误报排除**: 当前测试多数能过，不代表没有泄漏风险；这里只指出“清理不完整”，不是说现有测试已确定失败。
- **复核状态**: `未复核`

### [维度12-07] 多个测试文件超过 400 行，职责过重
- **文件**: `C:\can\nop\nop-chaos-next\packages\shared\src\http\client.test.ts:1-513; C:\can\nop\nop-chaos-next\packages\extension-host\src\index.test.ts:1-507; C:\can\nop\nop-chaos-next\packages\amis-core\src\core\ajax.test.ts:1-505; C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\index.test.ts:1-468; C:\can\nop\nop-chaos-next\packages\amis-core\src\core\graphqlArgs.test.ts:1-418; C:\can\nop\nop-chaos-next\packages\shared\src\utils\menu.test.ts:1-407`
- **证据片段**:
```ts
packages/shared/src/http/client.test.ts     // 513 lines
packages/extension-host/src/index.test.ts   // 507 lines
packages/amis-core/src/core/ajax.test.ts    // 505 lines
packages/plugin-bridge/src/index.test.ts    // 468 lines
packages/shared/src/utils/menu.test.ts      // 407 lines
```
- **严重程度**: P3
- **类别**: 一致性
- **现状**: 超大测试文件集中出现在跨分支、多职责模块，阅读、定位失败原因、按主题维护的成本都偏高。
- **建议**: 按主题拆分：例如 `client.auth.test.ts / client.refresh.test.ts / client.payload.test.ts`、`plugin-bridge.store.test.ts / plugin-bridge.hooks.test.ts`。
- **误报排除**: 这不是说长文件一定错误，而是当前长度已明显超过常规可维护阈值，且同仓库内普遍测试文件远短于这些文件。
- **复核状态**: `未复核`

### [维度12-08] Vitest 工作区发现规则与 `apps/main` 实际配置不一致
- **文件**: `C:\can\nop\nop-chaos-next\vitest.workspace.ts:3-8; C:\can\nop\nop-chaos-next\apps\main\package.json:16-19`
- **证据片段**:
```ts
const workspaceProjects = [
  'packages/*/vitest.config.ts',
  'apps/*/vitest.config.ts',
  'examples/*/vitest.config.ts',
  'flux-lib/*/vitest.config.ts',
];
```
```ts
"typecheck": "tsc -p tsconfig.json --noEmit",
"lint": "eslint \"src/**/*.{ts,tsx}\"",
"test": "vitest run --passWithNoTests"
```
- **严重程度**: P2
- **类别**: 一致性
- **现状**: 工作区配置按 `apps/*/vitest.config.ts` 发现 app 项目，但本轮未找到 `C:\can\nop\nop-chaos-next\apps\main\vitest.config.ts`。`apps/main` 虽有 39 个测试文件和独立 `test` 脚本，但未明显纳入工作区发现规则。
- **建议**: 二选一：
  1. 新增 `apps/main/vitest.config.ts` 并复用 `vitest.shared.ts`
  2. 调整根工作区策略，显式包含 `apps/main`
- **误报排除**: 这不是说 `apps/main` 测试跑不起来；问题是“根工作区发现方式”和“实际 app 测试入口”不一致，容易导致 CI/本地认知偏差。
- **复核状态**: `未复核`

## 补充说明
- 本轮未发现 Vitest/Playwright 混用问题。
- 本轮已检查：
  - 测试文件数量
  - 零测试包
  - 关键认证/权限/插件加载/路由分发/plugin-bridge 覆盖情况
  - 超大测试文件
  - setup 膨胀
  - mock 清理与全局状态重置
  - 测试框架模式一致性

## 深挖第 2 轮追加

### [维度12-09] 主题系统真实持久化分支缺少回归测试，当前测试基本都在绕开 `themeStore`
- **文件**: `apps/main/src/store/themeStore.ts:18-63`; `apps/main/src/pages/settings/theme/index.test.tsx:24-30`; `apps/main/src/App.test.tsx:89-91`
- **证据片段**:
```ts
merge: (persistedState, currentState) => {
  const persistedTheme = persisted?.themeConfig;
  if (!persistedTheme) {
    return currentState;
  }
  return {
    ...currentState,
    themeConfig: resolveThemeConfig({
      ...currentState.themeConfig,
      ...persistedTheme,
      themeId: normalizeThemeId(persistedTheme.themeId),
    }),
  };
},
```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 主题注册表、CSS 应用、system mode 监听都有测试，但真正高风险的 Zustand `persist + merge + normalizeThemeId + resolveThemeConfig` 组合路径没有直接测试；页面与 App 测试都在 mock store。
- **建议**: 补 `themeStore` 真实回归测试，至少覆盖非法 `themeId` 回退默认主题、合法 hydration、无持久化数据时保留默认值，以及 hydration 后 bridge 暴露规范化主题配置。
- **误报排除**: 纯函数/DOM 应用测试不覆盖真实 store 持久化合并链路。
- **复核状态**: `未复核`

### [维度12-10] `extension-demo` 的主题/语言运行时契约几乎没有回归测试，现有测试只校验静态文案存在
- **文件**: `examples/extension-demo/src/index.ts:15-18,55-66,104-107`; `examples/extension-demo/src/pages/ExtensionLoginPage.tsx:58-65,180-188`; `examples/extension-demo/src/index.test.ts:16-55`
- **证据片段**:
```ts
app: {
  defaultLanguage: 'en-US',
},
supportedLanguages: [
  { code: 'en-US', labelKey: 'settings.languageOptions.en' },
  { code: 'fr-FR', labelKey: 'settings.languageOptions.frFR' },
],
themes: [
  {
    id: 'harbor',
```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: extension demo 暴露了 `defaultLanguage/supportedLanguages/themes` 元数据，登录页也有真实 `changeLanguage` 交互；但现有测试只校验 locale JSON key 存在，不验证语言切换按钮、bridge i18n 能力、扩展主题/语言元数据的运行时消费。
- **建议**: 补 extension 侧组件测试和 host/集成侧测试，验证扩展的 `defaultLanguage/supportedLanguages/themes` 会进入宿主语言/主题注册流程。
- **误报排除**: 当前 `index.test.ts` 证明的是“翻译资源文件在”，不是“扩展主题/语言能力在运行时可用”。
- **复核状态**: `未复核`

### [维度12-11] `homePath` 与 tab 导航联动缺少真实壳层回归测试，当前只测了 store 和 redirect
- **文件**: `apps/main/src/router/AppShell.tsx:77-92`; `apps/main/src/hooks/useTabManagement.ts:21-40`; `apps/main/src/store/tabStore.test.ts:79-104`; `apps/main/src/router/AppRoutes.test.tsx:124-140`
- **证据片段**:
```ts
useEffect(() => {
  if (!currentMenu) {
    return;
  }

  registerTab({
    path: location.pathname,
    title: currentMenu.title ?? currentMenu.id,
    icon: currentMenu.icon,
    closable: location.pathname !== getCurrentHomePath(),
  });
}, [currentMenu, location.pathname, registerTab]);
```
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 现有测试覆盖了 `tabStore` 纯状态变更，以及 `AppRoutes` 的认证后重定向，但没有测试 `AppShell` 两个 effect 与 `useTabManagement` 导航耦合后的真实行为。
- **建议**: 增补 `AppShell`/`useTabManagement` 级测试，覆盖 homePath 改写后 home tab 唯一性、路由切换同步 `activePath`、`closeAllTabs` 跳到最新 `getCurrentHomePath()`。
- **误报排除**: `tabStore.test.ts` 不含 React Router 导航；`AppRoutes.test.tsx` 只验证 redirect，不验证 tab 与 route 的双向同步。
- **复核状态**: `未复核`

### [维度12-12] `ensurePluginSharedModules()` 的并发去重/失败后重试分支没有回归测试
- **文件**: `apps/main/src/plugins/sharedModules.ts:61-87`; `apps/main/src/plugins/sharedModules.test.ts:35-46`
- **证据片段**:
```ts
if (!pluginExtraModulesPromise) {
  pluginExtraModulesPromise = import('recharts')
    .then((rechartsModule) => {
      ...
      didRegisterPluginExtraModules = true;
    })
    .catch((error: unknown) => {
      pluginExtraModulesPromise = null;
      throw error;
    });
}
```
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 实现明确写了并发 promise 复用与失败后重试准备，但测试只做顺序 happy path / idempotent，未验证并发或失败恢复。
- **建议**: 补测试覆盖并发调用只触发一次注册、首次动态导入失败后第二次可重试、并发失败不会锁死内部 promise。
- **误报排除**: 顺序调用的“幂等”不等于并发安全；插件路由快速切换时最容易打到这个分支。
- **复核状态**: `未复核`

### [维度12-13] Flow 编辑器保存链路没有回归测试，`save/restore/error` 与潜在并发覆盖均处于裸奔状态
- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowPersistence.ts:18-57`; `apps/main/src/pages/flow-editor/[id]/index.test.ts:1-82`
- **证据片段**:
```ts
const saveSnapshot = useCallback(async () => {
  if (!flowDocument) {
    return;
  }
  ...
  const saved = await import('../../../services/mockApi').then((m) =>
    m.saveFlowDetail(payload),
  );
  setFlowDocument(saved);
  setSavedSnapshot(JSON.stringify({ nodes, edges }));
  toast.success(t('flowEditor.editor.saveSuccess'));
}, [flowDocument, nodes, edges, setFlowDocument, setSavedSnapshot, t]);
```
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: flow-editor 现有测试只覆盖 helper 纯函数，没有覆盖真正的保存 hook。保存成功、失败 toast、restore 使用 `savedSnapshot`、快速连点保存导致的结果覆盖顺序都没有回归保护。
- **建议**: 增补 `useFlowPersistence` 测试，覆盖 payload 结构、成功后状态更新、失败 toast、连续两次保存时只保留最后一次结果。
- **误报排除**: `mockApi.test.ts` 只证明 mock API 能存数据，不证明页面 hook 能正确处理异步保存链路。
- **复核状态**: `未复核`

### [维度12-14] Master-detail 明确存在“脏草稿防后台刷新覆盖”的竞态保护，但没有页面级回归测试
- **文件**: `apps/main/src/pages/data-management/master-detail/[id]/index.tsx:63-87,149-161,185-198`; `apps/main/src/pages/data-management/master-detail/detailState.test.ts:1-31`
- **证据片段**:
```ts
useEffect(() => {
  if (!detailQuery.data) {
    return;
  }

  const next = normalizeOrder(detailQuery.data);
  const savedSnapshot = savedStateRef.current;

  setDraft((current) => {
    if (current && savedSnapshot && hasOrderChanged(current, savedSnapshot)) {
      return current;
    }
```
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 详情页已经写了明显的竞态防护：后台 refetch 到来时，如果当前 draft 相对 saved snapshot 已变脏，就不要覆盖用户编辑；但现有测试只有 `detailState` 纯函数和 utils 校验，没有页面级异步回归测试。
- **建议**: 补页面/hook 测试覆盖用户编辑后后台 refetch 不覆盖脏 draft、保存成功后 `savedState` 与 `draft` 一起推进、保存失败保留草稿、`beforeunload` 与离开确认只在 dirty 时触发。
- **误报排除**: 这里不是“想当然的竞态风险”，实现里已经有专门保护逻辑；没有测试意味着这条保护极易在后续重构中失效。
- **复核状态**: `未复核`

## 深挖第 3 轮追加

### [维度12-15] `useMenuConfigQuery` 的鉴权缓存分片缺少直接回归测试
- **文件**: `apps/main/src/hooks/useMenuConfig.ts:6-15`; `apps/main/src/App.test.tsx:77-83`; `apps/main/src/router/AppRoutes.test.tsx:54-60`
- **证据片段**:
```ts
export function useMenuConfigQuery(enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  const token = useAuthStore((state) => state.token);

  return useQuery<MenuResponse>({
    queryKey: ['menus', userId ?? 'anonymous', token ? 'token' : 'no-token'],
    queryFn: fetchMenuConfig,
    enabled,
```
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 该 hook 实际负责菜单请求的用户态缓存隔离与启停控制，但现有测试主要覆盖 `menuApi/mockApi`，而 `App`、`AppRoutes` 测试又直接 mock 掉了 `useMenuConfigQuery`，未见直接验证 `queryKey` 分片、`enabled=false` 抑制请求、匿名态与登录态切换后的缓存边界。
- **建议**: 增补 hook 级测试，至少覆盖匿名态 queryKey、登录态 queryKey、`enabled=false` 不发请求、用户切换后 query key 隔离、token 从无到有时重新进入正确缓存桶。
- **误报排除**: `menuApi.test.ts` 只证明请求封装可用，`App/AppRoutes` 现有测试也只是消费方 mock，并未验证这个 hook 的真实缓存键与鉴权隔离策略。
- **复核状态**: `未复核`

### [维度12-16] Flow 编辑器核心交互钩子缺少回归测试，撤销/重做/复制粘贴/Delete 与脏状态保护未被覆盖
- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowHistory.ts:22-48`; `apps/main/src/pages/flow-editor/[id]/useFlowKeyboardShortcuts.ts:38-90`; `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts:168-179`; `apps/main/src/pages/flow-editor/[id]/index.test.ts:1-82`; `tests/e2e/flow-editor.spec.ts:72-114`
- **证据片段**:
```ts
if (meta && event.key.toLowerCase() === 'z') {
  event.preventDefault();
  if (event.shiftKey) {
    handleRedo();
  } else {
    handleUndo();
  }
}

if (event.key === 'Delete') {
```
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 当前单测仅覆盖 helper 纯函数，E2E 只覆盖拖拽与双击编辑 happy path；真正高风险的历史栈、快捷键、复制粘贴、删除请求、dirty 状态下 `beforeunload` 保护都没有直接回归测试。
- **建议**: 增补 hook/组件级测试，优先覆盖撤销、重做、复制粘贴、start 节点粘贴限制、Delete 对 node/edge 的删除请求、dirty 时 `beforeunload`、redo 链截断与历史上限。
- **误报排除**: 现有 `index.test.ts` 不涉及真实 hook 生命周期与键盘事件；`flow-editor.spec.ts` 也未覆盖 undo/redo、clipboard、Delete 或离页保护。
- **复核状态**: `未复核`

### [维度12-17] `useShellConfig` 测试通过 mock React 内部实现来替代真实订阅，无法验证运行时更新链路
- **文件**: `apps/main/src/hooks/useShellConfig.ts:4-9`; `apps/main/src/hooks/useShellConfig.test.ts:3-24`; `packages/extension-host/src/runtime.ts:108-138`
- **证据片段**:
```ts
vi.mock('react', () => ({
  useSyncExternalStore: vi.fn(
    (
      subscribe: (listener: () => void) => () => void,
      getSnapshot: () => unknown,
      _getServerSnapshot: () => unknown,
    ) => {
```
- **严重程度**: P2
- **类别**: 一致性
- **现状**: `useShellConfig` 本体只是对 `useSyncExternalStore(subscribeShellRuntimeConfig, getShellRuntimeConfig)` 的封装，但现有测试把 React 的 `useSyncExternalStore` 直接 mock 掉，只验证“拿到了 snapshot”，没有验证真实 rerender、监听解绑、`setShellRuntimeConfig()` 后订阅更新是否生效。
- **建议**: 使用真实 React renderHook 或最小 harness 直接测试 `useShellConfig`，并联动真实 `setShellRuntimeConfig/getShellRuntimeConfig/subscribeShellRuntimeConfig`，验证首次快照、运行时更新触发 rerender、卸载后不再响应。
- **误报排除**: runtime 测试只证明 store API 自身可 round-trip，不等于 `useShellConfig` 与 React 订阅桥接正确；当前问题指向的是测试方法失真。
- **复核状态**: `未复核`

## 维度复核结论

- [维度12-01]: 降级 (P2)。`flux-lib/ui` 源码层确实未见 `src/**/*.test.*`，但仓库存在 `dist/**/*.test.js` 与 `flux-lib/ui/vitest.config.ts`，更准确是源码侧覆盖不足而非“零测试”。
- [维度12-02]: 保留 (P1)。`RouteRenderer` 的 `beforeLoad`、`external/amis/flux`、builtin 缺失回落 500 等关键分支仍未直接覆盖。
- [维度12-03]: 保留 (P1)。`useAuth.test.ts` 仍复制 bootstrap 逻辑，`login.spec.ts` 仍只覆盖成功登录。
- [维度12-04]: 保留 (P2)。`usePermissionGuard.test.ts` 仍测试本地重写的 `checkPermission`，不是 hook 本体。
- [维度12-05]: 保留 (P2)。`tests/e2e/support/auth.ts` 仍是 448 行的复合 setup 辅助文件。
- [维度12-06]: 降级 (P3)。`plugin-bridge` 测试未清理 unsubscribe 句柄属实，但更像隔离性技术债。
- [维度12-07]: 降级 (P3)。多个测试文件超过 400 行属实，但主要是可维护性问题。
- [维度12-08]: 降级 (P3)。Vitest 工作区与 `apps/main` 测试入口不一致，但 `apps/main` 仍可直接跑 `vitest run`。
- [维度12-09]: 保留 (P2)。`themeStore` 持久化 `merge + normalizeThemeId + resolveThemeConfig` 仍无直接回归测试。
- [维度12-10]: 降级 (P3)。`extension-demo` 并非只校验静态文案，但主题/语言元数据被宿主消费的契约测试仍不足。
- [维度12-11]: 保留 (P1)。`AppShell`/`useTabManagement` 对 `homePath`、tab 注册、activePath 同步、closeAll 跳转仍无真实壳层联动测试。
- [维度12-12]: 保留 (P1)。`ensurePluginSharedModules()` 并发去重与失败后重试分支仍无回归测试。
- [维度12-13]: 保留 (P1)。`useFlowPersistence` 仍无直接测试，save/restore/error 链路裸奔。
- [维度12-14]: 降级 (P2)。页面级回归测试并非完全没有，但“脏草稿不被后台 refetch 覆盖”等关键竞态守卫仍缺针对性覆盖。
- [维度12-15]: 保留 (P1)。`useMenuConfigQuery` 的真实 `queryKey` 分片与 `enabled` 行为仍未直接测试。
- [维度12-16]: 保留 (P1)。Flow 编辑器仍缺撤销/重做、复制粘贴、Delete、dirty 离页保护等核心交互回归测试。
- [维度12-17]: 保留 (P2)。`useShellConfig.test.ts` 仍通过 mock `useSyncExternalStore` 替代真实订阅链路。

## 子项复核结论

- [维度12-02]: 子项复核通过。`RouteRenderer` 的多个关键分支与失败态仍缺直接回归测试。
- [维度12-03]: 子项复核通过。`useAuthBootstrap` 与失败登录/会话恢复场景仍缺真实 hook/E2E 覆盖。
- [维度12-11]: 子项复核通过。`AppShell`/`useTabManagement` 与 `homePath`/tab 联动仍无真实壳层测试。
- [维度12-12]: 子项复核通过。`ensurePluginSharedModules()` 并发去重与失败重试仍无测试。
- [维度12-13]: 子项复核通过。`useFlowPersistence` 的保存/恢复/失败链路仍无直接测试。
- [维度12-15]: 子项复核通过。`useMenuConfigQuery` 的 queryKey 分片与 enabled 行为仍无直接测试。
- [维度12-16]: 子项复核通过。Flow 编辑器的撤销/重做、复制粘贴、Delete、dirty 离页保护仍无覆盖。
