# 12 Theme Token Surface Migration Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-16
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (finding 09-02), independent hardcoded-color inventory
> Related: `docs/plans/10-style-and-animation-governance-plan.md`

## Purpose

将 23 个文件中 ~110 处硬编码的 `bg-white/XX` + `dark:bg-slate-{900,950}/XX` 半透明表面颜色迁移为 CSS 变量驱动的 theme token，使所有主题（classic / glass / harbor）切换时表面颜色能自动跟随变化。

> **文件计数**：26 个文件经审计包含硬编码色，其中 3 个仅含中性 overlay hover（adjudicated，不修改），23 个需要代码变更（21 个在 `apps/main/src`，2 个在 `packages/core`），加上 2 个需要新增 token 的基础设施文件（`theme-tokens/styles.css` 和 `tailwind-preset/index.ts`）。

## Current Baseline

- `packages/theme-tokens/src/styles.css` 已为 4 种主题×模式组合定义了 `--card-surface`、`--border-surface`、`--app-topbar-bg`、`--app-sidebar-bg`、`--app-tabs-bg` 等语义化 token。
- `apps/main/src/styles/index.css` 已有 `.theme-card` 工具类，使用 `var(--card-surface)` + `var(--border-surface)` + `var(--glass-blur)`，但仅用于少数组件。
- 23 个文件中存在 ~110 处 `bg-white/{opacity}` + `dark:bg-slate-{900,950}/{opacity}`，完全绕过 CSS 变量系统。
- 其中有 2 处使用 `dark:bg-slate-950/`（比 slate-900 更深），分别位于 `ai-workbench/index.tsx:323` 和 `FlowNodePalette.tsx:48`。
- 不存在 harbor 主题 token（本计划不负责添加 harbor 主题，但迁移后 harbor 只需在 CSS 中新增变量值即可）。
- `packages/tailwind-preset/src/index.ts` 未暴露任何 surface 相关的语义化 backgroundColor token。

### Hardcoded Color Inventory Summary

| Opacity Level | Light `bg-white/` Count | Dark (slate-900 + slate-950) Count | Semantic Role |
|:---:|:---:|:---:|:---|
| /80 | 1 | — | Active session highlight |
| /70 | 1 | — | Palette node item (focused) |
| /55 | 10 | — | Toolbar, card, select trigger, table |
| /50 | 7 | — | Toolbar, select, conversation input |
| /45 | 9 | 1 | Card, section, header bar |
| /40 | 19 | 4 | Card, section, login form, error panel |
| /35 | 4 | 28 (含 2 处 slate-950) | Panel, placeholder, container |
| /30 | 1 | 6 | Nested card, context item |
| /25 | 4 | 7 | Grid container, placeholder, inspector |
| /20 | — | 4 | Dashed placeholder, empty context |
| Other | 3 | 2 | Code block, overlay, hover states |
| **合计** | **~59** | **~52** | |

> **计数约定**："N 处"指 N 个 `bg-white/` 类名（light）或 N 个 `dark:bg-slate-{shade}/` 类名（dark）。一个 JSX 元素上的 `bg-white/55 dark:bg-slate-900/35` 算 2 处类名替换、1 个元素迁移点。

## Goals

- 所有 23 个文件中的 `bg-white/XX` + `dark:bg-slate-{900,950}/XX` 替换为 theme-token 驱动的 Tailwind class。
- Surface hover 变体（`hover:bg-white/55 dark:hover:bg-slate-900/50` 等）同步替换，因为它们是 surface token 的 hover 态，不是中性 overlay。
- 在 `packages/tailwind-preset/src/index.ts` 中注册语义化 `backgroundColor` token，覆盖各 opacity 层级。
- 在 `packages/theme-tokens/src/styles.css` 中补齐缺失的 surface token（不同 opacity 层级 + light/dark 双模式值）。
- 保持所有主题（classic / glass）在迁移后视觉不变。

## Non-Goals

- 不添加 harbor 主题（那是另一个计划的 scope）。
- 不重构 `.theme-card` 工具类本身（它已工作正常）。
- 不改变组件结构或交互逻辑。
- 不处理中性 overlay hover 微交互（`bg-black/5`、`dark:hover:bg-white/10` 等使用黑/白中性低透明度的 hover 反馈）。注意：surface hover 变体如 `hover:bg-white/55 dark:hover:bg-slate-900/50` **属于 scope**，因为它们是 surface 颜色的 hover 态而非中性 overlay。

