# Contribution Host Mode Shim 设计

> 本文档描述一个候选方案：保留 contribution 的 ESM 形态，但为“需要复用宿主 React 等运行时”的 contribution 增加 `host mode`。该方案当前是设计提案，不代表仓库现状已经全部落地。

---

## 1. 背景

当前仓库约定：

- 页面级插件继续使用 `SystemJS`
- shell contribution 继续使用 `ESM`
- 宿主当前通过 `import()` 加载 contribution

当前实现适合：

- 主题注册
- 语言与 i18n 资源注入
- 菜单扩展
- 样式资源声明
- 插件 manifest 声明

但当 contribution 开始承载以下能力时，问题会变得明显：

- 注册 builtin React 页面组件
- 在 `setup()` 中依赖 React 运行时能力
- 希望与宿主共享同一份 `react`、`react-router-dom`、`@nop-chaos/ui`

此时如果 contribution 仍按普通远程 ESM 处理，会遇到两个问题：

1. 宿主已经打包进 vendor 的 React，不会自动暴露给远程 ESM 使用
2. contribution 若自带一份 React，宿主再去渲染它导出的组件时，存在双 React 风险

---

## 2. 设计目标

目标不是把所有 contribution 都改成重型插件，而是在维持 ESM 的前提下，把开发体验和集成一致性拆开。

设计目标：

- 纯声明型 contribution 继续保持简单
- 需要宿主共享运行时的 contribution 能稳定复用宿主当前库对象
- 避免在运行时依赖动态 import map 或复杂 shim loader
- 尽量保留普通 Vite 的独立开发体验
- 让“独立开发”和“宿主联调”各自有清晰入口

---

## 3. 核心结论

- contribution 仍然输出 `ESM`
- 引入两种模式：`dev` 和 `dev:host`
- 宿主预先提供一批固定 URL 的 shim 文件
- contribution 在 `host mode` 下，把共享依赖改写到宿主 shim URL
- `dev` 与 `dev:host` 的顶层入口可以不同，但应复用同一套核心业务模块

一句话概括：

- `dev` 解决“像普通 Vite 项目一样开发”
- `dev:host` 解决“像真实宿主集成一样运行”

---

## 4. 模式定义

### 4.1 `dev`

`dev` 是 contribution 的独立开发模式。

特点：

- contribution 自己起 `vite dev server`
- 自己解析 `react`、`react-dom` 等依赖
- 有自己的 `main.tsx`
- 用于本地页面开发、样式调试、组件调试

适合：

- 独立调试 UI
- 编写页面
- 调整样式和交互
- 编写 mock 数据和本地路由

说明：

- 该模式下 contribution 可以使用自己的一份 React
- 只要它是独立运行，一般不会有运行时冲突
- 但这个产物不应直接视为宿主联调产物

### 4.2 `dev:host`

`dev:host` 是 contribution 的宿主联调模式。

特点：

- contribution 输出给宿主加载的 ESM 入口
- 共享依赖不再解析为 contribution 自己的本地依赖
- 共享依赖改写为宿主提供的 shim URL
- 宿主加载该构建结果时，拿到的是宿主当前正在使用的运行时对象

适合：

- 验证真实集成行为
- 验证 React 单例
- 验证 Router / i18n / UI / bridge 与宿主协作
- 复现生产接入问题

### 4.3 `build`

`build` 与 `dev:host` 使用同一套依赖边界。

要求：

- 产出稳定 ESM 文件
- 共享依赖指向宿主 shim URL
- 可以按需分 chunk

---

## 5. 为什么不直接依赖 import map / 运行时 shim

理论上可以用 import map、Blob URL、`es-module-shims` 处理远程 ESM 的共享依赖问题，但这里不作为默认方案。

原因：

- 动态 import map 时机更难控制
- 远程 Vite dev server 常常会重写 bare specifier
- 运行时 loader 协议更复杂
- 宿主和 contribution 的问题排查成本更高

本方案选择更直接的方式：

- 宿主提前生成固定 shim 文件
- contribution 构建时把共享依赖改写过去

也就是把复杂度前移到构建期，而不是运行时。

---

## 6. 宿主侧职责

宿主需要提供两层能力：

1. 共享模块对象注册
2. 固定 URL 的 shim 文件

### 6.1 共享模块注册

宿主启动时，把当前正在使用的共享模块对象挂到一个稳定 registry 上。

建议形态：

```ts
globalThis.__NOP_SHARED__ = {
  react: ReactLib,
  'react/jsx-runtime': ReactJsxRuntimeLib,
  'react/jsx-dev-runtime': ReactJsxDevRuntimeLib,
  'react-router-dom': ReactRouterDomLib,
  '@nop-chaos/ui': UiLib,
  '@nop-chaos/shared': SharedLib,
  '@nop-chaos/plugin-bridge': PluginBridgeLib
}
```

### 6.2 固定 shim 文件

宿主在公共静态目录下提供稳定路径，例如：

- `/nop-shared/react.js`
- `/nop-shared/react-jsx-runtime.js`
- `/nop-shared/react-jsx-dev-runtime.js`
- `/nop-shared/react-router-dom.js`
- `/nop-shared/ui.js`
- `/nop-shared/shared.js`
- `/nop-shared/plugin-bridge.js`

这些 shim 文件的职责不是加载远程库，而是把宿主当前 registry 里的对象重新导出为 ESM 模块。

示例：

