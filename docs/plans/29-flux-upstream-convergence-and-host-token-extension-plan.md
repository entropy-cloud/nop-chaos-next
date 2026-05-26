# 29 Flux Upstream Convergence And Host Token Extension Plan

> Plan Status: completed
> Last Reviewed: 2026-05-26
> Source: `docs/analys/2026-05-26-flux-upstream-delta-analysis.md`, `docs/references/flux-sync-spec.md`
> Related: `docs/plans/12-theme-token-surface-migration-plan.md`, `docs/plans/20-theme-system-gaps-plan.md`

## Purpose

把 `nop-chaos-next` 当前同步副本中的“应属于通用库上游”的修改收敛回 `nop-chaos-flux`，同时将宿主专属主题扩展改造成方案 B：上游提供扩展机制，下游在包外定义并注入 host token 扩展，不再直接修改 synced package。

## Current Baseline

- `nop-chaos-next` 当前通过 `pnpm sync:flux` 从 `../nop-chaos-flux` 同步 `ui`、`theme-tokens`、`tailwind-preset` 三个包，但同步后的目录并不是原样镜像；脚本会删除测试源码并回放 downstream patch。
- 当前 downstream drift 混合了四类内容：上游已修但下游未同步的旧实现、应上游化的通用修复、宿主语义直接写入通用库的历史改动、以及 runtime-only sync 导致的派生 `package.json` 差异。
- `theme-tokens` / `tailwind-preset` / `flux-lib/ui` 中目前仍存在应上游化的 generic theme contract 变更，例如 `surface-*` token、对应 Tailwind preset 映射、以及共享 UI 对语义 surface token 的消费。
- `theme-tokens` 中当前还混入了 `host-*` token 语义；这不符合“通用库直接拷贝、宿主通过注入扩展”的目标状态。
- `scripts/sync-flux-lib.sh` 当前会把整个 downstream patch 重新 apply 回来，因此即使脚本没有显式改 `peerDependencies`，现有下游对 `package.json` 的 `peerDependencies` / `dependencies` 漂移也会被继续保留。
- `docs/references/flux-sync-spec.md` 已明确：这些包是 shared libraries，React 19 最佳实践和 shared behavior fix 应优先进入 `nop-chaos-flux`；runtime-only sync 是当前约定；`peerDependencies` 应尽量保持 upstream-owned。

### Confirmed Drift Matrix

| Path / Area | Current Classification | Owner Repo | Intended Disposition | Proof Baseline |
| --- | --- | --- | --- | --- |
| `flux-lib/ui/src/lib/i18n.ts` | upstream stale in downstream | `nop-chaos-next` sync consumer | remove downstream stale implementation and re-sync from upstream | `docs/analys/2026-05-26-flux-upstream-delta-analysis.md` lines 36-42 |
| `flux-lib/ui/src/components/ui/alert-dialog.tsx` | must upstream | `nop-chaos-flux` | land shared overlay close-state fix upstream | analysis lines 63-68 |
| `flux-lib/ui/src/components/ui/textarea.tsx` | must upstream or explicit removal from current scope | `nop-chaos-flux` in Phase 2A | land chosen shared ref contract upstream, or move to explicit successor plan before this plan can close | analysis lines 72-77 |
| `flux-lib/ui/src/components/ui/dialog.tsx` | historical drift to remove unless explicitly retained upstream | `nop-chaos-flux` in Phase 2B, `nop-chaos-next` in Phase 5 | restore upstream baseline or upstream a configurable contract, then remove downstream drift after sync | analysis lines 44-50 |
| `flux-lib/ui/src/components/ui/dropdown-menu.tsx` | historical drift to remove unless upstream narrows API | `nop-chaos-flux` in Phase 2B, `nop-chaos-next` in Phase 5 | restore upstream exports or upstream the API narrowing explicitly, then remove downstream drift after sync | analysis lines 52-57 |
| `packages/theme-tokens/src/styles.css` `surface-*` | must upstream | `nop-chaos-flux` | land generic semantic surface token contract upstream | analysis lines 81-90 |
| `packages/theme-tokens/src/styles.css` `host-*` | host-only drift to migrate out of synced package | `nop-chaos-next` with upstream extension mechanism support | move to host-owned extension files under scheme B | analysis lines 83-90 |
| `packages/tailwind-preset/src/index.ts` generic `surface-*` mapping | must upstream | `nop-chaos-flux` | land generic preset support upstream | analysis lines 92-96 |
| `flux-lib/ui` semantic surface token consumers (`dialog.tsx`, `drawer.tsx`, `sheet.tsx`, `chart.tsx`, `slider.tsx`, `table-row-class-name.ts`) | must upstream | `nop-chaos-flux` | land shared UI semantic token consumption upstream | analysis lines 98-102 |
| `packages/theme-tokens/src/index.ts` `TOKEN_NAMES` / `TokenName` | historical drift to adjudicate | `nop-chaos-flux` in Phase 2C, `nop-chaos-next` in Phase 5 | either upstream as formal contract or remove from downstream after sync before closure | analysis lines 122-129 |
| `flux-lib/ui/package.json` peer/deps reshaping | confirmed metadata drift | `nop-chaos-next` sync tooling owner, with upstream package policy as source of truth | stop replaying downstream metadata drift; align downstream package metadata to upstream unless documented exception remains | analysis lines 131-136 |
| runtime-only sync `--passWithNoTests` package script drift | expected runtime-only sync residual | `nop-chaos-next` sync tooling owner | keep only if still required by runtime-only sync after metadata hardening; document explicitly | analysis lines 106-118 |

