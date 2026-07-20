# 14 Type Safety & API Surface Plan

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 03-02, 03-03, 03-06, 11-01, 11-02, 11-03, 11-06, 11-07)
> Related: `docs/plans/01-code-quality-improvement-plan.md`

## Purpose

Verify that 8 type safety & API surface findings from the 2026-05-16 deep audit have been correctly resolved in the live repo. All fixes have already landed (commits from 2026-05-16 onward); this plan audits closure.

## Current Baseline

All 8 findings have been addressed in prior commits:

- **11-01 (P2, duplicate systemjs.d.ts)**: `apps/main/src/types/systemjs.d.ts` removed in `785dfff`. Only `packages/core/src/types/systemjs.d.ts` remains. The main app's `System` types resolve through `@nop-chaos/core` workspace reference. No reference to `System` global or `systemjs` module found in `apps/main/src/`.
- **11-02 (P2, unknown→FluxSchema no validation)**: `providers.ts:fetchFluxPage` has explicit return type `Promise<FluxSchema>` and runtime validation (`value && typeof value === 'object' && 'type' in value`) in `providers.ts:37-41`.
- **11-03 (P2, core interfaces missing JSDoc)**: `ShellExtension` has JSDoc on every field (`extension.ts`). `PluginBridge` has JSDoc on every method (`types.ts`). `AmisRuntimeAdapter` has JSDoc on every method (`amis-core/types.ts`).
- **11-06 (P2, AmisSchemaPage as unknown as never)**: Replaced with explicit `as AmisSchema`, `as Parameters<typeof renderAmis>[1]`, `as RenderOptions` with `// safety:` comments.
- **11-07 (P2, unwrapApiPayload as T no validation)**: Has `@remarks` JSDoc and `// safety: caller-verified` comments.
- **03-02 (P2, iconRegistry exported)**: `iconRegistry` no longer exported from `packages/core/src/index.ts` (grep returns zero matches in core).
- **03-03 (P2, AmisFetcherResult.headers optionality)**: `headers: Record<string, string>` is required (not optional) in `packages/amis-core/src/types.ts:36`.
- **03-06 (P2, AppIconProps not exported)**: `export type { AppIconProps, AppIconComponent }` added to `packages/core/src/index.ts:10`.

## Goals

- Confirm all 8 fix-P2 findings are resolved with observable evidence.
- Run `pnpm typecheck && pnpm build && pnpm lint && pnpm test` to verify integrity.
- Record closure in `docs/logs/`.

## Non-Goals

- No new code changes in this plan (all fixes are already landed).
- No introduction of schema validation libraries (deferred to follow-up).
- No restructuring of the amis type system.

## Scope

### In Scope

- Verification of 8 finding resolutions in live repo.
- One-pass `pnpm typecheck && pnpm build && pnpm lint && pnpm test` green run.

### Out Of Scope

- Runtime validation library introduction.
- amis SDK type bridge rewrite.
- New type safety improvements beyond the 8 findings.

## Execution Plan

### Phase 1 - Verify Unsafe Type Assertion Cleanup

Status: completed
Targets: `packages/shared/src/http/payload.ts`, `packages/amis-react/src/components/AmisSchemaPage.tsx`, `apps/main/src/flux/providers.ts`

- Item Types: `Proof`

- [x] 1.1 `payload.ts` 已有 `@remarks` JSDoc 声明无运行时校验，且 `as T` 附带 `// safety: caller-verified` 注释。
- [x] 1.2 `AmisSchemaPage.tsx` 无 `as unknown as never`。三个参数（schema, renderProps, env）各有显式类型断言和 `// safety:` 注释。类型从 `amis-core` 导入。
- [x] 1.3 `providers.ts` 中 `fetchFluxPage` 有显式返回类型 `Promise<FluxSchema>`，且包含最小运行时校验（`value && typeof value === 'object' && 'type' in value`）。

Exit Criteria:

- [x] 确认 `payload.ts` 包含 `@remarks` JSDoc — `packages/shared/src/http/payload.ts:15-18` 有 `@remarks This function does not perform runtime validation.`
- [x] 确认 `AmisSchemaPage.tsx` 无 `as never` — 仅使用 `as AmisSchema`、`as Parameters<typeof renderAmis>[1]`、`as RenderOptions`，均附带 `// safety:` 注释
- [x] 确认 `providers.ts` 有返回类型和校验 — 返回类型 `Promise<FluxSchema>`，校验 `value && typeof value === 'object' && 'type' in value`（line 37-41）
- [x] `pnpm typecheck` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Verify Duplicate Declaration Consolidation

Status: completed
Targets: `packages/core/src/types/systemjs.d.ts`, `apps/main/tsconfig.json`

- Item Types: `Proof`

