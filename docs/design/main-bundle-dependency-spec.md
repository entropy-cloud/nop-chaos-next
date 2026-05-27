# apps/main Bundle Dependency Spec

> 当前仓库的项目级依赖规划与约束说明。描述 `apps/main` 的真实包边界、chunk 分层、构建门禁和已验证规则。通用分析方法见 `../skills/main-bundle-dependency-governance.md`。

## 1. Scope

本文件只讨论当前仓库，尤其是 `apps/main`：

- workspace 包依赖层级
- 外部 `file:` / tarball 依赖的运行时治理
- chunk 分层与命名规则
- 构建门禁与分析脚本
- 已验证的减包与隔离规则

本文件是当前生效规范，不记录历史演进过程。

## 2. Current Package Layers

源码依赖层级：

1. `@nop-chaos/shared`
2. `@nop-chaos/ui`
3. `@nop-chaos/core` / `@nop-chaos/plugin-bridge` / `@nop-chaos/amis-core`
4. `@nop-chaos/amis-react`
5. `@nop-chaos/main`

外部 file/tarball 包重点包括：

- `amis`
- `amis-core`
- `amis-ui`
- `amis-formula`
- `office-viewer`
- `@nop-chaos/flux`

说明：

- `@nop-chaos/ui` 实际来源于 `flux-lib/ui`，但在规划层仍属于稳定基础 workspace 包
- `AMIS` 与 `Flux` 都是当前 bundle 治理中的重点能力族

## 3. Current Chunk Layers

当前 `apps/main` 采用以下 chunk 层级：

1. `runtime`
2. `vendor-*`
3. `pkg-*`
4. `host-*` / `shell-core`
5. `bridge`
6. `page-*`
7. `facade` / `entry`

禁止的典型关系：

- `page -> page` 共享运行时
- `host -> page`
- `vendor -> host`
- `workspace -> host/page`

AMIS 例外族：

- `host-amis-*`
- `vendor-amis-*`
- `vendor-amis-bridge-*`

这些在当前仓库中合并视为 `bridge` 层，不按普通 `host` 或普通 `vendor` 处理。

选择这一分层的原因：

- 普通 `vendor/host/page` 三层不足以表达 AMIS 宿主桥接运行时
- 如果不引入 `bridge` 语义，分析器会把当前合法依赖误报为反向依赖
- 把 AMIS bridge 单独成层，比继续追加零散豁免规则更稳定

## 4. Shared Tooling

核心共享逻辑位于：

- `scripts/main-bundle-utils.mjs`
- `scripts/main-bundle-utils.d.mts`

当前已收口的职责：

- workspace 根识别：`apps/*`、`packages/*`、`examples/*`、`flux-lib/*`
- `apps/main` 外部依赖识别
- 包到 chunk 的稳定命名
- 外部运行时 override 目标解析
- `apps/main` 路径到 chunk 组的统一规则 `getMainChunkGroupName()`

要求：

- 若某条规则已被反复验证稳定，应优先沉淀到这里
- `apps/main/vite.config.ts` 应尽量只保留调用和拼装，不长期承载零散经验逻辑

选择这一做法的原因：

- 规则落实到脚本工具后，分析器、构建配置、文档才容易保持一致
- 若只写在 `vite.config.ts`，规则容易演变为局部经验，不易复用和校验

## 5. Current Stable Chunk Rules

当前已固化的 `apps/main` 规则包括：

### 5.1 Host Shared State and Runtime

- `src/config/*`、`src/services/*`、`src/store/*` -> `host-app-state`
- `src/flux/*` -> `host-flux-runtime`
- `src/main.tsx`、`src/App.tsx` -> `host-entry`
- `src/router/AppShell*` -> `shell-core`

### 5.2 AMIS Host Runtime Split

- `src/router/AmisRouteEntry.tsx` -> `host-amis-route-entry`
- `src/amis/init.ts` / `src/amis/xuiComponents.ts` -> `host-amis-bootstrap`
- `src/amis/adapter.ts` / `src/amis/providers.ts` -> `host-amis-adapter`
- `src/amis/AmisRouteRenderer.tsx` -> `host-amis-route-runtime`
- `src/amis/testSchema.ts` -> `host-amis-preview`

### 5.3 Flux Route Split

- `src/router/FluxRouteEntry.tsx` -> `host-flux-route-entry`
- `src/flux/*` -> `host-flux-runtime`

