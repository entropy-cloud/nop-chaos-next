# 维度 11：类型安全与契约质量

## 第 1 轮（初审）

## 1. any 使用统计

| 包 | `any` 数量 | 评估 |
|---|---|---|
| `packages/shared` | 0 | 干净 |
| `packages/core` | 0 | 干净 |
| `packages/plugin-bridge` | 0 | 干净 |
| `packages/amis-core` | 0 | 干净 |
| `packages/amis-react` | 0 | 干净 |
| `packages/extension-host` | 0 | 干净 |
| `packages/theme-tokens` | 0 | 干净 |
| `packages/tailwind-preset` | 0 | 干净 |
| `apps/main` | 0 | 干净 |
| **合计** | **0** | **无任何 `any` 使用** |

## 2. `as unknown as` 多重断言统计（8处）

| 文件 | 行号 | 断言目标 | 评估 |
|---|---|---|---|
| `packages/amis-react/.../AmisSchemaPage.tsx` | 122-124 | `as unknown as never` (x3) | 合理 |
| `packages/amis-core/.../ajax.ts` | 114 | `as unknown as { webkitURL? }` | 合理 |
| `apps/main/src/flux/testSchema.ts` | 249 | `as unknown as FluxSchema` | 可疑 — 见 [维度11-04] |
| `tests/e2e/amis-css-isolation.spec.ts` | 47, 158 | `as unknown as Record<string, string>` (x2) | 合理 |

## 3. @ts-expect-error / @ts-ignore 统计

**零实例。**

## 详细发现

### [维度11-01] systemjs.d.ts 在 core 和 main 之间存在重复声明且内容不一致

- **文件**: `packages/core/src/types/systemjs.d.ts` 全文 (17行) + `apps/main/src/types/systemjs.d.ts` 全文 (10行)
- **证据片段**:

core 版本:
```ts
declare module 'systemjs' {
  export interface SystemApi {
    import<T = unknown>(url: string): Promise<T>;
    addImportMap(map: { imports: Record<string, string> }): void;
    set(name: string, module: unknown): void;
  }
  const System: SystemApi;
  export { System };
  export default System;
}

declare global {
  var System: import('systemjs').SystemApi;
}

export {};
```

main app 版本:
```ts
declare module 'systemjs' {
  export interface SystemApi {
    import<T = unknown>(url: string): Promise<T>;
    addImportMap(map: { imports: Record<string, string> }): void;
    set(name: string, module: unknown): void;
  }
  const System: SystemApi;
  export default System;
}
```

- **严重程度**: P2
- **分类**: 可疑
- **现状**: 两份独立维护的 systemjs 类型声明。core 版本多出 `export { System }` 具名导出和 `declare global` 块。main app 版本缺少这些。
- **真实风险**: 如果 `SystemApi` 接口需新增方法，两处需分别修改，存在漂移风险。main app 版本缺少 `export { System }` 具名导出。
- **建议**: 将声明统一收归 `packages/shared` 或 `packages/core` 一处定义。main app 删除本地 `systemjs.d.ts`，改为通过 tsconfig 引用 core 的声明。
- **误报排除**: ambient `.d.ts` 不受 paths 映射影响，main app 确实需要本地声明。但内容重复和不一致是真实问题。
- **复核状态**: 未复核

### [维度11-02] FluxRouteRenderer 将未知 JSON 解析结果断言为 FluxSchema，无运行时校验

- **文件**: `apps/main/src/flux/FluxRouteRenderer.tsx:49-53`
- **证据片段**:

```ts
void fetchFluxPage(schemaPath, controller.signal)
  .then((value) => {
    setResolvedSchemaPath(schemaPath);
    setSchema(value as FluxSchema);    // <-- 未校验的断言
    setError(null);
  })
```

