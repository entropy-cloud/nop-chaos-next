# Bundle Dependency Governance Skill

> 通用分析策略。用于任何前端应用的 bundle / chunk / dependency 治理，不绑定本仓库的具体包名、目录结构或 chunk 名。

## 1. Purpose

当你需要分析以下问题时，优先使用这份方法论：

- 懒加载看起来存在，但真实下载边界不正确
- 大型依赖修改后，影响面比预期更大
- `vendor -> host`、`host -> page`、`page -> page` 一类反向依赖开始出现
- 某些共享运行时出现多实例解析风险
- chunk 规则越来越多，但仍然无法稳定解释构建结果

这份文档回答的是“如何分析”。
具体到当前仓库的“规则是什么”，应写在 `docs/design/`。

## 2. Core Model

不要把 bundle 优化当成“继续写更多 chunk 规则”。

更可靠的顺序是：

1. 先确认源码依赖边界是否正确
2. 再确认构建产物边界是否映射了源码边界
3. 最后才微调 chunk 分桶和按场景减载

典型错误顺序是：

1. 看到包大
2. 直接改 `manualChunks`
3. 不验证真实依赖图
4. 最终得到更多 facade、更多 preload、更多误判

## 3. Analysis Order

### 3.1 Source Graph First

先看源码依赖图，而不是先看构建哈希名。

优先确认：

- 是否存在跨层源码依赖
- 是否有共享模块被放进页面私有目录
- 是否有 linked/file/tarball 依赖绕开了既有包识别规则
- 是否存在跨包深层导入

如果源码边界本身已经错了，任何 chunk 规则都只是补丁。

### 3.2 Output Graph Second

源码边界确认后，再看构建产物图。

重点不是“变了多少文件”，而是：

- 哪些 chunk 真正依赖了目标 chunk
- 依赖是静态 import、dynamic import，还是 preload map
- 哪些改动只是 hash 传播，哪些是新建了真实依赖边

### 3.3 Measurement Third

体积和网络测量放在第三步。

测量可以回答：

- 下载是否变小
- 首屏是否更快
- 哪些大块仍然存在

但测量本身不能证明依赖边界是正确的。

### 3.4 Use Existing Tools First

优先直接使用仓库内现有分析工具，而不是再写一份额外“策略文档”去描述它们。

典型顺序：

1. `node scripts/analyze-main-package-graph.mjs --check`
2. `node scripts/ensure-amis-file-deps-built.mjs`
3. `node scripts/check-main-external-runtime-deps.mjs --check`
4. `pnpm --filter @nop-chaos/main build:analyze`
5. `node scripts/analyze-main-chunk-graph.mjs --check`

如果需要看可视化或体积：

- 看 `apps/main/dist/stats.html`
- 用 `scripts/analyze-main-chunks.py`
- 在浏览器里看 Network / Lighthouse / WebPageTest

原则：

- 核心分析结论优先来自脚本工具
- 文档只说明如何用工具，不再重复保存与工具等价的“纸面策略副本”

## 4. Stable Heuristics

### 4.1 Prefer Family Rules Over File-by-File Rules

优先沉淀“包族”或“目录族”规则，而不是单文件例外。

更稳的规则：

- 某类共享基础包始终进入稳定基础层
- 某类桥接运行时始终进入 bridge 层
- 某类页面目录始终进入对应 page 层

更脆弱的规则：

- 某次构建里为了绕过一个 chunk 名而新增的单文件特判

### 4.2 Prefer Path/Package-Derived Rules

如果一个结论可以从以下信息稳定推出，应优先固化为工具函数或分析器规则：

- 文件路径
- 包名
- chunk 名前缀
- 可遍历依赖图

如果一个结论只能靠人工记忆某次实验结果，就不应直接进工具函数。

### 4.3 Distinguish Real Dependency From Hash Propagation

以下现象要分开看：

- 真实新增依赖边
- 既有 importers 因 hash 变更而被连带改名
- preload / mapDeps 元数据跟随变动

文件变化数量本身不是依赖治理结论。

### 4.4 Treat Shared Runtime Separately

`react`、`react-dom`、router、i18n、state container、chart runtime 这类共享运行时应单独审视。

问题不只是体积，还有：

- 多实例运行时崩溃
- context / hook / store 边界失真
- host 与插件或外部渲染器之间的实例不一致

## 5. Violation Patterns

优先关注这些模式：

- `page-used-as-shared-runtime`
- `reverse-layer-import`
- chunk cycle
- external runtime duplicate resolution

含义分别是：

- 页面块被当公共运行时复用
- 低层 chunk 反向依赖高层 chunk
- 两个或多个块形成真实静态循环
- 宿主与外部依赖解析到不同物理运行时实例

## 6. Refactoring Rules

当一次分析得到稳定经验后，应分两层沉淀：

1. 方法层：放进 `docs/skills/`
2. 项目规则层：放进 `docs/design/`

判断标准：

- 对多个项目都成立的方法，进 `skills`
- 只对当前项目目录、包边界、命名约定成立的规则，进 `design`

## 7. Deliverables

一次完整的 dependency/bundle 治理，至少应交付：

- 问题模型
- 真实依赖图证据
- 规则调整或代码边界调整
- 构建验证
- 必要的测量结论
- 文档沉淀

## 8. Tool Usage Checklist

### 8.1 Source Dependency Issues

先跑：

```bash
node scripts/analyze-main-package-graph.mjs --check
```

适用于：

- workspace 层级漂移
- 跨包深层导入
- 未声明依赖
- 包循环依赖

### 8.2 External Runtime Split Risk

先跑：

```bash
node scripts/check-main-external-runtime-deps.mjs --check
```

适用于：

- `react` / `react-dom` / `echarts` / `i18next` 等共享运行时是否多实例分裂

### 8.3 Chunk Boundary Issues

先跑：

```bash
pnpm --filter @nop-chaos/main build:analyze
node scripts/analyze-main-chunk-graph.mjs --check
```

适用于：

- `page-used-as-shared-runtime`
- `reverse-layer-import`
- chunk cycles
- 依赖隔离是否真实成立

### 8.4 Measurement and Visualization

如果结构已经基本正确，再看：

- `apps/main/dist/stats.html`
- `scripts/analyze-main-chunks.py`
- 浏览器 Network / Lighthouse / WebPageTest

### 8.5 Interpretation Rule

- 先信脚本构建出的依赖图
- 再看可视化和体积
- 最后才根据这些结论决定是否需要新增稳定工具函数或项目规则

## 9. Anti-Patterns

避免以下做法：

- 只根据文件改名数量判断影响面
- 只看 visualizer treemap，不看 import 图
- 用更多临时 `manualChunks` 规则掩盖源码边界错误
- 把项目特定结论直接写成“通用方法”
- 把通用方法散落在 bug 记录或每日日志里
