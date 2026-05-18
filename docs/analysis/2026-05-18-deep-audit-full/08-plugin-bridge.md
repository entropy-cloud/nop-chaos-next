# 维度 08：插件桥接与共享模块

## 第 1 轮（初审）

第 1 轮初审结论：发现 3 个问题；其余已核查项中，`PluginSlot` 的 loading/error/timeout 与 `ErrorBoundary` 包裹链路基本成立。

### [维度08-01] Bridge 暴露的 `stores` 形态伪装成 Zustand hook，但实际不具备响应式订阅语义
- **文件**: `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\types.ts:21-40`, `C:\can\nop\nop-chaos-next\apps\main\src\plugins\boundStore.ts:13-20`
- **证据片段**:
```ts
// types.ts
type BoundStore<T> = {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
};

// boundStore.ts
export function createBoundStore<T>(store: StoreApi<T>): BoundStore<T> {
  const bound = (<U>(selector?: (state: T) => U) => {
    const state = store.getState();
    return selector ? selector(state) : state;
  }) as BoundStore<T>;
```
- **严重程度**: P1
- **类别**: 契约完整性
- **现状**: 类型把 `bridge.stores.authStore/themeStore/pluginStore` 声明成可直接在组件中调用的 Zustand bound store 形态，但 host 实现只是一次性同步读取 `getState()`，不会像真正的 Zustand hook 那样在状态变化时触发重渲染。
- **风险**: 第三方插件若按契约直觉写 `bridge.stores.authStore((s) => s.user)`，界面会拿到初始值但后续不响应宿主状态变化，形成“看起来能用、实际是静态快照”的隐性契约破坏。
- **建议**: 二选一：
  1. 把 `createBoundStore` 改成 `useSyncExternalStore` 驱动的真正响应式 bound hook；或
  2. 收窄公开类型，不再伪装成 hook，只暴露 `getState/subscribe` 之类显式 API。
- **误报排除**: 这不是在讨论当前 `usePluginUser/usePluginThemeConfig` hooks；问题在于 `PluginBridge.stores` 已是公开契约，且类型与实现不一致。
- **复核状态**: `未复核`

### [维度08-02] Bridge 注入缺少卸载清理路径，宿主卸载后全局 bridge 与订阅可能残留
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\App.tsx:119-121`, `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\bridge.ts:33-39`
- **证据片段**:
```ts
// App.tsx
useLayoutEffect(() => {
  setPluginBridge(pluginBridge);
}, [pluginBridge, bridgeSnapshot]);

// bridge.ts
export function setPluginBridge(bridge: PluginBridge) {
  const host = getHost();
  host[BRIDGE_UNSUBSCRIBE_KEY]?.();
  host[BRIDGE_KEY] = bridge;
  host[BRIDGE_UNSUBSCRIBE_KEY] = bridge.subscribe(notifyBridgeListeners);
  notifyBridgeListeners();
}
```
- **严重程度**: P2
- **类别**: 故障隔离
- **现状**: App 挂载时会 `setPluginBridge()`，但卸载时没有对应 cleanup；`bridge.ts` 也只提供 set/get/subscribe，没有 clear/reset API。
- **风险**: 在宿主 root 被销毁/重挂载、测试容器反复 mount/unmount、或未来 shell 被嵌入更大容器时，旧 bridge 可能继续保留旧的 `navigate`/toast/store/i18n 订阅引用，造成残留监听、死引用导航或卸载后仍可调用的全局桥接对象。
- **建议**: 增加显式清理能力，例如 `clearPluginBridge()` 或允许 `setPluginBridge(undefined)`；并在 `App` 的 `useLayoutEffect` cleanup 中执行解除订阅与全局清空。
- **误报排除**: 这不是在说“路由切换时 bridge 不应重建”；当前代码已通过 `getCurrentPath()` 规避 route-only 重建，但 root 卸载场景仍无回收路径。
- **复核状态**: `未复核`

### [维度08-03] `plugin-demo` 将 `systemjs` 声明为 peerDependency，但未纳入 shared/external 对齐合同
- **文件**: `C:\can\nop\nop-chaos-next\examples\plugin-demo\package.json:30-44`, `C:\can\nop\nop-chaos-next\examples\plugin-demo\scripts\build-with-rollup.mjs:22-38`, `C:\can\nop\nop-chaos-next\apps\main\src\plugins\sharedModules.ts:22-37`
- **证据片段**:
```ts
// package.json
"peerDependencies": {
  "@nop-chaos/plugin-bridge": "workspace:*",
  ...
  "systemjs": "^6.15.1",
  "zustand": "^5.0.12"
}

