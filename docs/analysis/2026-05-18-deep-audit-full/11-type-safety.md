# 维度 11：类型安全与契约质量

## 第 1 轮（初审）

## `any` 使用统计（explicit `any` / `as any` / `<any>` / `any[]`）

| 包/目录 | 合理 | 可疑 | 危险 | 备注 |
| --- | ---: | ---: | ---: | --- |
| `apps/main` | 3 | 0 | 0 | 全在测试 mock（`httpAjax.test.ts`、`http.test.ts`） |
| `packages/extension-host` | 5 | 0 | 0 | 全在测试用例，故意构造非法输入 |
| `packages/shared` | 0 | 0 | 0 | 未发现 explicit `any` |
| `packages/plugin-bridge` | 0 | 0 | 0 | 未发现 explicit `any` |
| `packages/core` | 0 | 0 | 0 | 未发现 explicit `any` |
| `packages/ui` | 0 | 0 | 0 | 未发现 explicit `any` |
| `examples/plugin-demo` | 0 | 0 | 0 | 未发现 explicit `any` |
| `examples/extension-demo` | 0 | 0 | 0 | 未发现 explicit `any` |
| `tests/e2e` | 6 | 0 | 0 | 全在 Playwright 性能条目读取场景 |

补充结论：

- 本轮未发现生产代码中的危险 explicit `any`
- `@ts-expect-error` / `@ts-ignore` 全仓搜索结果为 0
- `PluginBridge`、`ShellExtension` 定义与实际使用基本一致，且已有较完整 JSDoc
- `AuthState`、`ThemeConfig` 定义与实际使用一致，未见实现漂移
- 主要问题集中在：公共契约表达精度不足、以及 1 处具有实际运行时漂移风险的多重断言

### [维度11-01] `MenuItem` 公开类型未表达 `pageType` 的配套字段约束，属于误导性公共契约
- **文件**: `C:\can\nop\nop-chaos-next\packages\shared\src\types\menu.ts:1-18`
- **证据片段**:
```ts
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
```
- **严重程度**: P2
- **分类**: 可疑
- **现状**: `MenuItem` 把 `componentId`、`pluginUrl`、`schemaPath`、`frameSrc`、`externalUrl` 都定义成可选；但运行时校验器 `C:\can\nop\nop-chaos-next\packages\shared\src\utils\menuConfig.ts:106-131` 实际要求它们随 `pageType` 成对出现。
- **真实风险**: 扩展作者或宿主侧代码按类型系统写出“可编译但非法”的菜单对象时，编译期不会报错，只会在运行时 `validateMenuResponse()` / `mergeExtensionMenus()` 阶段抛错，属于真实的契约误导。
- **建议**: 将 `MenuItem` 改为按 `pageType` 区分的 discriminated union；至少补齐字段级 JSDoc，明确每种 `pageType` 的必填伴随字段。
- **误报排除**: 这里不是把动态菜单来源本身当问题；问题在于共享类型比真实约束更宽，且该宽松会直接放过无效对象直到运行时。
- **复核状态**: `未复核`

### [维度11-02] `mock://flux-demo` 路径上的示例 schema 使用 `as unknown as FluxSchema`，会掩盖结构漂移
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\flux\testSchema.ts:247-249`
- **证据片段**:
```ts
} as const satisfies Record<string, unknown>;

export const testFluxSchemaInput = testFluxSchema as unknown as FluxSchema;
```
- **严重程度**: P3
- **分类**: 可疑
- **现状**: 本地常量只满足 `Record<string, unknown>`，随后被整体双重断言成 `FluxSchema`。而 `C:\can\nop\nop-chaos-next\apps\main\src\flux\providers.ts:37-43` 仅做了顶层 `"type" in value` 校验后就返回为 `FluxSchema`。
- **真实风险**: 一旦 demo/mock schema 的深层结构与 `FluxSchema` 漂移，编译器不会报警，运行到 `mock://flux-demo` 页面时才可能在渲染链路中报错。
- **建议**: 优先改为 `satisfies FluxSchema`；若上游类型过宽，至少增加一个针对 demo schema 的更细运行时校验或 builder。
- **误报排除**: 这里不是第三方动态边界，也不是 `SystemJS`/插件动态配置/AMIS schema 回调里的合理宽类型；它是仓库内自带、会被实际页面消费的本地 schema 常量。
- **复核状态**: `未复核`