```js
const m = globalThis.__NOP_SHARED__.react

export default m
export const Children = m.Children
export const Component = m.Component
export const Fragment = m.Fragment
export const Suspense = m.Suspense
export const createContext = m.createContext
export const createElement = m.createElement
export const forwardRef = m.forwardRef
export const memo = m.memo
export const useCallback = m.useCallback
export const useContext = m.useContext
export const useEffect = m.useEffect
export const useMemo = m.useMemo
export const useRef = m.useRef
export const useState = m.useState
```

说明：

- `react/jsx-runtime` 和 `react/jsx-dev-runtime` 必须单独提供 shim
- 这些文件应由宿主统一维护，不由 contribution 自己生成

---

## 7. contribution 侧职责

contribution 保持源码中的正常 import 习惯：

```ts
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@nop-chaos/ui'
```

但在 `host mode` 和 `build` 下，构建配置要把这些依赖改写到宿主 shim。

建议采用三步：

1. alias 到约定 specifier
2. external 掉这些约定 specifier
3. 在输出阶段映射成宿主 shim URL

例如：

- `react` -> `@nop-host-shims/react`
- `react/jsx-runtime` -> `@nop-host-shims/react-jsx-runtime`
- `@nop-chaos/ui` -> `@nop-host-shims/ui`

再通过输出配置写成最终 URL：

- `@nop-host-shims/react` -> `https://host.example.com/nop-shared/react.js`
- `@nop-host-shims/ui` -> `https://host.example.com/nop-shared/ui.js`

这样最终远程 ESM 中，浏览器看到的是明确可访问的绝对 URL，而不是 bare specifier。

---

## 8. 入口组织建议

不建议让 `dev` 和 `dev:host` 共用同一个顶层入口文件。

推荐拆分：

- `standalone/main.tsx`：独立开发入口
- `remote/index.ts`：宿主加载入口
- `app/*`：核心业务模块

推荐目录：

```text
src/
  app/
    contribution.ts
    pages/
    components/
  standalone/
    main.tsx
  remote/
    index.ts
```

职责划分：

- `standalone/main.tsx`
  - `createRoot()`
  - 本地 router、mock、query client
- `remote/index.ts`
  - 导出宿主需要的 contribution 入口
- `app/*`
  - 被两种模式共同复用的业务代码

这样可以保证：

- 顶层运行方式不同
- 核心页面与注册逻辑保持一份实现

---

## 9. 哪些 contribution 需要 `host mode`

### 9.1 可以只用普通 `dev`

以下类型一般可以继续按轻量 ESM contribution 处理：

- 纯 app 配置
- 语言与 i18n 资源
- 主题声明
- 样式资源声明
- 菜单声明
- 插件 manifest 声明

### 9.2 必须验证 `dev:host`

以下类型建议至少提供 `dev:host` 联调能力：

- 注册 builtin React 页面组件
- 导出会被宿主直接 render 的 React 组件
- 依赖宿主 Router / i18n / UI / bridge 上下文
- 需要确认不存在双 React 问题

一句话判断：

- 如果 contribution 只“注入配置”，普通 `dev` 就够
- 如果 contribution 开始“输出 UI 运行时”，就必须有 `dev:host`

---

## 10. chunk 与调试体验

### 10.1 调试体验

本方案不追求让 `dev:host` 完全等同于普通 Vite HMR 体验。

预期是：

- `dev` 负责流畅开发体验
- `dev:host` 负责真实集成验证

因此：

- 普通 UI 调整优先在 `dev` 完成
- 宿主共享依赖、上下文、bridge 问题在 `dev:host` 验证

### 10.2 chunk

该方案允许 contribution 的 ESM 构建按需拆分 chunk。

要求：

- 输出到目录而不是单文件
- 主入口与 chunk 一起部署
- chunk URL 对宿主可访问

说明：

- 如果 contribution 体量较小，可以先保持单入口文件
- 只有在体积明显增长时再启用 chunk

---

## 11. 与统一改成 SystemJS 的关系

另一条可行路线是：

- 页面插件继续 `SystemJS`
- contribution 也统一改成 `SystemJS`

这样运行时协议会更统一，但代价是：

- contribution 开发门槛提高
- 纯声明型扩展也被迫进入更重的构建模型
- 文档和现有边界需要整体调整

本文方案选择折中路径：

- 纯声明型 contribution 继续轻量 ESM
- 带 UI 运行时的 contribution 增加 `host mode`

如果未来仓库里大多数 contribution 都承载 React 组件，可以再评估是否统一到 `SystemJS`。

---

## 12. 最终建议

建议采用以下边界：

1. contribution 默认仍是 ESM
2. 对“只注入配置”的 contribution，不增加额外复杂度
3. 对“导出 React 组件给宿主使用”的 contribution，增加 `dev:host` 与宿主 shim 支持
4. 宿主统一维护 `/nop-shared/*` shim 文件
5. contribution 在 `host mode` 和 `build` 下改写共享依赖到宿主 shim URL

这样可以同时满足：

- 简单场景仍简单
- 复杂场景有明确落地方案
- 不需要默认引入动态 import map 或运行时 shim loader

---

## 13. 相关文档

- `docs/08-plugin-dev-guide.md`
- `docs/15-shell-contribution-esm-design.md`
- `apps/main/src/contributions/loadContributions.ts`
- `apps/main/src/plugins/sharedModules.ts`
- `packages/core/src/utils/systemjs.ts`
