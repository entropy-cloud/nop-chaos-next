# Page JSON Extension Point

> 本文档定义 extension 系统对页面 JSON 的后处理扩展机制。

> **上下文**：ShellExtension 当前仅支持启动时配置注入（品牌、主题、语言、内置页面等）。页面 JSON 在加载后直接经过内部转换流水线（AMIS 的 `transformPageJson` / Flux 的直接渲染），不支持 extension 级运行时后处理。

> **重要**：本设计经过代码库审计后更新。关键发现：
> - `AmisPageRoute.tsx` 实际位于 `packages/amis-react` 包中，该包**不**依赖 `@nop-chaos/extension-host`，因此 AMIS 侧的 extension point 必须提升到 `apps/main` 层
> - Flux 侧 page 加载有两条路径（`FluxRouteRenderer` 直接调用 + 内部 `loadPage`），两者都需要 transformer 覆盖
> - 详见下文 §5.3 应用位置

---

## 1. 目标

在页面 JSON 加载完成后、进入渲染流水线之前，提供 extension 注册的转换函数介入点，允许 extension 对返回的 JSON 进行任意修改。

典型场景：

- 注入全局级别的 `xui:component` 映射（extension 自定义组件）
- 替换特定 schema 节点的数据源路径
- 根据业务环境动态调整页面结构
- 注入全局事件或动作

## 2. 类型定义

位于 `packages/shared/src/types/pageTransformer.ts`：

```ts
export interface PageTransformerContext {
  /** 页面 schema 路径 */
  schemaPath: string;
  /** 页面渲染引擎类型 */
  pageType: 'amis' | 'flux';
}

/**
 * 转换函数，接收页面 JSON，返回修改后的 JSON。
 * 返回 undefined 或 void 表示不修改（保持输入不变）。
 * 使用泛型 T 以保留具体 schema 类型信息（AMIS Schema / FluxSchema）。
 */
export type PageTransformFn<T = Record<string, unknown>> = (
  schema: T,
  context: PageTransformerContext,
) => T | undefined | void | Promise<T> | Promise<undefined> | Promise<void>;

export interface PageTransformerRegistration<T = Record<string, unknown>> {
  id: string;
  /** 执行顺序，升序。不指定则默认 100。 */
  order?: number;
  transform: PageTransformFn<T>;
}
```

泛型默认值为 `Record<string, unknown>` 以保证向后兼容。使用方可以指定更具体的类型：

```ts
const registration: PageTransformerRegistration<FluxSchema> = {
  id: 'my-flux-transform',
  transform: (schema, ctx) => {
    // schema 的类型会被推断为 FluxSchema
    return schema;
  },
};
```

## 3. Registry

位于 `packages/extension-host/src/pageTransformers.ts`（公共 API 从 `@nop-chaos/extension-host` 导出）：

```ts
export function registerPageTransformer(registration: PageTransformerRegistration): void;
export function unregisterPageTransformer(id: string): void;
export function getPageTransformers(): PageTransformerRegistration[];
export async function applyPageTransformers<T>(
  schema: T,
  context: PageTransformerContext,
): Promise<T>;
```

行为：

- `registerPageTransformer` 按 `order` 升序插入，同 order 按注册顺序
- `unregisterPageTransformer` 按 `id` 删除
- `applyPageTransformers` 按已排序列表顺序执行，每个 transformer 的输入是上一个的输出
- 如果某个 transformer 返回 `undefined` 或 `void`，则保持输入不变
- **transformer 中抛出的异常不阻塞后续 transformer**，但记录警告日志（`console.warn`）。当异常发生时，对应的 transformer 被跳过，下一个 transformer 收到**上一个 transformer 的输出**（即抛出异常的那一个的入参，而非 `undefined`）。如果所有 transformer 都抛出异常，返回原始 schema 输入。

## 4. ShellExtension 新增字段

在 `packages/shared/src/types/extension.ts` 的 `ShellExtension` 接口中新增：

