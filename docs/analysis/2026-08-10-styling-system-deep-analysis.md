# 样式系统深度分析：flux 控件封装 + 宿主 CSS 变量体系 vs 设计文档契约

> 日期：2026-08-10
> 范围：`nop-chaos-flux` 控件库封装（`@nop-chaos/ui` + renderer）与 `nop-chaos-next` 宿主 CSS 变量体系，对照两仓样式设计文档，评估是否满足"结构稳定且支持灵活样式配置"。
> 依据文档：
> - flux：`docs/architecture/theme-compatibility.md`、`styling-system.md`、`renderer-markers-and-selectors.md`、`container-spacing-design.md`、`flux-design-principles.md`、`flux-guide/14-theming.md`、审计 `docs/analysis/2026-06-02-deep-audit-full/10-styling.md`
> - 宿主：`docs/design/amis-theme-bridge.md`、`docs/design/amis-flux-rendering-engine-integration.md`（§8.1 Flux 主题变量契约）
> 现状证据：2026-08-08/08-10 两轮 CRUD 视觉对齐实测（表头/分页/按钮/空态/dialog/checkbox 等逐项对照 amis）。

---

## 0. TL;DR

设计文档确立的样式架构是 **"CSS 契约、三层分离、Token 驱动"**：
1. **结构稳定性**由"渲染器只发标记（marker/data-slot/aria）＋默认样式归 `@layer base`"保证；
2. **灵活样式配置**由"组件视觉关键数值经 CSS 变量（Token）暴露，宿主任意祖先覆盖"保证。

**评估结论：框架达标、执行面有系统性缺口，两个目标均为"部分满足"。**

| 目标 | 结论 | 关键缺口 |
| --- | --- | --- |
| 结构稳定 | ⚠️ 部分满足 | marker/分层协议达标且有测试锁定；但**组件 token 化不彻底**——input/select/button/checkbox/queryForm/pagination 的形状仍由 Tailwind 类直写，上游默认与宿主期望漂移，宿主被迫堆属性级补丁 |
| 灵活样式配置 | ⚠️ 部分满足 | CSS 契约成立、覆盖链清晰；但**宿主覆盖载体失当**——`theme-tokens` 被 sync 单向覆盖不可改，宿主只能把覆盖堆在 `flux-spacing.css` 的 unlayered `:root` + 属性选择器补丁；控件形状无法经 token 调整（必须 `!important` 级覆盖） |
| **变量治理（设计系统收敛）** | ❌ **不满足** | **`:root` 100 个变量中 35 个是组件级令牌（35%），其中约 75% 是语义层缺失的组件化拷贝/派生**；无字号/间距/尺寸刻度；同一概念（圆角/按钮高度/间距/字号）多处表达互不协调（详见 §3C） |

---

## 1. 设计文档要求（契约基线）

### 1.1 flux 侧

**`theme-compatibility.md`（CSS 契约模型，Non-Goal: 无 ThemeProvider/无 runtime theme state）**

- 渲染器发**稳定 class/DOM**；共享视觉**读 CSS 变量**；项目定义变量**默认值**；**宿主可从任意祖先作用域覆盖**。
- 所有权三分：schema 拥有作者显式选择；renderer 拥有稳定 DOM/class 与组件 chrome；**theme/token 层拥有默认值、host 覆盖、跨面视觉一致性**。
- 隔离根：`.nop-flux-root`（facade CSS 隔离）、`.nop-theme-root`（canonical 共享主题作用域，宿主可放 shell/page/widget 任意层）。
- Token 家族：共享 `--nop-*`；flow `--fd-*`。
- 规则 3：**host hook 稳定**（token/class 一旦成为文档化 hook 不得随意改名）；规则 4：dialog/debugger 与主树同一 token 家族。

**`styling-system.md`（总体样式架构）**

- **Tailwind 优先**：无平行样式系统（STY2：不引入 helper.css / scope-prefix，有测试锁定）。
- 三层 authoring：语义 props / raw className / classAliases（可嵌套展开、作用域继承）。
- **Layout renderers：identity only** —— 只发标记类，默认间距归 `@layer base` CSS（`default-spacing.css`），renderer 代码禁硬编码布局；Tailwind utilities（`@layer utilities`）恒可覆盖。
- **Widget renderers：自包含**完整视觉；仍发根标记 + data-slot + data-*/aria-* 状态。
- Marker 协议：`nop-*` 仅根标记；内部 region 用 `data-slot`；状态用 `data-*`/`aria-*`；不引入 BEM 修饰类。
- UI 层用 shadcn/ui（copy-paste 可改）+ cva variant/size。

