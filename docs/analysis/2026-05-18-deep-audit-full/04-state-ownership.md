# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] 插件清单存在两套持久化事实源，Zustand 与 mock API 存储未做写穿同步
- **文件**: `apps/main/src/store/pluginStore.ts:12-31`, `apps/main/src/services/mockApi/plugins.ts:4-52`, `apps/main/src/pages/plugins/management/index.tsx:31-32,83,163-172`
- **证据片段**:
```ts
// apps/main/src/store/pluginStore.ts
const initialPlugins = getPluginSeeds();

persist(
  (set) => ({
    plugins: initialPlugins,
    setPlugins: (plugins) => {
      set({ plugins });
    },
  }),
  { name: 'plugins:v1', storage: createJSONStorage(() => localStorage) },
)

// apps/main/src/services/mockApi/plugins.ts
const pluginStorageKey = 'plugins:manifests:v1';

export function getPluginSeeds(): PluginManifest[] {
  return readStoredJson(pluginStorageKey, seedPluginManifests);
}
```
- **严重程度**: P1
- **现状**: `usePluginStore` 把插件清单持久化到 `plugins:v1`，而 mock API 的种子/查询又单独读 `plugins:manifests:v1`。插件管理页的启停与配置编辑只写 Zustand store，没有回写 mock API 存储。
- **风险**: 同一份“插件注册/启用/配置”语义被两套 localStorage key 承载，后续任何使用 `fetchPluginList()` 的页面、初始化逻辑或测试都可能读到旧数据；路由、bridge、管理页、查询层看到的插件状态不一致。
- **建议**: 统一为单一 canonical source。优先方案是让 `fetchPluginList()`/seed 直接读取 `usePluginStore` 持久化结果，或在 `updatePlugin/setPlugins` 中强制 write-through 到同一存储 key，并删除另一套 key。
- **双状态详情**: `plugins:v1` 承载运行时/管理页状态；`plugins:manifests:v1` 承载 mock查询与初始化种子。两者内容会在首次加载后立刻分叉。
- **同步失败症状**: 管理页里已禁用/改配置的插件，在依赖 `fetchPluginList()` 的消费方仍显示旧状态；刷新后某些入口按 store 生效，另一些入口按 mock 数据回退。
- **误报排除**: 这不是普通“查询缓存 + 本地编辑态”。当前代码中未发现 `updatePlugin()` 对 `persistPluginSeeds()` 的回写，也未发现统一 hydration/reconciliation 逻辑。
- **复核状态**: `未复核`

### [维度04-02] Auth token 同时保存在 Zustand 与 shared tokenManager，`setToken` 路径不会同步两边
- **文件**: `apps/main/src/store/authStore.ts:94-118`, `apps/main/src/services/http.ts:66-90`, `packages/shared/src/http/client.ts:199-201,219-226`
- **证据片段**:
```ts
// apps/main/src/store/authStore.ts
setToken: (token) =>
  set((state) => ({
    token,
    tokens: state.tokens
      ? { ...state.tokens, accessToken: token ?? state.tokens.accessToken }
      : state.tokens,
  })),

// apps/main/src/services/http.ts
getAuthToken: () => useAuthStore.getState().token,
getValidToken,
setAuthToken: (token) => {
  if (token) {
    useAuthStore.getState().setToken(token);
  }
},
```
- **严重程度**: P1
- **现状**: HTTP 客户端认证请求走 `getValidToken()`，其底层读取的是 `@nop-chaos/shared` 的 tokenManager；但响应头 token 轮换、AMIS adapter 等路径只调用 `useAuthStore.getState().setToken(token)`，仅更新 Zustand，不更新 tokenManager。
- **风险**: UI/bridge 看到的新 token 与实际请求使用的旧 token 脱节，导致“界面显示已续期，但后续请求仍拿旧 token”。
- **建议**: 收敛到单一 token authority。若保留 tokenManager 为 canonical source，则 `setToken/setTokens/clearTokens` 必须统一委托到 shared 层；至少把 `setAuthToken` 和 AMIS `setAuthToken` 改成同步写两边。
- **双状态详情**: Zustand `authStore.token/tokens` 一套；shared `tokenManager`（`getValidToken/getAccessToken` 使用）一套。部分路径双写，部分路径单写。
- **同步失败症状**: 服务端返回新 `x-access-token` 后，界面继续正常显示登录态，但下一个带鉴权请求仍因旧 token 401；刷新/自动续期行为出现偶发回退。
- **误报排除**: `login()` 与 refresh 流程确实有双写；问题在于 `setToken`、HTTP `setAuthToken`、AMIS `setAuthToken` 这些有效运行路径没有同步 tokenManager。
- **复核状态**: `未复核`

