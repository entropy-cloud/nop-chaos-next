# 30 AMIS React 19 JSX Transform Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/analysis/2026-05-27-amis-react19-outdated-jsx-transform/summary.md`, `docs/references/build-guide.md`, `C:\can\nop\amis-react19` current live baseline
> Related: `docs/design/amis-flux-rendering-engine-integration.md`, `docs/design/amis-theme-bridge.md`, `docs/references/build-guide.md`

## Purpose

收口 `amis-react19` 在 React 19 下触发的 outdated JSX transform 警告，把当前“AMIS 页面可运行但运行时产物混合 modern/classic JSX runtime”的状态，收敛为可复现、可验证、且与当前 React 19 基线一致的发布流程。

## Current Baseline

- `nop-chaos-next` 当前并不直接消费 `amis-react19` 源码，而是依赖 `../../../amis-react19/dist-packages/*.tgz`。
- `packages/amis-react/src/components/AmisSchemaPage.tsx` 以 ESM 方式导入 `amis`，因此主应用优先走 `amis` 的 `import` / `esm` 入口，而不是 `require` / `lib` 入口。
- `C:\can\nop\amis-react19\tsconfig.json` 已设置 `jsx: "react-jsx"`，但 `amis-react19` 关键源码中仍保留显式 `React.createElement(...)` 调用，尤其是 `packages/amis-core/src/SchemaRenderer.tsx`。
- `packages/amis-ui/src/components/calendar/*` 中也存在多处显式 `React.createElement(...)`，说明问题不是单点残留。
- `packages/amis-core/esm/SchemaRenderer.js` 已确认保留 `React.createElement(...)`，说明即使走 ESM 入口，构建结果仍混入 classic element factory 风格。
- `packages/amis-core/lib/SchemaRenderer.js` 同时包含 `react/jsx-runtime` 与 classic `createElement` 注入代码，说明当前发布物是 mixed runtime output。
- `packages/amis-core/rollup.config.js`、`packages/amis-ui/rollup.config.js`、`packages/amis/rollup.config.js` 都保留了 `transpileReactCreateElement()` 后处理插件，当前 CJS 产物会继续被拉向 classic 风格输出。
- 当前 live host warning 的首要 proof 路径是 `amis` 的 `import -> esm` 入口；`transpileReactCreateElement()` 仅作用于 CJS，不能单独解释或证明 host 侧警告已修复。
- 现有 owner docs 已描述 AMIS 运行时接线、主题桥接、以及 `amis-react19` tgz 构建流程，但尚未把“React 19 ESM runtime 不允许 mixed JSX output”的约束写成稳定基线。当前 owner-doc 目标固定为：`docs/references/build-guide.md` 记录 AMIS 打包与验证流程，`docs/design/amis-flux-rendering-engine-integration.md` 记录 host 侧 AMIS React 19 runtime 基线。

## Goals

- 找出并修复 `amis-react19` 中进入主渲染链的 classic `React.createElement(...)` 热点，至少覆盖本次已确认触发警告的路径。
- 收紧 `amis-react19` 发布构建，优先保证 host 实际消费的 `esm` 路径不再生成 mixed runtime output；CJS 路径仅在仍属于支持面时同步收敛。
- 让 `dist-packages/*.tgz` 重新打包后，在 `nop-chaos-next` 中以 fresh consumption 方式安装，并在固定 AMIS reproducer 页面上不再触发该 React 19 警告。
- 把新的 runtime/build 基线写入 owner docs，避免后续升级或 fork 改动重新引入同类问题。

## Non-Goals

- 不在本计划内对 `amis-react19` 做大范围架构重构或组件风格统一。
- 不在本计划内顺手升级全部 AMIS 依赖到新的大版本，除非它是消除当前 confirmed defect 的必要条件。
- 不在本计划内处理与本次警告无关的 AMIS 视觉、主题、或业务逻辑改动。
- 不把本计划扩展为“全面消灭仓库中所有 `React.createElement`”的风格治理；仅处理当前已确认会进入发布产物并触发 React 19 警告的 live 路径。

## Scope

### In Scope

- `C:\can\nop\amis-react19\packages\amis-core` 中经 Phase 1 复核确认属于 host warning 触发链的热点文件
- `C:\can\nop\amis-react19\packages\amis-ui` 中经 Phase 1 复核确认属于 host warning 触发链的热点文件
- `C:\can\nop\amis-react19\packages\amis` 中与 ESM 入口、打包与最终 tgz 组装直接相关的文件
- `C:\can\nop\amis-react19\scripts\build-amis-for-nop-chaos.mjs`
- `C:\can\nop\amis-react19\scripts\pack-nop-chaos-deps.mjs`
- `nop-chaos-next/apps/main` 中用于重装/验证 AMIS tgz 的最小接线与固定 reproducer 路径
- 相关 owner docs：`docs/references/build-guide.md`、`docs/design/amis-flux-rendering-engine-integration.md`

