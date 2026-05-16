# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] @nop-chaos/amis-react 依赖 @nop-chaos/ui 但规则 f 限定只能依赖 amis-core 和 shared

- **文件**: `packages/amis-react/package.json:10-12`
- **证据片段**:
  ```json
  "dependencies": {
    "@nop-chaos/amis-core": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    "amis": "file:amis-react19/amis-6.12.0.tgz",
    "amis-core": "file:amis-react19/amis-core-6.12.0.tgz",
    "amis-formula": "file:amis-react19/amis-formula-6.12.0.tgz",
    "amis-ui": "file:amis-react19/amis-ui-6.12.0.tgz"
  }
  ```
- **严重程度**: P2
- **现状**: `@nop-chaos/amis-react` 的 `dependencies` 中包含 `@nop-chaos/ui`，但审核框架规则 f 规定 amis-react 只能依赖 amis-core 和 shared。实际代码中 `AmisSchemaPage.tsx` 使用了 `@nop-chaos/ui` 的组件（如 Button、Card 等），说明这个依赖是合理的，但规则定义与实际架构不符。
- **风险**: 规则与实际不一致会导致后续审核的误判，且如果按照规则严格执行会破坏 amis-react 的功能。
- **建议**: 更新规则 f 为：`@nop-chaos/amis-react 只能依赖 @nop-chaos/amis-core、@nop-chaos/shared 和 @nop-chaos/ui`，使规则与实际架构一致。
- **误报排除**: 这不是 amis-react 的架构问题，而是审核规则定义过时的问题。amis-react 作为 amis 的 React 封装层，使用 @nop-chaos/ui 组件是合理的架构选择。
- **复核状态**: 未复核

### [维度01-02] @nop-chaos/amis-react 缺少 lucide-react 依赖声明（隐式依赖泄漏）

- **文件**: `packages/amis-react/src/components/AmisSchemaPage.tsx:7`
- **证据片段**:
  ```ts
  import { ErrorBoundary } from '@nop-chaos/core';
  import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton, Spinner } from '@nop-chaos/ui';
  import { AlertTriangle, RotateCw } from 'lucide-react';
  ```
  ```json
  // packages/amis-react/package.json - dependencies 中无 lucide-react
  "dependencies": {
    "@nop-chaos/amis-core": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    ...
  }
  ```
- **严重程度**: P1
- **现状**: `AmisSchemaPage.tsx` 直接 `import { AlertTriangle, RotateCw } from 'lucide-react'`，但 `packages/amis-react/package.json` 的 `dependencies` 和 `peerDependencies` 中均未声明 `lucide-react`。当前在 monorepo 中通过 hoisting 可以运行，但若 amis-react 作为独立包被外部消费，将导致运行时模块未找到错误。
- **风险**: 在 monorepo 外部消费 amis-react 包时，`lucide-react` 不会自动安装，导致运行时 `Cannot find module 'lucide-react'` 错误。即使在 monorepo 内部，如果未来 pnpm hoisting 策略改变，也可能导致构建失败。
- **建议**: 在 `packages/amis-react/package.json` 中添加 `"lucide-react"` 到 `peerDependencies`（因为 `@nop-chaos/ui` 已经依赖了 `lucide-react`，两者应共享同一实例），或添加到 `dependencies`。
- **误报排除**: 已确认 `AmisSchemaPage.tsx` 第 7 行有直接的 `from 'lucide-react'` import。这不是通过 `@nop-chaos/ui` 间接使用的——是直接的裸模块导入。monorepo hoisting 掩盖了这个问题。
- **复核状态**: 未复核

### [维度01-03] @nop-chaos/core 的 react 声明在 dependencies 而非 peerDependencies

