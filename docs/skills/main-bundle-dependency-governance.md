# apps/main 拆包依赖治理 Skill

> 目标：让 `apps/main` 的代码分割建立在可验证的依赖图之上，而不是继续靠手工猜测 `manualChunks`。本 skill 定义源码包依赖层级、chunk 分层策略、构建后校验流程，以及外部 `AMIS file:` 依赖的前置要求。

---

## 1. 适用场景

在以下任务中应优先使用本 skill：

- 调整 `apps/main` 的 `vite.config.ts` chunk 切分规则
- 分析 `page -> page`、`vendor -> host`、`workspace -> host` 这类反向依赖
- 排查 `React.lazy` 看起来已经用了，但延迟加载没有真正生效的问题
- 细化大依赖的场景拆分，例如 `flow designer`、`code editor`、`dashboard charts`、`AMIS renderer` 的按需加载
- 新增或迁移 `apps/main` 依赖的 workspace 包、外部 file 包、渲染引擎包
- 验证 `AMIS`、`Flux`、宿主框架共享依赖之间是否形成了错误的 chunk 耦合

不适用于：

- 纯页面 UI 微调
- 与构建拆包无关的业务逻辑修改

---

## 2. 核心问题模型

`apps/main` 的延迟加载失效，通常不是因为少写了 `lazy()`，而是因为**chunk 边界与源码依赖边界不一致**。

典型坏味道：

1. 页面 chunk 被别的页面 chunk 复用。
2. `vendor` chunk 反向依赖 `host` chunk。
3. 底层 workspace 包没有被识别成独立基础层，结果被吸进某个页面或宿主运行时 chunk。
4. 外部 `file:` 包没有完整构建产物，导致 Vite 在构建时解析到半成品目录。
5. 启动期共享模块注册代码静态 import 了按场景才需要的大库，导致“页面虽然拆开了，但 host 还是提前把依赖拉进来”。

本仓库里最典型的一类问题是：

- `@nop-chaos/ui` 实际来自 `flux-lib/ui`
- 如果 chunk 识别逻辑只覆盖 `/packages/`，就会漏掉 `flux-lib/`
- 漏识别后，`ui` 代码会被谁先 import 谁先吞掉
- 一旦 `ui` 或共用组件被吞进页面 chunk，后续页面只能反向 import 这个页面 chunk
- 结果就是“逻辑上懒加载了，实际上共享运行时仍被页面块提前带起”

---

## 3. 依赖治理原则

### 3.1 先治理源码依赖图，再治理 chunk 图

顺序不能反过来。

先检查：

- workspace 包之间的依赖方向是否正确
- `apps/main/src` 是否把共用代码放进了页面目录或页面私有 chunk
- 是否存在跨包 `src/` 深层导入
- 外部 file 依赖是否具备可消费的 `esm` / `lib` 产物

再检查：

- 构建产物中的 chunk import 图是否仍然违反层级

### 3.2 chunk 分层必须映射真实层级

推荐层级：

1. `runtime`
2. `bridge`
3. `vendor`
4. `workspace`
5. `host`
6. `page`
7. `facade` / `entry`

允许高层依赖低层，不允许低层依赖高层。

等价地说：

- `page -> host/vendor/workspace/runtime` 可以接受
- `page -> bridge/host/vendor/workspace/runtime` 可以接受
- `host -> page` 不可接受
- `vendor -> host/page` 不可接受
- `vendor -> bridge` 在当前 `AMIS` 宿主桥接架构下允许
- `page -> page` 也应视为违规，除非只是 1 层 facade 指向真实页面实现

### 3.3 页面 chunk 只放页面私有代码

页面目录下如果 import 了真正通用的模块，例如：

- `src/components/common/*`
- `src/config/*`
- `src/hooks/*`
- `src/lib/*`
- `src/components/plugin/*`
- `src/services/*`
- `src/store/*`

这些模块通常应该进 `host` 共享层，而不是留在首个命中的页面 chunk 里。

判定规则：

- 被多个页面复用的，优先进入 `host` 共享 chunk
- 只被某个页面目录独占使用的，才保留在对应 `page-*` chunk

### 3.4 workspace 包识别不能只看 `packages/`

本仓库至少有四类工作区根：

- `apps/*`
- `packages/*`
- `examples/*`
- `flux-lib/*`

只扫描 `/packages/` 会把 `@nop-chaos/ui` 误判为普通源码文件，从而破坏 chunk 层级。

---

## 4. 当前落地实现

### 4.1 共享工具