- **严重程度**: P2
- **分类**: 可疑
- **现状**: `fetchFluxPage` 返回类型由推断得出为 `Promise<unknown>`（因为泛型参数未指定）。`value as FluxSchema` 直接断言，无运行时校验。
- **真实风险**: 服务器返回无效 schema JSON 时不会在加载阶段报错，而是在渲染阶段抛出难以定位的错误。
- **建议**: 为 `fetchFluxPage` 添加显式返回类型 `Promise<FluxSchema>`，在 `.then()` 中添加最小化运行时校验。
- **误报排除**: `fetchFluxPage` 有明确的返回类型语义，只是调用链中泛型推断导致类型退化为 `unknown`。
- **复核状态**: 未复核

### [维度11-03] ShellExtension 等核心公共接口完全缺乏 JSDoc 文档

- **文件**: `packages/shared/src/types/extension.ts:128-149`
- **证据片段**:

```ts
export interface ShellExtension {
  id: string;
  order?: number;
  app?: ExtensionAppConfig;
  branding?: ExtensionBrandingConfig;
  loginUi?: ExtensionLoginUiConfig;
  shell?: ExtensionShellConfig;
  systemPages?: ExtensionSystemPagesConfig;
  env?: Record<string, string>;
  languages?: ExtensionLanguage[];
  supportedLanguages?: ExtensionLanguage[];
  i18n?: ExtensionI18nConfig;
  i18nResources?: ExtensionI18nResource[];
  themes?: ExtensionTheme[];
  styles?: ExtensionStyleAsset[];
  builtinPages?: ExtensionBuiltinPage[];
  plugins?: PluginManifest[];
  menus?: MenuItem[];
  overrideMenus?: boolean;
  auth?: ExtensionAuthConfig;
  setup?: (context: ExtensionSetupContext) => void | Promise<void>;
}
```

- **严重程度**: P2
- **分类**: 可疑（公共契约文档化不足）
- **现状**: `ShellExtension`（25+ 字段）、`PluginBridge`（10 方法）、`AmisRuntimeAdapter`（15+ 方法）等核心接口全部没有任何 JSDoc 注释。
- **真实风险**: 外部扩展开发者无法仅从类型定义推断字段语义。如 `languages` vs `supportedLanguages` 语义相近但无文档区分。
- **建议**: 为 `ShellExtension` 和 `PluginBridge` 的每个字段/方法添加一行 JSDoc。
- **误报排除**: 这些接口定义了项目的跨包公共契约，面向外部扩展/插件开发者，JSDoc 是唯一的使用说明载体。
- **复核状态**: 未复核

### [维度11-04] testSchema.ts 使用 satisfies + 双重断言绕过 FluxSchema 类型检查

- **文件**: `apps/main/src/flux/testSchema.ts:247-249`
- **证据片段**:

```ts
} as const satisfies Record<string, unknown>;

export const testFluxSchemaInput = testFluxSchema as unknown as FluxSchema;
```

- **严重程度**: P3
- **分类**: 可疑
- **现状**: `testFluxSchema` 使用 `as const satisfies Record<string, unknown>` 获得字面量类型，然后通过 `as unknown as FluxSchema` 双重断言。`satisfies Record<string, unknown>` 只验证了"是一个对象"，跳过了对 Flux schema 结构的实际校验。
- **真实风险**: 如果 `FluxSchema` 类型发生破坏性变更，测试 schema 不会产生编译错误。影响范围有限（仅测试 mock 数据）。
- **建议**: 将 `satisfies Record<string, unknown>` 替换为 `satisfies FluxSchema`。
- **误报排除**: 当前代码未尝试 `satisfies FluxSchema`，直接退化为 `Record<string, unknown>`。
- **复核状态**: 未复核

### [维度11-05] Core 的 systemjs.d.ts 中 declare global 块为死代码

- **文件**: `packages/core/src/types/systemjs.d.ts:13-15`
- **证据片段**:

```ts
declare global {
  var System: import('systemjs').SystemApi;
}

export {};
```

对比实际使用（`packages/core/src/utils/systemjs.ts:15-17`）：
```ts
function getSystem() {
  return (globalThis as typeof globalThis & { System: SystemApi }).System;
}
```

