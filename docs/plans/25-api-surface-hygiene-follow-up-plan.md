# 25 API Surface Hygiene Follow-Up Plan

> Plan Status: planned
> Last Reviewed: 2026-05-17
> Source: `docs/plans/22-current-deep-audit-remediation-plan.md` deferred item `API Surface Low-Risk Cleanup`, plus `docs/analysis/2026-05-17-deep-audit-v1/summary.md` retained P2 item 03-04
> Related: `docs/plans/14-type-safety-api-surface-plan.md`, `docs/plans/22-current-deep-audit-remediation-plan.md`

## Purpose

收口当前不阻塞 Plan 22 closure 的低风险 API hygiene 尾项，重点是消除重复实现，并评估是否收窄无必要的公开表面积。

## Current Baseline

- `packages/amis-core/src/core/url.ts` 与 `packages/shared/src/http/url.ts` 都定义了 `isAbsoluteUrl`，形成已复核保留的重复实现问题。
- `packages/shared/src/index.ts` 仍公开导出一批当前无外部消费者的低层工具函数（如 `appendQueryParams`、`normalizeRequestUrl`、`resolveRequestUrl`、JWT 底层工具）。

## Goals

- 消除已确认的跨包重复实现。
- 评估并收敛低价值公共导出，减少未来 public API 负担。

## Non-Goals

- 不追求全面 API surface 重设计。
- 不在本计划内引入 breaking package export strategy 变更。
- 不扩张到未复核的 P3 文档化项。

## Scope

### In Scope

- `packages/amis-core/src/core/url.ts`
- `packages/shared/src/http/url.ts`
- `packages/shared/src/index.ts`

### Out Of Scope

- 其他 package 的所有导出清理
- package.json exports map 的大规模改造
- 非公共契约的内部 helper 文档化与未复核的类型 JSDoc 补齐

## Execution Plan

### Phase 1 - Duplicate Utility Elimination

Status: planned
Targets: `packages/amis-core/src/core/url.ts`, `packages/shared/src/http/url.ts`

- Item Types: `Fix | Proof`

- [ ] 裁定 `isAbsoluteUrl` 的 canonical owner（优先 shared）。
- [ ] 移除 amis-core 中的重复实现，改为复用 canonical 实现或删除死代码导出。
- [ ] 添加 focused tests，证明语义与当前 supported behavior 一致。

Exit Criteria:

- [ ] 仓库中只保留一个 live `isAbsoluteUrl` canonical 实现，或重复实现的存在理由被显式记录。
- [ ] 相关 tests 通过。
- [ ] No owner-doc update required。
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Public Export Tightening

Status: planned
Targets: `packages/shared/src/index.ts`

- Item Types: `Decision | Fix | Proof`

- [ ] 审核当前无外部消费者的低层 export，区分：保留、标记 internal、或移出根入口。
- [ ] 对确定收敛的导出实施最小变更，并验证 workspace 内消费者不回归。

Exit Criteria:

- [ ] 已对低价值导出做出明确裁定，而不是继续隐含保留。
- [ ] 若有导出从根入口移出，workspace 内 typecheck/build 仍通过。
- [ ] 若判断暂不收敛，理由被写入 plan closure 或 deferred 区，不再含糊。
- [ ] No owner-doc update required。
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] retained API/type hygiene items 已 landed 或被诚实裁定
- [ ] 不存在把未复核 P3 文档化工作误记为本 successor 已 owner retained scope 的情况
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 若后续要补 `MenuItem` / `AuthState` / `ThemeConfig` / `PluginManifest` 的 JSDoc，应单独起草基于 live baseline 的文档化计划，而不是回填为本 successor 的 retained scope。
- 若后续要做 package export strategy 全局整治，应由更大的 successor plan 接管。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