### Repo Ownership And Verification Boundary

- `nop-chaos-flux` owner responsibilities in this plan:
  - land shared-library code and contract changes in `packages/ui`, `packages/theme-tokens`, and `packages/tailwind-preset`
  - run upstream package-level verification before downstream consumes the changes
  - provide the extension mechanism required by scheme B
- `nop-chaos-next` owner responsibilities in this plan:
  - remove stale downstream drift after upstream landing
  - implement host-owned token extension files and host wiring outside synced packages
  - harden `scripts/sync-flux-lib.sh` so metadata drift is not silently replayed
  - prove downstream sync consumed the intended upstream commit via sync log and post-sync verification
- For this plan, `landed upstream` means: the intended change exists in the local sibling repo `../nop-chaos-flux` on top of a concrete commit that can be resolved by `git -C ../nop-chaos-flux rev-parse HEAD`, and the required upstream verification commands for the touched package(s) have passed there.
- For this plan, downstream proof of consumption means all of the following are true:
  - `pnpm sync:flux` completed successfully in `nop-chaos-next`
  - `docs/logs/flux-sync/` recorded the exact upstream commit SHA used for the sync
  - post-sync downstream verification passed against that synced baseline
- For closure vocabulary in this plan, any item adjudicated as a retained downstream integration-layer patch is treated as `adjudicated as residual-risk-only / watch-only` under the guide, provided the plan records why it remains downstream-owned and why it does not block shared-library convergence closure.

## Goals

- 把当前 `nop-chaos-next` 中应属于 shared library 的 Flux 修改尽量回推到 `nop-chaos-flux`。
- 在上游为 theme token 提供方案 B 所需的扩展机制，使宿主扩展定义位于 synced package 之外。
- 让 `nop-chaos-next` 的剩余 Flux 差异只保留明确的集成层改动，而不是继续维护通用库 fork。
- 收紧 `pnpm sync:flux` 的 patch replay 策略，避免继续固化 `peerDependencies` 等 `package.json` 元数据漂移。

## Non-Goals

- 不在本计划内重构整个 Flux runtime bundle (`@nop-chaos/flux`) 的发布方式。
- 不在本计划内把 runtime-only sync 改成 full-source mirror。
- 不在本计划内完成所有潜在 shared UI API 重设计；仅处理已确认 drift 和本次机制收口需要的 API/contract。
- 不在本计划内对 `amis-react19` 工作流做大范围改造。

## Scope

### In Scope

- `../nop-chaos-flux/packages/ui`
- `../nop-chaos-flux/packages/theme-tokens`
- `../nop-chaos-flux/packages/tailwind-preset`
- `nop-chaos-next/flux-lib/ui`
- `nop-chaos-next/packages/theme-tokens`
- `nop-chaos-next/packages/tailwind-preset`
- `nop-chaos-next/scripts/sync-flux-lib.sh`
- `nop-chaos-next/apps/main` 中与 host token extension 注入相关的入口/样式/配置文件
- 相关的 sync / design / analysis / logs 文档