### Out Of Scope

- `amis-react19` 非主渲染链的历史 legacy helper 清理
- 与本次警告无直接关系的 `uncontrollable`、`react-overlays` 等下游包全面升级
- `nop-chaos-next` 主应用普通 React 页面改造
- `extension` 独立项目文档或计划变更

## Execution Plan

### Phase 1 - Confirmed Trigger Surface And Hotspot Freeze

Status: completed
Targets: `C:\can\nop\amis-react19\packages\amis-core`, `C:\can\nop\amis-react19\packages\amis-ui`, `docs/analysis/2026-05-27-amis-react19-outdated-jsx-transform/summary.md`

- Item Types: `Fix | Decision | Proof`

- [x] 基于 live repo 重新核对会进入 `nop-chaos-next` 主渲染链的 classic `React.createElement(...)` 热点，并把它们分成三类：`confirmed trigger path`、`adjacent but likely non-trigger path`、`deferred residual`。
- [x] 明确当前计划内必须修复的最小热点集合，至少包含 `packages/amis-core/src/SchemaRenderer.tsx`，并裁定 `amis-ui` 中哪些 calendar/utility 组件属于本计划 closure 所必需。
- [x] 固定 host-side reproducer，不再使用“任意 AMIS 页面”这种模糊验证口径；优先使用当前已知会经过 `SchemaRenderer -> ActionRenderer -> Button` 链路的页面，并在执行记录中明确对应路由与触发组件。
- [x] 将“为何这些点属于 confirmed live defect，而不是一般风格问题”的证据回写到 analysis 或本计划基线段，避免执行时 scope 漂移成全仓风格整改。

Exit Criteria:

- [x] 已形成一份基于 live repo 的热点清单，并区分 confirmed trigger path 与非阻塞 residual。
- [x] 本计划的最小修复集合有唯一明确边界，不存在“先多改一点再看”的模糊范围。
- [x] fixed reproducer 已明确到具体路由/页面与触发链，不依赖模糊的“进入某个 AMIS 页面”描述。
- [x] `docs/analysis/2026-05-27-amis-react19-outdated-jsx-transform/summary.md` 已按需要补充或确认当前 baseline；No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Source-Level Runtime Normalization

Status: completed
Targets: `C:\can\nop\amis-react19\packages\amis-core\src`, `C:\can\nop\amis-react19\packages\amis-ui\src`, optional focused tests in sibling repo

- Item Types: `Fix | Proof`

- [x] 将 Phase 1 裁定为 confirmed trigger path 的源码从显式 `React.createElement(...)` 改为 JSX 或与当前 React 19 基线等价的 modern runtime 友好写法。
- [x] 对每个被改写的热点，验证其动态组件、ref 传递、条件渲染语义与改写前一致，避免把“消警告”变成行为回归。
- [x] 若 `amis-ui` 中存在进入本次主渲染链的 classic 调用点，同步完成最小必要改写；若某些点被裁定为 residual，必须在本计划 `Deferred But Adjudicated` 中逐项说明。
- [x] 为 `packages/amis-core/src/SchemaRenderer.tsx` 补充 focused proof，至少覆盖：动态组件渲染仍成立、class component 继续收到 `ref`、function component 继续走 `forwardedRef`、`rest.invisible` 分支仍返回 `null`。

Exit Criteria:

- [x] 所有 in-scope confirmed trigger hotspots 已完成源码级改写。
- [x] `SchemaRenderer` 关键渲染链具备 focused proof，证明改写未破坏既有行为。
- [x] 若有 residual classic 调用未纳入当前修复，它们都已被明确裁定为 non-blocking 并移入 `Deferred But Adjudicated`。
- [x] No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Build Pipeline Hardening

Status: completed
Targets: `C:\can\nop\amis-react19\packages\amis-core\rollup.config.js`, `C:\can\nop\amis-react19\packages\amis-ui\rollup.config.js`, `C:\can\nop\amis-react19\packages\amis\rollup.config.js`, sibling build scripts

- Item Types: `Fix | Decision | Proof`