- **文件**: `packages/core/package.json:13`
- **证据片段**:
  ```json
  "dependencies": {
    "@nop-chaos/shared": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    "clsx": "^2.1.1",
    "lucide-react": "^1.7.0",
    "react": "^19.0.0",
    "react-router-dom": "^7.14.0",
    "systemjs": "^6.15.1"
  },
  "peerDependencies": {
    "i18next": "^24.0.0",
    "react-dom": "^19.0.0",
    "react-i18next": "^15.0.0"
  }
  ```
- **严重程度**: P2
- **现状**: `react` 声明在 `dependencies` 中，而 `react-dom` 声明在 `peerDependencies` 中。React 生态中 `react` 和 `react-dom` 应始终使用同一版本，标准做法是两者都作为 `peerDependencies` 声明。当前 `@nop-chaos/ui`（core 的依赖）将 react 作为 peerDependency，而 core 将其作为 dependency，策略不一致。
- **风险**: 如果某个宿主应用使用不同版本的 React，core 包的 dependency 中的 `react` 可能导致版本冲突或重复打包。在 pnpm workspace 中，默认的 hoisting 可能掩盖此问题，但作为可发布的包，这是不规范的声明。
- **建议**: 将 `react` 从 `dependencies` 移到 `peerDependencies`，与 `react-dom` 保持一致。同时考虑将 `lucide-react` 也移到 `peerDependencies`（因为 `@nop-chaos/ui` 已有此依赖，core 应共享同一实例）。
- **误报排除**: 在 monorepo 内部，由于所有包共享根目录的 react 版本，此问题不会暴露。但作为可发布包的结构规范，react 应该作为 peerDependency 声明。
- **复核状态**: 未复核

### [维度01-04] @nop-chaos/core 包含未使用的 clsx 依赖

- **文件**: `packages/core/package.json:11`
- **证据片段**:
  ```json
  "dependencies": {
    "@nop-chaos/shared": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    "clsx": "^2.1.1",
    ...
  }
  ```
- **严重程度**: P3
- **现状**: `clsx` 在 `@nop-chaos/core` 的 `dependencies` 中声明，但在整个 `packages/core/src/` 目录中没有任何文件 import `clsx`。已通过全量搜索确认零匹配。core 使用的是 `@nop-chaos/ui` 导出的 `cn()` 工具函数（基于 `clsx` + `tailwind-merge`），而非直接使用 `clsx`。
- **风险**: 轻微的依赖膨胀。对于纯 typecheck 的包不会产生 bundle 影响，但增加了 `pnpm install` 的包数量和版本管理负担。
- **建议**: 从 `packages/core/package.json` 的 `dependencies` 中移除 `"clsx": "^2.1.1"`。
- **误报排除**: 已通过精确搜索确认 `packages/core/src/` 全目录中零个文件 import clsx。
- **复核状态**: 未复核

### [维度01-05] @nop-chaos/core 包含未使用的 dependency：react-router-dom

- **文件**: `packages/core/package.json:14`
- **证据片段**:
  ```json
  "dependencies": {
    "@nop-chaos/shared": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    "clsx": "^2.1.1",
    "lucide-react": "^1.7.0",
    "react": "^19.0.0",
    "react-router-dom": "^7.14.0",
    "systemjs": "^6.15.1"
  }
  ```
- **严重程度**: P3
- **现状**: `react-router-dom` 在 `@nop-chaos/core` 的 `dependencies` 中声明，但在整个 `packages/core/src/` 目录中没有任何文件 import `react-router-dom`。已通过全量搜索确认零匹配。
- **风险**: 轻微的依赖膨胀。
- **建议**: 从 `packages/core/package.json` 的 `dependencies` 中移除 `"react-router-dom": "^7.14.0"`。
- **误报排除**: 已确认零匹配。
- **复核状态**: 未复核

### [维度01-06] exports 字段策略不一致：部分包指向 src，部分指向 dist