## Scope

### In Scope

- 23 个源码文件中的 `bg-white/XX` + `dark:bg-slate-{900,950}/XX` 替换（含 surface hover 变体）。
- `packages/tailwind-preset/src/index.ts` 新增语义化 backgroundColor token。
- `packages/theme-tokens/src/styles.css` 新增所需的 CSS 变量（light + dark 双模式值）。
- 视觉回归验证（typecheck + build 通过，手动抽查 glass / classic 主题）。

### Out Of Scope

- `apps/main/public/plugins/plugin-demo.system.js`（构建产物，源码修改后自动同步）。
- Harbor 主题定义。
- 非 surface 用途的硬编码色（code block `bg-slate-950/90`、blob 装饰色）。
- 中性 overlay hover（`bg-black/5`、`dark:hover:bg-white/10`）。
- `.theme-blob` 装饰性色块。

## Design Decision

### 方案选择：多级 CSS 变量 + Tailwind 映射

**选择方案**：在 CSS 中为不同语义用途定义独立变量，在 Tailwind preset 中映射为语义 class。每个 CSS 变量在 light/dark 模式下分别定义不同色值，替换后只需一个 Tailwind class（如 `bg-surface`），无需 `dark:` 前缀。

**拒绝方案 A**：保留 `bg-white/XX`，只在 harbor 主题下用 `!important` 覆盖。理由：违反现有 token 架构，增加维护负担。

**拒绝方案 B**：只定义一个 `--card-surface` 变量，用 Tailwind `bg-[var(--card-surface)]` + opacity modifier 调节。理由：CSS 变量本身已包含 opacity，Tailwind opacity modifier 无法对 `rgba()` 值二次调节透明度。

### 与现有 `--card-surface` 的关系

`--card-surface` 已存在于所有 4 种主题×模式中，值为较高 opacity（如 classic-light: `rgba(255,255,255,0.72)`）。新的 `--surface-primary` 使用较低 opacity（如 `rgba(255,255,255,0.55)`），对应工具栏和列表项等非卡片场景。两者**有意保持独立**：

- `--card-surface`：`.theme-card` 工具类专用，含 hover 升级效果。
- `--surface-primary`：通用表面，用于工具栏、select trigger、表格等不需要 hover 升级的场景。

统一化可在后续计划中评估，当前 plan 不改变 `.theme-card` 行为。

### Opacity 到 Token 的映射规则

| 原始 opacity 范围 | 目标 Token | 理由 |
|:---|:---|:---|
| /55, /50 | `--surface-primary` | 主表面（卡片、工具栏、select trigger） |
| /45, /40, /35 | `--surface-secondary` | 次级表面（section card、登录框、header bar） |
| /30, /25, /20 | `--surface-ghost` | 幽灵表面（占位、虚线容器、inspector） |
| /80, /70 | `--surface-highlight` | 高亮表面（active session、focused palette item） |
| hover 变体 | `--surface-hover` | surface hover 反馈（比 base 更高 opacity） |
| overlay | `--surface-overlay` | 遮罩层（mobile sidebar） |

> **Opacity 粒度取舍**：同一组内的 opacity 差异（如 /55 vs /50、/45 vs /35）被视为非有意的设计不一致，token 会统一到组内最具代表性的值。如果后续设计审查确认某些场景需要更细粒度区分，可在主题 CSS 中按场景拆分。

> **Hover 反馈保留**：surface hover 变体（如 `bg-white/40` → hover → `bg-white/55`）通过独立的 `--surface-hover` token 保留视觉反馈。`hover:bg-surface-hover` 的 opacity 高于 `bg-surface-secondary`，确保用户可感知交互状态变化。注意：`--surface-hover` 与 `--surface-primary` 同为 0.55，因此 `hover:bg-surface-hover` 不应搭配 `bg-surface`（primary）使用，否则无视觉反馈；当前无此组合。

### CSS 变量值规格

Light 模式值基于 `rgba(255, 255, 255, opacity)`，Dark 模式值基于 `rgba(15, 23, 42, opacity)`（slate-900 ≈ `#0f172a`，slate-950 ≈ `#020617`）。`dark:bg-slate-950/` 的 2 处用法在 dark 模式下与 slate-900 足够接近，统一使用 slate-900 基色。

