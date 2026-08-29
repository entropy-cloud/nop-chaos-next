# 32 Flux 表单 label 宽度确定性化（--field-label-width 变量契约）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Source: `docs/analysis/2026-08-08-flux-amis-style-consistency-analysis.md`（§3.2/§5 修复方向）
> Related: `docs/design/amis-flux-rendering-engine-integration.md`

## Purpose

把 flux 表单横向布局（`labelAlign: left/right`）下 label 的宽度从"flex 自然宽度（不确定）"改为"CSS 变量 `--field-label-width` 确定性驱动"，变量契约定义在 `nop-chaos-flux` 上游，具体取值由 `nop-chaos-next` 宿主指定，并通过两端单元测试锁定契约。

## Current Baseline

- flux `FieldFrame`（`nop-chaos-flux/packages/flux-react/src/field-frame.tsx:209-213`）label 宽度优先级：field `labelWidth`（内联 style）> form 级 `labelWidth`（`FormLayoutContext`）> **无宽度**。
- 无 `labelWidth` 时 `[data-slot='field-label']` 无 width 规则，宽度 = flex 自然宽度（`flex-shrink:0` + `flex-basis:auto`），随文字长度/i18n 变化；form 多列 grid（`columnCount` → `repeat(N, minmax(0,1fr))`）下每个 field 是独立 cell，各 cell 内 label 宽度互不影响 → "宽度不确定"。
- 上游 `default-spacing.css` 已有 `.nop-field[data-label-align='left'] [data-slot='field-label']` 与 `right` 变体规则（host 副本 `apps/main/src/styles/flux-spacing.css` 只保留 left 且加了 `padding-top: 6px`）。
- host 已定义同语义的 `--space-*` / `--radius-*` 等 token（`packages/theme-tokens/src/styles.css`），但该文件会经 `scripts/sync-flux-lib.sh` 从上游覆盖，**宿主取值不得放在其中**。
- flux bundle 经 `scripts/repack-flux-and-refresh.sh`（上游 `pack-flux-bundle.mjs` → `libs/nop-chaos-flux-0.1.0.tgz` → 重装）交付；`default-spacing.css` 已被打进 bundle 的 `dist/style.css`。
- 测试设施：上游 `packages/flux-react/src/__tests__/default-spacing-contract.test.ts`（读 `src/default-spacing.css` 文本断言）；host `apps/main/src/styles/themeContract.test.ts`（读样式文件文本断言）。

## Goals

- 上游 `default-spacing.css` 为横向 label 提供 `width: var(--field-label-width, auto)` 规则（fallback `auto` 保持现有行为兼容，host 不定义变量时无视觉变化）。
- `nop-chaos-next` 在宿主自有样式（`apps/main/src/styles/index.css`）定义 `--field-label-width: 96px`，使横向表单 label 宽度确定、多列 grid 下各列 label 左边界对齐。
- 两端各有一个聚焦测试断言契约存在；host 测试同时断言 tgz bundle 内 `style.css` 引用了该变量。
- 更新 `docs/design/amis-flux-rendering-engine-integration.md` 记录变量契约；更新 daily log。

## Non-Goals

- 不改变 AMIS 侧样式（用户明确不需要参考 AMIS）。
- 不引入 JS 测量 label 宽度 / grid 轨道共享（`repeat(N, <labelW> 1fr)` + `span 2`）等复杂方案。
- 不给 `field-label` 增加默认非 `auto` 的全局 fallback（避免改变 flux playground 等其它宿主现状）。
- 不改 `labelWidth` schema prop 的既有优先级与行为。

## Scope

### In Scope

- `nop-chaos-flux/packages/flux-react/src/default-spacing.css`（+ 其 `dist` 产物经 bundle 重打）。
- `nop-chaos-flux/packages/flux-react/src/__tests__/default-spacing-contract.test.ts`。
- `nop-chaos-next/apps/main/src/styles/flux-spacing.css`（host 副本同步同一条规则）。
- `nop-chaos-next/apps/main/src/styles/index.css`（定义 `--field-label-width`）。
- `nop-chaos-next/apps/main/src/styles/themeContract.test.ts`。
- `nop-chaos-next/docs/design/amis-flux-rendering-engine-integration.md`、`docs/logs/2026/08-08.md`。

### Out Of Scope

- 其它已分析但未确认的不一致项（圆角、`--Form-item-gap` 等）——见 Non-Blocking Follow-ups。
- `packages/theme-tokens/src/styles.css`（会被上游同步覆盖，宿主取值不得写入）。

## Execution Plan

### Phase 1 - flux 上游：变量契约 + 契约测试

Status: completed
Targets: `../nop-chaos-flux/packages/flux-react/src/default-spacing.css`、`__tests__/default-spacing-contract.test.ts`

- Item Types: `Fix`（live contract gap）、`Proof`

- [x] 在 `default-spacing.css` 中为横向 label 增加 `width: var(--field-label-width, auto)`（left/right 两个选择器），并保留 `overflow-wrap: break-word` 避免长 label 撑破对齐
- [x] 扩展 `default-spacing-contract.test.ts`：断言 left/right 选择器包含 `width: var(--field-label-width` 且 fallback 为 `auto`；断言不出现裸 `[data-slot='field-label']` 全局规则
- [x] 跑 `pnpm --filter @nop-chaos/flux-react test`（含新断言）与 `typecheck`

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `default-spacing.css` 与测试文本已落地，上游 `@nop-chaos/flux-react` 单测全绿
- [x] 未引入对 `labelWidth` schema 优先级/行为的改动
- [x] `No owner-doc update required`（上游文档更新记录在 flux 项目内，属本项目文档边界外）
- [x] `docs/logs/` 对应日期条目已更新（Phase 4 统一收口）