- **文件**: 多个 package.json
- **证据片段**:
  ```json
  // packages/shared/package.json (src-style)
  "exports": { ".": "./src/index.ts" }
  
  // flux-lib/ui/package.json (dist-style)
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./chart": { ... },
    "./lib/utils": { ... },
    "./base.css": "./dist/styles/base.css",
    "./styles.css": "./dist/styles/index.css"
  }
  ```
- **严重程度**: P2
- **现状**: 6 个 packages 使用 `"./src/index.ts"` 直接导出源码（build 为 `tsc --noEmit`），3 个包（ui、tailwind-preset、theme-tokens）使用 `"./dist/"` 导出编译产物。这不是 bug——Vite 开发模式通过 tsconfig paths 直接解析源码。但两种策略共存增加理解成本。
- **风险**: 新开发者可能混淆哪些包需要先 build 才能被消费。dist-style 包未 build 时 exports 指向的 dist 目录不存在。
- **建议**: 文档化两种策略及适用场景。确保 turbo.json 构建管线正确处理 dist-style 包的依赖顺序。
- **误报排除**: 有意的渐进式架构，叶子/工具包已迁移到 dist-style，中间层包仍用 src-style。monorepo 中可接受的模式。
- **复核状态**: 未复核

### [维度01-07] @nop-chaos/plugin-demo 中 react/react-dom 未列入 peerDependencies

- **文件**: `examples/plugin-demo/package.json:14-43`
- **证据片段**:
  ```json
  "devDependencies": {
    ...
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    ...
  },
  "peerDependencies": {
    "@nop-chaos/plugin-bridge": "workspace:*",
    "@nop-chaos/shared": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    "@tanstack/react-query": "^5.96.1",
    ...
  }
  ```
- **严重程度**: P3
- **现状**: `react` 和 `react-dom` 都在 devDependencies 中但未列入 peerDependencies。远程插件运行时依赖宿主提供的共享模块。
- **风险**: 缺少版本约束提示。如果宿主 React 版本与插件构建时不兼容，可能出现类型或行为差异。
- **建议**: 将 `react` 和 `react-dom` 添加到 `peerDependencies`。
- **误报排除**: plugin-demo 仅是示例项目，风险实际很低。
- **复核状态**: 未复核

## 正面发现

### [维度01-08] 无内部路径导入

- **文件**: 全项目
- **证据片段**: 全项目搜索 `@nop-chaos/.*/src/` 结果为 0 匹配
- **严重程度**: N/A（合规确认）
- **现状**: 所有 `@nop-chaos/*` 的 import 均通过包的公开入口点进行。
- **建议**: 保持现状。
- **误报排除**: N/A
- **复核状态**: 已通过全量搜索确认

### [维度01-09] 无循环依赖

- **文件**: 全项目
- **严重程度**: N/A（合规确认）
- **现状**: 完整的包依赖图是有向无环图（DAG）。
- **建议**: 保持现状。
- **误报排除**: N/A
- **复核状态**: 已通过依赖图分析确认

## 合规的包清单

| 包 | 规则 | 结果 |
|----|------|------|
| `@nop-chaos/shared` | a | **合规** |
| `@nop-chaos/ui` | b | **合规** |
| `@nop-chaos/plugin-bridge` | d | **合规** |
| `@nop-chaos/extension-host` | shared-only | **合规** |
| `@nop-chaos/amis-core` | e | **合规** |
| `@nop-chaos/theme-tokens` | g | **合规** |
| `@nop-chaos/tailwind-preset` | g | **合规** |
| `@nop-chaos/main` | h | **合规** |
| `@nop-chaos/amis-react` | f | **违规**：依赖了 ui，且缺少 lucide-react |
| `@nop-chaos/core` | c | **合规**（有死依赖和风格问题） |
| `@nop-chaos/plugin-demo` | i | **基本合规** |

## 深挖第 2 轮追加

### [维度01-10] plugin-bridge 声明了四个从未在源码中 import 的 peerDependencies (i18next, react-dom, sonner, zustand)

