# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

第 1 轮初审结论：4 个发现，3 个代码/API 面问题，1 个文档契约漂移。

### [维度03-01] TS 路径别名允许深层子路径，但 package.json exports 未声明
- **文件**: `C:\can\nop\nop-chaos-next\tsconfig.base.json:22-39`；`C:\can\nop\nop-chaos-next\packages\shared\package.json:5-7`
- **证据片段**:
```ts
"@nop-chaos/shared/*": ["packages/shared/src/*"],
"@nop-chaos/amis-core/*": ["packages/amis-core/src/*"],
"@nop-chaos/plugin-bridge/*": ["packages/plugin-bridge/src/*"],
"@nop-chaos/ui/*": ["flux-lib/ui/src/*"],

"exports": {
  ".": "./src/index.ts"
}
```
- **严重程度**: P2
- **现状**: `tsconfig.base.json` 为多个包开放了 `@nop-chaos/*` 的 wildcard 子路径解析，但各包 `package.json` 大多只声明了 `.` 根导出（`@nop-chaos/ui` 仅额外声明 `./chart`、`./lib/utils`）。
- **风险**: 工作区内新代码可以合法写出深层导入并通过 TS 检查，但打包/外部消费时会被 `exports` 拒绝，导致“本地可用、对外不可用”的契约分裂。
- **建议**: 二选一：1) 删除不打算公开的 wildcard path alias；2) 为确实公开的子路径补齐 `package.json.exports`，并将其视为正式 API。
- **误报排除**: 本轮 grep 未发现 `apps/main`、`packages/core`、`packages/plugin-bridge` 现有代码使用 `@nop-chaos/*/<subpath>` 或直接导入 `packages/*/src/*`；问题是“契约已放宽但未声明”，不是现存调用点已破坏。
- **复核状态**: `未复核`

### [维度03-02] extension-host 根入口暴露了可变 runtime setter，公共表面积混入测试向接口
- **文件**: `C:\can\nop\nop-chaos-next\packages\extension-host\src\index.ts:2-18`
- **证据片段**:
```ts
export {
  resolveShellRuntimeConfig,
  mergeExtensionMenus,
  setLoadedExtensions,
  getLoadedExtensions,
  setShellRuntimeConfig,
  subscribeShellRuntimeConfig,
  getShellRuntimeConfig,
```
- **严重程度**: P2
- **现状**: `@nop-chaos/extension-host` 把 `setLoadedExtensions`、`setShellRuntimeConfig`、`getLoadedExtensions` 一并暴露到公共入口；实际生产代码主要消费的是 `mergeExtensionMenus`、`getShellRuntimeConfig`、`subscribeShellRuntimeConfig`、`getSystemPageComponentId` 等读取型 API。
- **风险**: 外部调用方可绕过 `loadExtensions/resolveShellRuntimeConfig` 正常流程直接篡改全局运行态，导致 host/runtime 契约难以稳定，也会放大测试辅助接口被误用到业务代码的概率。
- **建议**: 将 setter/内部状态访问拆到 internal/test-only 入口；公共入口保留只读/组合后的 runtime API。
- **误报排除**: grep 显示 `setLoadedExtensions`、`setShellRuntimeConfig` 的仓内使用几乎都在测试；未把 `mergeExtensionMenus`、`getShellRuntimeConfig` 这类真实生产 API 误判为泄露。
- **复核状态**: `未复核`

