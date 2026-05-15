# 06 Accessibility And I18n Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Completed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-review/round-01-a11y.md`, `docs/analysis/2026-05-15-open-ended-review/round-01-i18n.md`, `docs/analysis/2026-05-15-open-ended-review/round-04-cross-cutting.md`
> Related: `docs/plans/05-deep-audit-fix-plan.md`

## Purpose

将 open-ended 审查中最紧急、最集中、且尚未被 `05-deep-audit-fix-plan.md` 覆盖的用户面向合同缺陷收口到单一基线：主应用核心交互对键盘/屏幕阅读器可用，页面与关键状态具备最小可访问语义，host 与 flux-lib 的 i18n 不再向用户泄漏原始 key 或固定英文 fallback。

## Current Baseline

- `docs/analysis/2026-05-15-open-ended-review/round-01-a11y.md` 确认了 7 个高严重度 a11y live defects，集中在 shell 导航、tab 管理、flow editor 节点工具栏、页面标题与关键图标按钮。
- `docs/analysis/2026-05-15-open-ended-review/round-01-i18n.md` 确认了 host locale 缺失键、`PluginSlot`/`RouteRenderer` 原始 key 泄漏，以及 flux-lib `setI18nGetter` 未接线导致 primitives 永远显示英文。
- `docs/analysis/2026-05-15-open-ended-review/round-04-cross-cutting.md` 进一步确认 `main.tsx` bootstrap fallback 仍是硬编码英文，属于本计划 i18n 用户面向 copy contract 的一部分。
- `docs/plans/05-deep-audit-fix-plan.md` 已认领 bootstrap fallback 的异常处理与 fallback 渲染存在性；本计划只认领该 fallback 文案的本地化与用户可读 contract，不重复认领其错误处理机制。
- 当前 repo 未启用系统性 a11y lint guardrail；但本计划只负责最小可行 guardrail，不扩展到完整 design-system 治理。

## Goals

- 修复主应用核心导航与编辑交互中的高价值 a11y defect，使它们可通过键盘完成关键路径。
- 为主应用主要页面提供用户可读的 document title，并补充 shell 级快速进入主内容路径。
- 修复 host / core / flux-lib 之间的 i18n contract gap，消除原始翻译 key 泄漏与固定英文 fallback。
- 为本计划认领的行为补充 focused tests 和最小静态 guardrail，降低回归概率。

## Non-Goals

- 不处理 demo/reference 质量问题；`examples/plugin-demo` 和 `examples/extension-demo` 需由独立 successor plan 认领。
- 不处理网络弹性、表单体系、CSS 技术债、DX/CI、storage 安全边界等 open-ended 审查中的其他主题。
- 不重写 flux-lib 组件架构，也不在本计划中做大范围 design-system 重构。
- 不处理 `05-deep-audit-fix-plan.md` 已认领的非 a11y/i18n 事项。

## Scope

### In Scope

- `packages/core/src/components/TabsBar.tsx`
- `packages/core/src/components/Sidebar.tsx`
- `packages/core/src/components/MainLayout.tsx`
- `packages/core/src/components/TopBar.tsx`
- `packages/core/src/components/PluginSlot.tsx`
- `apps/main/src/pages/flow-editor/[id]/components/FlowNodeCard.tsx`
- `apps/main/src/pages/flow-editor/[id]/components/FlowEditorToolbar.tsx`
- `apps/main/src/pages/flow-editor/[id]/components/FlowNodePalette.tsx`
- `apps/main/src/pages/flow-editor/[id]/index.tsx`
- `apps/main/src/pages/ai-workbench/components/SessionSidebar.tsx`
- `apps/main/src/pages/ai-workbench/index.tsx`
- `apps/main/src/pages/dashboard/index.tsx`
- `apps/main/src/components/layout/NotificationButton.tsx`
- `apps/main/src/components/layout/ThemeSwitcher.tsx`
- `apps/main/src/pages/data-management/master-detail/index.tsx`
- `apps/main/src/pages/dashboard/index.tsx`
- `apps/main/src/pages/flow-editor/index.tsx`
- `apps/main/src/pages/flow-editor/[id]/index.tsx`
- `apps/main/src/pages/ai-workbench/index.tsx`
- `apps/main/src/pages/plugins/management/index.tsx`
- `apps/main/src/pages/settings/layout/index.tsx`
- `apps/main/src/pages/settings/language/index.tsx`
- `apps/main/src/pages/data-management/master-detail/index.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`
- `apps/main/src/router/RouteRenderer.tsx`
- `apps/main/src/flux/FluxRouteRenderer.tsx`
- `apps/main/src/main.tsx`
- `apps/main/src/config/i18n.ts`
- `apps/main/public/locales/**`
- `flux-lib/ui/src/lib/i18n.ts`
- `eslint.config.js`