### [维度04-03] extension 声明的 `plugins` 未进入 host plugin store，bridge snapshot 与路由解析看不到扩展注册结果
- **文件**: `packages/shared/src/types/extension.ts:159-169`, `apps/main/src/extensions/bootstrap.ts:167-179`, `apps/main/src/App.tsx:73-79`, `apps/main/src/router/RouteRenderer.tsx:52-76`
- **证据片段**:
```ts
// packages/shared/src/types/extension.ts
builtinPages?: ExtensionBuiltinPage[];
plugins?: PluginManifest[];
menus?: MenuItem[];

// apps/main/src/extensions/bootstrap.ts
const loaded = await loadExtensions({ sources, context: { logger } })

applyExtensionDefinitions(loaded)
setLoadedExtensions(loaded)
applyDocumentBranding(loaded)

// apps/main/src/App.tsx
const bridgeSnapshot = useMemo(
  () => ({ i18n, themeConfig: pluginThemeConfig, user, plugins }),
  [pluginThemeConfig, plugins, user],
);
```
- **严重程度**: P1
- **现状**: extension 类型合同支持 `plugins?: PluginManifest[]`，但 bootstrap 只处理 auth/language/theme/style/builtinPages，没有把 extension 的插件声明合并到 `usePluginStore`。而 bridge snapshot、`RouteRenderer`、插件管理页都只读 `usePluginStore().plugins`。
- **风险**: extension 注册出来的插件不会进入实际运行时单一源，导致“类型/文档声明支持，运行时却不可见”；插件页路由可能有菜单但没有 manifest，bridge 也无法向扩展页暴露完整插件清单。
- **建议**: 在 bootstrap 完成后，把 `loadedExtensions.flatMap(ext => ext.extension.plugins ?? [])` 与 store 内插件清单做明确合并，并定义冲突覆盖规则；或明确废弃 extension-level `plugins` 合同。
- **双状态详情**: extension runtime 的 `loadedExtensions[].extension.plugins` 一套；host `usePluginStore().plugins` 一套。路由与 bridge 只承认后者。
- **同步失败症状**: extension 已注册插件但插件管理页不显示；bridge `snapshot.plugins` 缺项；插件路由解析落到“未启用/未找到 manifest”分支。
- **误报排除**: 已全仓搜索 `extension.plugins` 与 `setPlugins` 调用，未发现把 extension 插件声明同步进 store 的实现路径。
- **复核状态**: `未复核`

### [维度04-04] extension bootstrap 仅防并发、不防成功后重复执行，`setup(context)` 仍可能被再次调用
- **文件**: `apps/main/src/extensions/bootstrap.ts:150-186`, `packages/extension-host/src/loadExtensions.ts:56-63`
- **证据片段**:
```ts
// apps/main/src/extensions/bootstrap.ts
if (bootstrapPromise) {
  return bootstrapPromise
}

bootstrapPromise = (async () => {
  const loaded = await loadExtensions({ sources, context: { logger } })
  return loaded
})().finally(() => {
  bootstrapPromise = null
})

// packages/extension-host/src/loadExtensions.ts
for (const source of sources.filter((item) => item.enabled !== false)) {
  const extension = normalizeExtension(raw, source)
  await extension.setup?.(context)
  loaded.push({ source, extension })
}
```
- **严重程度**: P2
- **现状**: 当前实现只在“bootstrap 进行中”复用同一个 promise；一旦成功完成，`finally` 立即把 `bootstrapPromise` 清空，后续再次调用会重新 load extension 并再次执行 `setup(context)`。
- **风险**: extension 运行时注册、全局副作用、配置注入、第三方 SDK 初始化可能重复执行，破坏单一事实来源与幂等假设。
- **建议**: 成功后缓存 bootstrap 结果而不是清空 promise；失败时才 reset。若必须支持重载，应显式提供 `reset/reload` API，并要求 `setup()` 幂等。
- **双状态详情**: “extension 已完成初始化”的状态只存在于瞬时 promise，不存在稳定 completed state；同一 extension 会被当作“未初始化”再次处理。
- **同步失败症状**: 重复调用 bootstrap 后，`setup()` 内注册器、全局监听、远程初始化、runtime config 注入再次发生；某些副作用重复但 store/路由状态未完全回滚。
- **误报排除**: 这不是并发窗口误判。并发首轮确实被去重；问题发生在第一次成功之后的第二次调用。
- **复核状态**: `未复核`

