# 0001 样式系统变量收敛：语义层（字号/间距/尺寸刻度）+ 组件令牌收敛

> Plan Status: draft
> Last Reviewed: 2026-08-10
> Source: `docs/analysis/2026-08-10-styling-system-deep-analysis.md`（§3C 变量治理与设计系统协调）
> Related: `docs/analysis/2026-08-08-flux-amis-style-consistency-analysis.md`、`docs/plans/2026-08-09-0001-c1a-crud-table-dialog-visual-amis-parity-plan.md`（上游）

## Purpose

把样式变量体系从"随问题增长的补丁集合"收敛为**"语义层（少数刻度）+ 组件层（结构性常量）"**：先建立字号/间距/尺寸语义刻度，把 `--table-*`/`--dialog-*` 中约 75% 的拷贝/派生改引语义层，组件令牌收敛到 ~10 个结构性常量；宿主补丁去掉硬编码原始值改引语义层；用契约测试锁定"组件令牌禁止硬编码、必须引用语义层"。

## Current Baseline

（2026-08-10 已核对 live repo）

- `packages/theme-tokens/src/styles.css` `:root` 共 100 个变量；其中**组件级令牌 35 个**（`--table-*` 20 + `--dialog-*` 14 + `--crud-*` 1），占比 35%。
- 组件令牌约 75% 为语义层缺失的拷贝/派生（详见分析报告 §3C.1）：
  - 字号拷贝：`--table-body-font-size: 12px`、`--table-header-font-size: 14px`、`--dialog-title-font-size: 14px` —— 无 `--text-*` 语义字号层
  - 间距拷贝：`--table-cell-padding-y/x`、`--table-edge-padding-x`、`--dialog-body-padding-x`、`--dialog-footer-gap`、`--table-row-action-gap`、`--crud-toolbar-gap` —— 与 Tailwind `--spacing-*`（4px 基数）割裂
  - 颜色拷贝：`--table-header-bg: hsl(var(--background))`、`--table-header-separator-color`、`--table-hover-bg`、`--table-selected-bg`、`--table-fixed-edge-shadow` —— 语义色/shadow 的组件化拷贝
  - 按钮尺寸：`--table-row-action-height: 32px`、`--dialog-footer-button-min-width: 72px` —— 无控件尺寸语义
- 消费点：`packages/ui/src/styles/table.css` 消费 15 个 `--table-*`；`packages/ui/src/components/ui/dialog.tsx` 消费 10 个 `--dialog-*`；`flux-renderers-data` 的 table-renderer/dialog 相关也消费。
- 宿主补丁：`apps/main/src/styles/flux-spacing.css` unlayered `:root` 覆盖 8 项（`--table-row-height: 44px`、`--table-header-bg: rgb(247,248,250)` **硬编码 RGB**、`--table-hover-bg`、`--table-row-action-height`、`--space-form-item-gap`、`--nop-field-error` 等）。
- 契约测试：宿主 `apps/main/src/styles/themeContract.test.ts` 5 项（锁变量名/fallback/引用）；上游 `flux-react/src/__tests__/default-spacing-contract.test.ts`（规则与 fallback）。**均不锁"语义层唯一性"与"组件令牌引用语义层"**。
- 语义层现状：有语义色层（`--primary` 等）✅；有圆角刻度（`--radius-sm/md/lg/xl`）✅；**无字号刻度、无间距刻度（与 Tailwind 割裂）、无控件尺寸刻度**。
- 同步机制：`scripts/sync-flux-lib.sh` 单向覆盖 `theme-tokens`/`tailwind-preset`/`flux-lib/ui` 到宿主；上游改动经 `pnpm refresh:flux` 进宿主。

## Goals