### Out Of Scope

- `docs/analysis/2026-05-15-open-ended-review/round-02-demo-quality.md` 中全部 demo/reference surface 问题
- `round-02-network-resilience.md` 的 timeout / offline / loading-error-state 治理
- `round-02-forms.md` 的 form-library / `forwardRef` / Field 体系治理
- `round-02-css-animation.md` 中除用户面向固定英文/缺失 key 的问题外的动画、字体、任意值和样式技术债
- `round-03-eslint-stores-dx.md` 中 HMR flag、CI 缺失、Turborepo lint 拓扑等 DX 问题
- `round-04-cross-cutting.md` 中 storage 三路不一致、`new Function()` 安全边界等跨领域议题

## Execution Plan

### Phase 1 - Shell 与导航可访问性

Status: completed
Targets: `packages/core/src/components/TabsBar.tsx` `packages/core/src/components/Sidebar.tsx` `packages/core/src/components/MainLayout.tsx` `packages/core/src/components/TopBar.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: 为 `TabsBar` 上下文菜单补充键盘打开路径、Escape 关闭和最小焦点管理，确保无需鼠标即可触发 tab 管理动作。
- [x] Fix: 为 `Sidebar` 菜单组补充 `aria-expanded`，并将导航容器调整为正确的 landmark 语义。
- [x] Fix: 为 `MainLayout` 的 mobile sidebar overlay 补充 Escape 关闭路径。
- [x] Fix: 为 `TopBar` 汉堡菜单、`TabsBar` 刷新按钮与更多按钮补充可访问名称，并为面包屑当前项补充 `aria-current`。
- [x] Proof: 为 `TabsBar` / `Sidebar` / `MainLayout` 的键盘与 `aria-*` 合同补充 focused tests。

Exit Criteria:

- [x] `TabsBar` 的上下文菜单可通过键盘打开与关闭，且关键操作可达。
- [x] `Sidebar` / `MainLayout` 暴露正确导航 landmark 与展开状态。
- [x] `TopBar` / `TabsBar` 的 in-scope icon-only 控件均有可访问名称。
- [x] 上述行为有 focused tests 覆盖。
- [x] `docs/design/layout-settings.md` 或相关 shell 设计文档已同步记录导航 landmark / tab 交互的最新可访问性行为
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - 页面与功能控件可访问性

Status: completed
Targets: `apps/main/src/pages/flow-editor/[id]/components/FlowNodeCard.tsx` `apps/main/src/pages/flow-editor/[id]/components/FlowEditorToolbar.tsx` `apps/main/src/pages/flow-editor/[id]/components/FlowNodePalette.tsx` `apps/main/src/pages/flow-editor/[id]/index.tsx` `packages/core/src/components/PluginSlot.tsx` `apps/main/src/pages/ai-workbench/components/SessionSidebar.tsx` `apps/main/src/pages/ai-workbench/index.tsx` `apps/main/src/pages/dashboard/index.tsx` `apps/main/src/components/layout/NotificationButton.tsx` `apps/main/src/components/layout/ThemeSwitcher.tsx` `apps/main/src/pages/data-management/master-detail/index.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: 让 `FlowNodeCard` 工具栏在键盘聚焦时可见且可操作，不再依赖纯鼠标 hover。
- [x] Fix: 为 `FlowNodeCard` 的编辑、复制、删除图标按钮补充可访问名称。
- [x] Fix: 为 `FlowEditorToolbar` grid switch、返回按钮，以及 `FlowNodePalette` 添加按钮补充可访问名称/关联标签。
- [x] Fix: 为 flow-editor 编辑页补充页面级 `<h1>` 或等价页面标题语义。
- [x] Fix: 为 `PluginSlot` 的加载与错误状态补充 `aria-busy` / `role="status"` / `aria-live` 等最小可播报合同。
- [x] Fix: 将 `SessionSidebar` 的会话条目改为不会产生嵌套 button 语义冲突的结构，并暴露当前项状态。
- [x] Fix: 让 AI Workbench resize handle 具备实际键盘操作路径，而不是仅补 `aria-*` 语义。
- [x] Fix: 为 `NotificationButton`、`ThemeSwitcher`、Dashboard 系列切换、表格排序控件补充正确的可访问名称和状态语义。
- [x] Proof: 为至少一条 flow-editor 路径、至少一条 AI workbench 路径、至少一条 dashboard/data-management 路径补充 focused verification。