### [维度03-03] shared 根入口导出了 token refresh 协调内部状态，泄露实现细节
- **文件**: `C:\can\nop\nop-chaos-next\packages\shared\src\index.ts:53-71`；`C:\can\nop\nop-chaos-next\packages\shared\src\auth\tokenManager.ts:91-96`
- **证据片段**:
```ts
setRefreshTokenFetcher,
getRefreshPromise,
setRefreshPromise,

export function setRefreshPromise(promise: Promise<string> | null): void {
  refreshPromise = promise;
}
```
- **严重程度**: P2
- **现状**: `getRefreshPromise/setRefreshPromise` 被从根入口公开；它们本质上是 `createHttpClient` 与 token manager 之间用于“单飞刷新”的内部协调状态。
- **风险**: 外部消费者可以读取/覆盖全局 refresh promise，破坏鉴权并发语义，把内部状态机固化成外部契约，后续难以重构。
- **建议**: 将 `getRefreshPromise/setRefreshPromise` 收回内部模块；根入口只暴露真正需要被 host/app 调用的 auth API。
- **误报排除**: 本轮未把 `getValidToken`、`setTokens`、`clearTokens` 这类已有真实调用点的 API 一并判为问题；问题集中在 refresh 协调原语。
- **复核状态**: `未复核`

### [维度03-04] MenuItem 文档契约仍声明二值 pageType，与实际公共类型六值联合不一致
- **文件**: `C:\can\nop\nop-chaos-next\AGENTS.md:180-187`；`C:\can\nop\nop-chaos-next\packages\shared\src\types\menu.ts:1-18`
- **证据片段**:
```ts
// AGENTS.md
- Current menu model supports `pageType: 'builtin' | 'plugin'`.

// packages/shared/src/types/menu.ts
pageType: 'builtin' | 'plugin' | 'amis' | 'flux' | 'iframe' | 'external';
```
- **严重程度**: P3
- **现状**: 代码内 `MenuItem`、`validateMenuResponse`、`menuMapper`、`RouteRenderer` 已一致支持 6 种 `pageType`，但 AGENTS 仍写成 2 种。
- **风险**: 后续评审、扩展实现、接口讨论可能基于过期契约做错误判断，形成文档/代码双轨。
- **建议**: 更新 AGENTS 中菜单模型说明，至少同步到当前六值联合；若想收敛，应先改代码与校验器，再改文档。
- **误报排除**: 这不是孤立类型残留；`validateMenuResponse` 和 `RouteRenderer` 均已落地处理 `amis/flux/iframe/external`。
- **复核状态**: `未复核`

## 契约一致性结论
- `MenuItem`: 代码契约基本一致；问题主要是 AGENTS 文档滞后。
- `PluginBridge`: `packages/plugin-bridge/src/types.ts` 与 `apps/main/src/App.tsx` 的实际注入对象一致，未见漂移。
- `ShellExtension`: `packages/shared/src/types/extension.ts`、`packages/extension-host/src/loadExtensions.ts`、`packages/extension-host/src/runtime.ts`、`examples/extension-demo/src/index.ts` 一致，未见跨包漂移。

## 其他检查结论
- 未发现 `apps/main`、`packages/core`、`packages/plugin-bridge` 直接导入未经过 index 的源码文件。
- 未发现 `@nop-chaos/shared/...`、`@nop-chaos/core/...`、`@nop-chaos/plugin-bridge/...` 等深层子路径的现有消费点。
- `package.json exports` 与各包 `src/index.ts` 当前根入口总体对齐；主要问题是“TS path alias 比 exports 更宽”。

## 每包 API 表面积报告

### `@nop-chaos/shared`
- **type 导出**: icon、extension、menu、plugin、tab、theme、user、auth/http 相关类型。
- **value 导出**: auth config/token manager、HTTP client/url、menu validator/utils、theme/icon helper。
- **观察**: 表面积最大；混合了稳定契约与明显内部实现原语，收敛空间最大。

### `@nop-chaos/core`
- **type 导出**: `AppIconProps`、`AppIconComponent`、`BreadcrumbItem`、`LowCodeIconProps`
- **value 导出**: layout/components、`usePermissionGuard`、icon helper、SystemJS helper
- **观察**: UI 组件导出合理；`utils/systemjs` 属低层运行时能力，建议继续区分高层/低层 API。