```ts
export interface ShellExtension {
  // ... 现有字段

  /**
   * 页面 JSON 后处理转换器。
   * 在页面 JSON 加载完成后、渲染前按 order 顺序执行。
   * 多个 extension 的 transformer 合并后统一排序。
   *
   * 接收静态配置的 `PageTransformerRegistration` 数组。如果 transformer
   * 需要运行时条件注册或动态 id，可以在 `setup()` 中调用
   * `registerPageTransformer()` 实现。
   */
  pageTransformers?: PageTransformerRegistration[];
}
```

## 5. 生命周期

### 5.1 注册时机

Extension 在 bootstrap 期间通过 `applyExtensionDefinitions` 注册 transformer。这是静态声明式注册（优先推荐）：

```ts
// apps/main/src/extensions/bootstrap.ts
import { registerPageTransformer } from '@nop-chaos/extension-host';

function applyExtensionDefinitions(loaded: LoadedExtension[]) {
  // ... 现有逻辑

  for (const { extension } of loaded) {
    if (extension.pageTransformers) {
      for (const registration of extension.pageTransformers) {
        registerPageTransformer(registration);
      }
    }
  }
}
```

Transformer 一旦注册即全局生效，直到页面卸载。注册顺序按 extension 的 `order` 排序，同一 extension 内的 transformer 按其自身的 `order` 排序。

**声明式（`pageTransformers`）vs 编程式（`setup()`）：**

| 维度 | `pageTransformers`（声明式） | `setup()` 内 `registerPageTransformer`（编程式） |
|------|---------------------------|----------------------------------------------|
| 触发时机 | `applyExtensionDefinitions` | `loadExtensions` 内的 `setup` 阶段 |
| 适用场景 | transformer 是固定、静态的一组函数 | transformer 需要运行时条件判断、动态 id 或异步注册 |
| 一致性与现有模式 | 一致（所有 `ShellExtension` 字段均为声明式配置） | 新增，但已存在的 `setup()` 钩子可承载该场景 |

两种方式可以混合使用。声明式适用于大部分场景；编程式用于需要动态注册的复杂需求。

> **设计决策**：优先支持声明式 `pageTransformers` 静态数组，与 `ShellExtension` 其他字段（`builtinPages`、`themes` 等）保持一致。transformer 可捕获 extension 局部状态（闭包），无需额外注册代码。

### 5.2 执行时机

Transformer 在页面 JSON 加载完成后立即执行。具体管道因渲染引擎而异：

**AMIS 流水线**：
```
provider.getPage(schemaPath)
  → fetchAmisPage(schemaPath)
    → withPageCache(...) → 返回深拷贝 ← applyPageTransformers 在此应用
  → AmisPageRoute setSchema
    → AmisSchemaPage transformPageJson + bindActions → render
```

**Flux 流水线（初始加载）**：
```
fetchFluxPage(schemaPath, signal)
  → 返回原始 schema  ← applyPageTransformers 在此应用
  → FluxRouteRenderer setSchema
    → FluxSchemaRenderer render
```

**Flux 流水线（内部导航，通过 adapter.loadPage）**：
```
loadPage(path, signal)
  → withPageCache(...) → fetchFluxPage(...) → clone ← applyPageTransformers 在此应用
  → Flux 渲染器接收 transform 后的 schema
```

> **缓存说明**：`fetchAmisPage` 使用 `withPageCache`（LRU 缓存），返回的是缓存值的深拷贝（`cloneValue`）。Transformer 修改深拷贝后的对象，不影响缓存。每次页面访问都从头执行 transformer。
>
> `fetchFluxPage` 当前在 `FluxRouteRenderer` 中**不经过缓存**直接调用（初始加载）；内部 Flux 导航通过 `adapter.loadPage` 走 `withPageCache`。详见 §5.3 的集成位置说明。

### 5.3 应用位置

#### AMIS 侧

**不可行方案（已否决）**：在 `packages/amis-react/src/components/AmisPageRoute.tsx` 中直接导入 `@nop-chaos/extension-host`。

原因：`packages/amis-react/package.json` 不依赖 `@nop-chaos/extension-host`，且不应新增该依赖——`amis-react` 是通用 AMIS 渲染包，不应引入 extension 系统概念。