### [维度04-05] bridge 暴露的 `stores` 具备 Zustand hook 形状，但实现只是一次性读快照，不具备响应式订阅语义
- **文件**: `packages/plugin-bridge/src/types.ts:21-40`, `apps/main/src/plugins/boundStore.ts:1-23`, `apps/main/src/App.tsx:55-69`
- **证据片段**:
```ts
// packages/plugin-bridge/src/types.ts
type BoundStore<T> = {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
};

// apps/main/src/plugins/boundStore.ts
export function createBoundStore<T>(store: StoreApi<T>): BoundStore<T> {
  const bound = (<U>(selector?: (state: T) => U) => {
    const state = store.getState();
    return selector ? selector(state) : state;
  }) as BoundStore<T>;
```
- **严重程度**: P2
- **现状**: `PluginBridgeStores` 的类型看起来像 Zustand bound hook，但 `createBoundStore()` 只是同步调用 `getState()` 返回当前值，没有 `useSyncExternalStore`，也不会在 React 渲染中自动订阅。
- **风险**: bridge 里同时存在两条读取 host 状态的路径：响应式 hooks（`usePluginUser/usePluginThemeConfig/usePluginManifest`）与伪 hook `bridge.stores.*`。它们的“活性”不同，容易形成隐性双状态。
- **建议**: 要么把 `stores` 改成纯 imperative API（只暴露 `getState/subscribe`），去掉 callable hook 形状；要么在 bridge 包里提供真正基于 `useSyncExternalStore` 的 store hook 封装。
- **双状态详情**: 数据本体仍在 host store，但 bridge 对外暴露了“响应式快照 hooks”和“非响应式伪 hook stores”两种消费模型，消费者看到的更新时机不同。
- **同步失败症状**: 插件组件若写成 `bridge.stores.pluginStore((s) => s.plugins)`，初次渲染能读到值，但 host 侧启停插件后该组件不重渲；改用 `usePluginManifest()` 却能更新。
- **误报排除**: 不是说 `getState()`/`subscribe()` 本身错误；问题是当前 callable API 形状会被自然当成 Zustand hook 使用，但实现并不满足该语义。
- **复核状态**: `未复核`

## 深挖第 2 轮追加