**`container-spacing-design.md`（间距三层）**

- 三层独立可覆盖：`--space-*` token（theme-tokens，全局可调）→ `@layer base` 默认规则（消费 token）→ renderer 语义 props/className（Tailwind utilities 覆盖 base）。
- `--space-*` 用具体像素（不依赖 Tailwind 加载顺序）；**不复制 Tailwind `--spacing-*` 刻度**（单一来源）。

**`flux-guide/14-theming.md`（主题与样式，含 C1a 组件 token 面）**

- 三层 CSS：theme-tokens（shadcn 风格 `--primary` 等 + 4 主题变体）→ tailwind-preset（`hsl(var(--token))` 映射）→ 包内局部变量（`--nop-*`/`--fd-*`）。
- **C1a 声明**：Table/Dialog/CRUD 工具栏的"所有关键数值经 token 控制，组件与样式文件内不写死魔法数字"（`--table-*` 14 项、`--dialog-*` 9 项、`--crud-toolbar-gap`），宿主同名变量直接覆盖即可整体换调。

### 1.2 宿主侧

**`amis-theme-bridge.md`**：AMIS 变量经 `.amis` 作用域映射到宿主 token；**宿主语义 token 不可在 bridge 中重定义**；新组件适配在 `amis-fix.css` 覆盖。

**`amis-flux-rendering-engine-integration.md` §8.1（Flux 主题变量契约）**：

- flux 消费少量宿主可覆盖变量（`--space-*`、`--radius-*`、`--field-label-width`）。
- **宿主取值不得写入 `packages/theme-tokens/src/styles.css`**（该目录经 `scripts/sync-flux-lib.sh` 从 flux 单向覆盖）；宿主可覆盖值一律放 host 自有样式。
- 契约有测试锁定（上游 `default-spacing-contract.test.ts` + 宿主 `themeContract.test.ts`）。

---

## 2. 现状盘点

### 2.1 控件库封装（`@nop-chaos/ui` + renderer）

| 层 | 实现 | 与文档的符合度 |
| --- | --- | --- |
| UI 组件 | shadcn/ui 复制组件 + cva variant/size + `data-slot`/`role`/`aria-*` | ✅ 符合 |
| Layout renderers | 只发 `nop-*` 标记 + schema className；默认间距在 `default-spacing.css` `@layer base` | ✅ 符合（06-02 审计 P0 确认） |
| Widget renderers | 自包含完整视觉，根标记 + data-slot | ✅ 符合 |
| Table/Dialog/Crud 视觉基线 | C1a token 面（`--table-*`/`--dialog-*`/`--crud-toolbar-gap`），`table.css`/`dialog.tsx` 消费 | ✅ 符合（C1a 范围） |
| **Input/Select/Button/Checkbox/Textarea** | **形状由 Tailwind 类直写**（`rounded-lg`、`h-8/h-9`、`py-1`、`bg-muted/30` 等） | ⚠️ **不消费 token** |
| **QueryForm 容器** | 类 `nop-crud-query rounded-lg border bg-muted/30 p-4`（Tailwind 直写） | ⚠️ 不消费 token |
| **TablePaginationBar 统计** | 曾硬编码 `1-10 of 15`；2026-08-10 已改 i18n | ✅（本次修复） |
| **Selection 列（checkbox）** | 默认 `text-align: left` + 首列 edge padding 不对称（表头无 16px） | ⚠️ 需宿主 CSS 修补 |
| **操作按钮（编辑/删除）** | `link` variant（primary 文字）+ 默认尺寸 | ⚠️ 需宿主 CSS 补 12px/18px/hover 亮蓝 |
| **分页器** | 缺省内建 `TablePaginationBar` + footerToolbar 独立 `pagination`（不联动）双轨 | ⚠️ 重复设计且行为不等价 |
| **Form actions** | 默认 `justify-content: normal`（靠左） | ⚠️ 需宿主 CSS 补靠右 |

### 2.2 CSS 变量系统（宿主消费链）

