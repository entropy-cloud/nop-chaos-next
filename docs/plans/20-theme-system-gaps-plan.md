# 20 Theme System Gaps Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-16
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 09-01, 09-03)
> Related: `docs/plans/12-theme-token-surface-migration-plan.md`, `docs/plans/10-style-and-animation-governance-plan.md`

## Purpose

修复 2 个主题系统问题：`--radius` 硬编码覆盖、system displayMode 不监听 OS 变化。

## Current Baseline

- `apps/main/src/styles/index.css:39` 将 `--radius` 硬编码为 `0.75rem`，覆盖 `theme-tokens` 中 `var(--radius-md)` 的语义定义（09-01, P2）。
- `apps/main/src/utils/themeCss.ts` 的 `displayMode: 'system'` 仅在调用时解析 OS 偏好，无 `matchMedia` change listener（09-03, P2）。

## Goals

- `--radius` 由 theme-tokens 统一定义，应用层不再覆盖。
- `system` 模式下 OS 主题变更自动切换。

## Non-Goals

- 不重构主题切换架构。
- 不添加 CSS 变量主题过渡动画。
- 不处理其他 09 维度问题（09-02 已在 Plan 12 中覆盖）。

## Scope

### In Scope

- `apps/main/src/styles/index.css` 移除 `--radius` 覆盖。
- `apps/main/src/utils/themeCss.ts` 添加 OS 偏好监听。

### Out Of Scope

- 主题架构重构。
- 其他 09 维度问题。

## Execution Plan

### Phase 1 - Radius Override Removal

Status: planned
Targets: `apps/main/src/styles/index.css`

- Item Types: `Fix`

- [ ] 1.1 删除 `index.css:39` 的 `--radius: 0.75rem` 覆盖行
- [ ] 1.2 验证 `--radius` 由 `theme-tokens/src/styles.css:7` 的 `var(--radius-md)` 正确提供（值为 `12px = 0.75rem`，视觉无变化）

Exit Criteria:

- [ ] `index.css` 不包含 `--radius` 赋值
- [ ] `--radius` 仍正确解析为 `0.75rem`（来自 theme-tokens）
- [ ] `pnpm typecheck && pnpm build` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - OS Theme Change Listener

Status: planned
Targets: `apps/main/src/utils/themeCss.ts`, `apps/main/src/App.tsx`（调用 `applyThemeToDocument` 的组件）

- Item Types: `Fix`

- [ ] 2.1 创建 `useSystemDisplayMode` hook：注册 `window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', callback)`，在回调中调用 `applyThemeToDocument` 自动更新 `data-mode` 属性，组件卸载时清理 listener
- [ ] 2.2 在 `App.tsx` 中使用 `useSystemDisplayMode` 替代手动调用 `applyThemeToDocument`
- [ ] 2.3 验证 OS 主题变更时 `data-mode` 自动切换

Exit Criteria:

- [ ] `useSystemDisplayMode` hook 存在于 `apps/main/src/hooks/` 或 `apps/main/src/utils/`
- [ ] `themeCss.ts` 包含 `matchMedia` change listener 逻辑
- [ ] Unit 测试验证 `matchMedia` change 事件触发时 listener 正确响应
- [ ] `pnpm typecheck && pnpm build` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [ ] `--radius` 不再被应用层覆盖（09-01）
- [ ] `system` 模式下 OS 主题变更自动切换（09-03）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

（无）

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- no remaining plan-owned work
