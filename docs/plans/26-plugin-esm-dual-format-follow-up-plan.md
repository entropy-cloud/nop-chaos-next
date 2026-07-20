# 26 Plugin ESM Dual-Format Follow-Up Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/plans/22-current-deep-audit-remediation-plan.md` deferred item `ESM Dual-Format Plugin Output`, plus `examples/plugin-demo/scripts/build-with-rollup.mjs` current live baseline
> Related: `docs/plans/16-plugin-build-bridge-runtime-plan.md`, `docs/design/plugin-system.md`

## Purpose

为 plugin-demo 和后续远程插件提供明确的双格式产物策略，解决当前“runtime 支持 SystemJS/ESM 两条加载路径，但示例构建只输出 SystemJS”之间的契约落差。

## Current Baseline

- `examples/plugin-demo/scripts/build-with-rollup.mjs` 当前只输出 `dist/plugin-demo.system.js`，`format: 'system'`。
- `examples/plugin-demo/package.json` 当前 build 脚本只同步单一 SystemJS 产物到 host。
- `docs/design/plugin-system.md` 当前文档已明确“示例构建产物是 externalized SystemJS bundle”，因此当前 supported baseline 仍是 SystemJS-first。
- Plan 22 已将此项裁定为 non-blocking，因为它不阻塞当前 retained P1/P2 的关闭。

## Goals

- 明确仓库对 remote plugin 双格式输出的支持策略：要么正式支持双格式，要么正式约束为 SystemJS-only。
- 如果支持双格式，提供可执行的 build、artifact naming、host loading、以及文档基线。

## Non-Goals

- 不在本计划内重构整个插件运行时架构。
- 不修改所有插件示例，只处理 plugin-demo 作为参考实现。
- 不引入与当前 host 不兼容的 breaking loading contract。

## Scope

### In Scope

- `examples/plugin-demo/scripts/build-with-rollup.mjs`
- `examples/plugin-demo/package.json`
- host/plugin loading contract 文档

### Out Of Scope

- 非 plugin-demo 的远程插件产物改造
- extension builtin page 机制改造

## Execution Plan

### Phase 1 - Contract Decision

Status: completed
Targets: build/runtime docs + plugin-demo build entry

- Item Types: `Decision`

- [x] 裁定仓库当前 supported baseline 是 `SystemJS-only` 还是 `SystemJS + ESM dual-format`。
- [x] 若维持 `SystemJS-only`，将当前 runtime 中可能误导为"已支持 ESM"的表述与文档对齐。
- [x] 若支持 dual-format，明确 artifact naming、host detection、error handling、shared dependency contract。（N/A — chose SystemJS-only）

Exit Criteria:

- [x] dual-format 支持策略有唯一明确结论。
- [x] `docs/design/plugin-system.md`、`docs/examples/plugin-dev-guide.md`、`docs/references/build-guide.md` 已同步到唯一最终状态，而非 proposal/compare 或互相矛盾的表述。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Reference Implementation

Status: completed
Targets: `examples/plugin-demo/scripts/build-with-rollup.mjs`, related build/sync script

- Item Types: `Fix | Proof`

- [x] 若选择 dual-format：为 plugin-demo 增加 ESM 输出并验证 host 可按约定加载。（N/A — chose SystemJS-only）
- [x] 若选择 SystemJS-only：移除/收紧误导性的 ESM 路径假设，并为当前单格式基线添加 focused proof。

Exit Criteria:

- [x] plugin-demo 构建产物与 Phase 1 的 contract decision 一致（仅输出 `plugin-demo.system.js`，无 ESM 产物）。
- [x] 对应 build / preview / host loading focused verification 通过。
- [x] `pnpm --filter @nop-chaos/plugin-demo build` 通过。
- [x] `docs/design/plugin-system.md`、`docs/examples/plugin-dev-guide.md`、`docs/references/build-guide.md` 已更新为当前最终契约。
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] 远程插件产物格式契约已收敛为单一明确基线
- [x] plugin-demo 参考实现与该基线一致
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 若 dual-format 落地，再评估是否把它推广到更多 remote plugin 示例。

## Closure

Status Note: completed — all phases executed, all closure gates passed.

Closure Audit Evidence:

- Reviewer / Agent: opencode (Mission Driver EXEC_PLANS)
- Evidence: `docs/logs/2026/07-20.md` (Plan 26 entry), typecheck 27/27, build 14/14, lint 27/27 (0 errors), test 55 files / 368 tests

Follow-up:

- ESM dual-format remains a runtime-capable path in `packages/core/src/utils/systemjs.ts` for future extension; build contract is SystemJS-only.