### Phase 2 - 打包同步到 nop-chaos-next + host 副本同步

Status: completed
Targets: `libs/nop-chaos-flux-0.1.0.tgz`、`apps/main/src/styles/flux-spacing.css`、`apps/main/node_modules/@nop-chaos/flux`

- Item Types: `Fix`、`Proof`

- [x] 在 next 跑 `bash scripts/repack-flux-and-refresh.sh`（上游打包 → `libs/` → 同步 ui/theme-tokens/tailwind-preset → 重装 @nop-chaos/flux）
- [x] 更新 `apps/main/src/styles/flux-spacing.css` 的 left label 规则，与上游规则一致（`width: var(--field-label-width, auto)`）
- [x] 验证 `apps/main/node_modules/@nop-chaos/flux/dist/style.css` 已含 `var(--field-label-width`

Exit Criteria:

- [x] tgz 已更新且 `node_modules/@nop-chaos/flux/dist/style.css` 含新规则
- [x] host `flux-spacing.css` 与上游规则一致
- [x] `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新（Phase 4 统一收口）

### Phase 3 - host 指定变量取值 + 契约测试

Status: completed
Targets: `apps/main/src/styles/index.css`、`apps/main/src/styles/themeContract.test.ts`

- Item Types: `Decision`（取值 96px）、`Fix`、`Proof`

- [x] `index.css` 的 `:root` 增加 `--field-label-width: 96px`
- [x] 扩展 `themeContract.test.ts`：断言 host 定义 `--field-label-width`；断言 `flux-spacing.css` 与 tgz `style.css` 引用 `var(--field-label-width`
- [x] 跑 `pnpm --filter @nop-chaos/main test`（themeContract 套件）与 `pnpm --filter @nop-chaos/main typecheck`

Exit Criteria:

- [x] `--field-label-width: 96px` 已在 `index.css:root` 定义
- [x] host 测试全绿（含新增断言）
- [x] `docs/design/amis-flux-rendering-engine-integration.md` 已更新变量契约章节（本 Phase 改变 live baseline）
- [x] `docs/logs/2026/08-08.md` 已更新

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] in-scope live defect（label 宽度不确定）已通过变量契约修复
- [x] 上游与宿主两端契约测试均已落地并全绿
- [x] host 已定义 `--field-label-width: 96px` 且 bundle 内规则引用同一变量名
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] `docs/design/amis-flux-rendering-engine-integration.md` 已同步 live baseline
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（@nop-chaos/main 通过）
- [x] `pnpm build`（@nop-chaos/main 含 tsc+vite+analyze 通过）
- [x] `pnpm lint`（唯一失败 @nop-chaos/ui carousel.tsx 为既有上游代码问题，git 无改动、与上游一致，非本计划引入）
- [x] `pnpm test`（11 失败均为既有：authApi 7 + pageApi 3 来自用户工作区未提交 M 代码，nopRpcResolver 1 为 stash 后仍存在的基线失败；本计划 0 新增失败，经 git stash 基线对比确认）

## Deferred But Adjudicated

### 其余样式不一致项（圆角/控件高度/表单间距对齐 AMIS）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划只收口用户确认的 label 宽度问题；圆角/间距等已在 `docs/analysis/2026-08-08-flux-amis-style-consistency-analysis.md` 记录并给出方向，需用户确认后再开新计划，不属于本 plan scope。
- Successor Required: `yes`
- Successor Path: 待用户确认的后续计划（基于 analysis §5）

## Non-Blocking Follow-ups

- flux 上游 `default-spacing.css` 与 host `flux-spacing.css` 副本的其余 diff（fieldset padding、`data-label-align='right'` 缺失、tabs-content 选择器）维持现状，不阻塞本计划。

## Closure

Status Note: 所有 in-scope 改动已在 live repo 落地，独立子 agent closure audit 8/8 PASS（audit task: ses_021443a4dffet4YkmdkYdTDgD9）。lint/test 全量失败项均确认属于既有状态（非本计划引入），未静默降级。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（task `ses_021443a4dffet4YkmdkYdTDgD9`）
- Evidence: 8/8 PASS —— 上游 default-spacing.css L105-113（width var + auto fallback + break-word）、上游契约测试 2 passed、host index.css:39 变量、flux-spacing.css L100-107、themeContract.test.ts 5 passed、tgz 今日产物 + bundle style.css 含 var 引用、design §8.1、daily log 第二条记录

Follow-up:

- no remaining plan-owned work（其余样式不一致项已在 Deferred But Adjudicated 中声明归属后续计划）

## Optional Sections

### Risks And Rollback

- `repack-flux-and-refresh.sh` 会重建 `@nop-chaos/flux` tgz 并重装依赖，若上游构建失败，`libs/` 中旧 tgz 与 `node_modules` 均不受影响（脚本先打新包后清缓存），可用 `git restore libs/` + 重新 `pnpm install` 回滚。
- `--field-label-width` fallback 为 `auto`，删除 host 变量即完全恢复原行为，回滚成本为零。