- 建立语义刻度（`theme-tokens`）：**字号刻度**（`--text-xs/sm/base/lg`）、**间距刻度**（`--space-*` 显式对齐 4px 基数，或与 Tailwind `--spacing-*` 建立显式别名关系）、**控件尺寸语义**（按钮高度族 `--control-height-*`）。
- `--table-*`/`--dialog-*` 的拷贝/派生项改引语义层（75% 收敛），组件令牌只保留结构性常量（`--table-row-height`、`--table-empty-height`、`--table-fixed-edge-width`、`--dialog-top-offset`、`--dialog-stack-step`、`--dialog-size-*` 等 ~10 个）。
- 宿主 `flux-spacing.css` 补丁去硬编码（`rgb(247,248,250)` → 语义层引用），与上游收敛后的 token 对齐。
- 契约测试锁定"组件令牌引用语义层、禁止硬编码数值"（上游 + 宿主）。
- 视觉基线不变（纯取值迁移，不重设计）。

## Non-Goals

- 不做任何视觉重设计（只迁移 token 取值，外观逐像素不变）。
- 不动 AMIS 侧（`amis-theme-bridge.css`/`amis-fix.css`/cxd 映射）。
- 不扩 token 面到"形状"控件（`--control-radius`/`--crud-query-bg` 等 Tailwind 类消费 token —— 属后续计划，见 Non-Blocking Follow-ups）。
- 不消除分页器重复设计（footerToolbar 独立 pagination vs 内建栏 —— 独立结果面）。
- 不调整上游默认视觉（44px thead/灰表头等 —— 独立结果面）。
- 不做 `--space-*` 的 Tailwind `--spacing-*` 合并实现（仅建立显式别名/对齐关系，不动消费代码）。

## Scope

### In Scope

- 上游 `packages/theme-tokens/src/styles.css`：新增语义刻度 + 收敛 `--table-*`/`--dialog-*`
- 上游消费点：`packages/ui/src/styles/table.css`、`packages/ui/src/components/ui/dialog.tsx`、`flux-renderers-data` 相关消费处
- 上游测试：`default-spacing-contract.test.ts` + 新增 token 契约测试
- 宿主：`apps/main/src/styles/flux-spacing.css`（补丁迁移引语义层）、`apps/main/src/styles/themeContract.test.ts`（补强）
- 文档：`flux-guide/14-theming.md`（token 面更新）、`docs/architecture/theme-compatibility.md`（token 层说明）、宿主 `docs/design/amis-flux-rendering-engine-integration.md` §8.1（契约表更新）
- 同步与验证：`pnpm refresh:flux` + 双引擎 e2e 回归

### Out Of Scope

- 分析报告建议 #3–#7（形状控件 token 面、上游默认对齐、宿主覆盖独立载体、分页重复设计、variant AMIS 映射）—— 见 Non-Blocking Follow-ups
- AMIS/宿主非 flux 样式

## Execution Plan

### Phase 1 - 语义刻度定义（上游 theme-tokens）

Status: planned
Targets: `../nop-chaos-flux/packages/theme-tokens/src/styles.css`

- Item Types: `Decision | Fix`

- [ ] `Decision`：字号刻度方案 —— 新增 `--text-xs: 12px`、`--text-sm: 14px`、`--text-base: 16px`、`--text-lg: 18px`（与 `--table-*`/`--dialog-*` 字号拷贝对齐）。**先验证 Tailwind v4 对 `--text-*` 的占用**（Tailwind v4 的 `--text-sm` 等是 `@theme` 下的 font-size 语义键）；若 `:root` 与 `@theme` 命名冲突，改用 `--nop-text-*` 前缀（命名冲突裁定是本项前置 Decision）
- [ ] `Decision`：间距刻度方案 —— `--space-*` 值全部落在 4px 基数（16/24/12/8/4 = 4×4/6×4/3×4/2×4/1×4），文档注明与 Tailwind `--spacing-*` 的对应关系（`--space-form-item-gap` = `--spacing-4`），不引入第二套刻度
- [ ] `Decision`：控件尺寸语义 —— 新增 `--control-height-sm/md/lg`（28/32/36px）与 `--control-button-min-width: 72px`，供按钮/操作列/dialog footer 引用
- [ ] `Fix`：在 `:root` 定义上述刻度，保持现有组件令牌默认值不变（迁移期双轨）
- [ ] `Proof`：上游 `theme-tokens` typecheck + 现有主题测试全绿（视觉不变）