### `@nop-chaos/plugin-bridge`
- **type 导出**: `BridgeI18n`、`BridgeSnapshot`、`PluginBridge*`
- **value 导出**: bridge getter/setter/subscribe/snapshot + React hooks
- **观察**: Host 侧注入 API 与 plugin 侧消费 API 在同一入口；目前契约一致。

### `@nop-chaos/extension-host`
- **type 导出**: `ShellRuntimeConfig`、`ShellBrandingRuntimeConfig`、`ShellLoginUiRuntimeConfig`
- **value 导出**: extension load/merge/runtime accessor
- **观察**: 读写型 runtime API 混出到同一公共入口；setter 明显偏 internal/test。

### `@nop-chaos/theme-tokens`
- **type 导出**: `TokenName`
- **value 导出**: `TOKEN_NAMES`
- **exports**: `.` + `./styles.css`
- **观察**: 表面积小且清晰，index 与 exports 对齐。

### `@nop-chaos/tailwind-preset`
- **type 导出**: 无显式 type barrel
- **value 导出**: `nopTailwindPreset`
- **观察**: 单一配置型 API，收敛良好。

### `@nop-chaos/amis-core`
- **type 导出**: request/runtime/page/schema 相关类型
- **value 导出**: ajax/graphql/url/runtime adapter/page transform/xui registry
- **观察**: 运行时与 registry/helper 同包暴露，API 面较宽，但当前消费关系基本一致。

### `@nop-chaos/amis-react`
- **type 导出**: `AmisPageRouteProps`、`AmisSchemaPageProps`
- **value 导出**: `createAmisEnv`、若干 React 组件
- **观察**: 表面积较清晰。

### `@nop-chaos/ui`（实际源码位于 `flux-lib/ui`）
- **type 导出**: root 显式有 `LucideIconComponent`，其余大量来自 `export *`
- **value 导出**: 50+ UI primitives、`Toaster`、`toast`、`cn`、`setI18nGetter`、`useIsMobile`、icon utils
- **exports**: `.`、`./chart`、`./lib/utils`、CSS 子路径
- **观察**: 根 barrel 很宽；当前 audited 消费点未使用未声明子路径。

## 问题清单
1. `P2` TS path alias 宽于 package exports，形成潜在公开契约分裂。
2. `P2` `@nop-chaos/extension-host` 暴露了 mutable runtime/testing API。
3. `P2` `@nop-chaos/shared` 暴露了 refresh promise 协调内部状态。
4. `P3` `MenuItem.pageType` 的文档契约落后于代码。

## 深挖第 2 轮追加

### [维度03-05] `@nop-chaos/plugin-bridge` 根入口把 host 注入 setter 暴露给所有 remote plugin，公共桥接面可被反向篡改
- **文件**: `packages/plugin-bridge/src/index.ts:6-7`; `packages/plugin-bridge/src/bridge.ts:33-39`; `apps/main/src/plugins/sharedModules.ts:14,30`; `apps/main/src/App.tsx:116-118`
- **证据片段**:
```ts
export { setPluginBridge, getPluginBridge, subscribePluginBridge, getPluginBridgeSnapshot };

const baseSharedModules = {
  '@nop-chaos/plugin-bridge': PluginBridgeLib,
};

useLayoutEffect(() => {
  setPluginBridge(pluginBridge);
}, [pluginBridge, bridgeSnapshot]);
```
- **严重程度**: P2
- **现状**: `setPluginBridge()` 是 host 注入 bridge 的内部写入口，但它和只读 getter/subscribe 一起从根入口公开；host 又把整个 `@nop-chaos/plugin-bridge` 模块作为 shared module 暴露给 remote plugin。
- **风险**: 任意 remote plugin 都可以直接重写全局 bridge，影响自身和其它插件读取到的用户、主题、导航、通知与 store 视图；host-only 注入能力被错误提升为 plugin-facing 公共契约。
- **建议**: 将 `setPluginBridge` 拆到 host-only/internal 入口；plugin-facing 根入口只保留只读 hooks/selector API。
- **误报排除**: 仓内生产代码里 `setPluginBridge()` 的真实调用点只有 host `App.tsx`；示例 plugin/extension 并不需要该 setter 才能工作。
- **复核状态**: `未复核`