Exit Criteria:

- [x] `FlowNodeCard`、AI Workbench resize handle 的确认 live defect 已按用户行为层闭环，而非只补语义属性。
- [x] `FlowNodeCard` 图标按钮与其他 in-scope 状态型控件正确暴露可访问名称、`aria-pressed`、`aria-sort` 或等价合同。
- [x] flow-editor 编辑页与 `PluginSlot` 的 in-scope 低严重度 a11y defect 已一并收敛。
- [x] `SessionSidebar` 不再产生嵌套 button 语义冲突。
- [x] 上述行为有 focused verification。
- [x] `docs/design/flow-editor.md` 与相关页面设计文档已同步记录 in-scope 控件的最新可访问性行为；如无需更新，需在执行时明确裁定原因
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - 页面标题与全局最小 a11y guardrail

Status: completed
Targets: `apps/main/src/pages/dashboard/index.tsx` `apps/main/src/pages/flow-editor/index.tsx` `apps/main/src/pages/flow-editor/[id]/index.tsx` `apps/main/src/pages/ai-workbench/index.tsx` `apps/main/src/pages/plugins/management/index.tsx` `apps/main/src/pages/settings/layout/index.tsx` `apps/main/src/pages/settings/language/index.tsx` `apps/main/src/pages/data-management/master-detail/index.tsx` `apps/main/src/pages/data-management/master-detail/[id]/index.tsx` `packages/core/src/components/MainLayout.tsx` `eslint.config.js`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 引入统一的页面标题设置方式，覆盖本计划 in-scope 的主应用用户可导航页面清单。
- [x] Fix: 补充 shell 级 skip-to-content 或等价的主内容快速进入路径。
- [x] Decision: 为 repo 启用最小可行的 `jsx-a11y` 规则集，仅覆盖本计划已确认的 live defect 类型。
- [x] Proof: 为 in-scope 页面标题清单补充 focused verification，并验证 shell 的快速进入主内容路径。

Exit Criteria:

- [x] 本计划 in-scope 页面标题清单均会设置用户可读 document title。
- [x] shell 提供键盘可用的主内容快速进入路径。
- [x] `pnpm lint` 能静态阻止至少一类本计划已确认的 a11y 回归。
- [x] `docs/design/layout-settings.md` 或相关 shell 设计文档已同步记录页面标题与 skip-to-content 行为；如新增 lint 规则改变开发 baseline，相关 owner doc 也已同步
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - Host / Core / Flux-Lib i18n 合同闭环