// build-with-rollup.mjs
external: [
  '@nop-chaos/plugin-bridge',
  '@nop-chaos/shared',
  '@nop-chaos/ui',
  'react',
  ...
  'sonner',
]
```
- **严重程度**: P3
- **类别**: SystemJS配置
- **现状**: `plugin-demo` 把 `systemjs` 列为 peer，但 rollup external 列表没有它，host `sharedModules.ts` 也没有注册它；实际运行语义更接近“宿主提供全局 SystemJS loader”，而不是“通过 shared modules/peer import 提供 `systemjs` 包”。
- **风险**: 会把插件运行前提描述成错误的依赖合同，增加接入方误判：以为需要通过 shared module/peer 安装满足 `systemjs`，但真实要求是宿主全局存在 `System`。
- **建议**: 删除 `examples/plugin-demo/package.json` 中的 `systemjs` peerDependency，或把它明确改成文档层前置条件，不作为 shared/peer 合同的一部分。
- **误报排除**: 这里不是要求把 `systemjs` 也注册进 sharedModules；相反，问题在于当前 peer 声明与真实加载方式不一致。
- **复核状态**: `未复核`

## 检查范围
- `C:\can\nop\nop-chaos-next\docs\index.md`
- `C:\can\nop\nop-chaos-next\AGENTS.md`
- `C:\can\nop\nop-chaos-next\docs\design\plugin-system.md`
- `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\index.ts`
- `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\bridge.ts`
- `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\types.ts`
- `C:\can\nop\nop-chaos-next\apps\main\src\plugins\boundStore.ts`
- `C:\can\nop\nop-chaos-next\apps\main\src\plugins\sharedModules.ts`
- `C:\can\nop\nop-chaos-next\packages\core\src\components\PluginSlot.tsx`
- `C:\can\nop\nop-chaos-next\packages\core\src\components\ErrorBoundary.tsx`
- `C:\can\nop\nop-chaos-next\packages\core\src\utils\systemjs.ts`
- `C:\can\nop\nop-chaos-next\apps\main\src\App.tsx`
- `C:\can\nop\nop-chaos-next\apps\main\src\router\RouteRenderer.tsx`
- `C:\can\nop\nop-chaos-next\examples\plugin-demo\package.json`
- `C:\can\nop\nop-chaos-next\examples\plugin-demo\scripts\build-with-rollup.mjs`
- `C:\can\nop\nop-chaos-next\examples\plugin-demo\src\index.tsx`

## 深挖第 2 轮追加

### [维度08-04] `@nop-chaos/plugin-bridge` 把 host-only 的 `setPluginBridge()` 一并暴露给 remote plugin，插件可覆盖全局 bridge
- **文件**: `packages/plugin-bridge/src/index.ts:6-7`; `apps/main/src/plugins/sharedModules.ts:14-15,30`; `apps/main/src/App.tsx:116-118`
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
- **严重程度**: P1
- **类别**: 故障隔离
- **现状**: host 把整个 `@nop-chaos/plugin-bridge` 命名空间注册为共享模块，其中包含 `setPluginBridge()` 这类宿主注入侧 API。remote plugin 只要导入该 setter，就能覆盖全局 bridge。
- **风险**: 任意插件都能把全局 bridge 指向伪造实现，劫持其他插件读到的用户/主题/导航/通知能力，或直接让后续插件全部失效；这是明确的 host/plugin 隔离缺口。
- **建议**: 将 host-only API 从公共 consumer 入口剥离，例如拆成 `@nop-chaos/plugin-bridge/host`；sharedModules 只注册 consumer-safe facade。
- **误报排除**: 问题不是插件能读取 bridge，而是插件被允许写回并替换 bridge，全局写权限不应出现在 remote plugin 契约里。
- **复核状态**: `未复核`

### [维度08-05] extension login 示例依赖未声明的 `authStore.login()`，bridge 类型与 host 实际暴露 shape 再次失配
- **文件**: `packages/plugin-bridge/src/types.ts:28-39`; `apps/main/src/App.tsx:52-67`; `apps/main/src/store/authStore.ts:13-29,54-131`; `examples/extension-demo/src/pages/ExtensionLoginPage.tsx:16-33,67-82`
- **证据片段**:
```ts
export interface PluginBridgeStores {
  authStore: BoundStore<{
    user: User | null;
    isAuthenticated: boolean;
    token?: string;
  }>;
}
```
```ts
interface AuthStoreWithActions {
  login: (payload: AuthSession) => void;
}