### [维度04-06] extension 语言注册发生在 i18n 首次初始化之后，registry 与 bridge 暴露的 i18n runtime 配置分裂
- **文件**: `apps/main/src/main.tsx:85-90`, `apps/main/src/config/i18n/index.ts:10-18`, `apps/main/src/extensions/bootstrap.ts:69-77,177-179`, `examples/extension-demo/src/pages/ExtensionLoginPage.tsx:58-65,180-193`
- **证据片段**:
```ts
// apps/main/src/main.tsx
await initializeI18n();
setI18nGetter((key) => i18n.t(key));
await bootstrapExtensions();

// apps/main/src/config/i18n/index.ts
initializationPromise = i18n.init({
  fallbackLng: getDefaultLanguage(),
  supportedLngs: getLanguageOptions().map((item) => item.code),
})

// apps/main/src/extensions/bootstrap.ts
if (extension.supportedLanguages) {
  replaceLanguages(extension.supportedLanguages)
} else if (extension.languages) {
  registerLanguages(extension.languages)
}
```
- **严重程度**: P1
- **现状**: 宿主先执行 `initializeI18n()`，把 `fallbackLng` 与 `supportedLngs` 从当前 registry 固化到 i18n instance；extension 的 `supportedLanguages/languages/defaultLanguage` 要到 `bootstrapExtensions()` 才注册。bootstrap 虽再次调用 `initializeI18n()`，但该函数受 `initializationPromise` 缓存保护，不会用 extension 更新后的 registry 重建配置。
- **风险**: extension 声明的新语言、默认语言与真实 i18n runtime 脱节，导致 extension 页面看到的 `i18n.options.supportedLngs`、fallback 行为与文档合同不一致；语言按钮、语言检测、缺失翻译回退都可能基于旧配置运行。
- **建议**: 将 extension 语言归并提前到首次 `initializeI18n()` 之前；若必须保留当前顺序，则在 bootstrap 完成后显式同步更新 i18n instance 的 `supportedLngs`/fallback 配置。
- **双状态详情**: `languages.ts` registry 一套；首次初始化后冻结进 i18n instance 的 `supportedLngs/fallbackLng` 又是一套。bridge 与 extension 页面读取的是后者，而 bootstrap 只修改前者。
- **同步失败症状**: extension 已声明额外语言并注入资源，但 extension 页面仍只显示旧语言集合，或切换到新语言后被 fallback 回旧默认语言。
- **误报排除**: 这不是资源晚加载问题；`addResourceBundle()` 只补资源，不会回写首次初始化时已经确定的 `supportedLngs` 与 `fallbackLng`。
- **复核状态**: `未复核`

### [维度04-07] extension `auth` 配置在 authStore 创建后才注入，store hydration 与 shared token storage 选择规则存在启动期双状态
- **文件**: `apps/main/src/main.tsx:7,85-90`, `apps/main/src/App.tsx:12-14`, `apps/main/src/store/authStore.ts:46-52,54-56,133-137`, `apps/main/src/extensions/bootstrap.ts:64-67`
- **证据片段**:
```ts
function getStorageType(): 'sessionStorage' | 'localStorage' {
  const config = getAuthConfig();
  if (config.tokenStorage === 'localStorage') {
    return 'localStorage';
  }
  return 'sessionStorage';
}

export const useAuthStore = create<AuthStore>()(
  persist(

if (extension.auth) {
  setAuthConfig(extension.auth)
  resetTokenStorage()
}
```
- **严重程度**: P1
- **现状**: `main.tsx` 在执行 `bootstrapExtensions()` 前就已静态导入 `App`，而 `App` 又静态导入 `useAuthStore`。这意味着 `authStore` 的 `persist(...)` 很可能已按默认 `getAuthConfig()` 完成创建并开始 hydration。之后 extension bootstrap 才调用 `setAuthConfig(extension.auth)` 与 `resetTokenStorage()`，把 shared tokenManager 切换到 extension 指定的存储策略，但不会重建或 rehydrate 已存在的 store。
- **风险**: 启动阶段同一份“当前登录态”会被两套存储规则解释：authStore 可能先从默认 `sessionStorage` 恢复，shared tokenManager 则在 bootstrap 后改为读 extension 指定介质。刷新后会出现会话恢复丢失、错误恢复旧 token、UI 登录态与请求鉴权态不一致等问题。
- **建议**: 把 extension auth config 的决议前移到 `useAuthStore` 模块创建前；或者在 `setAuthConfig()` 后显式重建/rehydrate authStore，并清理旧 storage。
- **双状态详情**: `authStore` 已 hydration 的内存状态及其 persist storage 选择是一套事实源；`@nop-chaos/shared` tokenManager 在 `setAuthConfig()+resetTokenStorage()` 后重新选择的 token storage 又是一套事实源。
- **同步失败症状**: extension 要求 token 持久化到 `localStorage`，但刷新后 UI 仍显示匿名；或 UI 从旧 `sessionStorage` 恢复出已登录态，而后续请求逻辑从新配置 tokenManager 读取不到 token。
- **误报排除**: 这不是 04-02 的“运行期 setToken 单写”重复问题；这里是启动顺序导致 store 创建与 auth 配置来源从一开始就可能不一致。
- **复核状态**: `未复核`