```
theme-tokens（上游同步源，宿主不可改）
  ├── 颜色 --primary/--background/...（HSL 三元组）
  ├── 圆角 --radius-sm/md/lg/xl（8/12/16/20）
  ├── 间距 --space-*（9 项）
  └── C1a 组件面 --table-* / --dialog-* / --crud-toolbar-gap
        │
        ▼ sync-flux-lib.sh 单向覆盖（宿主改动会被冲掉）
tailwind-preset：--color-* 等映射 → hsl(var(--token))
        │
        ▼
宿主覆盖面（apps/main/src/styles/）
  ├── flux-spacing.css：上游 default-spacing.css 的**同步副本** + 2026-08-10 追加的
  │    F 系列补丁（unlayered :root 覆盖 + 属性选择器覆盖，见 §2.3）
  ├── index.css：--field-label-width 等少量 host 变量
  ├── amis-theme-bridge.css / amis-fix.css：AMIS 侧
  └── themeContract.test.ts：锁定部分契约
```

### 2.3 宿主 F 系列补丁现状（2026-08-10 CRUD 对齐的产物）

`flux-spacing.css` 中与同步副本**混在一起**的宿主补丁（`F1–F17`）：

- **unlayered `:root` token 覆盖**：`--table-row-height: 44px`、`--table-header-bg: rgb(247,248,250)`、`--table-hover-bg`、`--table-row-action-height: 24px`、`--space-form-item-gap: 24px`、`--nop-field-error` —— 覆盖上游默认（40px/白底/16px）。
- **unlayered 属性级覆盖**：单元格去竖线、操作按钮 12px/18px/primary 色、分页按钮当前页边框、分页栏 padding、空态 200px、queryForm 透明化、dialog 按钮靠右、confirm 按钮 4px 圆角 —— 大部分带 `!important` 或依赖特异性压 Tailwind utilities。

---

## 3. 差距分析（对照契约逐条）

### A. 结构稳定性

| 契约项 | 现状 | 判定 |
| --- | --- | --- |
| Layout renderers 仅发标记 | 06-02 审计 P0 确认 | ✅ |
| marker/data-slot/aria 协议 | 有测试锁定（`field-controls-dom-contract`、`styling-no-helper-css` 等） | ✅ |
| Widget renderers 自包含 | 符合 | ✅ |
| **组件视觉基线 token 化（C1a 承诺）** | **只覆盖 Table/Dialog/Crud 工具栏**；input/select/button/checkbox/textarea/queryForm/pagination 形状仍 Tailwind 类直写 | ❌ **覆盖不全** |
| **host hook 稳定（规则 3）** | `--table-*` 等 C1a hook 稳定；但 `flux-spacing.css` 的同步副本与 F 补丁混放，副本漂移风险高（2026-08-08 已发现 9 处漂移） | ⚠️ |
| 重复设计排除 | footerToolbar 独立 `pagination` 与内建 `TablePaginationBar` 并存且**行为不等价**（独立组件不联动 CRUD 分页状态） | ❌ 结构缺陷 |
| 上游测试有效性 | `crud-loadaction-reaction-regression` 曾用无效字段 `selectable` + 选不中 Base UI checkbox（假阳性）；已修 | ⚠️ 曾经失效 |

**结构性结论**：分层与协议框架达标；但"关键数值 token 化"的承诺只兑现了一半（Table/Dialog），控件形状（圆角/高度/背景/对齐）仍由 Tailwind 类决定 —— 这是"上游默认与宿主期望漂移 + 宿主被迫属性级修补"的**根本来源**。

### B. 灵活样式配置

| 契约项 | 现状 | 判定 |
| --- | --- | --- |
| CSS 契约（无 ThemeProvider） | 成立，宿主可覆盖变量 | ✅ |
| 覆盖链（token → @layer base → utilities） | 清晰且 utilities 恒可覆盖 | ✅ |
| **宿主可改 token 默认** | **不可**：theme-tokens 被 sync 单向覆盖，宿主改动即被冲掉（2026-08-10 实测表头 token 被覆盖回 40px/白底） | ❌ 与"宿主可从任意祖先覆盖"冲突 |
| **宿主覆盖载体** | 只能堆在 `flux-spacing.css` unlayered `:root` + 属性选择器（部分 `!important`） | ⚠️ 补丁面而非 token 面 |
| **控件形状经 token 调整** | 不可：`rounded-lg`/`h-9`/`bg-muted/30` 是 Tailwind 类，改 token 不传导 | ❌ 违背"theme layer owns defaults and host overrides"的优雅性 |
| variant 语义 | flux `variant` 与 AMIS `level` 不兼容（schema 作者用 `level: primary` 无效，2026-08-10 实测） | ⚠️ 迁移场景缺映射 |
| 双引擎（AMIS/Flux）同 token 不同视觉 | 同一 `--primary` 下 AMIS（cxd 类）与 flux（Tailwind 类）控件取值不同（圆角/高度/边框），需 F1–F17 逐项修补 | ⚠️ 系统性对齐成本 |