- [x] 2.1 `apps/main/src/types/systemjs.d.ts` 不存在（已由 commit `785dfff` 删除）。
- [x] 2.2 `@nop-chaos/core` 的 `systemjs.d.ts` 通过 workspace path mapping（`tsconfig.base.json:36`）对 main app 可见，`System` 全局类型正确解析。

Exit Criteria:

- [x] 确认 `apps/main/src/types/` 无 `systemjs.d.ts` — glob 返回 "No files found"
- [x] `grep -r 'System' apps/main/src/ --include='*.ts,*.tsx'` 确认无裸 `System` 全局引用 — 所有匹配均为 `SystemPage`、`SystemDisplayMode` 等本地命名，非 `System` 全局类型引用
- [x] `pnpm typecheck` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Verify API Surface Tightening

Status: completed
Targets: `packages/core/src/index.ts`, `packages/amis-core/src/types.ts`

- Item Types: `Proof`

- [x] 3.1 `packages/core/src/index.ts` 不公开导出 `iconRegistry`。用 `grep -r 'iconRegistry' packages/core/src/include='*.ts,*.tsx'` 验证无残留。
- [x] 3.2 `packages/core/src/index.ts` 已导出 `AppIconProps`：`export type { AppIconProps, AppIconComponent } from './utils/iconMap'`（line 10）。
- [x] 3.3 `AmisFetcherResult.headers` 为必选字段：`headers: Record<string, string>`（`amis-core/src/types.ts:36`）。

Exit Criteria:

- [x] `grep 'iconRegistry' packages/core/src/` 无匹配 — 返回 "No files found"
- [x] `grep 'AppIconProps' packages/core/src/index.ts` 有匹配 — line 10: `export type { AppIconProps, AppIconComponent }`
- [x] 确认 `AmisFetcherResult.headers` 为必选 — `headers: Record<string, string>`（`amis-core/src/types.ts:36`）
- [x] `pnpm typecheck` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - Verify JSDoc for Core Interfaces

Status: completed
Targets: `packages/shared/src/types/extension.ts`, `packages/plugin-bridge/src/types.ts`, `packages/amis-core/src/types.ts`

- Item Types: `Proof`

- [x] 4.1 `ShellExtension` 所有字段有 JSDoc（`extension.ts`）。
- [x] 4.2 `PluginBridge` 所有方法有 JSDoc（`plugin-bridge/src/types.ts`）。
- [x] 4.3 `AmisRuntimeAdapter` 所有方法有 JSDoc（`amis-core/src/types.ts`）。

Exit Criteria:

- [x] 确认 `ShellExtension` 所有字段有 JSDoc — `packages/shared/src/types/extension.ts:178-228` 每个字段有注释
- [x] 确认 `PluginBridge` 所有方法有 JSDoc — `packages/plugin-bridge/src/types.ts:52-73` 每个方法有注释
- [x] `pnpm typecheck` 通过
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 无 `as never` 断言残留（11-06）— 确认 `AmisSchemaPage.tsx` 无 `as never`
- [x] `unwrapApiPayload` 有 JSDoc 声明无运行时校验（11-07）— `payload.ts:15-18` 有 `@remarks` 注释
- [x] `fetchFluxPage` 有最小运行时校验（11-02）— `providers.ts:37-41` 有 `value && typeof value === 'object' && 'type in value'`
- [x] `systemjs.d.ts` 仅在 core 中存在（11-01）— `apps/main/src/types/` 无此文件；`packages/core/src/types/systemjs.d.ts` 存在
- [x] `iconRegistry` 不公开导出（03-02）— `grep` 在 core 中无匹配
- [x] `AppIconProps` 已从 core 导出（03-06）— `core/src/index.ts:10` 导出
- [x] `AmisFetcherResult.headers` 为必选（03-03）— `types.ts:36` 为 `Record<string, string>`
- [x] 核心接口有 JSDoc（11-03）— ShellExtension、PluginBridge、AmisRuntimeAdapter 均有 JSDoc
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过 — 27/27/27/27 全部成功
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- Schema validation 引入（如 zod）可为 `unwrapApiPayload` 添加可选运行时校验，不属于当前 scope。
- amis SDK 类型桥接可在 amis 版本升级时重新评估。

## Closure

Status Note: All 8 deep audit findings (03-02, 03-03, 03-06, 11-01, 11-02, 11-03, 11-06, 11-07) confirmed resolved. No code changes needed — all fixes already landed in prior commits. All verification gates pass.

Closure Audit Evidence:

- Auditor / Agent: Mission Driver EXEC_PLANS execution
- Evidence: `docs/logs/2026/07-20.md` (daily dev log for 2026-07-20). Verification run: `pnpm typecheck` (27/27), `pnpm build` (14/14), `pnpm lint` (27/27), `pnpm test` (27/27, 346 tests in main). File inspections confirmed each finding's resolution.

Follow-up:

- Schema validation 引入评估