const authStore = bridge.stores.authStore as BridgeAuthStore;
authActions.login(createDemoSession(username));
```
- **严重程度**: P2
- **类别**: 契约完整性
- **现状**: public bridge 类型把 `authStore` 收窄成只有状态字段，但 host 实际上传递的是完整 Zustand store，包含 `login/logout/setSession/...`；extension-demo 已经不得不用本地类型断言绕过公开契约。
- **风险**: 官方示例依赖“类型未声明但运行时碰巧存在”的隐藏 API，后续一旦 host 收窄 store shape、做 facade、或第三方按类型实现 bridge mock，login override 就会静默失效。
- **建议**: 要么明确把允许的 auth actions 纳入 bridge 合同；要么不再让 extension 直接摸原始 store action，改为 bridge 显式暴露受控方法。
- **误报排除**: 这不是 [维度08-01] 的“bound store 不响应式”同一问题；这里是公开类型缺动作、但官方示例/runtime 又实际依赖这些动作。
- **复核状态**: `未复核`

### [维度08-06] shared module import-map 名称与 `public/nop-shared` 代理文件路径命名不一致，带 `/` 或 scope 的模块在 ESM 路径下全部失配
- **文件**: `packages/core/src/utils/systemjs.ts:52-68`; `apps/main/src/plugins/sharedModules.ts:23-35`; `apps/main/public/nop-shared/react-jsx-runtime.js:1-3`; `apps/main/public/nop-shared/plugin-bridge.js:1-3`; `apps/main/public/nop-shared/ui.js:1-3`; `apps/main/public/nop-shared/shared.js:1-3`
- **证据片段**:
```ts
for (const [name, moduleRef] of Object.entries(sharedModules)) {
  const modulePath = `${basePath}${name}.js`;
  const moduleUrl = toModuleUrl(modulePath);
  system.addImportMap({ imports: { [name]: moduleUrl } });
  system.set(moduleUrl, moduleRef);
}
```
```ts
const baseSharedModules = {
  '@nop-chaos/plugin-bridge': PluginBridgeLib,
  '@nop-chaos/shared': SharedLib,
  '@nop-chaos/ui': UiLib,
  'react/jsx-runtime': ReactJsxRuntimeLib,
}
```
- **严重程度**: P1
- **类别**: SystemJS配置
- **现状**: import map 会把 `@nop-chaos/ui` 映射到 `/nop-shared/@nop-chaos/ui.js`，把 `react/jsx-runtime` 映射到 `/nop-shared/react/jsx-runtime.js`；但仓库中实际代理文件是 `/nop-shared/ui.js`、`/nop-shared/plugin-bridge.js`、`/nop-shared/react-jsx-runtime.js`。路径命名与运行时生成规则不一致。
- **风险**: 当前 SystemJS 路径之所以没炸，依赖的是 `System.set()` 预注入；一旦走真实文件抓取路径，scoped/slash 模块会直接 404，形成更深层的 host/plugin/sharedModules 合同裂缝。
- **建议**: 统一生成规则，代理文件路径必须按包名保留目录层级生成；若短期不修，应把文档基线明确收窄为 `SystemJS-only`。
- **误报排除**: 这不是“有些 proxy 文件缺失”的同一条；这里即使已存在代理文件，命名也对不上 runtime 生成 URL。
- **复核状态**: `未复核`

### [维度08-07] `plugin-demo` 的本地 locale 资源并未接入运行时，示例实际上偷用 host 主应用翻译键
- **文件**: `examples/plugin-demo/src/index.tsx:10-22`; `examples/plugin-demo/src/index.test.tsx:15-35`; `apps/main/src/main.tsx:35-42`; `apps/main/public/locales/en-US/translation.json:509-552`; `examples/plugin-demo/public/locales/en-US/translation.json:1-34`
- **证据片段**:
```ts
import { useTranslation } from 'react-i18next';
...
const { t, i18n } = useTranslation();
```
```ts
<I18nextProvider i18n={i18n}>
  <HashRouter>
    <App />
  </HashRouter>
