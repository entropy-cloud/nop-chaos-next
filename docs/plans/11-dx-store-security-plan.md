# 11 DX Store Security Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Completed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-review/round-03-eslint-stores-dx.md`, `docs/analysis/2026-05-15-open-ended-review/round-04-cross-cutting.md`, `docs/analysis/2026-05-15-open-ended-review/round-02-demo-quality.md`
> Related: `docs/plans/07-demo-reference-surface-plan.md`

## Purpose

将 open-ended 审查中剩余的 DX、store 一致性、安全边界与 build/runtime honesty 问题收口到单一 owner baseline：开发流程约束真实可执行，storage 与 bootstrap 行为不再自相矛盾，AMIS 动态代码边界有明确裁定，demo/插件相关脚本对 runtime 前提保持诚实。

## Current Baseline

- `@typescript-eslint/no-explicit-any` 被关闭，且 `flux-lib/` 与示例目录中的部分静态约束覆盖不足。
- `lint-staged` 不会对 TS/TSX 跑 Prettier。
- `useAuth.ts` 与 `App.tsx` 存在模块级 HMR flag。
- `ai-workbench/index.tsx` 与 `master-detail/[id]/index.tsx` 通过全文件 `eslint-disable react-hooks/set-state-in-effect` 绕过规则。
- `storage.ts`、mockApi shared storage、zustand persist 三套存储路径并行存在。
- `amis/adapter.ts` 中 `new Function()` 的动态代码执行边界没有被 owner doc 明确裁定。
- `examples/plugin-demo/scripts/build-with-rollup.mjs` 与 shared-module 注册之间的竞态前提需要生产 owner 裁定。
- `authStore.test.ts` 仍缺少 persist / partialize 这条 store-security 关键路径的 focused verification。

## Goals

- 修复最直接的 DX 约束缺口与 HMR/format 基线问题。
- 为 auth/bootstrap 相关 storage、多路径 bootstrap、动态代码执行边界建立明确 owner 裁定。
- 为 plugin/shared-module 前提建立生产 owner 层面的文档诚实性。

## Non-Goals

- 不在本计划中重写 AMIS 渲染引擎。
- 不处理网络页面 UX、表单、样式、demo 文案等其他 owner surface。

## Scope

### In Scope

- `eslint.config.js`
- `package.json`
- `apps/main/src/hooks/useAuth.ts`
- `apps/main/src/store/authStore.ts`
- `apps/main/src/App.tsx`
- `apps/main/src/pages/ai-workbench/index.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`
- `apps/main/src/utils/storage.ts`
- `apps/main/src/services/mockApi/shared.ts`
- `apps/main/src/store/authStore.test.ts`
- `apps/main/src/amis/adapter.ts`
- `examples/plugin-demo/scripts/build-with-rollup.mjs`
- `turbo.json`
- `docs/design/plugin-system.md`
- `docs/design/backend-integration.md`
- `docs/references/build-guide.md`

### Out Of Scope

- CI 平台选型与完整 workflow 编写
- plugin runtime 的深层架构重写

## Execution Plan

### Phase 1 - DX guardrails

Status: completed
Targets: `eslint.config.js` `package.json` `turbo.json` `docs/references/build-guide.md`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 将 `no-explicit-any`、`flux-lib/` 与示例目录相关静态约束调整到诚实且可执行的基线。
- [x] Fix: 让 `lint-staged` 对 TS/TSX 具备格式化闭环。
- [x] Decision: 裁定 `turbo lint` 拓扑是否需要依赖构建输出。
- [x] Proof: 验证新的 guardrails 在工作区可运行。

Exit Criteria:

- [x] DX guardrails 不再明显低于 repo 已声明标准。
- [x] TS/TSX 的 pre-commit 格式闭环成立。
- [x] `docs/references/build-guide.md` 已同步开发约束变化。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - HMR / bootstrap / storage 一致性

Status: completed
Targets: `apps/main/src/hooks/useAuth.ts` `apps/main/src/App.tsx` `apps/main/src/pages/ai-workbench/index.tsx` `apps/main/src/pages/data-management/master-detail/[id]/index.tsx` `apps/main/src/utils/storage.ts` `apps/main/src/services/mockApi/shared.ts` `apps/main/src/store/authStore.test.ts`

- Item Types: `Fix | Proof`

- [x] Fix: 处理模块级 HMR flag 的一致性问题。
- [x] Fix: 收敛已确认的全文件 `eslint-disable react-hooks/set-state-in-effect` 缺陷，改为更窄的实现或更诚实的规则边界。
- [x] Fix: 为 `useAuth.ts` 与 `authStore.ts` 的 bootstrap 失败后 token/store 清理建立明确合同，避免无效 token 在刷新后反复复现。
- [x] Fix: 为 auth/bootstrap 相关的 storage 多路径并行问题建立单一或可证明一致的合同；本计划不扩张为所有 zustand store 的全仓统一改造。
- [x] Proof: 为 `authStore.ts` 的 persist / partialize 路径补 focused verification。
- [x] Proof: 为 HMR/bootstrap/storage 行为补 focused verification。

Exit Criteria:

- [x] in-scope HMR/bootstrap 行为不再依赖脆弱模块级 flag。
- [x] in-scope 全文件 `eslint-disable` 缺陷已完成裁定并收敛。
- [x] `useAuth.ts` bootstrap 失败后的 token/store 行为已完成明确裁定并落地。
- [x] storage 路径的一致性 contract 已建立并可验证。
- [x] `authStore` persist / partialize 路径已有 focused verification。
- [x] `docs/design/backend-integration.md` 或相关 owner doc 已记录 storage/bootstrap 基线。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - 动态代码与插件前提边界

Status: completed
Targets: `apps/main/src/amis/adapter.ts` `examples/plugin-demo/scripts/build-with-rollup.mjs` `docs/design/plugin-system.md` `docs/design/backend-integration.md`

- Item Types: `Decision | Fix | Proof`

- [x] Decision: 为 `new Function()` 在 AMIS adapter 中的可信输入边界与允许场景做明确 owner 裁定。
- [x] Decision: 为 plugin shared-module / build-with-rollup 前提做明确 owner 裁定，不再依赖隐式假设。
- [x] Fix: 如需，调整 in-scope 代码或注释/文档以反映裁定结果。
- [x] Proof: 以文档与 focused verification 证明边界诚实成立。

Exit Criteria:

- [x] `docs/design/plugin-system.md` 已记录 plugin/shared-module 前提。
- [x] `docs/design/backend-integration.md` 已记录 AMIS 动态代码执行边界。
- [x] in-scope 代码与文档对这些前提保持一致。
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复或被明确移出当前 scope
- [x] DX / storage / dynamic-code 边界不再处于隐式状态
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: DX guardrails、storage/bootstrap contract、AMIS dynamic-code 边界与 plugin shared-module honesty 已完成，并在 focused verification、全量验证与独立 closure audit 下确认无剩余 in-scope blocker，可关闭。

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit in current session
- Evidence: 审核曾将 `docs/design/plugin-system.md`、`docs/design/backend-integration.md`、`docs/references/build-guide.md` 以及 storage/runtime honesty 识别为 blocker；这些项已收口，并在 closure audit 期间额外发现 `examples/plugin-demo/scripts/build-with-rollup.mjs` 缺少 `dist/` 目录创建这一 runtime honesty 缺口，已修复后通过 `pnpm build` 复验。

Follow-up:

- 无。