**classic-light** 示例（完整值见 Phase 1 实施）：

```css
--surface-primary: rgba(255, 255, 255, 0.55);
--surface-secondary: rgba(255, 255, 255, 0.40);
--surface-ghost: rgba(255, 255, 255, 0.25);
--surface-highlight: rgba(255, 255, 255, 0.75);
--surface-hover: rgba(255, 255, 255, 0.55);
--surface-overlay: rgba(15, 23, 42, 0.40);
```

**classic-dark** 示例：

```css
--surface-primary: rgba(15, 23, 42, 0.55);
--surface-secondary: rgba(15, 23, 42, 0.40);
--surface-ghost: rgba(15, 23, 42, 0.25);
--surface-highlight: rgba(15, 23, 42, 0.50);
--surface-hover: rgba(15, 23, 42, 0.55);
--surface-overlay: rgba(15, 23, 42, 0.40);
```

> **Dark highlight 透明度**：dark 模式下 highlight 原始值为 `/35` 和 `/50`（0.35–0.50），取 0.50 作为统一值，而非 light 模式的 0.75。Light/dark 透明度不同是有意的：dark 模式基色更深，同等 opacity 下的视觉重量更大。

### Tailwind 映射

```ts
// packages/tailwind-preset/src/index.ts → theme.extend.backgroundColor 新增（当前 preset 无 backgroundColor section，需创建）
backgroundColor: {
  surface: 'var(--surface-primary)',
  'surface-secondary': 'var(--surface-secondary)',
  'surface-ghost': 'var(--surface-ghost)',
  'surface-highlight': 'var(--surface-highlight)',
  'surface-hover': 'var(--surface-hover)',
  'surface-overlay': 'var(--surface-overlay)',
}
```

> `bg-surface` 不与任何现有 Tailwind utility 冲突（已通过 live preset 验证）。

## Execution Plan

### Phase 1 - Token Foundation

Status: planned
Targets: `packages/theme-tokens/src/styles.css`, `packages/tailwind-preset/src/index.ts`

- Item Types: `Decision`, `Proof`

- [ ] 1.1 在 `packages/theme-tokens/src/styles.css` 中为所有 4 种主题×模式组合新增以下 6 个 CSS 变量，light 模式值基于 `rgba(255,255,255,opacity)`，dark 模式值基于 `rgba(15,23,42,opacity)`：
  - `--surface-primary`（light: 0.55, dark: 0.55）
  - `--surface-secondary`（light: 0.40, dark: 0.40）
  - `--surface-ghost`（light: 0.25, dark: 0.25）
  - `--surface-highlight`（light: 0.75, dark: 0.50）
  - `--surface-hover`（light: 0.55, dark: 0.55）
  - `--surface-overlay`（light: 0.40, dark: 0.40）
- [ ] 1.2 在 `packages/tailwind-preset/src/index.ts` 的 `theme.extend` 中新增 `backgroundColor` section（当前不存在），注册 `surface`、`surface-secondary`、`surface-ghost`、`surface-highlight`、`surface-hover`、`surface-overlay`。
- [ ] 1.3 验证：`pnpm --filter @nop-chaos/core build` 通过，Tailwind 能识别新 token。

Exit Criteria:

- [ ] `grep --surface-primary packages/theme-tokens/src/styles.css` 在 4 个主题选择器中各返回 1 行（共 4 行），值与规格一致
- [ ] `grep --surface-hover packages/theme-tokens/src/styles.css` 同上
- [ ] `packages/tailwind-preset/src/index.ts` 的 `backgroundColor` 中包含 6 个新 key
- [ ] `pnpm --filter @nop-chaos/core build` 通过
- [ ] No owner-doc update required（token 注册是内部实现）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - High-Frequency Pattern Migration (data-management)

Status: planned
Targets: `apps/main/src/pages/data-management/**`

- Item Types: `Fix`