统一策略放在：`scripts/main-bundle-utils.mjs`

用途：

- 枚举 workspace 包
- 识别 `apps/main` 的外部 `file:` 依赖包
- 从文件路径反查其所属包
- 生成包到 chunk 的稳定映射
- 检查外部 `AMIS` 包是否已经构建出所需产物

### 4.2 源码依赖图分析

脚本：`scripts/analyze-main-package-graph.mjs`

职责：

- 扫描 workspace 包源码 import/export/dynamic import
- 输出包依赖图和分层
- 检测 workspace 循环依赖
- 检测跨包 `src/` 深层导入
- 检测“源码已经 import 了某包，但 `package.json` 未声明依赖”

关键命令：

```bash
node scripts/analyze-main-package-graph.mjs --check
```

如果失败，先修源码依赖边界，再讨论 chunk 规则。

### 4.3 构建产物 chunk 图分析

脚本：`scripts/analyze-main-chunk-graph.mjs`

职责：

- 直接读取 `apps/main/dist/assets/*.js`
- 解析压缩产物中的静态 import、re-export、dynamic import
- 构建 chunk import 图
- 检测 chunk 环
- 检测层级反向依赖
- 检测 `page` 被其他非 facade chunk 当作共享运行时复用

当前实现还会把 `host-amis-*` 识别为独立 `bridge` 层，而不是普通 `host` 层。这样分析器可以正确表达当前架构：

- `host-amis-adapter-*`
- `host-amis-route-runtime-*`
- `host-amis-bootstrap-*`
- `host-amis-preview-*`

这些 chunk 本质上是 `AMIS` 宿主桥接与运行时边界，不应误报为普通 `vendor -> host` 反向依赖。

关键命令：

```bash
node scripts/analyze-main-chunk-graph.mjs --check
```

这里的 `page-used-as-shared-runtime` 是最高优先级信号之一。

### 4.4 apps/main build 集成

`apps/main/package.json` 已将以下流程接入 `build` 与 `build:analyze`：

1. `node ../../scripts/ensure-amis-file-deps-built.mjs`
2. `tsc` / `vite build`
3. `pnpm analyze:imports`
4. `pnpm analyze:chunks`

结论：

- 只要 `build` 成功，就说明源码依赖图和 chunk 图都通过了当前规则
- 以后改 chunk 规则不能只看 `vite build` 是否通过，还必须看两个分析脚本是否通过

---

## 5. 外部 AMIS file 依赖策略

### 5.1 问题本质

`apps/main` 当前依赖：

- `amis`
- `amis-core`
- `amis-ui`
- `amis-formula`

它们来自仓库外部的 `file:` 路径：`C:/can/nop/amis-react19/packages/*`

这类依赖只有在外部仓库已经产出可消费的 `esm/` 与相关静态资源时，当前仓库的 Vite 构建才稳定。

### 5.2 当前前置要求

脚本：`scripts/ensure-amis-file-deps-built.mjs`

会检查至少这些产物：

- `amis/esm/index.js`
- `amis/lib/themes/cxd.css`
- `amis-core/esm/index.js`
- `amis-ui/esm/index.js`
- `amis-formula/esm/index.js`

若缺失，会尝试调用外部 `amis-react19` 的 workspace build。

### 5.3 失败时怎么处理

如果这个脚本失败，不要继续调 `manualChunks`。

先处理外部仓库：

1. 确认 `C:/can/nop/amis-react19` 已安装自己的依赖
2. 确认它能单独运行 workspace build
3. 若外部仓库脚本依赖 `rimraf`、`cross-env` 等命令，先保证外部仓库自身构建可用

这属于**上游依赖未就绪**，不是本仓库 chunk 规则问题。

---

## 6. 修改 chunk 规则的操作步骤

### 步骤 1：先读现状

至少阅读：

- `apps/main/vite.config.ts`
- `scripts/main-bundle-utils.mjs`
- `scripts/analyze-main-package-graph.mjs`
- `scripts/analyze-main-chunk-graph.mjs`

### 步骤 2：跑源码依赖图

```bash
node scripts/analyze-main-package-graph.mjs --check
```

如果这里失败：

- 优先修依赖声明
- 优先修跨包深层导入
- 优先修 workspace 循环依赖

### 步骤 3：跑构建与 chunk 图

```bash
pnpm --filter @nop-chaos/main build
```

或调试时：

```bash
pnpm --filter @nop-chaos/main build:analyze
node scripts/analyze-main-chunk-graph.mjs
```

### 步骤 4：看违规类型再改

