# 09 Form Foundation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Completed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-review/round-02-forms.md`
> Related: `docs/plans/06-accessibility-and-i18n-contract-plan.md`

## Purpose

将 open-ended 审查中确认的表单基础缺陷收口到单一 owner baseline：基础输入组件具备未来可扩展的 ref/field 能力，关键业务表单不再存在 number/enum 边界错误或不一致的提交语义，表单错误展示具备最小一致性与可访问合同。

## Current Baseline

- `flux-lib/ui/src/components/ui/input.tsx` 与 `textarea.tsx` 没有 `forwardRef`。
- `field.tsx` 体系存在但应用层几乎完全不使用，导致 `aria-invalid` / `role="alert"` 能力被浪费。
- login、layout settings、master-detail、logistics 等表单存在 `name`/`autoComplete` 缺失、number 转换为 `0/NaN`、枚举字段使用文本输入等问题。
- `SessionSidebar` 使用不一致的 `defaultValue` inline rename 模式。
- `master-detail/[id]` 的 detailQuery 数据变化会重置用户草稿。

## Goals

- 让 Input / Textarea 具备基础 ref 能力。
- 修复已确认的 number/enum/form-semantic live defects。
- 为关键表单错误展示建立最小一致性与可访问合同。
- 为 master-detail 编辑态建立不丢失用户草稿的最小保护。

## Non-Goals

- 不在本计划中引入完整表单库。
- 不强制全仓迁移到 `Field` 抽象，只收口关键路径与基础合同。
- 不处理与表单无关的网络、i18n、demo 或样式问题。

## Scope

### In Scope

- `flux-lib/ui/src/components/ui/input.tsx`
- `flux-lib/ui/src/components/ui/textarea.tsx`
- `flux-lib/ui/src/components/ui/field.tsx`
- `apps/main/src/pages/auth/login/index.tsx`
- `apps/main/src/pages/settings/layout/index.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/components/ItemsSection.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/components/LogisticsDrawer.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`
- `apps/main/src/pages/ai-workbench/components/SessionSidebar.tsx`
- `apps/main/src/pages/plugins/management/index.tsx`
- `docs/design/ai-workbench.md`
- `docs/design/master-detail.md`
- `docs/design/layout-settings.md`
- `docs/design/plugin-system.md`

### Out Of Scope

- 全仓表单库迁移
- 输入组件的完整 design-system API 重构

## Execution Plan

### Phase 1 - 基础输入组件合同

Status: completed
Targets: `flux-lib/ui/src/components/ui/input.tsx` `flux-lib/ui/src/components/ui/textarea.tsx` `flux-lib/ui/src/components/ui/field.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 为 `Input` 与 `Textarea` 添加 `forwardRef`，建立基础 DOM/ref 合同。
- [x] Decision: 明确 `Field` 体系在当前 repo 中的最小使用边界，并将其落到关键错误展示路径而非继续完全闲置。
- [x] Proof: 为 ref 透传和关键错误展示合同补 focused tests。

Exit Criteria:

- [x] `Input` / `Textarea` 可被外部 ref 获取。
- [x] `Field` 体系不再完全闲置，至少一条关键错误展示路径开始使用或等价吸收其合同。
- [x] focused tests 覆盖 ref 与关键错误展示行为。
- [x] `docs/design/master-detail.md` 如涉及表单错误展示合同，已同步更新；否则明确 `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - 登录与设置表单语义修复

Status: completed
Targets: `apps/main/src/pages/auth/login/index.tsx` `apps/main/src/pages/settings/layout/index.tsx` `docs/design/layout-settings.md`

- Item Types: `Fix | Proof`

- [x] Fix: 为 login 表单补齐 `name`、`autoComplete`、必要的 required/错误关联语义。
- [x] Fix: 修复 layout settings number input 清空即写入 `0` 的边界问题。
- [x] Fix: 为 login 保持明确 `<form>` 语义；为 layout settings 明确裁定 immediate-apply 配置合同，并使代码与文档不再暗示存在独立提交阶段。
- [x] Proof: 为 login 表单语义与 layout settings 数字边界补 focused tests。

