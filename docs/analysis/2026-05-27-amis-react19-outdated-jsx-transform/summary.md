# AMIS React 19 Outdated JSX Transform 分析

## 背景

- 触发现象：浏览器开发环境持续出现 React 19 警告：`Your app (or one of its dependencies) is using an outdated JSX transform.`
- 触发链路：主应用进入 AMIS 页面后，在 `SchemaRenderer -> ActionRenderer -> Button -> themeable/StatusScoped` 这一段组件树中触发。
- 分析目标：判断问题来自主应用、第三方依赖，还是 `amis-react19` 自定义 fork 与打包链路；同时定位到具体源码位置和构建原因。

## 结论

- 根因不在 `apps/main` 自身的 React 写法，而在 `C:\can\nop\amis-react19` 这套本地打包产物。
- `amis-react19` 同时存在两类问题：
  - 源码层仍保留显式 `React.createElement(...)` 调用。
  - 打包层没有把这类调用统一收敛为 modern JSX runtime，且 CJS 构建中还额外保留了偏 classic 风格的后处理逻辑。
- 因此即使顶层 TypeScript 配置使用了 `jsx: "react-jsx"`，最终发布到 `dist-packages/*.tgz` 的产物里仍然混合存在：
  - `react/jsx-runtime`
  - `React.createElement(...)`
- React 19 在开发模式下会把这类混合产物识别为 outdated JSX transform，并在渲染经过相关组件链时发出警告。

## 分析范围

- 主仓库：`C:\can\nop\nop-chaos-next`
- 外部依赖源码仓库：`C:\can\nop\amis-react19`
- 重点检查对象：
  - `packages/amis-core`
  - `packages/amis-ui`
  - `packages/amis`
  - 对应的 `rollup.config.js`、`tsconfig.json`、`dist-packages/*.tgz`

## 触发链路

用户提供的运行时堆栈包含以下关键节点：

- `uncontrollable.js`
- `theme.js`
- `Button.js`
- `Action.js`
- `Badge.js`
- `SchemaRenderer.js`
- `StatusScoped.js`
- `Root.js`

这些名称与 `amis-react19` 中 `amis-core`、`amis-ui`、`amis` 的产物文件高度对应，说明警告发生在 AMIS 运行时组件树内部，而不是主应用页面层。

## 主应用侧证据

### 1. 主应用并未直接消费源码版 `amis`

`nop-chaos-next` 依赖的是本地 tgz 包，而不是从 npm 直接安装的官方发布版本：

- `apps/main/package.json`
  - `amis`: `file:../../../amis-react19/dist-packages/amis-6.13.1.tgz`
  - `amis-core`: `file:../../../amis-react19/dist-packages/amis-core-6.13.1.tgz`
  - `amis-ui`: `file:../../../amis-react19/dist-packages/amis-ui-6.13.1.tgz`
- `packages/amis-react/package.json`
  - 同样依赖 `../../../amis-react19/dist-packages/*.tgz`

这意味着运行时行为由 `amis-react19` 打包结果决定，而不是由 `apps/main` 的 Vite/React 编译配置直接决定。

### 2. 主应用以 ESM 方式导入 `amis`

- `packages/amis-react/src/components/AmisSchemaPage.tsx:2`
  - `import { clearStoresCache, render as renderAmis, setDefaultLocale } from 'amis';`
- `apps/main/vite.config.ts`
  - 使用 Vite 进行 ESM 构建。

结合 `amis/package.json` 的 `exports` 可判断：主应用优先走 `import` 条件，实际加载 `esm/index.js`，而不是 `lib/index.js`。

因此问题不能只归咎于 CJS 产物；ESM 产物也必须存在旧 JSX 风格代码。

## amis-react19 源码层证据

### 1. 顶层 tsconfig 已启用 modern JSX

- `C:\can\nop\amis-react19\tsconfig.json:8`
  - `"jsx": "react-jsx"`

这说明问题不是“完全没有打开新 JSX transform”。

### 2. 关键源码文件仍手写 `React.createElement(...)`

最关键的命中点在 `amis-core`：

- `C:\can\nop\amis-react19\packages\amis-core\src\SchemaRenderer.tsx:486`

该处源码直接使用：

```tsx
React.createElement(schema.component as any, {
  ...rest,
  ...restSchema,
  ...exprProps,
  defaultData,
  defaultValue,
  defaultActiveKey,
  propKey,
  $path: $path,
  $schema: schema,
  ref: isSFC ? undefined : this.refFn,
  forwardedRef: isSFC ? this.refFn : undefined,
  render: this.renderChild,
  rootStore,
  statusStore,
  dispatchEvent: this.dispatchEvent
})
```

这不是 JSX 语法，而是显式 classic runtime 风格调用。TypeScript 的 `jsx: react-jsx` 不会把这类手写 `React.createElement(...)` 自动改写成 `jsx/jsxs`。

### 3. `amis-ui` 里也存在多处同类写法

在 `amis-ui` 中同样能看到多处显式 `React.createElement(...)`：