#### `page-used-as-shared-runtime`

优先怀疑：

- 共享组件落在页面目录附近
- `manualChunks` 没覆盖共用目录
- 页面 chunk 先吞掉了公共模块
- `src/components/plugin/*`、`src/lib/*` 这类 app-local 共享模块没有被提升到 host 层

处理方式：

- 把公共目录收进 `host-*` 共享 chunk
- 不要把通用组件继续留在 `page-*`

#### `reverse-layer-import`

优先怀疑：

- workspace 包漏识别
- `vendor` / `workspace` 被错误归进 host/page
- 共享依赖先被高层 chunk 吞掉
- 分析脚本把桥接 runtime 误判成普通 `host` 层

处理方式：

- 在包级别固定 chunk 名
- 减少“按文件路径零散判断”的漏网情况

#### chunk cycle

先区分：

- 是 facade 层正常一跳
- 还是实质性共享代码互相牵扯

后者必须拆。

---

## 7. 对 `manualChunks` 的具体要求

1. 先判定“是否属于某个已知包”，再判定“是否属于某个页面目录”。
2. `@nop-chaos/ui`、`@nop-chaos/shared`、`@nop-chaos/core`、`@nop-chaos/plugin-bridge` 这类稳定底层包必须有稳定 chunk 名。
3. `@nop-chaos/amis-core`、`@nop-chaos/amis-react` 应固定到 AMIS bridge 层，不要散落进 host/page。
4. 对 `src/components/common` 这类多页面复用代码，优先固定到 host 共享层。
5. 对 `src/components/plugin`、`src/lib` 这类被多个页面命中的 app-local 共享模块，也优先固定到 host 共享层。
6. 页面 chunk 只负责页面私有模块，不负责“看起来离页面近”的公共模块。
7. 如果一个规则只是为了掩盖某次构建的偶然结果，而不是反映稳定依赖边界，不要加。

---

## 8. 交付标准

一次有效的拆包治理改动，至少应满足：

1. `pnpm --filter @nop-chaos/main build` 通过。
2. `node scripts/analyze-main-package-graph.mjs --check` 通过。
3. `node scripts/analyze-main-chunk-graph.mjs --check` 通过。
4. 没有 `page-used-as-shared-runtime`。
5. 没有 workspace 循环依赖。
6. 文档已更新：
   `docs/logs/{year}/{month}-{day}.md`
7. 若策略本身发生变化，设计文档也应更新。

---

## 9. 本次仓库已确认的经验结论

1. `lazy()` 只决定加载时机，不决定 chunk 边界是否正确。
2. `flux-lib/ui` 也是 workspace 包，不能只按 `/packages/` 识别。
3. 现有产物里出现 `page -> page` 共享时，优先检查 `src/components/common/*` 是否被 page chunk 吞掉。
4. `src/components/plugin/*` 与 `src/lib/*` 也是已经验证过的 app-local 共享模块来源；若留在 `page-*`，会真实触发 `page-used-as-shared-runtime`。
5. `host-amis-*` 在当前仓库应视为 `bridge` 层，而不是普通 `host`；否则会把 AMIS 宿主桥接关系误诊成 `vendor -> host`。
6. 外部 `AMIS file:` 依赖如果没有先构建出 `esm` / `lib`，本仓库 `build` 失败属于环境前置条件未满足，不应误归因到 chunk 规则。
7. 做“按场景减包”时，先检查静态全量引入点，而不是先改 `manualChunks`。当前最典型的诊断入口包括：
   - `apps/main/src/plugins/sharedModules.ts`：启动期共享注册会静态引入 `lucide-react`、`recharts`、`sonner` 等库
   - `packages/core/src/utils/iconMap.tsx`：因低代码引擎需要按 icon 名称解析 Lucide 组件，当前采用 `import * as LucideIcons from 'lucide-react'`
8. 对 `lucide-react` 的优化不能脱离业务前提。若低代码引擎必须支持“按名称动态取任意 Lucide 图标”，则应优先隔离到低代码场景懒加载，而不是简单删除整库导入。
9. 现有旧版产物分析脚本如果不能识别压缩后的 `import{...}from` 语法，分析结论不可信。

---

## 10. 推荐执行顺序

```bash
node scripts/analyze-main-package-graph.mjs --check
node scripts/ensure-amis-file-deps-built.mjs
pnpm --filter @nop-chaos/main build:analyze
node scripts/analyze-main-chunk-graph.mjs --check
```

如果第 2 步失败，先修外部 `amis-react19` 构建环境，再继续。
