# apps/main 拆包依赖策略

> 本文档记录 `apps/main` 的代码分割原则、包依赖层级和构建后校验方式。目标是避免 chunk 之间形成反向依赖或伪懒加载。

---

## 1. 背景

`apps/main` 既依赖宿主框架代码，也依赖工作区包和外部 `AMIS` file 包。

如果拆包只靠手写目录规则，而不基于真实依赖图，会出现几类问题：

- 页面 chunk 被别的页面复用，导致延迟加载失效
- 底层依赖被高层 chunk 吞掉，形成 `vendor -> host` 或 `workspace -> page` 的反向关系
- `flux-lib/ui` 这类工作区包没有被识别成基础层，进一步放大耦合
- 启动期共享模块注册代码静态引入了按场景才需要的大库，导致页面虽然拆开了，host 仍会过早拉起依赖

因此当前策略改为：

1. 先分析源码包依赖图
2. 再按稳定包边界和宿主边界切 chunk
3. build 后自动分析 chunk import 图并拒绝反向依赖

---

## 2. 依赖层级

源码依赖层级：

1. `@nop-chaos/shared`
2. `@nop-chaos/ui`
3. `@nop-chaos/core` / `@nop-chaos/plugin-bridge` / `@nop-chaos/amis-core`
4. `@nop-chaos/amis-react`
5. `@nop-chaos/main`

外部 file 包：

- `amis`
- `amis-core`
- `amis-ui`
- `amis-formula`

其中 `@nop-chaos/ui` 实际来自 `flux-lib/ui`，但在拆包层面仍视作稳定 workspace 基础包。

---

## 3. Chunk 分层

构建产物采用以下层级：

1. `runtime`
2. `vendor-*`
3. `pkg-*`
4. `host-*` / `shell-core`
5. `bridge`
6. `page-*`
7. facade / entry

允许高层依赖低层，不允许低层依赖高层。

禁止的典型关系：

- `page -> page` 共享运行时
- `host -> page`
- `vendor -> host`
- `workspace -> host/page`

当前仓库的 `host-amis-*` 与 `vendor-amis-*` 需要合并视为 `bridge` 层，而不是普通 `host` 或普通 `vendor`。这些 chunk 承载的是 AMIS 宿主桥接与运行时边界：

- `host-amis-adapter-*`
- `host-amis-route-runtime-*`
- `host-amis-bootstrap-*`
- `host-amis-preview-*`
- `vendor-amis-*`
- `vendor-amis-bridge-*`
- `vendor-amis-ui-*`
- `vendor-amis-formula-*`

在这一前提下，`host -> bridge`、`bridge -> vendor`、`bridge -> workspace` 属于当前架构允许的依赖关系，不应被误判为普通反向依赖。

---

## 4. 规则实现

### 4.1 包识别

共享逻辑位于：`scripts/main-bundle-utils.mjs`

会统一识别以下工作区根：

- `apps/*`
- `packages/*`
- `examples/*`
- `flux-lib/*`

这一步是为了避免 `flux-lib/ui` 漏识别。

### 4.2 包到 chunk 的映射

稳定包映射：

- `@nop-chaos/shared` -> `pkg-shared`
- `@nop-chaos/ui` -> `pkg-ui`
- `@nop-chaos/core` -> `pkg-core`
- `@nop-chaos/plugin-bridge` -> `pkg-plugin-bridge`
- `@nop-chaos/amis-core` / `@nop-chaos/amis-react` -> `vendor-amis-bridge`

第三方依赖保持按包族归类到 `vendor-*`。

额外要求：

- 对来自外部 `file:` 仓库但不在当前 workspace 内的路径，也要按稳定包边界归组，而不是让 Rolldown 退化生成匿名 `src-*` 大块
- 已验证 `../amis-react19/packages/office-viewer` 若未被路径规则识别，会退化成匿名 `src-*` chunk；当前已在 `apps/main/vite.config.ts` 中显式映射到 `vendor-office-viewer`
- `vendor-misc-*` 不是单一包，而是一个共享基础桶；当前已先拆出若干稳定子桶：`vendor-base-ui-*`、`vendor-date-*`、`vendor-embla-*`、`vendor-cmdk-*`、`vendor-mobx-*`
- `@rc-component/*` 当前不能简单独立拆成单独 vendor 桶，因为在现有图中会与剩余 `vendor-misc-*` 形成真实静态循环；若要继续拆这组，需要先处理 AMIS 侧的依赖交叉

### 4.3 宿主共享目录

以下目录优先归入 `host-*`：

- `src/amis/*`
- `src/components/common/*`
- `src/components/plugin/*`
- `src/components/layout/*`
- `src/components/auth/*`
- `src/config/*`
- `src/extensions/*`
- `src/hooks/*`
- `src/lib/*`
- `src/plugins/*`
- `src/services/*`
- `src/store/*`
- 关键路由运行时文件