Status: completed
Targets: `apps/main/src/main.tsx` `apps/main/src/config/i18n.ts` `apps/main/src/router/RouteRenderer.tsx` `apps/main/src/flux/FluxRouteRenderer.tsx` `packages/core/src/components/PluginSlot.tsx` `apps/main/src/pages/flow-editor/[id]/components/FlowEditorToolbar.tsx` `apps/main/src/pages/flow-editor/index.tsx` `apps/main/src/pages/flow-editor/[id]/index.tsx` `apps/main/src/pages/data-management/master-detail/index.tsx` `apps/main/public/locales/**` `flux-lib/ui/src/lib/i18n.ts` `docs/design/plugin-system.md` `docs/references/build-guide.md`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 为主应用 locale 文件补齐 `core.plugin.*`、`route.*` 等已被 live code 引用的缺失键。
- [x] Fix: 清除 `PluginSlot`、`RouteRenderer`、`FluxRouteRenderer`、`main.tsx` bootstrap fallback、`FlowEditorToolbar` 的 `"JSON"` 标签等 in-scope 固定英文 fallback。
- [x] Fix: 在主应用启动路径中将 flux-lib 的 `setI18nGetter` 接入当前 i18n 实例，消除 UI primitives 永远显示英文的问题。
- [x] Fix: 为 in-scope 动态状态键显示路径补充 fallback 合同，覆盖 `master-detail/index.tsx` 与 flow-editor 页面中已确认的状态 / key 泄漏风险。
- [x] Decision: 明确当前 host 对 core / flux-lib 翻译键的承载方式，并将该承载方式记录到 `docs/design/plugin-system.md` 与 `docs/references/build-guide.md` 的相应章节，保证新增 key 有明确归属。
- [x] Proof: 为缺失 key 修复、flux-lib i18n bridge、关键 fallback 本地化与 in-scope 动态状态键 fallback 补充 focused tests。

Exit Criteria:

- [x] `PluginSlot` 和 `RouteRenderer` 不再向用户泄漏原始翻译 key。
- [x] `FluxRouteRenderer` 与 `main.tsx` bootstrap fallback 不再使用固定英文用户文案。
- [x] `FlowEditorToolbar` 的 `"JSON"` 标签与 in-scope 动态状态键路径（`master-detail` + flow-editor）不再向用户泄漏固定英文或原始 key。
- [x] flux-lib primitives 在切换语言后使用 host i18n 文案，而非内置英文 fallback。
- [x] in-scope locale 文件与 live code 引用一致。
- [x] `docs/design/plugin-system.md` 与 `docs/references/build-guide.md` 已记录 host / core / flux-lib 的翻译键承载方式。
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 所有 in-scope confirmed a11y live defects 已修复或被明确移出当前 scope
- [x] 所有 in-scope i18n contract gaps 已收敛，用户不再看到原始 key 或固定英文 fallback
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Demo / Reference Surface 修复

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: demo 质量问题是另一块独立 owner surface；若并入本计划，会把用户面向 app contract 与参考实现治理耦合到一个 closure 中。
- Successor Required: `yes`
- Successor Path: `docs/plans/07-demo-reference-surface-plan.md`（待创建）

### 网络弹性与离线 UX

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 这些 defect 属于 HTTP client、React Query 与页面数据状态层治理，不影响本计划所认领的 a11y/i18n 合同是否成立。
- Successor Required: `yes`
- Successor Path: `docs/plans/08-network-resilience-plan.md`（待创建）

### 表单体系整合

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `forwardRef`、Field、表单库引入是横向治理，不阻塞本计划的 a11y/i18n 合同收口。
- Successor Required: `yes`
- Successor Path: `docs/plans/09-form-foundation-plan.md`（待创建）

## Non-Blocking Follow-ups

- 评估更完整的 `jsx-a11y` 规则集，而不仅是本计划内的最小可行规则
- 为 flux-lib 建立更清晰的 package-level locale contract 文档

## Closure

Status Note: shell a11y、页面标题、skip link、关键交互语义、host/core/flux-lib i18n 合同与 focused proof 已落地，并经本轮独立 closure audit 与全量验证复核，无剩余 in-scope live defect，可关闭。

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit in current session
- Evidence: 复核 `MainLayout`、`TabsBar`、`TopBar`、`Sidebar`、`PluginSlot`、`FlowNodeCard`、`FlowEditorToolbar`、`FlowNodePalette`、`SessionSidebar`、`apps/main/src/main.tsx`、`apps/main/src/config/i18n/index.ts`、locale 资源与 owner docs；结合 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`，确认本计划范围内的最后一个 late-session lint 回归已在 `apps/main/src/flux/FluxRouteRenderer.tsx` 修复并复验通过。

Follow-up:

- 评估更完整的 `jsx-a11y` 规则集，而不仅是本计划内的最小可行规则。
- 为 flux-lib 建立更清晰的 package-level locale contract 文档。