</I18nextProvider>
```
- **严重程度**: P2
- **类别**: 契约完整性
- **现状**: plugin-demo 自己没有 i18n 初始化、没有 `I18nextProvider`、没有 locale 加载逻辑；它运行时直接吃的是 host 根部 `I18nextProvider`。plugin-demo 自带的 locale 文件目前只被测试读取，未被 runtime 接线。
- **风险**: 参考示例会误导插件作者以为“只要提交 `public/locales/*` 就能工作”；实际上当前 remote plugin i18n 成功依赖 host 侧预置同名翻译键。第三方插件若不让 host 同步复制这些资源，运行时只会回退成 key 字符串。
- **建议**: 要么给 remote plugin 增加真实的 i18n bootstrap/资源加载链路与 runtime test；要么把文档改准确，明确当前基线是“remote plugin 复用 host i18n 实例，所需资源必须由 host 预载”。
- **误报排除**: locale 文件并非不存在；问题是它们当前没有任何运行时加载路径，demo 的成功只是因为 host 词典碰巧重复了相同键。
- **复核状态**: `未复核`

## 深挖第 3 轮追加

### [维度08-08] 原生 ESM 插件加载链路并未真正接通共享模块，`pageType: 'plugin'` 的 ESM 支持属于假合同
- **文件**: `packages/core/src/utils/systemjs.ts:30-42,52-68`; `docs/examples/plugin-dev-guide.md:9-10`
- **证据片段**:
```ts
if (isSystemJsEntry(url)) {
  return system.import(...);
}

return import(/* @vite-ignore */ resolvedUrl.href);
```
```ts
system.addImportMap({ imports: { [name]: moduleUrl } });
system.set(moduleUrl, moduleRef);
```
- **严重程度**: P1
- **类别**: SystemJS配置
- **现状**: 非 `.system.js` 的插件走浏览器原生 `import()`；但共享模块注册只调用了 `System.addImportMap()` / `System.set()`，这是 SystemJS loader 的配置，不是浏览器原生 ESM import map。仓库内也未发现真实浏览器 `importmap` 注入链路。
- **风险**: 任何原生 ESM remote plugin 只要保留 bare import，就会在浏览器模块解析阶段直接失败；当前“支持 SystemJS 和原生 ESM”的文档口径不成立。
- **建议**: 要么明确收窄当前 supported baseline 为 `SystemJS-only`；要么为原生 ESM 注入真实浏览器 import map 或构建期重写 shared import。
- **误报排除**: 这不是 [维度08-06] 的 proxy 文件命名问题；即使 proxy 文件全补齐，原生 `import()` 仍不会读取 `System.addImportMap()`。
- **复核状态**: `未复核`

### [维度08-09] `usePluginI18n()` 的语言切换通知实际可能不触发重渲染，bridge i18n 响应链路失效
- **文件**: `packages/plugin-bridge/src/index.ts:66-68`; `apps/main/src/App.tsx:70-77,96-109`; `examples/extension-demo/src/pages/ExtensionLoginPage.tsx:36-65`
- **证据片段**:
```ts
const bridgeSnapshot = useMemo(
  () => ({ i18n, themeConfig: pluginThemeConfig, user, plugins }),
  [pluginThemeConfig, plugins, user],
);
```
```ts
i18n.on?.('languageChanged', handleLanguageChange);
```
```ts
export function usePluginI18n(): BridgeI18n {
  return useSyncExternalStore(subscribeBridgeStore, getBridgeI18n, getBridgeI18n);
}
```
- **严重程度**: P1
- **类别**: 契约完整性
- **现状**: host 订阅了 `languageChanged` 并广播，但 `getBridgeI18n()` 读到的仍是同一个 i18n 单例引用；同时 `bridgeSnapshot` 的 `useMemo` 依赖里也没有语言值。`useSyncExternalStore` 看到快照引用未变时可直接跳过重渲染。
- **风险**: extension 页面使用 `usePluginI18n()` 时，语言切换后文案可能继续停留在旧语言；当前 `extension-demo` 正在依赖这条桥接链路。
- **建议**: 让 i18n 快照在语言变化时产生新引用，例如把 `language` 纳入 bridge snapshot 依赖，或在 `usePluginI18n()` 返回 language-keyed wrapper，而不是直接返回稳定单例。
- **误报排除**: 这不影响 `react-i18next` 自己的 `useTranslation()`；问题只在 bridge 侧 `usePluginI18n()`。
- **复核状态**: `未复核`

## 维度复核结论

- [维度08-01]: 保留 (P1)。`PluginBridge.stores` 仍被声明为可直接调用的 Zustand hook 形态，但 `createBoundStore()` 只是同步快照读取。
- [维度08-02]: 保留 (P2)。`App.tsx` 仍未在卸载时清理 bridge，`bridge.ts` 也无 clear/reset API。
- [维度08-03]: 降级 (P3)。`plugin-demo` 的 `systemjs` 声明更偏依赖口径/文档失真，而非立即可触发的加载故障。
- [维度08-04]: 保留 (P1)。remote plugin 仍可通过共享模块导入 `setPluginBridge()` 覆盖全局 bridge。
- [维度08-05]: 保留 (P2)。bridge 公共类型里的 `authStore` 仍缺官方示例实际依赖的 action 面。
- [维度08-06]: 驳回。代理文件命名问题不是当前主链路可独立成立的运行时缺陷，核心已被 08-08 覆盖。
- [维度08-07]: 保留 (P2)。`plugin-demo` 运行时仍直接复用 host i18n，locale 文件未见真实加载链路。
- [维度08-08]: 保留 (P1)。非 `.system.js` 插件仍走原生 `import()`，而共享模块注册仍只对 SystemJS 生效。
- [维度08-09]: 保留 (P1)。`usePluginI18n()` 仍返回稳定单例引用，语言切换后桥接消费者可能不重渲染。

## 子项复核结论

- [维度08-01]: 子项复核通过。`PluginBridge.stores` 的类型与实现仍不一致。
- [维度08-04]: 子项复核通过。remote plugin 仍可导入 `setPluginBridge()` 覆盖全局 bridge。
- [维度08-08]: 子项复核通过。原生 ESM plugin 路径仍未真正接通 shared modules。
- [维度08-09]: 子项复核通过。`usePluginI18n()` 语言切换后仍可能因快照引用稳定而不重渲染。