- `packages/amis-ui/src/components/calendar/CalendarContainer.tsx:25`
- `packages/amis-ui/src/components/calendar/TimeView.tsx:288`
- `packages/amis-ui/src/components/calendar/QuartersView.tsx:128`
- `packages/amis-ui/src/components/calendar/MonthsView.tsx:133`
- `packages/amis-ui/src/components/calendar/YearsView.tsx:113`
- `packages/amis-ui/src/components/calendar/DaysView.tsx:213`

这些点说明 `amis-react19` 不是“只有某一处遗留调用”，而是源码中仍保留了一批 classic element factory 写法。

### 4. 当前 host-side fixed reproducer 与最小热点边界

- 当前固定 reproducer 已收敛为 `nop-chaos-next` 的 `/#/amis/preview` 页面。
- 该页的静态 schema 由 `apps/main/src/amis/providers.ts` 在 `schemaPath === 'mock://preview'` 时加载 `apps/main/src/amis/testSchema.ts`。
- 当前用于稳定命中 `SchemaRenderer -> ActionRenderer -> Button` 链的最小触发区块是：
  - `apps/main/src/amis/testSchema.ts:78-96` 的 `button-toolbar`
  - `apps/main/src/amis/testSchema.ts:99-116` 的 `button-group`
- 重新审视 `amis-react19` 源码后，当前 confirmed trigger hotspot 只有：
  - `C:\can\nop\amis-react19\packages\amis-core\src\SchemaRenderer.tsx`
- `amis-ui` 中当前检出的 `React.createElement(...)` 仍主要位于 `calendar/*` 组件；它们属于 adjacent surface，但在本次 fixed reproducer 链中尚未形成 confirmed trigger path，因此当前更适合作为 residual watch target，而不是本轮最小修复集合的一部分。

## 打包产物证据

### 1. ESM 产物已确认保留旧调用

- `C:\can\nop\amis-react19\packages\amis-core\esm\SchemaRenderer.js:360`

构建结果中仍然存在：

```js
React.createElement(schema.component, ...)
```

这证明：

- 主应用即使走 ESM 入口，仍会加载包含 classic 风格调用的模块。
- 问题不是仅存在于 `lib/cjs` 目录。

后续最小修复落地后，`C:\can\nop\amis-react19\packages\amis-core\esm\SchemaRenderer.js` 已不再包含 `React.createElement(`，说明 `SchemaRenderer` 这条 host-consumed ESM 路径上的 classic 调用已被源码改写消除；剩余 closure 仍需依赖完整 tgz 重打包与 host-side console proof 完成。

### 2. CJS 产物呈现混合运行时状态

- `C:\can\nop\amis-react19\packages\amis-core\lib\SchemaRenderer.js:11`
  - `var jsxRuntime = require('react/jsx-runtime');`
- `C:\can\nop\amis-react19\packages\amis-core\lib\SchemaRenderer.js:74-76`
  - `var __react_jsx__ = require('react');`
  - `var _J$X_ = (__react_jsx__["default"] || __react_jsx__).createElement;`

同一产物同时引入：

- `react/jsx-runtime`
- `react` + `createElement`

这是一个非常明确的信号：构建结果没有统一使用单一 modern runtime，而是混合了两套 JSX/element factory 路径。

### 3. `amis-ui/lib` 中也有大量 classic 风格输出

例如多处图标产物包含：

- `require('react')`
- `.createElement`

这进一步说明 tgz 中确实携带大量 classic 风格代码，而不是个别边角文件。

## 打包配置分析

### 1. 实际发布走的是各包 Rollup 构建

相关脚本：

- `C:\can\nop\amis-react19\scripts\pack-nop-chaos-deps.mjs`
- `C:\can\nop\amis-react19\scripts\build-amis-for-nop-chaos.mjs`

包级构建命令：

- `packages/amis-core/package.json`
  - `build`: `rollup -c`
- `packages/amis-ui/package.json`
  - `build`: `rollup -c`
- `packages/amis/package.json`
  - `build`: `sh build.sh`
  - `build:nop-chaos:amis` 最终也进入 rollup 产物流程

因此，真正决定发布物形态的是各包内的 Rollup 配置，而不是主仓库的 Vite 配置。

### 2. Rollup 并不会改写手写的 `React.createElement(...)`

`@rollup/plugin-typescript` 会根据 `jsx: react-jsx` 处理 JSX 语法，但不会把源码里显式调用的 `React.createElement(...)` 再转换成 `jsx/jsxs`。这正是为什么：

- JSX 语法能产出 `react/jsx-runtime`
- 手写 `React.createElement(...)` 仍会原样保留

### 3. CJS 构建中还保留了额外的 classic 风格后处理插件

以下 Rollup 配置都定义了 `transpileReactCreateElement()`：

- `packages/amis-core/rollup.config.js:124`
- `packages/amis-ui/rollup.config.js:159`
- `packages/amis/rollup.config.js:116`