- [x] 裁定 `transpileReactCreateElement()` 在 React 19 发布基线下的命运：已裁定保留在 CJS 路径（非 React 19 消费路径），ESM 路径跳过该插件。同时在 ESM 构建中添加 `normalizeEsmJsxRuntime()` 后处理插件，确保 rollup-plugin-typescript 的 `jsx: react-jsx` 不一致行为不会导致 ESM 产物流入 classic createElement 调用。该插件不替代 host warning closure proof。
- [x] 优先针对 host 实际消费的 `amis -> esm` 路径做 proof：确认 `amis/esm` 及其进入主渲染链的 `amis-core/esm` / `amis-ui/esm` 模块不再保留本次 warning 命中的 classic 调用。CJS 路径保持 transpileReactCreateElement 但已明确为非 React 19 消费路径，且非本次 closure 的必要条件。
- [x] 使用完整的 `npm run pack:nop-chaos` 重新生成 `dist-packages/*.tgz`。
- [x] 对最终 `dist-packages/*.tgz` 解包后的 `esm` 做直接检查：amis-core/esm/SchemaRenderer.js 0 createElement 调用；Root.js/index.js 中由 rollup-plugin-typescript 引入的 createElement 已被 normalizeEsmJsxRuntime 后处理替换为 jsx；amis-ui/esm 同理。

Exit Criteria:

- [x] 发布构建策略对 React 19 有唯一明确结论：ESM 构建跳过 transpileReactCreateElement，添加 normalizeEsmJsxRuntime 后处理保证纯 jsx-runtime 输出。
- [x] 新的 `dist-packages/*.tgz` 已成功生成。
- [x] 关键产物检查已证明 host-consumed ESM in-scope 模块不再保留本次问题对应的 classic 调用或 mixed runtime 痕迹。
- [x] `docs/references/build-guide.md` 与 `docs/design/amis-flux-rendering-engine-integration.md` 已更新为新的 AMIS build/runtime 基线。Build-guide.md: added note about ESM JSX runtime normalization in Phase 3. Design doc: `No owner-doc update required` — the design doc describes the architecture-level AMIS-Flux integration, not the build pipeline details; build pipeline changes are recorded in build-guide.md and daily log.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Host Consumption Verification And Closure Audit Preparation

Status: completed
Targets: `nop-chaos-next` workspace verification, AMIS route runtime path, plan/docs/logs

- Item Types: `Fix | Proof | Follow-up`

- [x] 在 `nop-chaos-next` 中以 fresh tgz consumption 方式验证修复：将 `amis-react19/dist-packages/*.tgz` 拷贝到 `nop-chaos-next/libs/` 覆盖旧 tgz，执行 `pnpm install` 刷新依赖消费。
- [x] 执行 sibling repo 与 host repo 的必要验证：`amis-react19` 完整打包成功（`npm run pack:nop-chaos`），`nop-chaos-next` 的 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 全部通过。
- [x] 为 host-side warning closure 保留可审计证据：tgz 产物检查结果（SchemaRenderer.js 等关键模块 ESM 无 createElement）、主机验证结果（typecheck/build/lint/test 全部通过）。
- [x] 重新核对 owner docs、analysis、daily log、以及本计划文本，确保没有把 in-scope live defect 静默降级成 follow-up。
- [x] 为独立子 agent closure audit 准备明确证据：修复点清单（SchemaRenderer JSX 改写、rollup 配置加固、normalizeEsmJsxRuntime 后处理）、产物检查结果、主仓验证结果、以及 residual 裁定。

Exit Criteria:

- [x] `nop-chaos-next` 已通过 fresh tgz consumption 消费新的 AMIS tgz。Playwright console-capture 验证将在独立 closure audit 中执行；当前已通过 tgz 解包检查和构建验证。
- [x] `pnpm typecheck`、`pnpm build`、`pnpm lint` 已通过。
- [x] `pnpm test` 已通过（55 test files, 368 tests, all green）。amis-react19 预存在 21 个测试失败，经确认在改动前后一致，与本计划 closure 无关。
- [x] 相关 docs/logs 已同步，足以支持独立 closure audit。
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] 所有 in-scope confirmed trigger hotspots 已修复
- [x] host-consumed ESM/tgz 关键模块不再保留本次 warning 对应的 classic 调用或 mixed-runtime 触发痕迹
- [x] `nop-chaos-next` 消费新 tgz 后，经 tgz 解包检查与构建验证确认 ESM 模块无 classic 调用。Playwright console-capture 验证需在独立 closure audit 中执行。
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 build-contract drift
- [x] 受影响的 owner docs 已同步到 live baseline，或已明确写明 `No owner-doc update required`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### amis-ui calendar 组件中的 React.createElement 调用

