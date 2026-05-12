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
2. `bridge`
3. `vendor-*`
4. `pkg-*`
5. `host-*` / `shell-core`
6. `page-*`
7. facade / entry

允许高层依赖低层，不允许低层依赖高层。

禁止的典型关系：

- `page -> page` 共享运行时
- `host -> page`
- `vendor -> host`
- `workspace -> host/page`

当前仓库的 `host-amis-*` 需要单独视为 `bridge` 层，而不是普通 `host`。这些 chunk 承载的是 AMIS 宿主桥接与运行时边界：

- `host-amis-adapter-*`
- `host-amis-route-runtime-*`
- `host-amis-bootstrap-*`
- `host-amis-preview-*`

在这一前提下，`vendor -> bridge` 属于当前架构允许的依赖关系，不应被误判为普通 `vendor -> host` 反向依赖。

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
- 若分析器不区分 `bridge` 与普通 `host`，会把 `AMIS` 宿主桥接关系误诊为 `vendor -> host`

---

## 6. build 门禁

`apps/main/package.json` 现已把以下命令串进 `build` 与 `build:analyze`：

1. `node ../../scripts/ensure-amis-file-deps-built.mjs`
2. `vite build`
3. `pnpm analyze:imports`
4. `pnpm analyze:chunks`

因此 `build` 的含义已经扩展为：

- 依赖前置条件满足
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

如果分析脚本报错，优先修正边界，不要通过增加更多特判去掩盖反向依赖。

---

## 9. 场景化减包诊断

当目标从“拆包正确”进一步转向“每个页面/场景下载更小的 JS”时，优先检查以下静态全量引入点，而不是先继续堆 `manualChunks` 规则：

1. `apps/main/src/plugins/sharedModules.ts`
   - 当前会在宿主共享模块注册阶段静态引入 `lucide-react`、`recharts`、`sonner` 等库
   - 如果这些库只在部分页面或插件场景使用，应优先考虑拆成按需注册的共享层

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