### [维度11-03] `AuthState` / `ThemeConfig` 作为跨包公共契约缺少字段语义文档
- **文件**: `C:\can\nop\nop-chaos-next\packages\shared\src\types\user.ts:17-22；C:\can\nop\nop-chaos-next\packages\shared\src\types\theme.ts:12-15`
- **证据片段**:
```ts
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token?: string;
  tokens?: AuthTokens;
}

export interface ThemeConfig {
  themeId: ThemeId;
  displayMode: DisplayMode;
}
```
- **严重程度**: P3
- **分类**: 可疑
- **现状**: 两者均为 `@nop-chaos/shared` 导出的公共接口，被 `authStore`、`themeStore`、`plugin-bridge`、`amis adapter` 等跨包消费，但没有字段级 JSDoc；相比之下 `PluginBridge`、`ShellExtension` 已有较完整说明。
- **真实风险**: 使用方很容易误解 `AuthState.isAuthenticated` 与 `user/token/tokens` 的关系，或忽略 `ThemeId` 在运行时还会经过 `normalizeThemeId()` 归一化，导致公共契约理解不一致。
- **建议**: 为 `AuthState`、`ThemeConfig` 添加字段级 JSDoc；至少写明 `isAuthenticated` 的语义、`token` 与 `tokens.accessToken` 的关系、以及 `themeId` 的归一化规则。
- **误报排除**: 本项不是实现不一致；复核结果显示 `AuthState` 与 `C:\can\nop\nop-chaos-next\apps\main\src\store\authStore.ts` 一致，`ThemeConfig` 与 `C:\can\nop\nop-chaos-next\apps\main\src\store\themeStore.ts` / `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\index.ts` 一致。问题在于公共契约文档缺失。
- **复核状态**: `未复核`

## 搜索范围与关键契约文件

- 搜索范围：`C:\can\nop\nop-chaos-next` 全仓 `*.{ts,tsx,js,jsx,mts,cts}`
- 关键契约文件：
  - `C:\can\nop\nop-chaos-next\packages\shared\src\types\extension.ts`
  - `C:\can\nop\nop-chaos-next\packages\shared\src\types\menu.ts`
  - `C:\can\nop\nop-chaos-next\packages\shared\src\types\theme.ts`
  - `C:\can\nop\nop-chaos-next\packages\shared\src\types\user.ts`
  - `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\types.ts`
- 抑制注释检查：
  - `@ts-expect-error`: 0
  - `@ts-ignore`: 0

## 深挖第 2 轮追加

### [维度11-04] `ShellExtension` 公共契约与主应用真实接线存在漂移，多个已导出扩展能力在生产链路未落地
- **文件**: `packages/shared/src/types/extension.ts:148-167`; `apps/main/src/router/pageRegistry.tsx:51-57`; `apps/main/src/config/themeRegistry.ts:24-35`; `apps/main/src/config/i18n/languages.ts:32-43`; `packages/shared/src/auth/config.ts:25-29`
- **证据片段**:
```ts
/** Languages this extension provides translations for. */
supportedLanguages?: ExtensionLanguage[];
/** Available visual themes. */
themes?: ExtensionTheme[];
/** Page components registered as built-in routes. */
builtinPages?: ExtensionBuiltinPage[];

export function registerBuiltinPages(
  pages: Array<{ componentId: string; component: BuiltinPage }>,
) {
```
- **严重程度**: P1
- **分类**: 危险
- **现状**: `@nop-chaos/shared` 公开的 `ShellExtension` 明确承诺了 `supportedLanguages`、`themes`、`builtinPages`、`auth` 等输入能力；但主应用生产代码中只能看到对应注册入口的“定义”，未看到实际接线调用。全仓搜索显示这些注册/应用函数主要出现在定义文件和测试中，未形成从 `loadExtensions()` 到宿主注册的完整生产链路。
- **真实风险**: 扩展作者可按共享类型合法声明上述字段，编译通过，但宿主运行时静默忽略这些贡献，形成“类型承诺存在、运行时无效”的跨包契约漂移，直接误导扩展开发。
- **建议**: 若这些能力应当可用，应补齐从扩展加载到宿主注册的完整生产接线；若暂未支持，应立即收窄 `ShellExtension` 公共类型或以 JSDoc 明确“预留/未接线”。
- **误报排除**: 这不是要求所有可选字段都必须即时启用；问题在于这些字段已作为共享公共 API 对外导出，并有对应宿主注册函数与示例扩展输入，却在生产代码中缺少消费路径。
- **复核状态**: `未复核`