- **严重程度**: P3
- **分类**: 可疑
- **现状**: core 的 `systemjs.d.ts` 声明了 `declare global { var System }`，但 `systemjs.ts` 中的 `getSystem()` 使用手动类型断言访问 `System`，不依赖该全局声明。末尾 `export {}` 使文件成为模块，可能导致 `declare global` 不生效。
- **真实风险**: 两种机制并存且互相矛盾，可能误导后续开发者。
- **建议**: 移除 `declare global` 块和 `export {}`，或在确认全局声明确实有效后使用 `globalThis.System` 替代手动断言。
- **误报排除**: 两种不同的类型化机制并存指向同一变量，说明设计意图不一致。
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度11-06] AmisSchemaPage 使用 `as unknown as never` 三重断言完全绕过 amis render 类型检查

- **文件**: `packages/amis-react/src/components/AmisSchemaPage.tsx:122-124`
- **证据片段**:
  ```tsx
  {renderAmis(
    transformedSchema as unknown as never,
    renderProps as unknown as never,
    env as unknown as never,
  )}
  ```
- **严重程度**: P2
- **分类**: 可疑
- **现状**: 对 renderAmis 三个参数全部使用 `as unknown as never`，amis render 函数签名的任何变更都不会产生编译错误。
- **真实风险**: amis 升级后 render 签名变化无编译期警告。
- **建议**: 定义本地桥接类型做显式兼容声明。
- **误报排除**: amis 集成层最核心调用点，完全排除类型检查有真实回归风险。
- **复核状态**: 未复核

### [维度11-07] `unwrapApiPayload<T>` 两个分支均使用未经校验的 `as T` 泛型断言

- **文件**: `packages/shared/src/http/payload.ts:17,24`
- **证据片段**:
  ```ts
  if (!isApiPayload(value) || !('status' in value)) {
    return value as T;
  }
  // ...
  return value.data as T;
  ```
- **严重程度**: P2
- **分类**: 可疑
- **现状**: 公共 API 函数两条路径都只做 `as T` 无运行时校验。
- **真实风险**: 服务端返回结构与 T 不匹配时错误隐蔽爆发。
- **建议**: 增加可选 schema 验证或标注不做运行时校验。
- **误报排除**: 该函数被所有包依赖。
- **复核状态**: 未复核

### [维度11-08] `isRecord`/`isPlainObject` 类型守卫在 3 个包中独立重复实现 7 次

- **文件**: 7 个文件各自实现（amis-core/ajax.ts, amis-core/graphql.ts, amis-core/action.ts, amis-core/processor.ts, extension-host/loadExtensions.ts, shared/http/client.ts, shared/utils/menuConfig.ts）
- **严重程度**: P3
- **分类**: 可疑
- **现状**: 7 处实现逻辑相同但窄化目标不同。extension-host 的 isRecord 缺少 `!Array.isArray` 检查。
- **真实风险**: 分散维护，增强检查时易遗漏。
- **建议**: 在 shared 中统一，extension-host 补上数组排除。
- **误报排除**: extension-host 守卫缺少数组排除是真实缺陷。
- **复核状态**: 未复核

### [维度11-09] graphql.ts 将 prefix 直接断言为 OperationType 无 exhaustive check

- **文件**: `packages/amis-core/src/core/graphql.ts:470-475`
- **严重程度**: P3
- **分类**: 可疑
- **现状**: `as OperationType` 硬断言，联合类型扩展时不报编译错误。
- **建议**: 使用 switch + never 穷举检查。
- **误报排除**: 当前正确但缺乏面向未来保护。
- **复核状态**: 未复核

### [维度11-10] amis schema 处理管线全链路返回 `unknown`

- **文件**: `packages/amis-core/src/page/processor.ts:7-10`, `transform.ts:42`, `action.ts:245`
- **严重程度**: P3
- **分类**: 可疑
- **现状**: 三个核心函数输入输出全为 `unknown`，无类型约束。
- **建议**: 至少声明返回类型为 `Promise<AmisSchemaRecord>`。
- **误报排除**: 当前功能正确但类型信息完全丢失。
- **复核状态**: 未复核