**采用方案**：在 `apps/main/src/amis/providers.ts` 中包装 `mainAmisPageProvider.getPage`，拦截 API 返回后立即应用 transformer：

```ts
// apps/main/src/amis/providers.ts
import { applyPageTransformers } from '@nop-chaos/extension-host';

export const mainAmisPageProvider: AmisPageProvider = {
  async getPage(schemaPath) {
    const schema = await fetchAmisPage(schemaPath);
    return applyPageTransformers(schema, {
      schemaPath,
      pageType: 'amis',
    });
  },
};
```

选择此位置的理由：

| 条件 | 满足情况 |
|------|---------|
| `apps/main` 可以依赖 `@nop-chaos/extension-host` | ✅（已存在于 `package.json`） |
| 无包边界违规 | ✅（都在 `apps/main` 内） |
| 不侵入共享包 `packages/amis-react` | ✅ |
| 对 `AmisPageRoute` 透明（无需改动） | ✅ |
| transformer 执行时机位于 API 返回后、setSchema 前 | ✅ |
| 可复用现有缓存（`fetchAmisPage` 的 `withPageCache`） | ✅ |

**替代方案**：在 `apps/main/src/services/pageApi.ts` 的 `fetchAmisPage` 返回前应用 transformer。
优点：集中一处，所有调用方（包括未来新增的 AMIS 页面加载方式）都自动获得 transformer。
缺点：`pageApi.ts` 是通用服务层，引入 extension 概念可能造成职责混淆。当前选择 provider 层更符合关注点分离原则。

#### Flux 侧

Flux 的页面加载有两条路径，需要全面覆盖：

**路径 A（初始加载 —— `FluxRouteRenderer.tsx`）**：

```ts
// apps/main/src/flux/FluxRouteRenderer.tsx
import { applyPageTransformers } from '@nop-chaos/extension-host';

useEffect(() => {
  const controller = new AbortController();

  void fetchFluxPage(schemaPath, controller.signal)
    .then((value) => applyPageTransformers(value, {
      schemaPath,
      pageType: 'flux',
    }))
    .then((transformed) => {
      setResolvedSchemaPath(schemaPath);
      setSchema(transformed);
      setError(null);
    });
    // ...catch 处理不变
}, [schemaPath, t]);
```

**路径 B（内部导航 —— `flux/adapter.ts` loadPage）**：

```ts
// apps/main/src/flux/adapter.ts
import { applyPageTransformers } from '@nop-chaos/extension-host';

loadPage: (path: string, signal?: AbortSignal) =>
  withPageCache(normalizeLanguageCode(i18n.language), path, () =>
    fetchFluxPage(path, signal).then((schema) =>
      applyPageTransformers(schema, { schemaPath: path, pageType: 'flux' }),
    ),
  ),
```

> **备选集成方案**：直接在 `fetchFluxPage` 函数内部应用 transformer（`apps/main/src/flux/providers.ts`）。这样做的好处是两条路径自动覆盖，无需在 `FluxRouteRenderer` 和 `adapter.ts` 中分别添加代码。缺点是 `fetchFluxPage` 是一个通用获取函数，引入 transformer 会隐式产生副作用。当前设计选择在调用方显式调用，以保持获取函数的纯数据职责。

## 6. 与现有机制的关系

### 6.1 与 AMIS transformPageJson 的关系

| 维度 | `applyPageTransformers` | `transformPageJson` |
|------|------------------------|---------------------|
| 所有者 | extension 系统 | amis-core 内部 |
| 执行阶段 | API 返回后立即 | 渲染前，在 AmisSchemaPage 内 |
| 可见范围 | 全 page JSON | 递归遍历每个节点 |
| 覆盖范围 | AMIS + Flux | 仅 AMIS |
| 注册方 | 任意 ShellExtension | 仅宿主代码通过 `registerXuiComponent` |

`applyPageTransformers` 先于 `transformPageJson` 执行。Extension transformer 可以修改 schema 后再进入 AMIS 的角色守卫 / XUI 组件解析流程。

### 6.2 与 XUI Component Registry 的关系