### [维度11-05] 扩展加载链路存在新的 `unknown -> ShellExtension` 高风险收窄：动态模块仅校验 `id`
- **文件**: `packages/extension-host/src/loadExtensions.ts:14-16,34-47`
- **证据片段**:
```ts
function isShellExtension(value: unknown): value is ShellExtension {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0
}
return import(/* @vite-ignore */ resolveSameOriginPath(source.entry).href) as Promise<ExtensionModule>
function normalizeExtension(raw: unknown, source: ExtensionSource): ShellExtension {
  if (!isShellExtension(raw)) {
    throw new Error(`Extension '${source.id}' must export an object with a non-empty 'id'`)
  }
  return raw
}
```
- **严重程度**: P1
- **分类**: 危险
- **现状**: 动态导入结果先被断言为 `Promise<ExtensionModule>`，随后 `normalizeExtension()` 只通过 `isShellExtension()` 检查 `id` 是否为非空字符串，就将整个 `raw` 返回为 `ShellExtension`。`menus`、`loginUi.features`、`systemPages`、`themes`、`plugins` 等其余字段未做结构校验。
- **真实风险**: 远端扩展只要导出 `{ id: 'x', menus: 'bad', loginUi: 1 }` 这类对象，就能穿过当前类型守卫并继续进入宿主链路；最终会在菜单合并、页面解析或运行时配置消费阶段报错，形成更难定位的运行时故障。
- **建议**: 为 `ShellExtension` 增加字段级 runtime validator/normalizer，对关键字段做对象/数组/字符串结构校验，避免仅凭 `id` 把 `unknown` 宣告成完整扩展对象。
- **误报排除**: 这里已经使用类型谓词把 `unknown` 宣告成 `ShellExtension`；问题不是没做深度业务校验，而是守卫名义上的收窄强度与真实校验强度严重不匹配。
- **复核状态**: `未复核`

### [维度11-06] `PluginManifest` 公共接口对配置 schema 约束过宽，且缺少字段语义文档
- **文件**: `packages/shared/src/types/plugin.ts:12-19`; `apps/main/src/pages/plugins/management/index.tsx:156-170,175-193`
- **证据片段**:
```ts
configSchema?: Array<{
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  defaultValue?: string | number;
}>;
settings?: Record<string, string | number>;
```
- **严重程度**: P2
- **分类**: 可疑
- **现状**: `PluginManifest` 是跨包公共契约，被插件管理页、插件 store、plugin-bridge 快照共同消费，但 `configSchema/settings` 没有字段级 JSDoc，也未表达随 `type` 变化的约束：`select` 没有强制 `options`，`defaultValue` 未与 `type` 联动收窄，`settings` 也未与 `configSchema` 的键和值建立关联。
- **真实风险**: 插件清单可在类型上合法通过，但运行到配置页时会出现 `select` 无选项、`number` 字段携带字符串默认值、持久化 `settings` 与 schema 语义不一致等问题。
- **建议**: 将 `configSchema` 改为 discriminated union，并为 `settings` 补充语义说明；若暂不做强关联，也应通过 JSDoc 明确 `select` 需提供 `options`、`defaultValue` 必须与 `type` 对齐。
- **误报排除**: 这里不是要求把动态插件配置做成完全静态可推导；问题在于当前共享类型已给出较具体的字段结构，却仍放过明显非法组合。
- **复核状态**: `未复核`

## 深挖第 3 轮追加