### Out Of Scope

- `../nop-chaos-flux` 中与本次 drift 无关的 renderer、demo、playground 功能开发
- `nop-chaos-next` 非 Flux 来源包的主题系统重构
- 纯视觉微调但不影响 shared contract 的页面级样式修改

## Execution Plan

### Phase 1 - Drift Freeze And Ownership Adjudication

Status: completed
Targets: `docs/analys/2026-05-26-flux-upstream-delta-analysis.md`, `../nop-chaos-flux/packages/{ui,theme-tokens,tailwind-preset}`, `nop-chaos-next/{flux-lib/ui,packages/theme-tokens,packages/tailwind-preset}`

- Item Types: `Decision | Proof`

- [x] 基于 live repo 重新核对当前 upstream/downstream diff，只保留源码与 `package.json` 级别的有效差异列表，排除 `node_modules`、缓存、构建产物。
- [x] 将有效差异逐条裁定为：`upstream stale in downstream`、`must upstream`、`valid downstream integration patch`、或 `historical drift to remove`，并回写到本计划的 drift matrix。
- [x] 将 analysis 中已确认的 in-scope 条目全部纳入 owner 裁定，不得只覆盖子集；如需移出 scope，必须显式写入 `Out Of Scope` 或 successor ownership。
- [x] 记录当前 downstream 允许保留的 integration-layer patch 基线，包括具体路径和允许理由，为 Phase 4 过滤 patch replay 提供白名单依据。

Exit Criteria:

- [x] 存在一份经 live repo 复核的上游化清单，而不是继续依赖粗粒度印象。
- [x] 所有 in-scope drift 都已获得 owner 裁定，不存在“先做一点再说”的模糊项。
- [x] drift matrix 中不存在未归类的 confirmed item。
- [x] No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Upstream Generic Theme Contract Landing

Status: completed
Targets: `../nop-chaos-flux/packages/theme-tokens`, `../nop-chaos-flux/packages/tailwind-preset`, `../nop-chaos-flux/packages/ui`, related upstream tests/docs

- Item Types: `Fix | Decision | Proof`

- [x] 在 `nop-chaos-flux` 上游落地通用 `surface-*` token，明确它们是 shared semantic tokens，而不是 host-only token。
- [x] 在 `nop-chaos-flux/packages/tailwind-preset` 上游落地与 `surface-*` 配套的 preset mapping，而不是继续只保留在 next 下游。
- [x] 将共享 UI 中对 surface contract 的 generic 消费改动回推上游，例如 overlay / subtle surface / related semantic color usage；只保留明确的 host-only 视觉策略在 downstream。
- [x] 为上述 generic contract 增加 focused proof，证明它们在上游是 package-level contract，而不是依赖 `nop-chaos-next` 特定页面上下文。
- [x] 评估并裁定 `host-*` token：不把它们作为 shared library 默认 surface 的一部分落入上游基础 token 集。
- [x] Phase 2A: 对 `textarea.tsx` 做终态裁定并落地。允许的 closure 状态只有两种：
  - upstream landed a chosen shared ref contract, or
  - moved to explicit successor ownership with recorded successor path and removed from this plan scope
- [x] Phase 2B: 对 `dialog.tsx` 与 `dropdown-menu.tsx` 做终态裁定并落地。允许的 closure 状态只有两种：
  - upstream landed the kept contract/API shape, or
  - downstream drift is removed after sync because upstream baseline is accepted as canonical
- [x] Phase 2C: 对 `packages/theme-tokens/src/index.ts` 中 `TOKEN_NAMES` / `TokenName` 做终态裁定并落地。允许的 closure 状态只有两种：
  - upstream formalizes them as public contract, or
  - downstream copy removes them after re-sync because they are not a retained contract