Exit Criteria:

- [ ] `theme-tokens/src/styles.css` 中新增 `--text-*`/`--control-*` 组（或 `--nop-text-*`，视 Tailwind 命名占用裁定），`--space-*` 值全部在 4px 基数
- [ ] 现有组件令牌默认值未变（`--table-*`/`--dialog-*` 数值与迁移前一致）
- [ ] 上游 `pnpm --filter @nop-chaos/theme-tokens typecheck` + 相关测试通过
- [ ] 文档归属裁定：本 Phase 的 Decision（命名/刻度方案）在 theme-tokens 注释内落地；`flux-guide/14-theming.md` token 面表格更新集中在 Phase 5（避免中间态双轨文档）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - `--table-*` 收敛（消费点迁移 + 测试）

Status: planned
Targets: `../nop-chaos-flux/packages/ui/src/styles/table.css`、`../nop-chaos-flux/packages/theme-tokens/src/styles.css`、相关 renderer

- Item Types: `Fix | Proof`

- [ ] `Fix`：`--table-body-font-size`/`--table-header-font-size`/`--table-header-font-weight` 改为 `var(--text-*)`/语义字重（在 theme-tokens 中定义引用，消费点不变或消费点改引语义变量）
- [ ] `Fix`：`--table-cell-padding-*`/`--table-edge-padding-x`/`--table-row-action-gap`/`--crud-toolbar-gap` 改引间距刻度（`--space-*`）
- [ ] `Fix`：`--table-header-bg`/`--table-header-separator-color`/`--table-hover-bg`/`--table-selected-bg`/`--table-fixed-edge-shadow` 改为语义色/shadow 派生引用（`hsl(var(--background))` 等直接引用，组件层不拷贝数值）
- [ ] `Fix`：`--table-row-action-height` 改引 `--control-height-sm`
- [ ] `Proof`：上游 table 相关测试（`table-index-column`、`data-table-*`、`crud-selection-*` 等）全绿；`table.css` 消费的 `--table-*` 数量从 15 → ≤6（结构性常量）
- [ ] `Proof`：上游 `styling-no-helper-css` 等样式 guard 测试不回归

Exit Criteria:

- [ ] `table.css` 消费的 `--table-*` 数量 ≤ 6（`--table-row-height`/`--table-empty-height`/`--table-fixed-edge-width`/`--table-fixed-edge-shadow`/`--table-striped-bg` 等结构性常量）
- [ ] `theme-tokens` 中 `--table-*` 的拷贝/派生项改为 `var(--text-*)`/`var(--space-*)`/`var(--control-*)`/语义色引用，无独立数值
- [ ] 上游 flux-renderers-data + ui 全量测试通过（视觉不变）
- [ ] 文档归属裁定：`--table-*` 收敛清单进入 `flux-guide/14-theming.md` 的更新集中在 Phase 5；本 Phase 无独立 owner-doc 更新
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - `--dialog-*` 收敛

Status: planned
Targets: `../nop-chaos-flux/packages/ui/src/components/ui/dialog.tsx`、`../nop-chaos-flux/packages/theme-tokens/src/styles.css`

- Item Types: `Fix | Proof`

- [ ] `Fix`：`--dialog-title-font-size` 改引 `--text-sm`
- [ ] `Fix`：`--dialog-body-padding-x`/`--dialog-footer-gap` 改引间距刻度
- [ ] `Fix`：`--dialog-footer-button-min-width` 改引 `--control-button-min-width`
- [ ] `Decision`：`--dialog-content-border-radius: 6px` 的处理 —— 圆角刻度 `--radius-*`（8/12/16/20）无 6px 级；裁定为"结构性常量保留 + 文档注明不在刻度上"或"引入 `--radius-2xs: 6px` 补刻度"（二选一，倾向后者补刻度，与 AMIS 7 级圆角对齐）
- [ ] `Fix`：`--dialog-overlay-bg` 归入 overlay 语义（如 `--overlay-bg`，dialog/alert-dialog 共用）
- [ ] `Proof`：dialog 相关测试（`surface-enhancements`、`crud-dialog-actions` 上游等价）全绿