### [维度03-06] `@nop-chaos/shared` 根入口仍暴露全局 auth runtime policy setter，外部包可改写宿主鉴权契约
- **文件**: `packages/shared/src/index.ts:50-51`; `packages/shared/src/auth/config.ts:21-30`; `apps/main/src/plugins/sharedModules.ts:13,31`; `apps/main/src/services/authApi.ts:143-153`
- **证据片段**:
```ts
export { getAuthConfig, setAuthConfig, resetAuthConfig } from './auth/config';

export function setAuthConfig(config: Partial<AuthRuntimeConfig>): void {
  runtimeConfig = { ...runtimeConfig, ...config };
}

const baseSharedModules = {
  '@nop-chaos/shared': SharedLib,
};
```
- **严重程度**: P2
- **现状**: 根入口公开了 `setAuthConfig/resetAuthConfig`，但仓内生产代码主要只读取 `getAuthConfig()`；与此同时，host 把整个 `@nop-chaos/shared` 暴露给 remote plugin。
- **风险**: 外部调用方可在运行时改写 `refreshTokenEndpoint`、`tokenStorage`、`persistRefreshToken`、`enableAutoRefresh` 等全局 auth 策略，把应由宿主 bootstrap 决定的鉴权配置变成可被插件任意改写的公共 API。
- **建议**: 将 `setAuthConfig/resetAuthConfig` 收回 app/bootstrap/internal 层；公共根入口仅保留类型与必要只读 API，或改成一次性初始化接口。
- **误报排除**: 这里不是把 `getAuthConfig()` 的正常读取误判为问题；问题集中在“全局配置写入口”被作为公共表面积暴露。
- **复核状态**: `未复核`

### [维度03-07] plugin-bridge 文档与官方 extension 示例已漂移：文档推荐细粒度 hooks，示例却依赖未文档化的 raw bridge/store 面
- **文件**: `docs/design/plugin-system.md:44-57`; `docs/examples/plugin-dev-guide.md:43-50,157-160`; `examples/extension-demo/src/pages/ExtensionLoginPage.tsx:4-33,35-82`; `examples/extension-demo/src/pages/ExtensionNotFoundPage.tsx:2-16`
- **证据片段**:
```md
| 当前主题 | `usePluginThemeConfig()` |
| 当前用户 | `usePluginUser()` |
- 过度依赖整包 `usePluginBridge()`（推荐使用细粒度 hooks）
```
```ts
import {
  getPluginBridge,
  usePluginBridge,
  usePluginI18n,
  usePluginNotifications,
} from '@nop-chaos/plugin-bridge';

const authStore = bridge.stores.authStore as BridgeAuthStore;
```
- **严重程度**: P2
- **现状**: 文档把细粒度 hooks 描述为推荐/正式入口，并明确不鼓励依赖整包 `usePluginBridge()`；但官方 `extension-demo` 直接使用 `getPluginBridge()/usePluginBridge()` 与 `bridge.stores.authStore`，甚至通过类型断言读取未文档化 action。
- **风险**: 官方示例会被当成真实契约复制；若文档口径正确，则示例已在消费内部面；若示例口径正确，则当前文档低估了公开契约范围，未来收敛 API 时容易造成外部 breakage。
- **建议**: 二选一：要么将 raw bridge/stores（含可用 action 面）正式写入文档并视为稳定契约；要么重写 `extension-demo`，只使用已文档化的 hooks/能力。
- **误报排除**: 问题不是 `usePluginI18n/usePluginNotifications` 等已文档化 API，而是官方示例额外依赖了文档未承诺的 raw bridge/store 面。
- **复核状态**: `未复核`

## 深挖第 3 轮追加