### [维度11-07] `TokenStorage` 公开契约把未校验的持久化数据宣告为 `AuthTokens`，类型收窄强度与真实校验不匹配
- **文件**: `packages/shared/src/auth/tokenManager.ts:26-30`
- **证据片段**:
```ts
getTokens: () => {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
},
```
- **严重程度**: P2
- **分类**: 可疑
- **现状**: `TokenStorage.getTokens()` 的公开返回类型是 `AuthTokens | null`，但读取持久化时仅做了 JSON 解析，未校验关键字段结构，就直接断言为 `AuthTokens`。
- **真实风险**: 一旦本地存储中的 token 数据被旧版本遗留、手工篡改或异常写坏，调用方仍会把它当成合法 `AuthTokens` 使用；后续过期判断、刷新流程与鉴权请求头拼装都可能建立在错误结构上。
- **建议**: 为持久化 token 增加 runtime validator/normalizer；至少在读回时校验关键字段类型，不满足时返回 `null` 并清理坏数据。
- **误报排除**: 问题不在“所有持久化数据都要深校验”，而在于函数签名已把返回值声明为完整 `AuthTokens`，但实现只做了 `JSON.parse()`。
- **复核状态**: `未复核`

### [维度11-08] `unwrapApiPayload<T>()` 用宽松浅判断把原始 `unknown` 直接伪装成 `T`，公共解包契约存在误导
- **文件**: `packages/shared/src/http/payload.ts:7-28`
- **证据片段**:
```ts
export function isApiPayload(value: unknown): value is ApiPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('status' in value || 'msg' in value || 'data' in value)
  );
}

if (!isApiPayload(value) || !('status' in value)) {
  return value as T;
}
```
- **严重程度**: P2
- **分类**: 可疑
- **现状**: `unwrapApiPayload<T>()` 的签名承诺返回 `T`，但内部只用极宽松的 `isApiPayload()` 做浅判断；只要输入不是它认定的 payload，函数就会把整个 `unknown` 直接断言成 `T` 返回。
- **真实风险**: 当后端响应形状与约定的 payload 略有漂移，或业务对象自身恰好带有 `data/msg` 字段时，调用方会在编译期得到“已是 T”的错误安全感，直到后续字段访问才暴露契约不一致。
- **建议**: 收紧 `isApiPayload()` 条件，至少要求 `status` 存在；或把“严格解包”和“原样透传”拆成两个 helper，避免单个 `T` 覆盖两条不同运行时路径。
- **误报排除**: 问题不是泛型断言本身，而是该共享 helper 被上层请求封装直接依赖，其返回类型已被用来代表“已完成 payload 解包”。
- **复核状态**: `未复核`

## 维度复核结论

- [维度11-01]: 保留 (P2)。`MenuItem` 公开类型仍宽于 `menuConfig.ts` 的真实 `pageType` 字段约束。
- [维度11-02]: 保留 (P3)。`testSchema.ts` 的 `as unknown as FluxSchema` 与 `providers.ts` 的宽松校验仍会掩盖深层 schema 漂移。
- [维度11-03]: 驳回。`AuthState` / `ThemeConfig` 缺字段 JSDoc 更偏文档完备性，而非类型安全缺陷。
- [维度11-04]: 驳回。live code 已在 extension bootstrap 中接线 `auth`、语言、主题、builtinPages、plugins 与 i18nResources，原结论不成立。
- [维度11-05]: 保留 (P1)。`loadExtensions.ts` 的类型守卫仍只校验非空 `id`，却把结果收窄为完整 `ShellExtension`。
- [维度11-06]: 降级 (P3)。`PluginManifest.configSchema` 过宽属实，但更接近契约精度不足。
- [维度11-07]: 保留 (P2)。`TokenStorage.getTokens()` 仍把未校验的持久化数据直接断言为 `AuthTokens`。
- [维度11-08]: 驳回。`unwrapApiPayload<T>()` 的宽边界行为已通过 JSDoc 明确，当前更像有意的 API 取舍。

## 子项复核结论

- [维度11-05]: 子项复核通过。`loadExtensions.ts` 仍只靠非空 `id` 把 `unknown` 收窄为完整 `ShellExtension`。
