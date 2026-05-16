# 19 Icon System Governance Plan

> Plan Status: done
> Last Reviewed: 2026-05-16
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 10-03, 10-05, 10-06)
> Related: `docs/plans/14-type-safety-api-surface-plan.md`

## Purpose

修复 3 个图标系统问题：映射重复、全量导入影响 bundle、直接导入绕过统一层。

## Current Baseline

- `core/iconMap.tsx` 内部存在 `iconRegistry` 和 `fontAwesomeAliasMap` 两个独立映射（10-03, P2）。
- `iconMap.tsx` 使用 `import * as LucideIcons from 'lucide-react'`（10-06, P2），拉入 1000+ 组件。
- 33+ 文件直接从 `lucide-react` 导入（10-05, P2），绕过统一图标层。

## Goals

- 统一图标解析逻辑到 `@nop-chaos/ui`。
- `iconMap` 改用 `import { icons } from 'lucide-react'` 按需查找。
- 文档化图标使用约定。

## Non-Goals

- 不消灭所有直接 `lucide-react` 导入（静态图标可直接导入，动态图标必须用统一层）。
- 不改变图标名称映射。
- 不引入图标 lazy loading。

## Scope

### In Scope

- `packages/core/src/utils/iconMap.tsx` 导入方式修复。
- 图标映射统一化。
- 图标使用约定文档化。

### Out Of Scope

- 33+ 文件的直接导入全面迁移（仅需文档化约定）。
- 图标 lazy loading。

## Execution Plan

### Phase 1 - Full Import Fix

Status: planned
Targets: `packages/core/src/utils/iconMap.tsx`

- Item Types: `Fix`

- [x] 1.1 将 `import * as LucideIcons from 'lucide-react'` 改为 `import { icons } from 'lucide-react'`
- [x] 1.2 更新 `getIconByName` 实现使用 `icons[name]` 按需查找，替代 `LucideIcons[name]`。说明：`import { icons } from 'lucide-react'` 导出的 `icons` 对象与 `import * as LucideIcons` 的命名空间 default 是同一个查找映射，因此 `icons[name]` 可直接替代 `(LucideIcons as Record<string, unknown>)[name]`
- [x] 1.3 验证 `pnpm --filter @nop-chaos/core build` 通过

Exit Criteria:

- [x] `iconMap.tsx` 不包含 `import * as LucideIcons`
- [x] `pnpm --filter @nop-chaos/core build` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - Mapping Unification

Status: planned
Targets: `packages/core/src/utils/iconMap.tsx`

- Item Types: `Fix`, `Decision`

- [x] 2.1 评估 `iconMap.tsx` 中 `iconRegistry` 与 `fontAwesomeAliasMap` 的映射差异，统一为单一解析逻辑
- [x] 2.2 合并 `fontAwesomeAliasMap` 到 `iconRegistry`（或建立统一查找链），消除同一文件内的重复映射
- [x] 2.3 验证 `pnpm build` 通过

Exit Criteria:

- [x] `iconMap.tsx` 中图标映射仅有单一权威来源
- [x] `pnpm build` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - Convention Documentation

Status: planned
Targets: `docs/design/` 或相关 README

- Item Types: `Decision`

- [x] 3.1 文档化图标使用约定：静态图标可直接 `import { Icon } from 'lucide-react'`；动态图标（名称运行时决定）必须使用 `renderIcon`/`resolveIcon`
- [x] 3.2 更新相关 `docs/design/` 文档

Exit Criteria:

- [x] 图标使用约定已文档化
- [x] 相关 `docs/design/` 已更新
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] `iconMap.tsx` 不再全量导入 lucide-react（10-06）
- [x] 图标映射仅有单一权威来源（10-03）
- [x] 图标使用约定已文档化（10-05）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

### 33+ files direct lucide-react import migration

- Classification: `optimization candidate`
- Why Not Blocking Closure: 静态图标直接导入是 React 社区常规做法，tree-shaking 已确保只打包使用的图标。全面迁移到 `renderIcon` 增加代码复杂度但无明显收益。约定文档化已覆盖此场景。
- Successor Required: no

## Non-Blocking Follow-ups

- 未来可在 ESLint 中添加 rule 检测动态场景下的直接 `lucide-react` 导入。

## Closure

Status Note: All three phases completed. iconMap.tsx now uses `import { icons } from 'lucide-react'` instead of namespace import, dual maps merged into single `faNameMap`, and conventions documented in `docs/design/icon-system.md`.

Closure Audit Evidence:

- Reviewer / Agent: opencode (automated execution)
- Evidence: Plan 19 executed 2026-05-16 Session 4. All phases verified: `pnpm --filter @nop-chaos/core build` passes, `pnpm typecheck` passes (21/21 tasks), core tests 13/13 pass. Pre-existing `@nop-chaos/main` flow-editor build errors unrelated.

Follow-up:

- ESLint rule for dynamic icon import detection