- [ ] 2.1 `master-detail/index.tsx`：替换 9 处 `bg-white/XX` + `dark:bg-slate-900/XX`
- [ ] 2.2 `master-detail/[id]/components/SummaryCard.tsx`：替换 5 处
- [ ] 2.3 `master-detail/[id]/components/ItemsSection.tsx`：替换 1 处
- [ ] 2.4 `master-detail/[id]/components/LogisticsSection.tsx`：替换 1 处
- [ ] 2.5 `master-detail/[id]/components/LogisticsDrawer.tsx`：替换 1 处
- [ ] 2.6 `master-detail/[id]/components/AddressesSection.tsx`：替换 1 处
- [ ] 2.7 `master-detail/[id]/components/FilterToolbar.tsx`：替换 3 处

Exit Criteria:

- [ ] data-management 目录下零 `bg-white/` 和零 `dark:bg-slate-900/` 残留（`grep` 验证）
- [ ] `pnpm --filter @nop-chaos/main typecheck` 通过
- [ ] `pnpm --filter @nop-chaos/main build` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - AI Workbench + Flow Editor Migration

Status: planned
Targets: `apps/main/src/pages/ai-workbench/**`, `apps/main/src/pages/flow-editor/**`

- Item Types: `Fix`

- [ ] 3.1 `ai-workbench/index.tsx`：替换 3 处（含 1 处 `dark:bg-slate-950/25` → `--surface-ghost` dark 值）
- [ ] 3.2 `ai-workbench/components/SessionSidebar.tsx`：替换 4 处（3 处 base surface + 1 处 `hover:bg-white/55 dark:hover:bg-slate-900/50` → `hover:bg-surface-hover`）
- [ ] 3.3 `ai-workbench/components/ConversationPanel.tsx`：替换 3 处
- [ ] 3.4 `ai-workbench/components/ContextPanel.tsx`：替换 3 处
- [ ] 3.5 `flow-editor/index.tsx`：替换 4 处
- [ ] 3.6 `flow-editor/[id]/components/FlowNodePalette.tsx`：替换 2 处（含 1 处 `dark:bg-slate-950/35` → `--surface-highlight` dark 值）
- [ ] 3.7 `flow-editor/[id]/components/FlowInspectorPanel.tsx`：替换 3 处

Exit Criteria:

- [ ] ai-workbench 和 flow-editor 目录下零 `bg-white/` 和零 `dark:bg-slate-900/` 残留
- [ ] `pnpm --filter @nop-chaos/main typecheck` 通过
- [ ] `pnpm --filter @nop-chaos/main build` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - Remaining Files + Core Package

Status: planned
Targets: `apps/main/src/pages/dashboard/**`, `apps/main/src/pages/auth/**`, `apps/main/src/pages/plugins/**`, `apps/main/src/pages/settings/**`, `apps/main/src/components/**`, `apps/main/src/router/**`, `apps/main/src/lib/**`, `packages/core/**`

- Item Types: `Fix`, `Decision`

- [ ] 4.1 `dashboard/index.tsx`：替换 2 处
- [ ] 4.2 `auth/login/index.tsx`：替换 1 处
- [ ] 4.3 `plugins/index.tsx`：替换 1 处
- [ ] 4.4 `settings/theme/index.tsx`：替换 1 处
- [ ] 4.5 `components/layout/SidebarUserMenu.tsx`：保留 `bg-black/5` + `dark:bg-white/10`（hover overlay 微交互，不属于 surface 语义，记录为 adjudicated）
- [ ] 4.6 `components/plugin/PluginMountPanel.tsx`：替换 2 处
- [ ] 4.7 `router/RouteRenderer.tsx`：替换 1 处
- [ ] 4.8 `lib/tableRowClassName.ts`：替换 1 处（`hover:bg-white/45 dark:hover:bg-slate-900/45` → `hover:bg-surface-hover`，属于 surface hover 变体）
- [ ] 4.9 `packages/core/src/components/Sidebar.tsx`：保留 `hover:bg-black/5` + `dark:hover:bg-white/10`（中性 overlay hover，不属于 surface 语义，记录为 adjudicated）
- [ ] 4.10 `packages/core/src/components/ErrorBoundary.tsx`：替换 1 处
- [ ] 4.11 `packages/core/src/components/MainLayout.tsx`：`bg-slate-950/40` 替换为 `bg-surface-overlay`（注意：原 slate-950 `rgb(2,6,23)` → 新 slate-900 基色 `rgb(15,23,42)`，40% opacity 下有细微色偏，视觉可接受）
- [ ] 4.12 `ai-workbench/markdown.tsx`：保留 `bg-slate-950/90`（code block 有意使用深色背景，非 surface 语义，记录为 adjudicated）

