# 24 Coverage And Hygiene Follow-Up Plan

> Plan Status: planned
> Last Reviewed: 2026-05-17
> Source: `docs/plans/22-current-deep-audit-remediation-plan.md` deferred item `Coverage And Hygiene Tail Work`, plus `docs/analysis/2026-05-17-deep-audit-v1/summary.md` retained P2 items 01-01, 12-2, 12-3, 12-6, 12-7, 12-16, 12-28, 12-29
> Related: `docs/plans/21-state-architecture-test-coverage-plan.md`, `docs/plans/22-current-deep-audit-remediation-plan.md`

## Purpose

收口当前 retained 但不阻塞 Plan 22 的 coverage 与 hygiene 尾项：若干高价值单元测试缺口、测试文件结构可读性问题、extension-demo E2E 入口不可达，以及 `packages/core` 的未使用依赖声明。

## Current Baseline

- `packages/core/package.json` 仍声明未使用的 `clsx` 与 `react-router-dom` dependencies。
- `apps/main/src/store/layoutStore.ts` 与 `apps/main/src/store/themeStore.ts` 当前无 colocated tests。
- `packages/shared/src/http/url.ts` 与 `packages/shared/src/http/payload.ts` 当前无直接单元测试。
- `packages/plugin-bridge/src/index.test.ts` 的 React mock 放在文件中段，依赖 hoist 规则，阅读上有误导性。
- `tests/e2e/extension-demo.spec.ts` 默认被 `test.skip(process.env.PLAYWRIGHT_APP_MODE !== 'extension-demo')` 跳过，常规流水线不可达。
- `packages/amis-core/src/core/graphql.test.ts` 对错误分支的 focused proof 不足。

## Goals

- 为 retained P2 中最有回归价值的逻辑补齐 focused tests。
- 收敛低成本 package hygiene 问题。
- 让 extension-demo E2E 拥有明确、可执行、可记录的进入方式。

## Non-Goals

- 不在本计划内补齐所有低优先级测试空白。
- 不引入跨浏览器 E2E 矩阵。
- 不扩张到 flow editor 或 PluginBridge runtime contract 变更。

## Scope

### In Scope

- `packages/core/package.json`
- `apps/main/src/store/layoutStore.ts`
- `apps/main/src/store/themeStore.ts`
- `packages/shared/src/http/url.ts`
- `packages/shared/src/http/payload.ts`
- `packages/plugin-bridge/src/index.test.ts`
- `tests/e2e/extension-demo.spec.ts`
- `packages/amis-core/src/core/graphql.test.ts`

### Out Of Scope

- 全量测试覆盖率提升
- extension-demo 的产品行为修改
- plugin-demo / extension-demo 的构建产物变更

## Execution Plan

### Phase 1 - Store And Shared Utility Proof

Status: planned
Targets: `apps/main/src/store/layoutStore.ts`, `apps/main/src/store/themeStore.ts`, `packages/shared/src/http/url.ts`, `packages/shared/src/http/payload.ts`

- Item Types: `Proof`

- [ ] 为 `layoutStore.ts` 添加 focused tests，覆盖 clamp、toggleMenuGroup、持久化字段选择。
- [ ] 为 `themeStore.ts` 添加 focused tests，覆盖 themeId 规范化与持久化恢复。
- [ ] 为 `http/url.ts` 添加 focused tests，覆盖 absolute/relative URL、query append、baseUrl 拼接。
- [ ] 为 `http/payload.ts` 添加 focused tests，覆盖成功解包、失败抛错、fallback message。

Exit Criteria:

- [ ] 四个 retained 测试缺口都有 colocated tests。
- [ ] 新测试覆盖的是当前 retained P2 中明确提到的关键逻辑，而非泛覆盖。
- [ ] 相关 focused test commands 通过。
- [ ] No owner-doc update required.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Test Harness Readability And GraphQL Error Paths

Status: planned
Targets: `packages/plugin-bridge/src/index.test.ts`, `packages/amis-core/src/core/graphql.test.ts`

- Item Types: `Fix | Proof`

- [ ] 将 `index.test.ts` 中的 React mock 移到文件顶部或拆分文件，消除中段 hoisted mock 的阅读陷阱。
- [ ] 为 `graphql.test.ts` 补充错误分支 focused tests，覆盖错误响应与边界条件。

Exit Criteria:

- [ ] plugin-bridge 测试文件不再依赖中段 hoisted mock 的隐式语义。
- [ ] `graphql.test.ts` 明确覆盖 retained P2 提到的错误分支。
- [ ] `pnpm --filter @nop-chaos/plugin-bridge test` 与 `pnpm --filter @nop-chaos/amis-core test` 通过。
- [ ] No owner-doc update required.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Extension Demo E2E Entry And Package Hygiene

Status: planned
Targets: `tests/e2e/extension-demo.spec.ts`, relevant scripts/workflow/docs, `packages/core/package.json`

- Item Types: `Fix | Decision | Proof`

- [ ] 移除 `packages/core/package.json` 中已确认未使用的 `clsx` 与 `react-router-dom`。
- [ ] 为 extension-demo E2E 定义明确入口：脚本、CI job、或 documented command，保证不是永久 skip 的死测试。
- [ ] 将入口与运行方式写入可观察位置（脚本、workflow、或 `docs/testing/` 对应文档）。

Exit Criteria:

- [ ] `packages/core/package.json` 不再保留未使用 runtime 依赖。
- [ ] extension-demo E2E 有明确、可执行、可记录的运行入口。
- [ ] 若新增脚本或测试文档，相关 owner docs 已同步；否则明确记录 `No owner-doc update required`。
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` 通过。
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] retained coverage/hygiene items 全部 landed 或被诚实裁定
- [ ] extension-demo E2E 不再是无人 owner 的永久 skip 测试
- [ ] package hygiene 已收口
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 跨浏览器 Playwright 矩阵可另起 successor 计划评估。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