Exit Criteria:

- [x] login 表单具备基本浏览器自动填充与语义合同。
- [x] layout settings 数字输入不再因空值导致侧边栏宽度崩溃到 `0`。
- [x] login 的表单级提交语义成立，layout settings 的 immediate-apply 合同已明确并实现一致。
- [x] focused tests 覆盖登录语义与数字边界。
- [x] `docs/design/layout-settings.md` 已同步当前输入边界行为。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Master-detail 编辑态与枚举/数值边界

Status: completed
Targets: `apps/main/src/pages/data-management/master-detail/[id]/components/ItemsSection.tsx` `apps/main/src/pages/data-management/master-detail/[id]/components/LogisticsDrawer.tsx` `apps/main/src/pages/data-management/master-detail/[id]/index.tsx` `docs/design/master-detail.md`

- Item Types: `Fix | Proof`

- [x] Fix: 修复 `ItemsSection` 中 `Number()` 产生 `NaN` 的边界问题。
- [x] Fix: 将 `shippingStatus` 从文本输入改为受限枚举选择，移除不安全类型断言路径。
- [x] Fix: 为 master-detail 编辑页建立最小草稿保护，避免 query 刷新直接覆盖用户未保存编辑。
- [x] Fix: 为 master-detail 编辑页恢复明确 `<form>` 语义，避免当前独立输入缺乏表单级提交合同。
- [x] Proof: 为数值边界、枚举字段、草稿保护补 focused tests。

Exit Criteria:

- [x] master-detail 的数值输入不会将 `NaN` 写回草稿状态。
- [x] 运输状态字段不再允许任意字符串绕过类型系统。
- [x] detail query 刷新不会无声覆盖用户进行中的编辑。
- [x] master-detail 编辑页具备明确 form-level submit 语义。
- [x] `docs/design/master-detail.md` 已同步记录相关表单合同。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - Inline rename 与表单一致性

Status: completed
Targets: `apps/main/src/pages/ai-workbench/components/SessionSidebar.tsx` `apps/main/src/pages/plugins/management/index.tsx` `docs/design/ai-workbench.md` `docs/design/plugin-system.md`

- Item Types: `Fix | Proof`

- [x] Fix: 统一 `SessionSidebar` inline rename 的受控/非受控语义，避免 DOM 复用带来的旧值残留。
- [x] Fix: 为 plugin-management 配置对话框明确 immediate-apply 或 explicit-submit 合同，并使当前实现与该合同一致。
- [x] Proof: 为 rename 输入切换路径补 focused verification。

Exit Criteria:

- [x] SessionSidebar inline rename 不再依赖脆弱的默认值复用行为。
- [x] plugin-management 配置对话框的提交合同已明确且实现一致。
- [x] focused verification 覆盖重命名切换路径。
- [x] `docs/design/ai-workbench.md` 已同步 SessionSidebar rename 合同
- [x] `docs/design/plugin-system.md` 已同步 plugin-management 配置提交合同
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复或被明确移出当前 scope
- [x] 基础输入组件具备 ref/错误展示最小合同
- [x] 关键表单不再存在 0/NaN/任意枚举字符串等边界 defect
- [x] master-detail 编辑态具备最小草稿保护
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: `forwardRef`、Field 最小落地、login/layout/master-detail/plugin-management/AI workbench 的 in-scope 表单边界问题与 focused proof 已完成，并在独立 closure audit 与全量验证下确认无剩余 blocker，可关闭。

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit in current session
- Evidence: 复核 `flux-lib/ui/src/components/ui/input.tsx`、`textarea.tsx`、`apps/main/src/pages/auth/login/index.tsx`、`apps/main/src/pages/settings/layout/index.tsx`、`apps/main/src/pages/data-management/master-detail/[id]/components/ItemsSection.tsx`、`LogisticsDrawer.tsx`、`[id]/index.tsx`、`apps/main/src/pages/ai-workbench/components/SessionSidebar.tsx`、`apps/main/src/pages/plugins/management/index.tsx` 与相关 owner docs；结合 focused tests、`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build` 确认合同一致。

Follow-up:

- 无。