- **文件**: `packages/plugin-bridge/package.json:12-16`
- **证据片段**:
  ```json
  "peerDependencies": {
    "i18next": "26.0.5",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sonner": "^2.0.7",
    "zustand": "^5.0.12"
  }
  ```
  ```ts
  // packages/plugin-bridge/src/index.ts — 全部外部运行时 import
  import { useSyncExternalStore } from 'react';
  import type { ThemeConfig, User, PluginManifest } from '@nop-chaos/shared';
  ```
- **严重程度**: P2
- **现状**: plugin-bridge 在 peerDependencies 中声明了 i18next、react-dom、sonner、zustand，但全部源码仅 import 了 react 和 @nop-chaos/shared。这四个包从未被 import 或在运行时使用。peerDependencies 会强制所有消费者安装这些包。
- **风险**: 增加消费者的安装负担。如果这些包的版本与消费者项目不兼容，会导致 pnpm install 报错。
- **建议**: 从 peerDependencies 中移除 i18next、react-dom、sonner、zustand，仅保留 react。
- **误报排除**: types.ts 中的 BoundStore<T> 接口虽模仿 zustand API 形状，但这只是类型契约，不需要 zustand 作为运行时依赖。
- **复核状态**: 未复核

### [维度01-11] extension-host 声明了 react 和 react-dom 的 peerDependencies 但源码从未使用 React

- **文件**: `packages/extension-host/package.json:11-13`
- **证据片段**:
  ```json
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
  ```
  ```ts
  // packages/extension-host/src/runtime.ts — 唯一外部 import
  import type { ... } from '@nop-chaos/shared'
  import { validateMenuResponse } from '@nop-chaos/shared'
  ```
- **严重程度**: P3
- **现状**: extension-host 是纯逻辑包，全部源码为 .ts 文件，无 JSX，无任何 react/react-dom import。
- **风险**: 增加消费者的安装负担。
- **建议**: 从 peerDependencies 中移除 react 和 react-dom。
- **误报排除**: 该包功能（加载扩展、合并菜单）完全不需要 React。
- **复核状态**: 未复核

### [维度01-12] extension-demo 的 react-router-dom 是未使用的 devDependency

- **文件**: `examples/extension-demo/package.json:22`
- **证据片段**:
  ```json
  "react-router-dom": "^7.14.0"
  ```
  全目录无任何文件导入 react-router-dom，路由导航均通过 bridge.navigate()。
- **严重程度**: P3
- **现状**: extension-demo 的 devDependencies 中声明了 react-router-dom 但源码中无任何使用。
- **建议**: 从 devDependencies 中移除。
- **误报排除**: 已确认零匹配。
- **复核状态**: 未复核

### [维度01-13] extension-demo 在 devDependencies 和 peerDependencies 中重复声明相同的 workspace 包

- **文件**: `examples/extension-demo/package.json:14-19, 29-34`
- **证据片段**: @nop-chaos/plugin-bridge、shared、ui、lucide-react、react 五个包同时出现在 devDeps 和 peerDeps 中。
- **严重程度**: P3
- **现状**: 对于 private: true 的开发用 example 包，双重声明无附加语义。
- **建议**: 保留 devDependencies，移除 peerDependencies 中的重复条目。
- **误报排除**: private 包不发布，workspace:* 在两个字段中效果相同。
- **复核状态**: 未复核

### [维度01-14] flux-lib/ui 的 exports 子路径未在 tsconfig.base.json paths 中显式映射

- **文件**: `flux-lib/ui/package.json:16-23` + `tsconfig.base.json:34-35`
- **严重程度**: P3
- **现状**: `@nop-chaos/ui/lib/utils` 和 `@nop-chaos/ui/chart` 通过通配符 paths 解析，碰巧能工作但不如 exports 精确。
- **建议**: 低优先级，当前通配符映射可正常工作。
- **误报排除**: 依赖通配符匹配，未来不一致时可能出错。
- **复核状态**: 未复核