**配置性结论**：CSS 契约与覆盖链本身成立；但"宿主覆盖"在**载体**（不能改 token 源）与**粒度**（控件形状不可经 token）两个层面都不符合设计意图 —— 实际是"token 补丁 + 属性补丁"双轨，且补丁面与同步副本同文件（维护风险）。

---

## 3C. 变量治理与设计系统协调（关键缺口）

> 设计系统的本质不是"每个值都有变量"，而是 **"少数关键变量 + 整体协调"**：色调/尺寸/间隔都应该是**少数几组**，什么地方用什么变量由设计系统整体决定。当前体系在这一维度**不达标**。

### 3C.1 现状量化

`packages/theme-tokens/src/styles.css` `:root` 块共 **100 个变量**，分类：

| 类别 | 数量 | 占比 | 说明 |
| --- | --- | --- | --- |
| 语义色（`--primary`/`--background`/`--muted`…） | 26 | 26% | ✅ 合理（语义层） |
| **组件令牌（`--table-*` 20 + `--dialog-*` 14 + `--crud-*` 1）** | **35** | **35%** | ❌ **膨胀** |
| shadow | 7 | 7% | 刻度族，可收敛 |
| space（`--space-*`） | 10 | 10% | 语义间距，但无刻度来源 |
| radius（`--radius-*`） | 4 | 4% | 圆角刻度，偏少（AMIS 7 级） |
| icon/transition/chart/其他 | 18 | 18% | 杂项 |

**组件令牌 75% 可收敛**（`--table-*` 20 个中 15 个、`--dialog-*` 14 个中 5 个是语义层缺失的拷贝/派生）：

| 冗余模式 | 实例 | 应有归属 |
| --- | --- | --- |
| 字号拷贝 | `--table-body-font-size: 12px`、`--table-header-font-size: 14px`、`--dialog-title-font-size: 14px` | 语义字号刻度（`--text-xs/sm` 等） |
| 字重拷贝 | `--table-header-font-weight: 400` | 语义字重 |
| 间距拷贝 | `--table-cell-padding-y/x`、`--table-edge-padding-x`、`--dialog-body-padding-x`、`--dialog-footer-gap`、`--table-row-action-gap`、`--crud-toolbar-gap` | 间距刻度（与 Tailwind `--spacing-*` 统一） |
| 颜色拷贝 | `--table-header-bg: hsl(var(--background))`、`--table-header-separator-color`、`--table-hover-bg`、`--table-selected-bg`、`--table-fixed-edge-shadow` | 直接引用语义色/shadow（组件层不拷贝） |
| 按钮尺寸 | `--table-row-action-height: 32px`、`--dialog-footer-button-min-width: 72px` | 控件尺寸语义（按钮高度族） |

**合理保留的结构性常量**（~10 个）：`--table-row-height`、`--table-empty-height`、`--table-fixed-edge-width`、`--dialog-top-offset`、`--dialog-stack-step`、`--dialog-size-*`（宽度族）等 —— 组件级"结构常数"是 token 体系的合法例外，但**应是少数**。

### 3C.2 缺层：无 Primitive/Scale 层

经典 token 模型是三层：**Primitive（原始刻度）→ Semantic（语义映射）→ Component（组件，最少）**。当前体系：

- **有 Semantic 色层** ✅（`--primary` 等）
- **有 Semantic 圆角刻度**（`--radius-*` 4 级）——但被组件层绕过
- **无字号刻度**、**无间距刻度**（与 Tailwind `--spacing-*` 割裂）、**无控件尺寸刻度**
- 语义层缺失 → 组件层被迫自建（35 个组件令牌的根因）

### 3C.3 协调缺失实例（同一概念多处表达）