Exit Criteria:

- [ ] `dialog.tsx` 消费的 `--dialog-*` 中拷贝/派生项改引语义层，保留结构性常量（`--dialog-size-*`/`--dialog-top-offset`/`--dialog-stack-step` 等）
- [ ] `--dialog-content-border-radius` 的裁定已记录（补刻度或保留常量，二者必选其一并写入 theme-tokens 注释）
- [ ] 上游 dialog/surface 测试全绿（视觉不变）
- [ ] 文档归属裁定：`--dialog-*` 收敛清单与 `--dialog-content-border-radius` 裁定进入 `flux-guide/14-theming.md` 的更新集中在 Phase 5；本 Phase 无独立 owner-doc 更新
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - 宿主补丁迁移 + 契约测试补强

Status: planned
Targets: `apps/main/src/styles/flux-spacing.css`、`apps/main/src/styles/themeContract.test.ts`、`../nop-chaos-flux/packages/flux-react/src/__tests__/default-spacing-contract.test.ts`

- Item Types: `Fix | Proof`

- [ ] `Fix`：宿主 `flux-spacing.css` unlayered `:root` 补丁去硬编码 —— `--table-header-bg: rgb(247,248,250)` 改为语义引用：**新增语义色（如 `--surface-header: rgb(247,248,250)`）承载 amis 灰**，宿主补丁引用之（不用 `var(--muted)` 近似，保持视觉逐像素不变）；其余补丁改引收敛后的变量名
- [ ] `Fix`：宿主补丁与上游收敛后的 `--table-*`/`--dialog-*` 命名对齐（若上游改名，宿主覆盖同步改名）
- [ ] `Fix`（上游测试）：`default-spacing-contract.test.ts` 增加"组件令牌必须引用语义层/刻度、禁止硬编码数值"断言 —— 采用**白名单方式**：读取 `theme-tokens` 源文本，对 `--table-*`/`--dialog-*` 的取值做检查，非白名单结构性常量（`--table-row-height`/`--table-empty-height`/`--table-fixed-edge-width`/`--dialog-size-*`/`--dialog-top-offset`/`--dialog-stack-step` 等）不得包含裸数值（px/数字），必须为 `var(--...)`/`hsl(var(--...))` 引用
- [ ] `Proof`（宿主测试）：`themeContract.test.ts` 增加"宿主补丁无硬编码 RGB 原始值"断言 + 补丁引用变量名锁定
- [ ] `Proof`（主题变体核对）：新增语义色（`--surface-header` 等）在 4 个主题变体（classic/glass × light/dark）中的表现核对 —— 每个变体显式定义或确认继承 `:root` 默认值一致
- [ ] `Proof`：`pnpm refresh:flux` 同步上游到宿主（含 Phase 1–3 变更与测试）

Exit Criteria:

- [ ] 上游 `default-spacing-contract.test.ts` + 宿主 `themeContract.test.ts` 全绿且含新断言
- [ ] 宿主 `flux-spacing.css` 的 unlayered `:root` 无 `rgb(...)`/`#hex` 硬编码（`hsl(var(--...))`/`var(--...)` 引用）
- [ ] 新增语义色（`--surface-header` 等）在 4 个主题变体显式定义或确认继承一致
- [ ] `pnpm refresh:flux` 后宿主 `libs/nop-chaos-flux-0.1.0.tgz` 为最新
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 5 - 文档同步 + 全量验证

Status: planned
Targets: `flux-guide/14-theming.md`、`docs/architecture/theme-compatibility.md`、`docs/design/amis-flux-rendering-engine-integration.md` §8.1、双引擎 e2e

- Item Types: `Fix | Proof`

