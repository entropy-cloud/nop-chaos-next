# 对抗性审查 Round 01 — AMIS/Flux 渲染引擎安全、Extension 系统生命周期、E2E 覆盖盲区

**日期**: 2026-05-17
**发现来源视角**: 恶意输入者（Schema 注入）、生命周期追踪者（Extension 资源泄漏）、契约考古学家（AMIS adapter 单例）

---

## 发现 1：CRITICAL — Schema 驱动的任意代码执行 (`@fn:` + `new Function()`)

**在哪里**: `packages/amis-core/src/page/action.ts:198-206`, `apps/main/src/amis/adapter.ts:100`

**是什么**: AMIS schema 中以 `@fn:` 前缀开头的值会被直接当作 JavaScript 源码编译为函数执行。adapter 实现使用 `new Function()` 构造器，无任何沙箱、白名单或签名验证：

```typescript
// amis-core/src/page/action.ts:198-206
if (value.startsWith('@fn:')) {
    const source = value.slice('@fn:'.length).trim();
    if (!adapter.compileFunction) {
      throw new Error('Amis runtime adapter does not support @fn compilation');
    }
    return wrapFunction(adapter.compileFunction(source, page), value);
}

// apps/main/src/amis/adapter.ts:100
compileFunction: (code, page) => new Function('page', `return (${code})`)(page) as AmisAction,
```

**为什么值得关心**: Schema 来自服务端 `pageProvider.getPage()`。如果后端被入侵、数据库被注入、或中间人攻击修改了 schema 响应，攻击者可以在用户浏览器中执行任意 JavaScript。编译后的函数接收完整的 `page` 对象，拥有 `getAction()`、`setState()`、`getComponent()` 等全部运行时能力。这是整个代码库中最高危的攻击面。

**信心水平**: 确定

**建议**: (a) 移除 `compileFunction`，要求预注册命名 action；或 (b) 对 `@fn:` payload 添加加密签名验证；或 (c) 使用受限的 `Function` 构造器在沙箱中执行。

---

## 发现 2：HIGH — `xui:import` 任意远程模块导入（SSRF + 代码注入）

**在哪里**: `packages/amis-core/src/page/action.ts:77-113`

**是什么**: Schema 中的 `xui:import` 指令允许导入任意 URL 的远程模块：

```typescript
// action.ts:77-91
async function importRuntimeModule(moduleUrl: string) {
  const resolvedUrl = new URL(moduleUrl, getBaseOrigin());
  const useSystemImport = resolvedUrl.pathname.endsWith('.system.js');
  if (useSystemImport && runtime.System?.import) {
    return runtime.System.import<Record<string, unknown>>(moduleUrl);
  }
  return import(/* @vite-ignore */ moduleUrl) as Promise<Record<string, unknown>>;
}
```

`resolveModuleUrl` (lines 19-36) 会原样传递绝对 HTTP URL。没有 CSP 检查、没有域名白名单、没有完整性校验。导入的模块的导出成为 action handler，在页面上下文中以一等公民身份执行。

**为什么值得关心**: 与发现 1 组合，恶意 schema 可以：1) 从任意外部服务器加载代码；2) 该代码作为 action handler 在页面上下文中执行。构成 SSRF + 远程代码执行的完整攻击链。

**信心水平**: 确定

---

## 发现 3：HIGH — Extension 系统无 teardown 生命周期，所有注册资源永久驻留

**在哪里**: `packages/shared/src/types/extension.ts:168-169`（接口定义）, `apps/main/src/extensions/bootstrap.ts`（所有注册调用）

**是什么**: `ShellExtension` 接口只定义了 `setup` 钩子，没有 `teardown`、`dispose`、`cleanup` 或 `destroy`。Extension 的 setup 过程向多个全局注册表写入数据，但这些写入全部不可逆：

| 注册操作 | 文件 | 清理函数 |
|----------|------|----------|
| Stylesheet `<link>` 注入 | `bootstrap.ts:18-30` (`ensureStylesheet`) | 不存在 |
| Builtin 页面注册 | `pageRegistry.tsx:49-57` (`registerBuiltinPages`) | 不存在 |
| 主题注册 | `themeRegistry.ts:22-35` (`registerThemes`) | 不存在 |
| 语言注册 | `i18n/languages.ts:29-43` | 不存在 |
| i18n 资源包 | `bootstrap.ts:108-114` (`i18n.addResourceBundle`) | 不存在 (`removeResourceBundle` 从未被调用) |
| Favicon | `bootstrap.ts:32-44` (`ensureLinkElement`) | 不存在 |