该插件会在构建后处理阶段继续围绕 `React.createElement` 注入 classic 风格适配代码，尤其作用于 CJS 输出。

这不是本次警告的唯一根因，但它起到了两个放大作用：

- 让 `lib/cjs` 产物更稳定地保留 old transform 痕迹。
- 让整个产物体系呈现“部分 modern，部分 classic”的混合状态，更容易触发 React 19 的开发警告。

## 为什么 `theme.tsx` 看起来正常，仍然会出现在堆栈里

- `packages/amis-core/src/theme.tsx` 主要使用 JSX，而不是显式 `React.createElement(...)`。
- 但 React 的警告是在整条组件树渲染过程中抛出的，并不要求当前栈帧文件本身一定手写了 classic 调用。
- 一旦该渲染链上有老式 transform 组件，堆栈中就可能出现包装层文件，例如：
  - `theme.js`
  - `StatusScoped.js`
  - `Button.js`
  - `Action.js`

因此，`theme.tsx` 更像是“渲染路径中的宿主文件”，不是当前证据链上的首要根因。

## 排除项

### 1. 不是主应用 React 配置缺失

- `apps/main/vite.config.ts` 使用 Vite + React 插件。
- 主应用自身 TSX/JSX 代码未见异常 classic transform 迹象。
- 警告集中发生在 AMIS 页面渲染链，不发生在普通主应用页面。

### 2. 不是单纯 `uncontrollable` 一个包的问题

`uncontrollable` 出现在堆栈中，但现有证据已经足够证明：

- `amis-react19` 自己的源码和产物里就存在 classic 调用。
- 即使完全不追 `uncontrollable`，当前问题链条也已经闭合。

因此，`uncontrollable` 可能是触发链上的一个参与者，但不是本次问题能够成立的必要前提。

### 3. 不是“只要升级 React 或只要升级一个下游依赖”就能自动解决

因为当前运行的是 `amis-react19` 这套本地 tgz 发布物，只要：

- 源码里还存在 `React.createElement(...)`
- 打包链路还保留 classic 风格输出

那么即使升级部分下游依赖，警告仍可能保留。

## 根因归纳

本次问题可归纳为两层根因：

### 根因一：源码仍保留 classic element factory 写法

最明确的例子是：

- `packages/amis-core/src/SchemaRenderer.tsx`

这类代码直接绕过了 `jsx: react-jsx` 的自动运行时优势。

### 根因二：发布构建没有统一 runtime 语义

虽然 tsconfig 已切到 `react-jsx`，但发布构建仍允许以下情况并存：

- JSX 代码走 `react/jsx-runtime`
- 手写 `React.createElement(...)` 保持不变
- CJS 产物再被 `transpileReactCreateElement()` 做 classic 风格处理

最终形成 mixed runtime output，这正是 React 19 开发警告最容易命中的状态。

## 修复建议

### 方案 A：最小根因修复

先改最关键的源码热点，把显式 `React.createElement(...)` 改为 JSX。

建议优先级：

1. `packages/amis-core/src/SchemaRenderer.tsx`
2. `packages/amis-ui/src/components/calendar/*`
3. 其他实际进入主渲染链的 classic 调用点

优点：

- 直接消除 React 19 命中的根因。
- 影响范围最可控。

风险：

- 需要确认历史上使用 `React.createElement` 是否为了规避某些 ref/动态组件边界问题。

### 方案 B：同时收敛构建配置

在方案 A 基础上，继续清理 Rollup 中的 `transpileReactCreateElement()` 或至少避免其参与 React 19 发布构建。

优点：

- 避免未来继续生成混合 runtime 产物。
- 让 `lib` / `esm` 语义更一致。

风险：

- 需要重新验证 CJS 消费方、动态导入和图标/svg 相关输出是否受影响。

### 方案 C：单纯升级依赖

仅在以下前提下才有机会一次解决：

- 升级到一个已经完整适配 React 19 的上游版本。
- 且 `amis-react19` 自己的 fork/build 流程不再重新引入 classic 风格代码。

否则，只升级版本号但保留现有 fork 与打包方式，通常不能保证问题消失。

## 验证标准

完成修复后，不应只看版本号，应直接检查产物：

1. `packages/amis-core/esm/**/*.js`
2. `packages/amis-ui/esm/**/*.js`
3. `dist-packages/*.tgz` 解包后的 `esm` 与 `lib`

重点确认：

- 关键渲染链文件不再包含 `React.createElement(`
- 不再出现同一关键模块同时混用 `react/jsx-runtime` 与 classic createElement 注入代码
- 在 `nop-chaos-next` 中重新安装 tgz 后，进入 AMIS 页面不再出现该警告

## 一句话结论

这是 `amis-react19` 自身的源码遗留与打包链路共同造成的 mixed JSX runtime 问题，不是主应用 React 配置错误；要真正消除警告，必须至少修正 `amis-react19` 关键源码中的 `React.createElement(...)`，并最好同步收敛其 Rollup 发布配置。
