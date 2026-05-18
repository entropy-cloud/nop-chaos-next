# 对抗性审查 Round 01

本轮切入视角：跨边界契约、运行时状态分叉、生命周期残留。

## 发现 1：HIGH - `ShellExtension.plugins` 已进入公共类型，但 host 运行时完全不消费

- 在哪里：`packages/shared/src/types/extension.ts:159-163`，`apps/main/src/extensions/bootstrap.ts:62-107`，`apps/main/src/store/pluginStore.ts:12-34`，`apps/main/src/App.tsx:21,65-68,97-105`
- 是什么：`ShellExtension` 类型公开承诺了 `plugins?: PluginManifest[]`，注释也明确写成“Remote plugin manifests to register”。但 host bootstrap 只处理 `auth`、语言、主题、样式和 `builtinPages`，完全不读取 `extension.plugins`。运行时插件清单仍然只来自 `pluginStore` 的 seed/persist 路径。
- 为什么值得关心：这不是单个字段没人用的问题，而是一个已经进入公共扩展契约的“幽灵能力”。extension 作者按类型实现后，会发现插件管理页、`RouteRenderer`、plugin bridge 快照、`getPluginManifest()` 全都看不到这些插件。随着 extension 能力继续扩展，这种“类型已承诺、host 未接线”的模式会持续误导外部开发者，并放大调试成本。
- 信心水平：确定

## 发现 2：HIGH - `supportedLanguages` 的语义是全量替换，不是注册；多个 extension 会互相抹掉语言能力

- 在哪里：`apps/main/src/extensions/bootstrap.ts:69-77`，`apps/main/src/config/i18n/languages.ts:24-48`，`apps/main/src/config/i18n/index.ts:16-18`，`apps/main/src/pages/auth/login/index.tsx:38`，`apps/main/src/components/layout/LanguageSwitcher.tsx:8`
- 是什么：bootstrap 遍历每个 extension 时，遇到 `supportedLanguages` 就调用 `replaceLanguages()`。`replaceLanguages()` 会直接清空整个 `languageRegistry`，再塞入当前 extension 的语言列表；它不是 merge，也不会保留 host 默认语言。结果是“最后一个声明 `supportedLanguages` 的 extension”会覆盖前面所有 extension 以及 host 自带语言。
- 为什么值得关心：这会制造一种很隐蔽的配置分叉。某个 extension 的 i18n 资源可能已经被成功加载，但登录页、语言切换器和设置页只显示最后一次替换后的语言列表；`initializeI18n()` 也会用这份被覆盖后的列表作为 `supportedLngs`。当仓库未来从“单 demo extension”走向“多个 extension 叠加”时，这会直接变成 live defect，而不是设计讨论。
- 信心水平：确定

## 发现 3：MEDIUM - 失效的持久化 `themeId` 会让 DOM、store 和 plugin bridge 观察到不同主题

- 在哪里：`apps/main/src/store/themeStore.ts:42-59`，`apps/main/src/utils/themeCss.ts:12-29`，`apps/main/src/App.tsx:47-52,73-80,96,114`
- 是什么：`themeStore` hydrate 时只做 `normalizeThemeId()`，不会校验该主题是否仍已注册。`applyThemeToDocument()` 发现主题未注册后，会把 DOM 的 `data-theme` 回退到默认主题；但 store 里的 `themeConfig.themeId` 仍保留旧值，`App.tsx` 组装给插件的 `pluginThemeConfig` 也继续携带这个失效值。
- 为什么值得关心：用户看到的是默认主题，host/store/plugin 读到的却是旧 extension 主题，形成三方分叉。设置页可能仍高亮不存在的主题，插件通过 bridge 读取 `getThemeConfig()` 也会得到和实际页面不一致的值。这类“视觉层自救成功，状态层继续腐烂”的问题通常很难定位，因为 UI 看起来只是“偶尔恢复默认主题”。
- 信心水平：确定

## 发现 4：MEDIUM - `storageCache` 没有处理 `Storage.clear()` 的失效事件，跨 tab 清空后仍可能继续读到旧缓存

- 在哪里：`apps/main/src/utils/storage.ts:3-4,11-24,50-56`，`apps/main/src/services/mockApi/shared.ts:19-20,45-47`
- 是什么：`storage.ts` 用内存 `Map` 缓存 Storage 读取结果，并依赖 `window` 的 `storage` 事件失效缓存。但实现只在 `event.key` 存在时删除单 key。浏览器在 `localStorage.clear()` / `sessionStorage.clear()` 时触发的 `storage` 事件里 `event.key === null`，当前代码会直接跳过，导致整张缓存表继续保留旧值。
- 为什么值得关心：上一轮审查已经指出“同 tab 原生/Zustand 写入不会触发 storage 事件”，这里是另一个更窄但真实的残余缺口：即使跨 tab 发生了合法的全量清空，本 tab 仍可能通过 `getStorageItem()` / `readStoredJson()` 读到清空前的数据。任何依赖 storage 作为跨 tab 协调面的 mock data、偏好项或登录前状态都可能出现“实际已清空，但当前 tab 还活在旧世界”的现象。
- 信心水平：确定

## 发现 5：MEDIUM - AI Workbench 的异步流式回复和历史加载没有卸载取消，离页后仍会继续补写状态

- 在哪里：`apps/main/src/pages/ai-workbench/index.tsx:79-103`，`apps/main/src/pages/ai-workbench/index.tsx:178-213`
- 是什么：`loadOlderMessages()` 直接发起 `window.setTimeout(..., 220)`，不保存 timer id，也没有 cleanup。`streamAssistantReply()` 用逐字循环 + `await setTimeout(12)` 推送回复，只有手动点击 stop 才会设置 `stopStreamRef.current = true`；组件卸载或路由切换时没有任何取消逻辑。
- 为什么值得关心：这类页面离开后的“幽灵异步任务”很容易在低负载下被忽略，但会在频繁切页、并发对话或未来接入真实流式 API 后放大成资源浪费和状态污染。即便 React 18 不一定给出经典的 setState-on-unmounted 警告，这种定时器/异步链在后台继续跑完，仍然是实际的生命周期泄漏。
- 信心水平：很可能