### [维度03-08] `@nop-chaos/shared` 根入口暴露 refresh fetcher 写入口，且 host 将整包共享给 remote plugin，插件可接管全局刷新链路
- **文件**: `packages/shared/src/index.ts:53-71`; `packages/shared/src/auth/tokenManager.ts:108-112`; `apps/main/src/plugins/sharedModules.ts:30-31`; `apps/main/src/services/http.ts:47-64`
- **证据片段**:
```ts
export {
  createTokenStorage,
  getTokenStorage,
  resetTokenStorage,
  setRefreshTokenFetcher,
  ...
} from './auth/tokenManager';

export function setRefreshTokenFetcher(fetcher: RefreshTokenFetcher): void {
  refreshTokenFetcher = fetcher;
}
```
- **严重程度**: P2
- **现状**: `setRefreshTokenFetcher()` 是宿主初始化 HTTP/auth 刷新流程的内部注入点，但它通过 `@nop-chaos/shared` 根入口公开，并被 host 作为 shared module 暴露给 remote plugin。
- **风险**: 任意 plugin 都可替换全局 refresh fetcher，接管后续 token 刷新请求，读取 refresh token、改写返回 token 或制造全局鉴权异常；bootstrap-only 能力被错误提升为公共 API。
- **建议**: 将 `setRefreshTokenFetcher` 与相邻的 `resetTokenStorage` 收回 internal/bootstrap-only 入口；shared 根入口只保留读取型或真正需要给外部消费的 auth API。
- **误报排除**: 仓内生产代码对 `setRefreshTokenFetcher()` 的真实使用点只有 host 初始化；未见 plugin/demo 需要该写入口才能工作。
- **复核状态**: `未复核`

### [维度03-09] `@nop-chaos/ui` 根入口暴露全局 i18n setter，且 host 将整包共享给 plugin，插件可改写宿主/UI 文案解析器
- **文件**: `flux-lib/ui/src/index.ts:56-60`; `flux-lib/ui/src/lib/i18n.ts:15-23`; `apps/main/src/plugins/sharedModules.ts:31-32`; `apps/main/src/main.tsx:88`
- **证据片段**:
```ts
export { setI18nGetter } from './lib/i18n.js';

let i18nGetter: ((key: string) => string) | null = null;

export function setI18nGetter(getter: ((key: string) => string) | null) {
  i18nGetter = getter;
}
```
- **严重程度**: P2
- **现状**: `setI18nGetter()` 是 UI 库全局翻译解析器的可变写入口，正常只应由宿主启动时设置；但它从 `@nop-chaos/ui` 根入口公开，且整个 UI 包被共享给 remote plugin。
- **风险**: plugin 可覆写全局 `i18nGetter`，影响宿主和其它插件中依赖 UI 内置文案解析的组件，形成跨插件的全局副作用；bootstrap-only 能力被错误纳入公共契约。
- **建议**: 将 `setI18nGetter()` 拆到 app/internal 入口；plugin-facing 的 `@nop-chaos/ui` 根入口只保留稳定组件与工具函数。
- **误报排除**: 仓内对 `setI18nGetter()` 的实际生产调用仅见宿主初始化路径；现有 plugin/demo 并不依赖该 setter 才能渲染。
- **复核状态**: `未复核`