如果 extension 需要热重载（开发环境 HMR）或运行时替换，旧 extension 的所有副作用永久驻留。

**为什么值得关心**: 在开发阶段频繁修改 extension 时，DOM 中会积累大量 `<link>` 和注册表条目。更严重的是，`contributedBuiltinPageRegistry` 持有 React 组件引用，阻止垃圾回收。这是一个系统性的资源泄漏模式。

**信心水平**: 确定

---

## 发现 4：HIGH — 任意 Extension 可替换登录页面，无信任验证

**在哪里**: `packages/shared/src/types/extension.ts:79-85, 143`, `apps/main/src/router/pageRegistry.tsx:49-57`

**是什么**: Extension 的 `systemPages.login` 配置允许覆盖系统登录页面的 componentId。任何 extension 只需提供：

```typescript
systemPages: { login: 'malicious-login' },
builtinPages: [{ componentId: 'malicious-login', component: PhishingLoginPage }]
```

即可将登录页替换为凭据钓鱼页面。没有 allowlist、信任等级或签名验证机制来限制哪些 extension 可以替换安全关键页面。

**为什么值得关心**: 如果攻击者能通过 `window.__NOP_EXTENSIONS__`（见发现 5）或供应链攻击注入一个恶意 extension，可以直接窃取用户凭据。

**信心水平**: 很可能（需要攻击者能注入 extension 源，但 `window.__NOP_EXTENSIONS__` 降低了门槛）

---

## 发现 5：MEDIUM — `window.__NOP_EXTENSIONS__` 允许任意 Extension 注入

**在哪里**: `apps/main/src/extensions/config.ts:35-57`

**是什么**: 页面上任何 JavaScript（浏览器扩展、XSS payload、注入脚本）都可以设置 `window.__NOP_EXTENSIONS__` 来注入 extension 源：

```typescript
function getWindowExtensionSources(): ExtensionSource[] {
  const runtimeSources = (globalThis as ExtensionHost).__NOP_EXTENSIONS__;
  if (!Array.isArray(runtimeSources)) return [];
  return runtimeSources.filter(isExtensionSource);
}
```

`isExtensionSource` 只检查 `{ id, entry }` 或 `{ id, load }` 形状，不验证来源或签名。

**为什么值得关心**: 结合发现 4，一个 XSS 漏洞的攻击链可以扩展为：XSS → 设置 `__NOP_EXTENSIONS__` → 注入恶意 extension → 替换登录页 → 窃取凭据。这显著放大了任何 XSS 漏洞的影响。

**信心水平**: 确定

---

## 发现 6：MEDIUM — AMIS 全局可变 Adapter 单例在并发页面中被覆盖

**在哪里**: `packages/amis-core/src/adapter/index.ts:1-15`, `packages/amis-react/src/components/AmisSchemaPage.tsx:65`

**是什么**: `runtimeAdapter` 是模块级全局单例。`AmisSchemaPage` 在每次渲染时调用 `registerAmisRuntimeAdapter(adapter)`（line 65），且 adapter 每次是新对象。如果两个 `AmisSchemaPage` 并发挂载（路由切换 keep-alive、标签页布局），后者的注册会覆盖前者的 adapter，导致前者进行中的异步操作使用错误的 auth token、toast 系统或权限上下文。

**为什么值得关心**: 当前应用主要一次显示一个 AMIS 页面，所以影响有限。但如果引入多标签页同时显示 AMIS 页面（tab layout），每个页面会相互破坏对方的状态。

**信心水平**: 很可能

---

## 发现 7：MEDIUM — Schema 递归处理无深度限制和循环引用检测

**在哪里**: `packages/amis-core/src/page/processor.ts:1-37`

**是什么**: `processSchemaValue` 递归遍历整个 schema 树，没有最大深度限制和 visited-object 追踪：