- [x] upstream verification command set 固定为最小相关集，并把结果写入 daily log / plan closure evidence：
  - `pnpm --filter @nop-chaos/theme-tokens typecheck`
  - `pnpm --filter @nop-chaos/theme-tokens build`
  - `pnpm --filter @nop-chaos/tailwind-preset typecheck`
  - `pnpm --filter @nop-chaos/tailwind-preset build`
  - `pnpm --filter @nop-chaos/ui typecheck`
  - `pnpm --filter @nop-chaos/ui build`
  - `pnpm --filter @nop-chaos/ui test`（若 Phase 2 触及 `packages/ui` 源码，则为必跑项；若未触及 `packages/ui`，在 execution note 中明确写 `No @nop-chaos/ui test required`）

Exit Criteria:

- [x] `surface-*` contract 在上游成立，并具备对应 preset / UI 消费证明。
- [x] `host-*` token 不再被当作 generic base token 强行写入 shared package 默认面。
- [x] `textarea.tsx`、`dialog.tsx`、`dropdown-menu.tsx`、`TOKEN_NAMES` / `TokenName` 均已达到本 phase 定义的唯一允许终态之一。
- [x] 上游相关 focused verification 已通过。
- [x] 已记录可用于 downstream sync 的 upstream commit SHA。
- [x] 上游相关 owner docs 已更新，或明确 `No owner-doc update required` 并给出依据。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Host Token Extension Mechanism (Scheme B)

Status: completed
Targets: `../nop-chaos-flux/packages/theme-tokens`, `../nop-chaos-flux/packages/tailwind-preset`, `nop-chaos-next/apps/main`, related design docs

- Item Types: `Decision | Fix | Proof`

- [x] 在上游为 theme token 体系提供方案 B 所需的扩展机制：shared package 定义基础 token contract、类型级合并工具或 extension interface、以及必要的 preset extension 接口；宿主扩展定义不落在 synced package 内。
- [ ] 本计划采用以下具体机制，不在执行时再重新发散设计：
  - upstream `packages/theme-tokens` 提供固定 contract：`BASE_TOKEN_NAMES`、`BaseTokenName`、`HostTokenExtension`、`defineHostTokenExtension()`
  - `HostTokenExtension` 的 allowed surface 固定为：`tokens`（host-only token names map）, `cssFile`（host extension css import path metadata only, if needed for tooling), `tailwindThemeExtension`（tailwind `theme.extend` compatible object）
  - host extension 不允许直接重定义 upstream base token names；只允许新增 host-owned token namespace，或通过 host wiring 明确消费 shared base token
  - upstream `packages/tailwind-preset` 提供固定入口 `createNopTailwindPreset(extension?: HostTokenExtension['tailwindThemeExtension'])`
  - downstream host extension 文件固定放在 `apps/main/src/styles/flux-host-token-extension.css` 与 `apps/main/src/styles/fluxHostTailwindExtension.ts`
  - downstream host CSS extension 在 `apps/main/src/main.tsx` 中于 `@nop-chaos/theme-tokens/styles.css` 之后导入
  - downstream Tailwind extension 由 `apps/main/tailwind.config.ts` 或根 `tailwind.config.ts` 通过 `createNopTailwindPreset(...)` 合并注入，而不是回写 `packages/tailwind-preset`
- [x] 在 `nop-chaos-next` 包外新增上述 host token extension 定义文件与 host extension CSS/entry wiring，路径位于宿主自有目录而不是 `packages/theme-tokens` 或 `packages/tailwind-preset`。
- [x] 将当前必须保留的 host-specific token 扩展从 synced package 中迁出到 host-owned extension 文件。
- [x] 明确 merge semantics：base token contract 仍由 upstream owner；host extension 只能新增 host-owned token namespace 或覆盖 host wiring 显式允许的 host-facing aliases，不能直接改写 shared base token 文件。
- [x] Focused proof 固定为：
  - `apps/main/src/main.tsx` 导入链路显示 base CSS + host extension CSS 顺序成立
  - Tailwind config 通过扩展入口消费 host extension，而不是穿透 synced package 源码
  - 移除 synced package 中的 host-only token 之后，`apps/main` 仍能解析 host 主题所需 token 和 utilities
