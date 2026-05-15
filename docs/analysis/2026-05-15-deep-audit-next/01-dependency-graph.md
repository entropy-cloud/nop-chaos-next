# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] @nop-chaos/amis-react 违反规则(f)，依赖了禁止的 @nop-chaos/ui

- **文件**: `packages/amis-react/package.json:10`
- **证据片段**:
  ```json
  "dependencies": {
    "@nop-chaos/amis-core": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
  }
  ```
  ```tsx
  // packages/amis-react/src/components/AmisLoadingView.tsx:1
  import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
  // packages/amis-react/src/components/AmisErrorView.tsx:2
  import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
  ```
- **严重程度**: P2
- **现状**: `@nop-chaos/amis-react` 声明了对 `@nop-chaos/ui` 的依赖，并实际在 AmisLoadingView 和 AmisErrorView 中导入 Card 系列组件。但规则(f)规定「@nop-chaos/amis-react 只能依赖 @nop-chaos/amis-core 和 @nop-chaos/shared」。
- **风险**: 包边界扩大，amis-react 作为 AMIS 渲染引擎封装被 UI 框架绑定；独立使用 amis-react 的场景需引入整套 UI 库。
- **建议**: 评估能否用内联样式或下沉 Loading/Error 组件到 core/shared；或更新规则文档承认 ui 是合法下游。
- **误报排除**: 规则(f) 是明确的白名单约束，当前状态明显违反。

### [维度01-02] @nop-chaos/plugin-bridge 将共享运行时库列为实际依赖而非对等依赖

- **文件**: `packages/plugin-bridge/package.json:8-15`
- **证据片段**:
  ```json
  "dependencies": {
    "@nop-chaos/shared": "workspace:*",
    "i18next": "26.0.5",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sonner": "^2.0.7",
    "zustand": "^5.0.12"
  }
  ```
  ```ts
  // packages/plugin-bridge/src/index.ts:1
  import { useSyncExternalStore } from 'react';
  // 未直接导入 react-dom、i18next、sonner、zustand
  ```
- **严重程度**: P2
- **现状**: plugin-bridge 将 i18next、react、react-dom、sonner、zustand 声明为 dependencies，但源码中除了 react（useSyncExternalStore）外并未直接导入这些库。
- **风险**: 远程插件通过 SystemJS 加载 plugin-bridge 时会将 React 打包进 bundle，导致 host 和插件各有一个 React 实例（hooks 规则错误）；Zustand store 不共享；i18next 多实例；bundle 膨胀。
- **建议**: 将 i18next、react、react-dom、sonner、zustand 从 dependencies 移至 peerDependencies；删除未使用的 phantom deps。
- **误报排除**: 插件系统中多重 React 实例是已知硬伤，声明方式直接影响运行时安全。

### [维度01-03] exports 字段格式不一致：source-only 包 vs dist-producing 包

- **文件**: 多处 package.json（shared/core/plugin-bridge 等 source-only 包 vs theme-tokens/tailwind-preset/ui dist-producing 包）
- **证据片段**:
  ```json
  // source-only 模式
  "exports": { ".": "./src/index.ts" }
  // dist-producing 模式
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./styles.css": "./dist/styles.css"
  }
  ```
- **严重程度**: P3
- **现状**: 6 个 source-only 包直接暴露 ./src/index.ts（依赖 bundler 处理 TS），3 个 dist-producing 包用 conditional exports 指向 dist/。
- **风险**: 消费方混淆；source-only 包无法被非 Vite 运行时正确解析；不支持子路径导出。
- **建议**: 文档化两种模式的设计意图；长期统一为 conditional exports 格式。
- **误报排除**: 两种模式各有合理用途，不是严格错误，但维护成本隐患。

### [维度01-04] tsconfig.base.json 缺少 @nop-chaos/flux 路径映射

- **文件**: `tsconfig.base.json:21-41`
- **证据片段**:
  ```json
  "paths": {
    "@nop-chaos/shared": ["packages/shared/src/index.ts"],
    // @nop-chaos/flux 缺失！
  }
  ```
  ```ts
  // apps/main/src/flux/FluxRouteRenderer.tsx:4
  import { createDefaultFluxEnv, createFluxSchemaRenderer } from '@nop-chaos/flux';
  ```
- **严重程度**: P3
- **现状**: @nop-chaos/flux 通过 tgz（file: 依赖）引入，tsconfig.base.json 中无路径映射。类型解析仅依赖 tgz 内的 .d.ts。
- **风险**: tgz 路径变更/损坏会导致静默失败；tsconfig 与其他工作区包的做法不一致；IDE 类型追踪链路断开。
- **建议**: 添加 @nop-chaos/flux 的路径映射；长期考虑将 flux 集成到 monorepo 内。
- **误报排除**: skipLibCheck: true 掩盖了此问题，但 tgz 依赖方式不够稳健。

---

## 完整依赖图

```
@nop-chaos/shared           ── (无内部依赖)
@nop-chaos/ui (flux-lib)    ── (无 @nop-chaos/* 依赖)
@nop-chaos/core             ──→ @nop-chaos/shared, @nop-chaos/ui
@nop-chaos/plugin-bridge    ──→ @nop-chaos/shared (phantom deps: react, zustand, i18next, sonner, react-dom)
@nop-chaos/amis-core        ──→ @nop-chaos/shared
@nop-chaos/amis-react       ──→ @nop-chaos/amis-core, @nop-chaos/ui [违规]
@nop-chaos/theme-tokens     ── (无 @nop-chaos/* 依赖)
@nop-chaos/tailwind-preset  ── (无 @nop-chaos/* 依赖)
@nop-chaos/extension-host   ──→ @nop-chaos/shared
@nop-chaos/main (apps)      ──→ 所有 @nop-chaos/* 包
examples/plugin-demo        ── peerDeps: plugin-bridge, shared, ui
examples/extension-demo     ── peerDeps: plugin-bridge, shared, ui
```

## 违规清单

| # | 文件 | 违规 | 严重程度 |
|---|---|---|---|
| 01-02 | packages/plugin-bridge/package.json:8-15 | 共享运行时库列为 deps 而非 peerDeps | P2 |
| 01-01 | packages/amis-react/package.json:8-10 | 违反规则(f)：依赖不允许的 @nop-chaos/ui | P2 |
| 01-03 | 多文件 | exports 字段格式不一致 | P3 |
| 01-04 | tsconfig.base.json:21-41 | @nop-chaos/flux 路径映射缺失 | P3 |

## 合规的包清单

shared, ui, core, plugin-bridge（@nop-chaos/* 依赖合规但 phantom deps 有问题）, amis-core, theme-tokens, tailwind-preset, extension-host, main, plugin-demo, extension-demo

## 总结评估

依赖方向严格遵循 shared→上层包的层次结构，无逆向依赖或循环依赖。两个 P2 问题都是契约漂移——包声明的依赖关系和实际运行时需求不匹配。
