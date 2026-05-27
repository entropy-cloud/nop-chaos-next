# 13 Package Dependency & Exports Hygiene Plan

> Plan Status: done
> Last Reviewed: 2026-05-16
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 01-01, 01-02, 01-03, 01-06, 03-05, 03-08, 10-01)
> Related: `docs/plans/04-workspace-tooling-and-docs-alignment-plan.md`

## Purpose

修复 7 个包依赖声明与导出策略问题，消除 phantom dependency、peerDependency 不一致、以及 exports map 与实际导出内容的偏差。

## Current Baseline

- `amis-react` 缺少 `lucide-react` 依赖声明（01-02, P1），通过 monorepo hoisting 隐式可用。
- `amis-react` 依赖 `@nop-chaos/ui` 但审计规则 f 禁止（01-01, P2）——规则过时，实际架构合理。
- `core` 将 `react` 放在 `dependencies` 而非 `peerDependencies`（01-03, P2），与 `ui` 包策略不一致。
- 6 个包用 src-style exports、3 个用 dist-style exports，无文档说明策略差异（01-06, P2）。
- `ShellRuntimeConfig` 在 `extension-host` 独立定义未关联 shared（03-05, P2）。
- `theme-tokens` index.ts 空导出与 exports map 不一致（03-08, P2）。
- `apps/main` 多余依赖 `@base-ui/react`（10-01, P2）。

## Goals

- 消除所有 phantom dependency 和依赖声明不一致。
- 统一 peerDependency 策略（React 系列包）。
- 文档化 exports 策略差异（src vs dist）。
- 清理多余依赖。

## Non-Goals

- 不重构包之间的实际依赖关系（如 amis-react 对 ui 的合理依赖保留）。
- 不统一 exports 策略本身（src 和 dist 各有场景，只需文档化）。
- 不移动 `ShellRuntimeConfig` 到 shared（当前 extension-host 是独立项目，移动会增加跨项目耦合）。

## Scope

### In Scope

- 7 个 `package.json` 文件的依赖声明修复。
- `packages/theme-tokens/src/index.ts` 添加 CSS-only 说明。
- `packages/extension-host/src/runtime.ts` 添加 shared 类型关联注释。
- exports 策略文档化（在 `docs/design/` 或相关 README 中说明）。

### Out Of Scope

- 包结构重组。
- `ShellRuntimeConfig` 类型迁移（extension-host 是独立项目，见 AGENTS.md Extension Project Boundary）。

## Execution Plan

### Phase 1 - P1 Dependency Fix

Status: done
Targets: `packages/amis-react/package.json`

- Item Types: `Fix`

- [x] 1.1 在 `packages/amis-react/package.json` 的 `peerDependencies` 中添加 `"lucide-react": "^1.7.0"`（版本与 `@nop-chaos/ui` 对齐）

Exit Criteria:

- [x] `packages/amis-react/package.json` 包含 `lucide-react` peerDependency
- [x] `pnpm install` 无错误
- [x] `pnpm typecheck` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - peerDependency Strategy Alignment

Status: done
Targets: `packages/core/package.json`

- Item Types: `Fix`

- [x] 2.1 将 `packages/core/package.json` 中 `dependencies` 的 `"react": "^19.0.0"` 和 `"lucide-react": "^1.7.0"` 移到 `peerDependencies`
- [x] 2.2 验证 `pnpm install && pnpm build` 通过

Exit Criteria:

- [x] `packages/core/package.json` 的 `peerDependencies` 包含 `react` 和 `lucide-react`
- [x] `packages/core/package.json` 的 `dependencies` 不包含 `react`
- [x] `pnpm install && pnpm build` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Phantom Dep Removal + Empty Export Fix

Status: done
Targets: `apps/main/package.json`, `packages/theme-tokens/src/index.ts`

- Item Types: `Fix`

- [x] 3.1 从 `apps/main/package.json` 的 `dependencies` 中移除 `"@base-ui/react"`
- [x] 3.2 在 `packages/theme-tokens/src/index.ts` 中添加注释说明包为 CSS-only，无需 TS 导出；考虑导出 token 名称常量供 JS 消费
- [x] 3.3 验证 `pnpm install && pnpm build && pnpm typecheck` 通过

Exit Criteria:

- [x] `apps/main/package.json` 不包含 `@base-ui/react`
- [x] `packages/theme-tokens/src/index.ts` 不再是空文件
- [x] `pnpm install && pnpm typecheck` 通过（`pnpm build` 的 layer violation 是其他未提交代码的预存问题，非 plan 13 引入）
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - Documentation & Annotations

Status: done
Targets: `docs/design/`, `packages/extension-host/src/runtime.ts`

- Item Types: `Follow-up`

- [x] 4.1 在 `packages/extension-host/src/runtime.ts` 的 `ShellRuntimeConfig` 上方添加注释，说明其与 `@nop-chaos/shared` 类型的关联关系。注：`ShellRuntimeConfig` 是运行时解析的合并形状，有意与 extension 输入类型分离，以适应宿主端动态配置场景
- [x] 4.2 在合适位置（`docs/design/` 或根 README）添加 exports 策略说明：src-style 用于纯 TS 包（shared, core, plugin-bridge 等），dist-style 用于需要 build step 的包（ui, tailwind-preset, theme-tokens）
- [x] 4.3 更新审计规则 f（定义在 `docs/skills/deep-audit-execution-framework.md`），允许 `amis-react` 依赖 `@nop-chaos/ui`

Exit Criteria:

- [x] `packages/extension-host/src/runtime.ts` 包含 ShellRuntimeConfig 关联注释
- [x] exports 策略已文档化（`docs/design/package-exports-spec.md`）
- [x] `pnpm typecheck` 通过
- [x] 相关 `docs/design/` 已更新
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] `amis-react` 的 `lucide-react` peerDependency 已声明（01-02）
- [x] `core` 的 `react` 已移至 peerDependencies（01-03）
- [x] `@base-ui/react` 已从 `apps/main` 移除（10-01）
- [x] `theme-tokens` index.ts 不再空导出（03-08）
- [x] exports 策略已文档化（01-06）
- [x] 审计规则 f 已更新（01-01）
- [x] `ShellRuntimeConfig` 已添加关联注释（03-05）
- [x] `pnpm typecheck && pnpm lint` 通过（`pnpm build` layer violation 是预存问题）
- [x] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

### ShellRuntimeConfig migration to shared

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: extension-host 是独立项目（见 AGENTS.md Extension Project Boundary），将类型迁移到 shared 会增加跨项目耦合。当前注释关联已足够表达设计意图。
- Successor Required: no

## Non-Blocking Follow-ups

- 未来可考虑统一所有包的 exports 策略为 src-style（需要所有包都支持 TS 直接导入）。
- `03-05` 如 extension-host 成为主项目一部分，可重新评估类型迁移。

## Closure

Status Note: All 4 phases completed. pnpm typecheck, lint, install pass. Build layer violation (host-runtime -> index) is a pre-existing issue from other uncommitted changes, verified by confirming the violation exists with plan 13 changes reverted.

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- Exports 策略统一化评估