### 5.4 Page Families

- `src/pages/dashboard/*` -> `page-dashboard`
- `src/pages/flow-editor/*` -> `page-flow-editor`
- `src/pages/ai-workbench/*` -> `page-ai-workbench`
- `src/pages/help/*`、`src/pages/settings/*`、`src/pages/plugins/*`、`src/pages/data-management/*` -> `page-secondary`

### 5.5 AMIS Renderer Families

当前已稳定拆出的 renderer/vendor 族包括：

- `vendor-amis-core`
- `vendor-amis-bridge`
- `vendor-amis-chart`
- `vendor-amis-renderer`
- `vendor-amis-json`
- `vendor-amis-office-viewer`
- `vendor-amis-pdf-viewer`
- `vendor-amis-rich-text`
- `vendor-amis-ui`
- `vendor-amis-formula`

选择这些 renderer family split 的原因：

- 它们是当前已验证能独立落盘、又不会破坏层级约束的稳定能力边界
- 比继续扩大通用 `vendor-amis-*` 更能减少未命中能力场景的下载面

## 6. Build Gates

`apps/main` build 当前串联以下门禁：

1. `node ../../scripts/ensure-amis-file-deps-built.mjs`
2. `node ../../scripts/check-main-external-runtime-deps.mjs --check`
3. `tsc --noEmit`
4. `vite build`
5. `pnpm analyze:imports`
6. `pnpm analyze:chunks`

含义：

- 外部构建前置条件满足
- 关键共享运行时没有未治理的多实例分裂
- 源码依赖图合规
- chunk 图合规

之所以把这些校验串进 build，而不是只作为人工流程保留，是因为：

- 依赖治理问题如果不是门禁，就会回退成事后观察
- 构建通过的定义必须包含依赖边界正确，而不只是 bundle 成功产出

## 7. Current Analysis Scripts

### 7.1 Source Graph

- `scripts/analyze-main-package-graph.mjs`

检查：

- workspace 层级顺序
- workspace 循环依赖
- 跨包 `src/` 深层导入
- 未声明依赖却已 import

### 7.2 Chunk Graph

- `scripts/analyze-main-chunk-graph.mjs`

检查：

- chunk cycles
- `reverse-layer-import`
- `page-used-as-shared-runtime`

### 7.3 External Runtime Dependency Gate

- `scripts/check-main-external-runtime-deps.mjs`

检查：

- `react` / `react-dom` / `i18next` / `react-i18next` / `zustand` / `echarts` / `sonner` 等共享运行时是否按策略治理

## 8. Current Verified Conclusions

### 8.1 Workspace Recognition

- `flux-lib/*` 必须纳入 workspace 根识别
- 否则 `@nop-chaos/ui` 会被错误吸入高层 chunk

### 8.2 Page Leakage

- `src/components/common/*`、`src/components/plugin/*`、`src/lib/*` 若落入 `page-*`，会真实导致 `page-used-as-shared-runtime`

### 8.3 Analyzer Fidelity

- chunk 分析器必须识别压缩产物中的静态 import、dynamic import，以及必要的 preload 关系
- 否则“拆包成功”的结论不可信

### 8.4 External Runtime Singleton Rules

- `react` / `react-dom` 必须由宿主统一收口
- 对外部 `file:` / tarball 渲染器依赖，不能默认假设它们与宿主天然共享相同运行时实例

### 8.5 AMIS / Flux Isolation

已验证：

- `Flux -> AMIS` 真实依赖路径已消除
- `AMIS -> Flux` 真实依赖路径已消除
- `sharedImporters` 已收敛为空

这是通过 route entry split、host shared state split 和 renderer family split 一起达成的。

## 9. Scenario Optimization Guidance

当目标从“结构正确”进一步转向“场景下载更小”时，优先检查：

1. `apps/main/src/plugins/sharedModules.ts`
2. `apps/main/src/App.tsx`
3. `packages/core/src/utils/iconMap.tsx`
4. 各重量级页面能力入口（flow editor、code editor、dashboard charts、AMIS renderer）

原则：

- 先减少启动期静态全量引入
- 再做 renderer family split
- 最后才考虑更细的页面或能力子块拆分

## 10. Related Documents

- `./index.md`
- `../skills/main-bundle-dependency-governance.md`
- `../bugs/24-main-bundle-chunk-boundary-regression.md`
- `../bugs/25-amis-file-dependency-runtime-split.md`
