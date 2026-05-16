# 14 Type Safety & API Surface Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-16
> Source: `docs/analysis/2026-05-16-deep-audit-full-run/summary.md` (findings 03-02, 03-03, 03-06, 11-01, 11-02, 11-03, 11-06, 11-07)
> Related: `docs/plans/01-code-quality-improvement-plan.md`

## Purpose

修复 8 个类型安全与 API 表面积问题：消除 unsafe 类型断言、统一重复声明、导出缺失类型、为公共接口添加文档。

## Current Baseline

- `systemjs.d.ts` 在 core 和 main 中重复声明且内容不一致（11-01, P2）。
- `FluxRouteRenderer` 将 `unknown` 断言为 `FluxSchema` 无运行时校验（11-02, P2）。
- 核心接口 `ShellExtension` 等缺少 JSDoc（11-03, P2）。
- `AmisSchemaPage` 使用 `as unknown as never` 绕过类型检查（11-06, P2）。
- `unwrapApiPayload` 双分支使用 `as T` 无校验（11-07, P2）。
- `iconRegistry` 内部映射表被公开导出（03-02, P2）。
- `AmisFetcherResult.headers` 可选性与 `HttpResponse.headers` 不一致（03-03, P2）。
- `AppIconProps` 未从 core index.ts 导出（03-06, P2）。

## Goals

- 消除所有 unsafe `as` 断言或添加显式文档说明。
- 统一重复类型声明。
- 收紧公开 API 表面积。
- 为核心公共接口添加 JSDoc。

## Non-Goals

- 不引入完整的 schema validation 库（如 zod）。
- 不重构 amis 类型系统。
- 不改变核心运行时行为（Phase 1.3 的 FluxRouteRenderer 最小校验除外）。

## Scope

### In Scope

- 8 个文件的类型声明修改。
- `packages/core/src/index.ts` 导出调整。
- JSDoc 添加。

### Out Of Scope

- 运行时 validation 框架引入。
- amis SDK 类型桥接重写。

## Execution Plan

### Phase 1 - Unsafe Type Assertion Cleanup

Status: planned
Targets: `packages/shared/src/http/payload.ts`, `packages/amis-react/src/components/AmisSchemaPage.tsx`, `apps/main/src/flux/FluxRouteRenderer.tsx`

- Item Types: `Fix`

- [ ] 1.1 `payload.ts`：为 `unwrapApiPayload<T>` 添加 `@remarks` JSDoc 明确声明"此函数不执行运行时校验，调用方应确保 T 与实际响应结构匹配"。保留 `as T` 但添加 `// safety: caller-verified` 行内注释。
- [ ] 1.2 `AmisSchemaPage.tsx:122-124`：将 `as unknown as never` 替换为对 `renderAmis()` 的 3 个参数分别使用显式类型断言：`transformedSchema as AmisSchema`（含注释 `// safety: schema transformed by our adapter layer`）、`renderProps as RenderOptions`（含注释 `// safety: props shape matches amis RenderOptions`）、`env as AmisEnv`（含注释 `// safety: env constructed with required amis fields`）。从 `@nop-chaos/amis-react` 或本地定义导入 `AmisSchema`、`RenderOptions`、`AmisEnv` 类型
- [ ] 1.3 `FluxRouteRenderer.tsx:49-53`：为 `fetchFluxPage` 添加显式返回类型 `Promise<FluxSchema>`，在 `.then()` handler 中添加最小运行时校验（检查 `value && typeof value === 'object' && 'type' in value`），校验失败时 throw 明确错误。

Exit Criteria:

- [ ] `payload.ts` 包含 `@remarks` JSDoc
- [ ] `AmisSchemaPage.tsx` 不再包含 `as never`
- [ ] `FluxRouteRenderer.tsx` 的 `fetchFluxPage` 有显式返回类型和最小校验
- [ ] `pnpm typecheck` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - Duplicate Declaration Consolidation

Status: planned
Targets: `packages/core/src/types/systemjs.d.ts`, `apps/main/src/types/systemjs.d.ts`

- Item Types: `Fix`

- [ ] 2.1 删除 `apps/main/src/types/systemjs.d.ts`，确保 `apps/main/tsconfig.json` 通过 workspace reference 引用 `@nop-chaos/core` 的声明
- [ ] 2.2 验证 main app 的 `System` 全局类型仍正确解析

Exit Criteria:

- [ ] `apps/main/src/types/systemjs.d.ts` 已删除
- [ ] `pnpm typecheck` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - API Surface Tightening

Status: planned
Targets: `packages/core/src/index.ts`, `packages/core/src/utils/iconMap.tsx`, `packages/amis-core/src/types.ts`

- Item Types: `Fix`

- [ ] 3.1 从 `packages/core/src/index.ts` 移除 `iconRegistry` 公开导出，改为内部模块使用。执行前先用 `grep -r 'iconRegistry' --include='*.ts' --include='*.tsx'` 验证无外部消费者依赖此导出
- [ ] 3.2 在 `packages/core/src/index.ts` 添加 `export type { AppIconProps, AppIconComponent } from './utils/iconMap'`
- [ ] 3.3 在 `packages/amis-core/src/types.ts` 中将 `AmisFetcherResult.headers` 从可选改为必选（`headers: Record<string, string>`）

Exit Criteria:

- [ ] `grep 'iconRegistry' packages/core/src/index.ts` 无匹配（已移除导出）
- [ ] `grep 'AppIconProps' packages/core/src/index.ts` 有匹配
- [ ] `AmisFetcherResult.headers` 为必选字段
- [ ] `pnpm typecheck` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - JSDoc for Core Interfaces

Status: planned
Targets: `packages/shared/src/types/extension.ts`, `packages/plugin-bridge/src/index.ts`

- Item Types: `Follow-up`

- [ ] 4.1 为 `ShellExtension` 的每个字段添加一行 JSDoc 说明
- [ ] 4.2 为 `PluginBridge` 的每个方法添加一行 JSDoc 说明
- [ ] 4.3 为 `AmisRuntimeAdapter` 的关键字段添加 JSDoc

Exit Criteria:

- [ ] `ShellExtension` 所有字段有 JSDoc
- [ ] `PluginBridge` 所有方法有 JSDoc
- [ ] `pnpm typecheck` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [ ] 无 `as never` 断言残留（11-06）
- [ ] `unwrapApiPayload` 有 JSDoc 声明无运行时校验（11-07）
- [ ] `FluxRouteRenderer` 有最小运行时校验（11-02）
- [ ] `systemjs.d.ts` 仅在 core 中存在（11-01）
- [ ] `iconRegistry` 不再公开导出（03-02）
- [ ] `AppIconProps` 已从 core 导出（03-06）
- [ ] `AmisFetcherResult.headers` 为必选（03-03）
- [ ] 核心接口有 JSDoc（11-03）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 未来可引入 zod 等 schema validation 库为 `unwrapApiPayload` 添加可选的运行时校验。
- amis SDK 类型桥接可在 amis 版本升级时重新评估。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- Schema validation 引入评估