Exit Criteria:

- [ ] Phase 4 范围内除 adjudicated 项外，零 `bg-white/` 和零 `dark:bg-slate-900/` 残留
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 5 - Validation and Cleanup

Status: planned
Targets: 全仓库

- Item Types: `Proof`

- [ ] 5.1 全仓库 `grep` 确认：除 adjudicated 项外，零 `bg-white/` + `dark:bg-slate-900/` 残留
- [ ] 5.2 手动验证 classic-light、classic-dark、glass-light、glass-dark 四种主题×模式下以下页面视觉无回退：data-management master-detail（含详情页）、AI workbench（含 session 列表 hover）、flow-editor（含 inspector 面板）、dashboard、login、settings/theme
- [ ] 5.3 确认 `apps/main/public/plugins/plugin-demo.system.js` 在 rebuild 后自动同步（如需要则手动 `pnpm build`）

Exit Criteria:

- [ ] 全仓库 grep 确认仅剩 adjudicated 项
- [ ] 四种主题×模式手动抽查通过
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

## Risks And Rollback

| 风险 | 影响 | 缓解 |
|:---|:---|:---|
| CSS 变量 `rgba()` 值与 Tailwind 内置 opacity modifier 的渲染结果有细微色差 | 低 | Phase 5 手动四主题抽查；如有差异可在 CSS 变量中微调 opacity 值 |
| `backdrop-filter: blur()` 与 CSS 变量背景的交互可能与 inline class 不同 | 中 | glass 主题使用 `--glass-blur: blur(12px)`，所有 surface token 通过 `.theme-card` 或手动 `backdrop-blur-*` 应用，Phase 5 验证 |
| `bg-surface` 潜在与未来 Tailwind 原生 utility 冲突 | 低 | Tailwind v4 才可能引入同名 utility；如冲突可 rename 为 `bg-surface-base` |
| MainLayout overlay 色偏（slate-950 → slate-950 基色统一为 slate-900） | 低 | 40% opacity 下色偏极小，Phase 5 抽查确认 |
| 24 个文件批量修改可能引入 typo | 中 | 每阶段 grep 验证零残留 + typecheck + build |

**回滚策略**：整个迁移可通过单个 revert commit 回滚，无数据或配置变更。

## Closure Gates

- [ ] 23 个源码文件中所有 in-scope 硬编码色已替换为 token-driven class
- [ ] 6 个新 CSS 变量已注册到 4 种主题×模式
- [ ] 6 个新 backgroundColor token 已注册到 Tailwind preset（新增 section）
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] 全仓库 grep 确认仅剩 adjudicated 项
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

### Sidebar hover overlay (bg-black/5 + dark:bg-white/10)

- Classification: `watch-only residual`
- Why Not Blocking Closure: hover overlay 微交互（`group-data-[state=open]:bg-black/5`、`dark:hover:bg-white/10`）属于中性交互反馈语义，使用黑白低透明度在任何主题下都合理。与 surface hover 变体（如 `hover:bg-white/55 dark:hover:bg-slate-900/50`）本质不同：后者是 surface 颜色的 hover 态，而前者是中性遮罩。若未来需要主题化 hover 颜色，可在后续计划中引入 `--surface-hover-overlay` token。
- Successor Required: no

### Code block background (bg-slate-950/90)

- Classification: `watch-only residual`
- Why Not Blocking Closure: `markdown.tsx` 中 code block 使用深色背景是有意的设计选择，不属于 glassmorphism 表面层。若未来需要主题化 code block 颜色，可引入 `--code-block-bg` token。
- Successor Required: no

## Non-Blocking Follow-ups

- Harbor 主题可在此计划完成后通过在 `styles.css` 中新增 6 个 `--surface-*` 变量值来轻松接入。
- 未来可考虑将 `.theme-card` 工具类迁移到使用新的 `--surface-*` token，统一 card surface 实现。
- `examples/plugin-demo/` 中的硬编码色在重建后会自动跟进，但如需立即同步可手动 rebuild。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- Harbor 主题 surface token 定义
- `.theme-card` 与 `--surface-*` token 统一化