### [维度04-08] `currentHomePath` 与持久化 `tabStore` 未做运行时 reconcile，home 变更后会残留双首页状态
- **文件**: `apps/main/src/store/tabStore.ts:6-13,25-29,61-77`, `apps/main/src/config/systemMenus.ts:160-177`, `apps/main/src/router/AppShell.tsx:77-88`
- **证据片段**:
```ts
function createHomeTab(): AppTab {
  return {
    path: getCurrentHomePath(),
    title: 'Dashboard',
    icon: 'layout-dashboard',
    closable: false,
  };
}

tabs: [createHomeTab()],
activePath: getCurrentHomePath(),
```
- **严重程度**: P2
- **现状**: `tabStore` 在模块初始化和持久化恢复阶段把当时的 `getCurrentHomePath()` 固化为首页 tab 与 `activePath`；真正的 canonical home 要等菜单查询完成后，`mergeBuiltinSystemMenus()` 才调用 `setCurrentHomePath(merged.home)` 写入新值。之后 `AppShell` 访问新首页路径时又会注册新的不可关闭 tab，但旧首页记录不会被迁移或清理。
- **风险**: “首页”语义同时存在于 `config/homePath.ts` 与 `tabs:v1` 两套状态中，用户长期持有两个不可关闭首页 tab；`closeOtherTabs()` 仍会保留所有 `closable: false` tab，导致错误首页无法自然收敛。
- **建议**: 在 `setCurrentHomePath()` 变化后主动 reconcile `tabStore`：替换旧 home tab、同步 `activePath`、去重不可关闭首页项；或者不要把 home tab 当普通持久化 tab 保存，而是始终从 canonical `currentHomePath` 派生。
- **双状态详情**: `config/homePath.ts` 保存 runtime canonical home 一套；`tabStore` 持久化的 `tabs/activePath` 中首页记录又是一套。
- **同步失败症状**: extension 或菜单配置把首页改成 `/plugins` 后，标签栏同时保留旧 `/dashboard` 和新 `/plugins` 两个不可关闭 tab；执行“关闭其他”后两者都被保留。
- **误报排除**: 这不是已修复的“硬编码 `/dashboard`”同一问题；当前确实改为读取 `getCurrentHomePath()`，但缺少对已持久化 tab 数据的迁移。
- **复核状态**: `未复核`

## 维度复核结论

- [维度04-01]: 降级 (P2)。双持久化键仍存在，但 live 影响面较初审小，更多集中在 mock/query 层一致性。
- [维度04-02]: 保留 (P1)。`authStore` 与 shared `tokenManager` 仍是双源，若干写入路径只写 Zustand。
- [维度04-03]: 驳回。live code 已在 extension bootstrap 中把 `extension.plugins` 合并进 `usePluginStore()`。
- [维度04-04]: 降级 (P3)。重复 bootstrap 理论上存在，但当前生产调用点仅见启动阶段一次。
- [维度04-05]: 降级 (P3)。`bridge.stores.*` 合同误导成立，但当前 live 消费主要走响应式 hooks 或 `getState()`。
- [维度04-06]: 保留 (P1)。宿主仍先 `initializeI18n()`、后注册 extension 语言，`supportedLngs/fallbackLng` 不会按 extension 结果重建。
- [维度04-07]: 保留 (P1)。`authStore` 在 extension auth 配置注入前就可能完成 hydration，之后不会重建或 rehydrate。
- [维度04-08]: 保留 (P2)。`currentHomePath` 与 `tabStore` 之间仍缺完整 reconcile，旧/新 home 状态可残留并存。

## 子项复核结论

- [维度04-02]: 子项复核通过。`authStore` 与 shared `tokenManager` 双源仍成立，关键写入路径仍未双写。
- [维度04-06]: 子项复核通过。extension 语言注册晚于首次 i18n 初始化，`supportedLngs/fallbackLng` 仍冻结为旧值。
- [维度04-07]: 子项复核通过。extension auth 配置在 authStore hydrate 之后才注入，store 与 shared token storage 仍可能跨介质分叉。