### [维度03-10] `getShellRuntimeConfig()` 名义上是读 API，实际返回可变全局单例；外部可绕过 setter 静默改写宿主 runtime
- **文件**: `packages/extension-host/src/runtime.ts:91-138`
- **证据片段**:
```ts
let shellRuntimeConfig: ShellRuntimeConfig = defaultShellRuntimeConfig;

export function getShellRuntimeConfig(): ShellRuntimeConfig {
  return shellRuntimeConfig;
}
```
- **严重程度**: P2
- **现状**: `getShellRuntimeConfig()` 直接暴露内部对象引用，不是只读快照；调用方可修改其嵌套字段，且不会触发 `subscribeShellRuntimeConfig()` 通知。
- **风险**: API 表面看似“读接口”，实则保留无通知写能力；会破坏 `useSyncExternalStore` 快照语义，并让 runtime 配置出现“状态已变、订阅者未感知”的隐性契约裂缝。
- **建议**: 返回冻结/克隆后的只读快照，并将返回类型收紧为 `Readonly<ShellRuntimeConfig>`。
- **误报排除**: 这不是泛泛讨论“对象可变”；这里的对象正被 `useSyncExternalStore` 风格订阅消费，返回 live 引用会直接削弱外部存储契约。
- **复核状态**: `未复核`

### [维度03-11] `getAuthConfig()` 同样泄露可变 auth policy；即使隐藏 setter，插件仍可通过 getter 改写全局鉴权契约
- **文件**: `packages/shared/src/auth/config.ts:19-31`; `apps/main/src/plugins/sharedModules.ts:22-37`
- **证据片段**:
```ts
let runtimeConfig: AuthRuntimeConfig = { ...defaultConfig };

export function getAuthConfig(): AuthRuntimeConfig {
  return runtimeConfig;
}
```
- **严重程度**: P2
- **现状**: `getAuthConfig()` 返回 live `runtimeConfig` 引用；而 `@nop-chaos/shared` 又被 host 整包暴露给 remote plugin。
- **风险**: 外部代码可直接通过 getter 返回值赋值改写 `enableAutoRefresh`、`tokenStorage`、`refreshTokenEndpoint` 等全局策略，形成伪只读 API 的隐藏写通道。
- **建议**: `getAuthConfig()` 仅返回只读快照或冻结对象；把可写初始化限制在 bootstrap/internal 层。
- **误报排除**: 问题不依赖显式 setter 是否可见；即使后续隐藏 setter，只要 getter 返回 live 引用，外部仍可改写内部状态。
- **复核状态**: `未复核`

## 维度复核结论

- [维度03-01]: 保留 (P2)。`tsconfig.base.json` 为多个包开放 wildcard 深层别名，而各包 `package.json.exports` 大多只声明根入口，契约放宽与公开导出不一致。
- [维度03-02]: 降级 (P3)。`@nop-chaos/extension-host` 暴露 mutable runtime setter 属实，但目前主要被 host 内部与测试消费，未像 shared/plugin-bridge/ui 那样共享给 plugin。
- [维度03-03]: 保留 (P2)。`@nop-chaos/shared` 根入口导出 `getRefreshPromise/setRefreshPromise`，公开表面积泄露内部刷新状态机。
- [维度03-04]: 保留 (P3)。`AGENTS.md` 仍写二值 `pageType`，但 `MenuItem` 公共类型已是六值联合。
- [维度03-05]: 保留 (P2)。`@nop-chaos/plugin-bridge` 根入口仍把 `setPluginBridge` 暴露给 remote plugin。
- [维度03-06]: 保留 (P2)。`@nop-chaos/shared` 根入口仍暴露 `setAuthConfig/resetAuthConfig`，且 host 继续共享整包给 plugin。
- [维度03-07]: 降级 (P3)。文档/示例漂移部分成立，但需收窄到 `bridge.stores.authStore` 等未文档化 action 面。
- [维度03-08]: 保留 (P2)。`setRefreshTokenFetcher` 仍从 shared 根入口公开并被 host 整包共享。
- [维度03-09]: 保留 (P2)。`@nop-chaos/ui` 根入口仍导出 `setI18nGetter`，plugin 可改写全局 UI 文案解析器。
- [维度03-10]: 保留 (P2)。`getShellRuntimeConfig()` 仍直接返回 live `shellRuntimeConfig` 引用，保留隐式可写通道。
- [维度03-11]: 保留 (P2)。`getAuthConfig()` 同样返回 live `runtimeConfig` 引用，即使隐藏 setter 仍可被外部改写。