1. **圆角 4 处来源互不协调**：`--radius-sm/md/lg/xl`（8/12/16/20）／`--dialog-content-border-radius: 6px`（**不在刻度上**）／按钮 4px（Tailwind 类，不在刻度上）／AMIS `--borders-radius-1..7`（0/2/4/6/8/10/50%，bridge 放大映射）—— 一个"圆角"概念四种取值体系。
2. **按钮高度/尺寸 3 处表达**：`--table-row-action-height: 32px`／`--dialog-footer-button-min-width: 72px`／Tailwind `h-8/h-9`（工具栏/分页/操作按钮各自）—— 无"控件高度"统一语义。
3. **间距 3 套来源**：`--space-*` 9 个独立值（16/24/16/16/12/16/4/8/16，无刻度派生）／Tailwind `--spacing-*`（4px 基数，`container-spacing-design.md` 明确拒绝复制）／`--table-cell-padding-*` 等散值（11/10/16px）。
4. **字号无刻度**：表体 12px、表头 14px、field-label 13px（默认样式硬编码）、dialog-title 14px —— 四处字号各写各的。
5. **宿主补丁绕过语义层**：`flux-spacing.css :root` 里 `--table-header-bg: rgb(247,248,250)` 是**硬编码 RGB 原始值**（不落在任何语义色上）；而 `--nop-field-error: hsl(var(--danger))` 回到语义层（正确示范）—— 补丁行为不一致。

### 3C.4 缺协调规则

- 无"组件令牌必须引用语义层、禁止硬编码数值"的约束（`--table-header-bg` 拷贝 `--background`、宿主补丁写 RGB 原始值均未被拦）。
- 无"新 token 需过设计系统评审"的机制（C1a 一次引入 24 个组件令牌即为"局部补丁式"扩展的实例）。
- 契约测试（`themeContract.test.ts`/`default-spacing-contract.test.ts`）只锁"变量名与 fallback"，**不锁"语义层唯一性"与"组件令牌引用语义层"**。

---

## 4. 根因归纳

1. **C1a token 面范围过窄**：只 token 化 Table/Dialog/CRUD 工具栏，未覆盖"形状"（圆角/高度/背景/对齐）类控件 —— 而这些恰恰是视觉差异最密集处。
2. **Tailwind 类直写 vs 变量覆盖的断层**：`rounded-lg`、`h-9`、`bg-muted/30` 在 `@layer utilities`，宿主改 `--radius-*` 不传导（Tailwind v4 用 `--radius-lg` 生成类，改值会影响类本身，但语义错位——`rounded-lg` 同时服务按钮与弹层）；属性级覆盖必须 unlayered + 特异性/`!important`。
3. **sync 单向覆盖与"宿主可覆盖"契约冲突**：`sync-flux-lib.sh` 把上游 theme-tokens 覆盖进宿主 → 宿主 token 层实际只读；契约文档（§8.1）承认这一点并要求宿主用自有样式 —— 但没有为"宿主 token 覆盖"提供正式载体，导致补丁散落在同步副本文件中。
4. **上游默认与宿主需求漂移**：上游默认（40px thead、白表头、16px gap、ghost hover 灰底、checkbox 左对齐）与宿主 AMIS 对齐目标不同 → 宿主 F 系列逐项修补；每次上游 sync 都可能重新引入漂移。
5. **结构重复设计**：footerToolbar 独立 `pagination`（AMIS 迁移遗留）与内建分页栏并存且行为不等价，是"结构不稳定"的直接实例。
6. **变量治理缺失（本次新增，§3C）**：没有先建立 Primitive/Semantic 层（字号/间距/尺寸刻度），组件层被迫自建 35 个令牌（75% 冗余）；"少数字典 + 整体协调"的设计系统原则被"局部补丁式加变量"取代 —— 变量只会随问题逐项增多，永远收敛不了。

---

## 5. 结论

**"结构稳定且支持灵活样式配置" —— 均部分满足，未完全达标。**