```typescript
export async function processSchemaValue(value: unknown, options = {}) {
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => processSchemaValue(item, options)));
  }
  if (!isRecord(value)) return value;
  // ...
  for (const [key, childValue] of Object.entries(nextValue)) {
    const processedChild = await processSchemaValue(childValue, options);
    // ...
  }
}
```

同样的问题也存在于 `bindActions` 中的 `bindValue`（action.ts:211-243）。

**为什么值得关心**: 恶意或出错的 schema 包含循环引用会导致无限递归和栈溢出。即使不循环，极深嵌套的 schema 也会触发栈溢出。这构成 DoS 攻击面。

**信心水平**: 确定

---

## 发现 8：MEDIUM — Flow Editor 保存失败完全静默

**在哪里**: `apps/main/src/pages/flow-editor/[id]/useFlowPersistence.ts:18-39`

**是什么**: `saveSnapshot` 没有 `try/catch`：

```typescript
const saveSnapshot = useCallback(async () => {
  // ...
  const saved = await import('../../../services/mockApi').then((m) =>
    m.saveFlowDetail(payload),
  );
  // ... success handling
}, [flowDocument, nodes, edges, ...]);
```

调用方在 `FlowEditorPageInner` line 114 使用 `void` 吞掉了 rejected promise：
```typescript
onSave={() => void persistence.saveSnapshot()}
```

**为什么值得关心**: 用户点击保存后，如果保存失败：1) 没有 error toast；2) 没有 rollback（虽然不需要因为本地状态未修改）；3) 用户以为保存成功了。在真实后端环境中，这是一个严重的数据丢失风险。

**信心水平**: 确定

---

## 发现 9：MEDIUM — Bridge `getSnapshot()` 与 `stores.*.getState()` 双源不一致

**在哪里**: `apps/main/src/App.tsx:65-108`

**是什么**: 插件 bridge 提供两种读取状态的机制：
1. `bridge.getSnapshot()` — 返回 React 渲染周期中 `useMemo` 计算的 `bridgeSnapshot`
2. `bridge.stores.authStore.getState()` — 直接读取 Zustand 最新状态

在 store 更新后、React 重新渲染前，`getSnapshot()` 返回过期数据而 `stores.*.getState()` 返回最新数据。同时使用两个 API 的插件代码可能在同一逻辑操作中看到不一致的值。

**为什么值得关心**: 插件开发者可能不知道两种 API 有不同的时效性保证。在 `useSyncExternalStore` 之外使用 `stores.*` 直接读取时，数据可能与快照不同步。

**信心水平**: 很可能

---

## 发现 10：MEDIUM — E2E 测试覆盖存在 10 个主要功能盲区

**在哪里**: `tests/e2e/`（缺失的测试文件）

**是什么**: 以下关键用户流程完全没有 E2E 测试：

| 功能 | 页面文件 | 测试状态 |
|------|----------|----------|
| Dashboard（首页） | `pages/dashboard/index.tsx` | 零测试 |
| AI Workbench | `pages/ai-workbench/index.tsx` | 零测试 |
| 设置功能（主题/语言/布局） | `pages/settings/*/index.tsx` | 仅测试导航，不测试功能 |
| 错误页面（403/404/500） | `pages/errors/*.tsx` | 零测试 |
| 登录失败场景 | — | 零测试（只测成功登录） |
| 权限路由守卫 | `router/AppRoutes.tsx` | 零测试 |
| 帮助/指南 | `pages/help/guide/index.tsx` | 零测试 |
| 插件管理功能 | `pages/plugins/management/index.tsx` | 仅测导航 |
| Tab 导航/多标签路由 | `store/tabStore.ts` | 零测试 |
| 数据管理首页 | `pages/data-management/index.tsx` | 零测试 |

**为什么值得关心**: 44 个 E2E 测试中，大部分集中在 master-detail 页面（18 个）和 lazy-loading（7 个）。最核心的用户流程（登录失败、权限、Dashboard）反而没有覆盖。

**信心水平**: 确定

---

## 发现 11：MEDIUM — E2E 测试使用 4 处硬等待 (`waitForTimeout`)