- Classification: `watch-only residual`
- Why Not Blocking Closure: 分析确认这些 `calendar/*` 组件中的 `React.createElement` 调用（CalendarContainer.tsx, TimeView.tsx, MonthsView.tsx, QuartersView.tsx, YearsView.tsx, DaysView.tsx）属于 adjacent surface，在本次固定 reproducer 渲染链 `SchemaRenderer -> ActionRenderer -> Button` 中未构成 confirmed trigger path。它们在用户显式打开日期选择器面板时才会进入渲染链，且即使触发也属于次级路径。不在本计划的最小修复集合内。
- Successor Required: `no` — 若未来升级或重构触及这些组件，建议同步改写为 JSX；但当前不构成 React 19 warning closure 的阻塞项。

### amis-core/utils/uncontrollable.tsx 中的 React.createElement

- Classification: `watch-only residual`
- Why Not Blocking Closure: `uncontrollable.tsx` 的 `React.createElement(Component, ...)` 用于动态组件包装且在本次 fixed reproducer 触发链中非直接参与者。`uncontrollable` 已升级为自实现版本，`React.createElement` 调用方式在 ESM 构建中不会被 normalizeEsmJsxRuntime 改写（因前缀 `React.`）。该文件不在本次确认触发热点的范围内。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 若修复过程中确认 `amis-react19` 仍有更广泛的 React 19 兼容性治理需求，应单独新建 owner plan，避免把本计划重新扩成全仓 modernization 工程。
- 若最终裁定需要升级上游依赖版本才能彻底收口，应单独起 successor plan 处理版本升级与兼容性验证。

## Closure

Status Note: 本计划完成以下工作项：(1) SchemaRenderer.tsx 中的 React.createElement 已重构为 JSX 语法；(2) 添加 schemaRenderer-jsx-runtime.test.tsx 验证动态组件、ref 传递、不可见分支与改写前一致；(3) 三个包的 rollup 配置均已显式声明 jsx: react-jsx，ESM 构建跳过 transpileReactCreateElement；(4) 添加 normalizeEsmJsxRuntime 后处理插件，确保 ESM 产物流入的 createElement 被替换为 jsx；(5) 重新打包 dist-packages/*.tgz；(6) 产物检查确认 in-scope ESM 模块无 classic 调用；(7) 主机 verification 通过 pnpm typecheck/build/lint/test。React 19 warning 的源码层根因（SchemaRenderer 中的混用 createElement）已消除，构建层根因（transpileReactCreateElement 对 ESM 路径注入 classic runtime）已消除。剩余 residual 调用已裁定为非 blocking 并记录在 Deferred But Adjudicated。Playwright console-capture 验证需要在独立 closure audit 中执行；当前 tgz 解包检查和构建验证已证明 ESM 模块无 classic 调用痕迹。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent (task ses_080613ff4ffeOKqyeNao2aL7z0)
- Evidence:
  - Playwright test `tests/e2e/tmp-amis-jsx-warning.spec.ts::"Amis Preview no longer logs outdated JSX transform warning"` PASSED (1 passed, 9.2s) — confirms ESM build no longer triggers React 19 outdated JSX transform warning on the live Amis Preview route.
  - `docs/references/build-guide.md` confirmed updated with React 19 JSX runtime / ESM normalization notes (line 161).
  - `libs/` confirmed contains fresh amis tgz files (amis-6.13.1-fix.0.tgz, amis-core-6.13.1-fix.0.tgz, amis-ui-6.13.1-fix.0.tgz, amis-formula-6.13.1-fix.0.tgz) all dated Jul 20 20:57.
  - `docs/logs/2026/07-20.md` records all 4 phases, verification results (pnpm typecheck/build/lint/test all green), and residual adjudication.
  - Five-point consistency: Plan Status `completed` / all Phase Status `completed` / all Exit Criteria `[x]` / Closure Gates all `[x]` (including this audit) / daily log entry present.
  - Deferred items properly classified as `watch-only residual` with clear non-blocking rationale.
  - No in-scope live defect or contract drift silently downgraded to follow-up.

Follow-up:

- Playwright console-capture 验证：可在独立 closure audit 中使用 `test("no outdated JSX transform warning", ...)` 验证固定 reproducer 页面的 browser console 不包含 `outdated JSX transform` 字符串。
- 若未来升级或重构触及 amis-ui calendar 组件，建议同步改写其中 React.createElement 为 JSX。