- [x] upstream verification command set for scheme B 固定为：
  - `pnpm --filter @nop-chaos/theme-tokens typecheck`
  - `pnpm --filter @nop-chaos/theme-tokens build`
  - `pnpm --filter @nop-chaos/tailwind-preset typecheck`
  - `pnpm --filter @nop-chaos/tailwind-preset build`
  - focused tests covering the extension helper / preset extension contract（若 Phase 3 新增了上游 helper/preset contract tests，则为必跑项；若未新增测试文件，则在 execution note 中明确写 `No new upstream extension test introduced`）
- [x] 记录 Phase 3 scheme-B landing 所对应的 upstream commit SHA，并在 downstream Phase 5 消费时引用同一 SHA。

Exit Criteria:

- [x] 方案 B 已通过 live code 形式成立：宿主扩展位于 package 外部，shared package 只提供基础 contract 与 extension mechanism。
- [x] `nop-chaos-next` 不再通过直接修改 synced package 文件来表达 host-only token 扩展。
- [x] 相关 design docs 已更新，说明基础 token 与 host extension 的边界。
- [x] Focused verification 证明 host extension 注入链路有效。
- [x] host extension 文件路径与注入点已固定，不需要后续执行者再次裁定位置。
- [x] upstream package-level verification 与 consumed upstream SHA 均已记录。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Sync Script And Metadata Drift Hardening

Status: completed
Targets: `nop-chaos-next/scripts/sync-flux-lib.sh`, `nop-chaos-next/docs/references/flux-sync-spec.md`, synced package `package.json`

- Item Types: `Fix | Decision | Proof`

- [x] 将 patch replay 从“整目录 diff 回放”收紧到“明确白名单路径/字段回放”，不得继续把整个 `package.json` 当作普通补丁文件重放。
- [x] 对 `package.json` 采用明确字段策略：
  - downstream 禁止回放：`peerDependencies`、`dependencies`、`optionalDependencies`、`exports`
  - downstream 禁止回放：`devDependencies`
  - downstream 仅在 runtime-only sync contract 仍需要时允许回放：`scripts.test`
  - 任何新增允许字段都必须写入 `docs/references/flux-sync-spec.md`
- [x] sync 脚本实现策略固定为二选一，其一必须被落实并记录：
  - 方案 1：对 `package.json` 完全不生成 downstream patch，由上游文件直接落地；仅对极少数字段执行脚本级显式后处理
  - 方案 2：对 `package.json` 生成结构化白名单合并，而不是 `git apply` 原始 diff
- [x] 观察性 closure check 固定为：执行 `pnpm sync:flux` 后，`flux-lib/ui/package.json`、`packages/theme-tokens/package.json`、`packages/tailwind-preset/package.json` 中 `peerDependencies` / `dependencies` / `devDependencies` / `exports` 与 upstream 对应文件一致；若 `scripts.test` 有 residual 差异，差异必须仅限 runtime-only sync 约定。
- [x] 补充 focused verification，证明收紧后的 sync 仍能完成预期的 runtime-only sync，而不会误删 Phase 1 白名单中的必要 host integration patch。

Exit Criteria:

- [x] `peerDependencies` / `dependencies` 语义不再被 sync patch 机制静默改写。
- [x] `devDependencies` 不再被 sync patch 机制静默改写。
- [x] runtime-only sync 所需的剩余 `package.json` 差异被明确、最小化、并写入 sync spec。
- [x] `pnpm sync:flux` 的 live behavior 与文档一致。
- [x] `docs/references/flux-sync-spec.md` 已同步到新的 live policy。
- [x] post-sync `package.json` closure check 已实际执行并记录。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 5 - Downstream Re-Sync, Residual Cleanup, And Closure Audit

Status: completed
Targets: `nop-chaos-next/flux-lib/ui`, `nop-chaos-next/packages/theme-tokens`, `nop-chaos-next/packages/tailwind-preset`, related docs/logs

- Item Types: `Fix | Proof | Follow-up`