**在哪里**:
- `tests/e2e/amis-css-isolation.spec.ts:102` — 2000ms
- `tests/e2e/amis-css-isolation.spec.ts:170` — 2000ms
- `tests/e2e/amis-react19-transition.spec.ts:70` — 500ms
- `tests/e2e/master-detail-dialogs.spec.ts:91` — 500ms

**是什么**: 硬编码的 `waitForTimeout` 等待。在慢速 CI 机器上可能不够等待，在快速机器上浪费时间。`networkidle` 也被用于 4 个位置，Playwright 文档明确警告其固有不稳定性。

**信心水平**: 确定

---

## 发现 12：MEDIUM — Extension `useShellConfig` hook 不是响应式的

**在哪里**: `apps/main/src/hooks/useShellConfig.ts:1-5`

**是什么**: 这个 hook 只是调用模块级 getter，没有 subscription、没有 React state、没有 context：

```typescript
export function useShellConfig() {
  return getShellRuntimeConfig();
}
```

如果 shell 配置在扩展加载后异步变化，使用此 hook 的组件不会重新渲染。

**为什么值得关心**: 这个 hook 名字暗示它是响应式的（`use` 前缀），但实际上不是。扩展开发者可能依赖它在配置变化时更新 UI，但不会生效。

**信心水平**: 确定

---

## 发现 13：MEDIUM — Extension Bootstrap 无并发保护和非原子状态初始化

**在哪里**: `apps/main/src/extensions/bootstrap.ts:148-175`

**是什么**: `bootstrapExtensions()` 执行 6 步状态变更（注册定义 → 设置扩展列表 → 应用品牌 → 初始化 i18n → 加载 i18n → 应用 i18n 资源），但：

1. 没有互斥锁防止并发调用
2. 在步骤 1-6 之间，应用处于部分初始化状态
3. 如果步骤 4-6 中间失败，步骤 1-3 的副作用已无法回滚

```typescript
export async function bootstrapExtensions(): Promise<LoadedExtension[]> {
  registerHostSharedModules();
  const loaded = await loadExtensions({ sources, context: { logger } });
  applyExtensionDefinitions(loaded);   // (1) 永久修改注册表
  setLoadedExtensions(loaded);          // (2) 设置全局状态
  applyDocumentBranding(loaded);        // (3) 修改 DOM
  await initializeI18n();               // (4) async - 可能失败
  await loadExtensionI18nFromBaseUrl(loaded); // (5) async - 可能失败
  applyExtensionI18nResources(loaded);  // (6)
  return loaded;
}
```

**信心水平**: 很可能（在 HMR 开发环境中最可能触发）

---

## 发现 14：LOW-MEDIUM — AMIS Singleton HTTP Client 捕获过期 Adapter

**在哪里**: `packages/amis-core/src/core/ajax.ts:288-310`

**是什么**: `_client` 是模块级单例。一旦创建，闭包捕获了 `adapter` 的引用。如果 `registerAmisRuntimeAdapter` 被调用时提供了新 adapter（`AmisSchemaPage` 每次 mount 都会），`_client` 的回调仍然指向旧 adapter 的 `getLocale`、`getAuthToken`、`setAuthToken`、`onUnauthorized`。

主应用通过提供自定义 `request` 方法绕过了这个单例，但任何不提供自定义 `request` 的消费者都会命中这个 bug。

**信心水平**: 很可能

---

## 发现 15：LOW-MEDIUM — E2E Mock 数据跨文件完全重复

**在哪里**:
- `tests/e2e/plugin-demo.spec.ts:5-60` vs `tests/e2e/flow-editor.spec.ts:5-60` — `demoRoutesMenuResponse` 完全相同
- `tests/e2e/i18n-persistence.spec.ts:4-71` vs `tests/e2e/lazy-loading.spec.ts:4-72` — `fluxEnabledSiteMapResponse` + `fluxEnabledMenuResponse` 完全相同
- `tests/e2e/master-detail-buttons.spec.ts:205-213` vs `tests/e2e/master-detail-dialogs.spec.ts:4-9` — `navigateToDetail` 辅助函数重复

**为什么值得关心**: API schema 变更时需要同时更新多处。`auth.ts` 已经有 439 行 mock 数据，各 spec 又各自维护副本。没有集中的 test data factory 或 fixture 系统。

**信心水平**: 确定