- [ ] `Fix`：`flux-guide/14-theming.md` 的 token 面表格更新（新增 `--text-*`/`--control-*`/`--space-*` 4px 基数说明；`--table-*`/`--dialog-*` 收敛后的清单）
- [ ] `Fix`：`theme-compatibility.md` 的 Token Layers 章节补充"组件令牌必须引用语义层、禁止硬编码数值"规则
- [ ] `Fix`：宿主 `amis-flux-rendering-engine-integration.md` §8.1 契约表更新（新变量与覆盖位置）
- [ ] `Proof`：宿主 flux e2e 全量（crud-style-parity / crud-index-column / crud-selection-no-refetch / crud-pagination-* / crud-dialog-actions / crud-visual-diagnostic）+ amis e2e 回归
- [ ] `Proof`：上游 flux-renderers-data + ui + i18n + theme-tokens 全量测试 + typecheck

Exit Criteria:

- [ ] 三份文档与 live repo 变量清单一致（抽查 `theme-tokens` 变量名与文档表格）
- [ ] 宿主 flux e2e 全绿、amis e2e 全绿（视觉无回归）
- [ ] 上游全量测试 + typecheck 全绿
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（组件令牌硬编码、宿主 RGB 硬编码）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（`--table-*`/`--dialog-*` 引用语义层）
- [ ] 行为/契约结果已达成：组件令牌数量 35 → ≤ 12；宿主补丁无硬编码；测试锁定新规则
- [ ] 必要 focused verification 已完成（上游/宿主契约测试 + 双引擎 e2e）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline（14-theming / theme-compatibility / §8.1）
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`（宿主 28/28）
- [ ] `pnpm build`（宿主）
- [ ] `pnpm lint`（宿主，已知 pre-existing 失败项除外并注明）
- [ ] `pnpm test`（宿主单测 + 上游 flux-renderers-data/ui/i18n）

## Deferred But Adjudicated

### 形状控件 token 面（分析报告建议 #3）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划只收敛**现有** token 体系（语义层先行）；`input/select/button/checkbox/queryForm/pagination` 的 Tailwind 类消费 token（`--control-radius`/`--crud-query-bg`）是新增 token 面，属独立结果面，且依赖本计划的刻度先落地。
- Successor Required: `yes`
- Successor Path: `2026-08-10-0002-shape-token-surface`（规划中）

### 上游默认视觉对齐宿主（建议 #4）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 44px thead/灰表头/checkbox 居中/按钮 link 化等是"上游默认值"变更，影响上游 playground 与所有消费方；本计划不改变任何默认视觉（纯迁移）。
- Successor Required: `yes`
- Successor Path: `2026-08-10-0003-upstream-defaults-amis-alignment`（规划中）

### 宿主覆盖独立载体（建议 #5）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `flux-spacing.css` 副本与补丁分离是维护性优化；本计划已处理补丁的硬编码问题，物理分离可后续做。
- Successor Required: `no`（可并入后续治理计划）

### 分页器重复设计消除（建议 #6）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: footerToolbar 独立 pagination 的 deprecation 属结构收敛，独立于变量体系；且已在上游文档标注（§2a）。
- Successor Required: `yes`
- Successor Path: 上游 plan（分页三机制收口）

### variant/level AMIS 迁移映射（建议 #7）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: authoring 兼容层（`level` → `variant` 映射）与变量体系无依赖。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 分析报告建议 #5（宿主覆盖独立载体文件）作为治理优化，可并入后续 plan。
- 上游 `--radius` 刻度是否补 6px/4px 级（与 AMIS 7 级对齐）的全局裁定（Phase 3 的 dialog 裁定可先行，全局刻度扩展另行评估）。

## Closure

Status Note: 未完成（draft）。

Closure Audit Evidence:

- Auditor / Agent: （执行完成后由独立子 agent 填写）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- （执行完成后填写；confirmed live defect 不得出现在这里）

## Optional Sections

### Risks And Rollback

- **风险 1：视觉回归** —— 纯取值迁移若消费点遗漏，可能改变外观。缓解：Phase 2/3 均以"视觉不变"为 Exit Criteria，双引擎 e2e 兜底；回滚 = 还原 theme-tokens 与消费点文件（git revert）。
- **风险 2：上游 sync 与宿主补丁错位** —— 上游改名后宿主补丁未同步会失效。缓解：Phase 4 的 refresh:flux 紧跟上游变更；themeContract.test.ts 锁定变量名。
- **风险 3：`--space-*` 4px 基数对齐破坏既有主题变体覆盖** —— 4 个主题变体可能覆盖 `--space-*` 为非常量值。缓解：Phase 1 先核对 4 个变体的 `--space-*` 值，仅当全部落在 4px 基数才实施，否则记为 Decision 并改文档说明。
- **风险 4：`--text-*`/`--control-*` 命名与 Tailwind 冲突** —— Tailwind v4 已有 `--text-*`（font-size 主题键）。缓解：Phase 1 先验证 Tailwind v4 对 `--text-*` 的占用（`@theme` 命名空间），若冲突则改用 `--nop-text-*` 命名（Phase 1 Decision 项已含此裁定）。
- **风险 5：语义色新增导致主题变体未覆盖新语义色** —— `--surface-header` 等新语义色只在 `:root` 定义，4 个主题变体（classic/glass × light/dark）若不覆盖会在深色/glass 主题下表现不一致。缓解：Phase 4 的新增语义色同时在 4 个变体中定义（或文档注明继承 `:root` 默认），Phase 4 Exit Criteria 增加"新语义色在 4 变体核对"项。

## Review History

- **Review 1（结构完整性）**：对照 `00-plan-authoring-and-execution-guide.md` 模板逐节核对 —— Plan Status/Last Reviewed/Source/Related、Purpose、Current Baseline、Goals/Non-Goals、Scope、Execution Plan（Phase + Item Types + Exit Criteria）、Closure Gates、Deferred/Follow-up、Closure 全部就位。
- **Review 2（Baseline 核对）**：计划撰写前实测 live repo —— `:root` 100 变量/35 组件级、`table.css` 消费 15 个 `--table-*`、`dialog.tsx` 消费 10 个、宿主补丁 8 项含 `rgb(247,248,250)` 硬编码、`themeContract.test.ts` 5 项现状，均写入 Current Baseline。
- **Review 3（Scope 边界与视觉一致性）**：发现 Phase 4 的 `--table-header-bg` 语义化若用 `var(--muted)` 近似会改变视觉，与"视觉不变"冲突 → 修正为"新增语义色 `--surface-header` 承载 amis 灰，宿主引用之"，保持逐像素不变。
- **Review 4（命名冲突）**：发现 `--text-*` 与 Tailwind v4 `@theme` font-size 键可能冲突 → Phase 1 Decision 项前置"验证 Tailwind 占用，冲突则用 `--nop-text-*`"。
- **Review 5（测试可观测性）**：上游契约测试断言从"正则/解析检查"细化为"白名单方式"（结构性常量清单外不得含裸数值），避免误伤。
- **Review 6（主题变体覆盖）**：新增风险 5 —— 新语义色（`--surface-header` 等）需在 4 个主题变体核对，Phase 4 补 Exit Criteria 项。
- **Review 7（guide 规则 17：文档归属）**：Phase 1–3 改变 live baseline，但 token 收敛文档（14-theming token 面）跨 Phase 共享一份表格 —— 每个 Phase 显式裁定"文档更新集中在 Phase 5，避免中间态双轨"，满足"文档更新是 Phase 内工作"的裁定要求。
- **Review 8（guide 规则 15/16：分类诚实性）**：已确认 defect（组件令牌硬编码、宿主 RGB 硬编码）均为 `Fix`；Deferred 全部为 `out-of-scope improvement` 且附 Why Not Blocking，无 confirmed defect 混入。
- **Review 9（Closure Gates 可验证性）**：组件令牌数量目标（35 → ≤ 12）与 Phase 2（table ≤ 6）/Phase 3（dialog 收敛）一致；lint gate 注明 pre-existing 失败项例外。
- **Review 10（终审一致性）**：Plan Status: draft、5 个 Phase 均 planned、Closure Status Note: 未完成 —— 文本一致；执行项 28 个（Decision 4 / Fix 15 / Proof 9，无 Follow-up 项，符合"confirmed defect 不得降级"规则），Exit Criteria 24 条全部 repo-observable。

### Outdated Note

无（新计划）。