1. **结构稳定**：分层（layout/widget）、标记协议、`@layer` 覆盖链是**稳定的**，且有测试锁定；但组件 token 化不彻底导致"宿主修补面"成为事实上的第二样式层，上游默认与宿主期望持续漂移 —— 结构上稳定的是**框架**，不稳定的是**视觉基线**。
2. **灵活样式配置**：CSS 契约（无 runtime provider）与 token 覆盖链成立；但宿主对 token 源只读、控件形状不可经 token 调整、覆盖只能以"unlayered :root + 属性补丁"落地 —— 配置灵活性停留在"能改"，远未达到"通过变量优雅换调"（C1a 承诺的"宿主同名变量直接覆盖即可整体换调"仅对 Table/Dialog 成立）。
3. **变量治理（设计系统收敛）**：**不满足**。`:root` 100 个变量中 35 个组件级令牌（35%），其中约 75% 是语义层缺失的拷贝/派生；无字号/间距/尺寸刻度；圆角/按钮尺寸/间距/字号四处"同一概念多表达"；缺"组件令牌引用语义层"的约束 —— 变量体系**不是"少数关键变量 + 整体协调"的设计系统，而是"随问题增长的补丁集合"**。

**一句话**：设计文档是对的，方向正确；但执行层把"token 化"做成了**局部优化**（C1a 只覆盖 Table/Dialog），把"宿主覆盖"留给了**补丁面**（flux-spacing.css F 系列），把"变量治理"让位给了**逐项补丁**（组件令牌膨胀）—— 三处系统性缺口使"结构稳定 + 灵活配置 + 可收敛"的目标打了对折。

---

## 6. 改进建议（按优先级）

| # | 建议 | 归属 | 收益 |
| --- | --- | --- | --- |
| 1 | **先建语义层，再谈组件令牌**：补齐 Primitive/Semantic 刻度 —— 字号刻度（`--text-xs/sm/base`）、间距刻度（与 Tailwind `--spacing-*` 统一为 4px 基数或显式别名）、控件尺寸语义（按钮高度族）；`--table-*`/`--dialog-*` 中 75% 的拷贝/派生改引语义层，**组件令牌收敛到 ~10 个结构性常量** | flux 上游 | 变量从 100 → 目标 ~60；单一来源；换调优雅 |
| 2 | **组件令牌约束**：规则"组件令牌禁止硬编码数值，必须引用语义层（`hsl(var(--...))`/`var(--text-*)`/刻度）"；契约测试锁"语义层唯一性" | flux 上游 + 宿主测试 | 防再次膨胀 |
| 3 | **扩大 C1a token 面到"形状"控件**：`--control-radius`（input/select/button 圆角，落在圆角刻度上）、`--crud-query-bg` 等；控件 Tailwind 类改消费 token | flux 上游 | 消除属性级补丁 |
| 4 | **上游默认对齐宿主期望**：44px thead、灰表头、checkbox 列居中、操作按钮 link 尺寸、form-actions 靠右、分页统计 i18n 进上游默认 | flux 上游 | 消除 F 系列大部分补丁 |
| 5 | **宿主覆盖正式载体**：宿主覆盖抽独立文件（`flux-host-overrides.css`），unlayered `:root` 只写语义层引用（禁止 RGB 原始值）；纳入 `themeContract.test.ts` 锁定 | 宿主 | 补丁与同步副本分离 |
| 6 | **消除分页重复设计**：footerToolbar 独立 `pagination` 标注 deprecated；文档明确"缺省内建分页栏 + toolbarLayout 拆分"两路径 | flux 上游 | 结构收敛 |
| 7 | **variant 词汇表补 AMIS 迁移映射**：`level: primary/danger` → `variant: default/destructive` 的 authoring 转换或文档 | flux 上游 | 迁移场景少踩坑 |

---

## 7. 相关文件索引

- 设计文档：`../nop-chaos-flux/docs/architecture/{theme-compatibility,styling-system,renderer-markers-and-selectors,container-spacing-design}.md`、`../nop-chaos-flux/flux-guide/14-theming.md`、`docs/design/{amis-theme-bridge,amis-flux-rendering-engine-integration}.md`
- 现状实现：`packages/theme-tokens/src/styles.css`、`packages/tailwind-preset/`、`flux-lib/ui/src/styles/{table,base}.css`、`apps/main/src/styles/{flux-spacing,index,amis-theme-bridge,amis-fix}.css`
- 宿主补丁面：`apps/main/src/styles/flux-spacing.css`（F1–F17）、`apps/main/src/styles/themeContract.test.ts`
- 上游审计基线：`../nop-chaos-flux/docs/analysis/2026-06-02-deep-audit-full/10-styling.md`
- 本次实测证据：`docs/analysis/2026-08-08-flux-amis-style-consistency-analysis.md`、`docs/analysis/2026-08-10-flux-amis-crud-style-parity-analysis.md`、`docs/testing/2026/08-10.md`