`registerXuiComponent` 是节点级组件替换，作用于 `xui:component` 标记的单个节点。

`pageTransformers` 是页面级全量 JSON 转换，可以执行任何结构性修改（增删改节点、替换整段 schema、注入全局配置）。两者是互补关系。

## 7. 约束与边界

- Transformer 接收的是**原始 JSON 的深拷贝**，修改不会影响缓存中的原始数据
- Transformer 应保持幂等性，不应依赖多次执行的副作用
- Transformer 应尽量轻量，避免在页面加载关键路径上执行重计算
- 如果 transformer 需要异步获取数据，推荐使用内部缓存或去重，避免每次页面切换都发起网络请求
- 不可在 transformer 中触发 React 状态更新或 DOM 操作

## 8. 实现边界

### 8.1 依赖关系

- `packages/extension-host` 当前依赖 `packages/shared`（类型），新增 `pageTransformers.ts` 不引入额外依赖
- `apps/main`（渲染器、provider、bootstrap）已经依赖 `@nop-chaos/extension-host`（通过 `package.json`），因此可以直接 import
- `packages/amis-react/src/components/AmisPageRoute.tsx` **不导入** `@nop-chaos/extension-host`，也不应导入——transformer 应用点位于 `apps/main` 层的 provider 包装中
- 如果未来其他包的渲染器（如 `packages/core` 中的通用页面路由）需要应用 transformer，考虑将 registry 下移到 `packages/shared` 或 `packages/core`

### 8.2 类型安全

- `PageTransformFn<T>` 的泛型参数 T 默认 `Record<string, unknown>`，保证向后兼容
- 具体调用时可传入精确的 schema 类型（如 `FluxSchema`），避免无谓的 `as` 强制类型转换
- 在 `applyPageTransformers<T>(schema, context)` 调用时，TypeScript 会从 `schema` 参数推断 T，无需显式标注
- `packages/extension-host/src/pageTransformers.ts` 的 `applyPageTransformers` 实现内部使用 `unknown` 操作，但对外暴露泛型签名

### 8.3 当前选择

为保持最小改动，当前选择在 `apps/main` 层（`apps/main/src/amis/providers.ts` 和 `apps/main/src/flux/FluxRouteRenderer.tsx` / `adapter.ts`）调用 `applyPageTransformers`。registry 位于 `packages/extension-host`。

AMIS 侧不修改 `packages/amis-react` 的 `AmisPageRoute.tsx`，而是包装 provider 层——该方式对共享渲染器透明，无包边界违规。

### 8.4 缓存一致性

`fetchAmisPage` 内部有 LRU 缓存（`pageCache`），返回的是缓存值的深拷贝（`cloneValue`）。Transformer 修改深拷贝后的对象，不影响缓存。每次应用 transformer 都产生新的转换结果。

Flux 侧，`FluxRouteRenderer` 直接调用 `fetchFluxPage`（无缓存），transformer 每次执行。内部 Flux 导航通过 `adapter.loadPage` 走 `withPageCache`（返回深拷贝），同样不影响缓存。

## 9. 相关文件

| 文件 | 用途 |
|------|------|
| `packages/shared/src/types/pageTransformer.ts` | 类型定义（新增） |
| `packages/shared/src/types/extension.ts` | `ShellExtension.pageTransformers` 字段（修改） |
| `packages/extension-host/src/pageTransformers.ts` | Registry + 执行引擎（新增） |
| `packages/extension-host/src/index.ts` | 导出公共 API（修改） |
| `apps/main/src/extensions/bootstrap.ts` | Bootstrap 注册 transformer（修改） |
| `apps/main/src/amis/providers.ts` | AMIS 流水线应用点：包装 `mainAmisPageProvider.getPage`（修改） |
| `apps/main/src/flux/FluxRouteRenderer.tsx` | Flux 初始加载流水线应用点（修改） |
| `apps/main/src/flux/adapter.ts` | Flux 内部导航 `loadPage` 流水线应用点（修改） |
| `packages/amis-react/src/components/AmisPageRoute.tsx` | **不修改**——共享包无需感知 extension 机制 |