原则：

- 多页面共享代码不放 `page-*`
- 页面 chunk 只装页面私有实现

---

## 5. 自动分析脚本

### 5.1 源码包依赖图

脚本：`scripts/analyze-main-package-graph.mjs`

校验项：

- workspace 层级顺序
- workspace 循环依赖
- 跨包 `src/` 深层导入
- 未声明依赖却已被源码 import

### 5.2 构建后 chunk 图

脚本：`scripts/analyze-main-chunk-graph.mjs`

校验项：

- chunk cycles
- `reverse-layer-import`
- `page-used-as-shared-runtime`

这里的经验结论已经包含两类已验证问题：

- 若 `src/components/common/*`、`src/components/plugin/*`、`src/lib/*` 这类 app-local 共享模块落进 `page-*`，会真实触发 `page-used-as-shared-runtime`
- 若分析器不区分静态 `import` 与动态 `import()`，会把 `lazy(() => import(...))` 这类正常页面边界误诊为 `host -> page`
- 若分析器不把 `index-*`、`preload-helper-*`、`storage-*` 视为引导支持块，会把 Rolldown 生成的 bootstrap 互链误诊成层级违规
- 若分析器不把 `vendor-amis-*` 归入 `bridge` 家族，会把 `AMIS` 宿主桥接关系误诊为 `vendor -> host` 或 `host -> bridge` 违规
- 若外部 `file:` 包路径没有被 chunk 规则接住，Rolldown 可能生成语义不明的匿名 `src-*` 大块；这类块需要优先回溯真实包来源，再补稳定映射，而不是直接把匿名块当宿主源码处理
- `vendor-amis-*` 当前已经与 `vendor-echarts-*` 分层：`echarts`/`zrender`/`echarts-wordcloud` 已通过包映射单独落到 `vendor-echarts-*`，但 `AMIS` renderer 里仍保留对 `echarts` 的静态 facade 与若干无效动态导入警告，因此 `vendor-amis-*` 仍会通过 facade chunk 间接拉起图表运行时
- 进一步验证表明，`AMIS` 的 chart renderer 本身也可以单独从通用 `vendor-amis-*` 中拆出；当前已通过路径分桶把 `packages/amis/src|esm/renderers/Chart` 归到 `vendor-amis-chart-*`
- 在此之后，`vendor-amis-*` 从约 `2.44 MB` 下降到约 `2.06 MB`，而 `vendor-echarts-*` 仍保持独立；这说明目前能继续削减 `vendor-amis-*` 的主要方向，是继续按 renderer 能力拆分，而不是再重复拆 `echarts` 包本体
- 同样的方法也适用于其他重量级 renderer facade。当前已验证 `AMIS`、`Json`、`OfficeViewer`、`PdfViewer` 也能单独从通用 `vendor-amis-*` 中拆出，而不破坏 chunk 图层级约束
- 最新验证中，`vendor-amis-*` 进一步降到约 `2.04 MB`，并新增了 `vendor-amis-renderer-*`、`vendor-amis-json-*`、`vendor-amis-office-viewer-*`、`vendor-amis-pdf-viewer-*`、`vendor-amis-rich-text-*`
- `RichText` 最初未能独立落盘并不是单一原因：一方面 `amis-react19/packages/amis/src/compat.ts` 对 `RichTextControlRenderer` 的静态导入会抵消 `minimal.ts` 中的动态 `import('./renderers/Form/InputRichText')`；另一方面宿主侧最初匹配的是错误路径 `renderers/RichText`，而真实入口是 `renderers/Form/InputRichText`
- 修正后，`InputRichText-*` facade 已稳定指向 `vendor-amis-rich-text-*`，同时 `Cycles: none` 与 `Layer violations: none` 保持不变
- 这类拆分主要收益是减少“通用 AMIS renderer 集合”体积，让未命中对应能力的页面不必先加载其 facade 代码；真正更深层的库级懒加载仍取决于 `amis-react19` 内部 renderer 图是否保留静态依赖

当前已验证：

- `apps/main/src/services/http.ts` 通过动态 `import('@nop-chaos/amis-core')` 延迟 GraphQL/AMIS 请求转换逻辑，避免宿主运行时静态拉起 `vendor-amis-bridge-*`
- `apps/main` 的 `build`、`analyze:imports`、`analyze:chunks` 已在最新产物上同时通过

### 5.3 外部 file 运行时单例门禁

脚本：`scripts/check-main-external-runtime-deps.mjs`

校验项：