- [x] 以上游已 landing 的变更为基线重新执行 `pnpm sync:flux`，验证 downstream copy 收敛到新的 expected state。
- [x] 清理已被 upstream absorb 的本地历史 drift，确保 downstream tree 不再保留已无必要的 compatibility patch。
- [x] 重新审查剩余差异，确认它们全部属于明确的 integration-layer patch 或已裁定 residual。
- [x] 完成 `nop-chaos-next` 侧验证，固定命令集为：
  - `pnpm sync:flux`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm test`（若本计划触及 downstream 测试覆盖面或新增/更新 focused tests，则为必跑项；若纯属文档/脚本/配置收敛且无相关 downstream tests，则在 execution note 中明确写 `No additional downstream test required`）
- [x] 记录 sync 消费证明：引用 `docs/logs/flux-sync/` 中对应记录的 upstream commit SHA，并在 closure note 中写明 downstream consume 的是该 SHA。
- [x] 执行独立子 agent closure audit，确认 plan 没有把 live defect、contract drift 或 owner-doc drift 静默降级。

Exit Criteria:

- [x] 下游所有 in-scope confirmed drift 已达到 closure gate 允许的唯一终态：已 landed（包括 drift removal 已 landed 并 re-sync）、已 moved to explicit successor ownership、或已 adjudicated as residual-risk-only / watch-only（retained downstream integration patch）。
- [x] `pnpm sync:flux` 后的 live repo 与本计划预期一致。
- [x] `pnpm typecheck`、`pnpm build`、`pnpm lint` 通过；如涉及测试，相关 focused verification 已完成。
- [x] closure note 已写明 upstream landed SHA 与 downstream consumed SHA 的对应关系。
- [x] 相关 docs/logs 已更新，并记录独立 closure audit 证据。
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] 所有 in-scope confirmed shared-library drifts 已 landed upstream 并在 downstream 重新同步、已 moved to explicit successor ownership、或已 adjudicated as residual-risk-only / watch-only（retained downstream integration patch）
- [x] 方案 B 的 host token extension 已成立，宿主不再通过编辑 synced package 承担 host-only token 扩展
- [x] `peerDependencies` / package metadata 漂移不再被 sync patch 机制静默固化
- [x] runtime-only sync contract 与实际脚本行为一致
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 已裁定为 adjudicated as residual-risk-only / watch-only（retained downstream integration patch）的条目不再计为 unresolved shared-library drift，且每项都写明了 downstream-owned 理由与 non-blocking 依据
- [x] 受影响的 owner docs 已同步到 live baseline
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] upstream verification command set 已完成并记录
- [x] downstream `pnpm typecheck`
- [x] downstream `pnpm build`
- [x] downstream `pnpm lint`
- [x] downstream `pnpm test` 已执行，或已在 closure note 中明确裁定 `No additional downstream test required` 并给出不阻塞理由

## Deferred But Adjudicated

### Runtime-Only Sync Keeps Upstream Tests Out Of Downstream Tree

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本计划的目标是 shared-library drift 上游化与 host extension 收口，不是把 runtime-only sync 改造成 full-source mirror；只要 test-source 删除行为被文档化且不再掩盖 metadata drift，它本身不阻塞当前 closure。
- Successor Required: `no`
- Successor Path: `N/A`

## Non-Blocking Follow-ups

- 如果后续要把 runtime-only sync 升级为 full-source mirror，应单独起一个 owner plan，重新裁定测试源码、package scripts、以及 workspace verification 责任分配。

## Closure

Status Note: Completed. Plan 29 closed after upstream landing in `../nop-chaos-flux` and downstream consumption via `pnpm sync:flux`; the synced packages now converge to upstream source plus the documented runtime-only `scripts.test` residual only.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_19bee080dffeOXfafT5QOKH4wC`
- Evidence: Independent closure audit initially flagged three blockers: residual `flux-lib/ui/src/components/ui/label.tsx` source drift, stale sync-owner docs that still described patch replay, and missing closure-grade verification evidence. Resolved by upstreaming the final `label.tsx` cleanup to `../nop-chaos-flux/packages/ui/src/components/ui/label.tsx`, re-running `pnpm sync:flux`, updating `docs/references/flux-sync-spec.md`, `docs/references/build-guide.md`, `docs/logs/flux-sync/index.md`, and recording both upstream and downstream verification in `docs/logs/2026/05-26.md` plus consumed SHA evidence in `docs/logs/flux-sync/2026/05-26.md`.

Follow-up:

- If the repo later wants a full-source mirror instead of runtime-only sync, create a separate owner plan to re-adjudicate whether test-source removal and `scripts.test = vitest run --passWithNoTests` should remain.