- `apps/main` 的外部 `file:` 包是否把受管控的共享运行时解析成多个物理副本
- 对必须宿主收口的运行时，是否已经存在可用的 bundler override target

当前策略分两类：

- `single-instance`：必须直接解析到同一物理路径
- `bundler-override`：允许原始 Node 解析分裂，但宿主必须通过 `apps/main/vite.config.ts` 的 alias/dedupe 收口到单一路径

当前已把 `react`、`react-dom`、`echarts` 归入 `bundler-override`；其中 `echarts` 的 override 目标不是仓库根猜测路径，而是从 `apps/main` 或外部 `amis-react19` 依赖链实际可解析到的 canonical 包根中选出的稳定目标，避免 alias 指向不存在的宿主安装目录。

---

## 6. build 门禁

`apps/main/package.json` 现已把以下命令串进 `build` 与 `build:analyze`：

1. `node ../../scripts/ensure-amis-file-deps-built.mjs`
2. `node ../../scripts/check-main-external-runtime-deps.mjs --check`
3. `vite build`
4. `pnpm analyze:imports`
5. `pnpm analyze:chunks`

因此 `build` 的含义已经扩展为：

- 依赖前置条件满足
- 外部 `file:` 运行时单例/override 门禁通过
- Vite 构建成功
- 源码依赖图合规
- chunk 图合规

---

## 7. 外部 AMIS 前置条件

`apps/main` 当前消费外部 `amis-react19` 仓库的 `file:` 包。

构建前必须存在至少这些产物：

- `packages/amis/esm/index.js`
- `packages/amis/lib/themes/cxd.css`
- `packages/amis-core/esm/index.js`
- `packages/amis-ui/esm/index.js`
- `packages/amis-formula/esm/index.js`

如果缺失，本仓库脚本会尝试触发外部构建；若外部仓库本身无法构建，则本仓库 `build` 应显式失败，而不是继续输出误导性的 chunk 结论。

---

## 8. 维护要求

当出现以下变化时，必须重跑并检查两个分析脚本：

- 新增 workspace 包
- `@nop-chaos/ui` / `@nop-chaos/core` / `@nop-chaos/plugin-bridge` 边界变更
- 新增大型外部 file 包
- 新增页面目录或调整公共组件目录
- 修改 `manualChunks`

如果分析脚本报错，优先修正真实边界，不要通过增加更多特判去掩盖反向依赖。

允许保留的分析器特判只限于两类：

- 构建器自动生成且不代表业务层级的 bootstrap 支持块
- 已确认属于同一家族内部实现细节的 bridge 循环

---

## 9. 场景化减包诊断

当目标从“拆包正确”进一步转向“每个页面/场景下载更小的 JS”时，优先检查以下静态全量引入点，而不是先继续堆 `manualChunks` 规则：

1. `apps/main/src/plugins/sharedModules.ts`
   - 当前会在宿主共享模块注册阶段静态引入 `lucide-react`、`recharts`、`sonner` 等库
   - 如果这些库只在部分页面或插件场景使用，应优先考虑拆成按需注册的共享层
   - 已验证 `recharts` 可以从启动期基础共享模块中移除，并改为只在 `ensurePluginSharedModules()` 内按需动态注册；这样 `host-runtime-*` 不再静态依赖 `vendor-recharts-*`，dashboard 页面继续通过自己的 page chunk 拉起图表库

2. `apps/main/src/App.tsx`
   - 不要因为菜单树中“存在某类页面”就提前 `import()` 对应运行时
   - 已验证 `needsAmis` 这类菜单能力探测会让 `Flux`-only 用户也在启动期预热 `./amis/init`
   - 运行时初始化应收口到真实路由入口，例如 `apps/main/src/router/RouteRenderer.tsx` 中的 `lazy(async () => import('../amis/init'))`

3. `packages/core/src/utils/iconMap.tsx`
   - 当前因低代码引擎需要“根据 icon 名称得到 Lucide 组件”，采用了 `import * as LucideIcons from 'lucide-react'`
   - 这不是普通 tree-shaking 失效，而是运行时能力设计带来的整库引入
   - 如果要优化，优先考虑把这套能力隔离到低代码场景懒加载，而不是直接删除能力

4. 具体页面场景
   - `flow designer`：优先拆分列表页与设计器页，而不是继续把整个 `flow-editor` 目录并进同一页面 chunk
   - `code editor`：优先确认 `monaco-editor` 的真实入口组件，再把编辑器 runtime 延迟到真正命中代码编辑场景时加载
   - `dashboard charts`：优先把大图表区域拆成惰性子块，避免进入 dashboard 就立即拉起整套图表运行时
   - `AMIS renderer`：若 `echarts`、`monaco`、文件预览等能力来自 renderer 注册链，应优先做 renderer 能力分层与延迟注册
