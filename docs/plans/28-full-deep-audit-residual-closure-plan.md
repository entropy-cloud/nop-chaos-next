# 28 Full Deep-Audit Residual Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-deep-audit-full/summary.md`, plus live repo re-audit on 2026-05-18 after `docs/plans/27-adversarial-review-contract-state-closure-plan.md` closure
> Related: `docs/plans/22-current-deep-audit-remediation-plan.md`, `docs/plans/23-flow-editor-reactive-cost-plan.md`, `docs/plans/24-coverage-and-hygiene-follow-up-plan.md`, `docs/plans/25-api-surface-hygiene-follow-up-plan.md`, `docs/plans/26-plugin-esm-dual-format-follow-up-plan.md`, `docs/plans/27-adversarial-review-contract-state-closure-plan.md`

## Purpose

收口 `2026-05-18 deep-audit-full` 在当前 live baseline 下仍成立、且尚未被现有 completed/planned successor 明确 owner 的剩余高风险问题，重点解决 4 类 residual risk：shell auth/i18n/route canonicalization、plugin/extension runtime boundary、核心页面异步结果归属保护、以及样式/模块语义漂移。

## Ownership Note

- 本计划只 owner `docs/analysis/2026-05-18-deep-audit-full/summary.md` 中在 2026-05-18 live repo 复核后仍然成立、且尚未被现有 plan 明确接手的 retained findings。
- 以下项不由本计划重复 owner：
  - `05-04 useFlowEditorActions` 响应式 fan-out，已由 `docs/plans/23-flow-editor-reactive-cost-plan.md` 接手。
  - `08-08` native ESM plugin/shared-modules 契约收敛，已由 `docs/plans/26-plugin-esm-dual-format-follow-up-plan.md` 接手。
  - 低风险 API/export hygiene 尾项，已由 `docs/plans/25-api-surface-hygiene-follow-up-plan.md` 接手。
- `docs/plans/27-adversarial-review-contract-state-closure-plan.md` 已关闭的 extension URL contract、broad canonical theme parsing/state alignment（含 `09-13` store/UI/bridge/bound-store 面）、dynamic `homePath` dual-home tab、以及 AI Workbench lifecycle cancellation，不再按 open gap 重复 owner。
- 如果本计划执行前 live repo 已进一步消除某条 finding，则必须在执行 slice 中显式做 current-baseline 重裁定，而不是机械沿用本文件。

## Current Baseline

- `docs/analysis/2026-05-18-deep-audit-full/summary.md` 已确认 4 组最值得优先处理的真实风险：公共 contract 过宽、异步结果回写竞态、canonical state 未统一、关键 hook 与失败态测试不足。
- 2026-05-18 当天的 Plan 27 已经额外关闭了部分重叠问题，因此本计划的 baseline 不是机械照搬 summary，而是以 summary 加 live repo 复核后的剩余缺口为准。
- `09-13` 所指向的 canonical theme 解析/对齐问题已由 Plan 27 在 store、UI、plugin bridge、bound-store 相关路径上收口；本计划只继续 owner 尚未关闭的 theme/style residual，如 extension theme registration、AMIS theme bridge、`tableRowClassName`、以及 shared UI style drift。
- 现存的剩余 gap 主要集中在：
  - auth token 仍在 Zustand store 与 shared token manager 两处存放，写入/恢复路径不完全一致。
  - extension bootstrap 的 auth/i18n 初始化顺序仍可能晚于持久化 hydrate 或首次 i18n 初始化。
  - `AppRoutes` 仍未让 `/auth/login` 与 shell `*` fallback 完整走 `systemPages` contract；首页求值仍需按可访问结果收敛。
  - `loadExtensions()` 仍无 timeout/cancel，且 `ShellExtension` runtime guard 只校验非空 `id`。
  - plugin-facing bridge surface 仍公开 `setPluginBridge()`，`PluginBridge.stores` 的类型语义仍比真实实现更宽。
  - master-detail detail 与 flow editor 的保存/切换路径仍缺请求归属保护；对应 focused tests 仍薄弱。
- `master-detail/index.tsx`（当前 500 行）与 `packages/amis-core/src/core/ajax.ts`（当前 420 行）仍是职责堆积热点；AMIS theme bridge、`tableRowClassName` 双实现，以及 shared UI style-surface 审计残项仍未收口。

## Findings Coverage

| Finding | Severity | Owner Workstream |
| --- | --- | --- |
| `02-01` `apps/main/src/pages/data-management/master-detail/index.tsx` 职责堆积 | P1 | Workstream 4 |
| `02-04` `packages/amis-core/src/core/ajax.ts` 职责堆积 | P1 | Workstream 4 |
| `04-02` auth token 双源状态 | P1 | Workstream 1 |
| `04-06` extension 语言注册晚于 i18n 初始化 | P1 | Workstream 1 |
| `04-07` extension auth 配置晚于 auth hydrate | P1 | Workstream 1 |
| `06-01` 当前用户恢复绕过统一 401/refresh 链路 | P1 | Workstream 1 |
| `06-03` `useAuthBootstrap` 缺会话归属校验 | P1 | Workstream 1 |
| `06-05` `loadExtensions()` 无 timeout/cancel | P1 | Workstream 2 |
| `06-08` detail 保存结果缺请求归属校验 | P1 | Workstream 3 |
| `06-09` flow 保存结果缺流程归属校验 | P1 | Workstream 3 |
| `06-10` 切换 detail `id` 后旧草稿继续展示 | P1 | Workstream 3 |
| `06-11` 切换 flow `id` 后旧画布继续可操作 | P1 | Workstream 3 |
| `07-01` `/auth/login` 未接入 `systemPages.login` | P1 | Workstream 1 |
| `07-04` wildcard `*` 未接入 `systemPages.notFound` | P1 | Workstream 1 |
| `07-07` 首页路径按完整菜单树求值，可能落到不可访问入口 | P1 | Workstream 1 |
| `08-01` `PluginBridge.stores` 类型伪装成 Zustand hook | P1 | Workstream 2 |
| `08-04` remote plugin 可导入 `setPluginBridge()` 覆盖全局 bridge | P1 | Workstream 2 |
| `08-09` `usePluginI18n()` 语言切换重渲染语义不稳 | P1 | Workstream 2 |
| `09-03` extension theme registration contract 未完全证明接通 | P1 | Workstream 2 |
| `09-09` AMIS theme bridge 污染宿主 `--background` 语义 | P1 | Workstream 4 |
| `09-10` `tableRowClassName` 双实现且语义分叉 | P1 | Workstream 4 |
| `09-11` shared UI primitives 裸色值残留 | P1 | Workstream 4 |
| `11-05` `ShellExtension` 类型守卫过宽 | P1 | Workstream 2 |
| `12-02` RouteRenderer 关键分支/失败态缺测试 | P1 | Workstream 1 |
| `12-03` `useAuthBootstrap` / 登录失败恢复缺测试 | P1 | Workstream 1 |
| `12-11` AppShell tab/homePath 联动缺真实测试 | P1 | Workstream 1 |
| `12-12` `ensurePluginSharedModules()` 并发去重/失败重试缺测试 | P1 | Workstream 2 |
| `12-13` `useFlowPersistence` 保存/恢复/失败链路缺测试 | P1 | Workstream 3 |
| `12-15` `useMenuConfigQuery` queryKey/enabled 行为缺测试 | P1 | Workstream 1 |
| `12-16` flow editor 核心交互与离页保护缺测试 | P1 | Workstream 3 |

## Goals

- 消除当前 live baseline 中仍未 owner 的 retained P1 runtime defect、contract drift、owner-doc drift 与 verification gap。
- 为 auth/i18n/route、plugin/extension boundary、core-page async ownership、style/module semantics 四个面建立单一可验证基线。
- 在关闭本计划时，所有 in-scope findings 都必须落到 `landed`、`adjudicated as residual-risk-only / watch-only`、`moved to explicit successor ownership`、或 `removed from scope through a recorded scope change` 四种状态之一。

## Non-Goals

- 不重复执行已由 `23/25/26/27` 接手或关闭的工作；`24` 号计划虽引用旧 retained coverage source，但其 active scope 不含本计划 owner 的 auth/route/flow/plugin runtime proof，因此本计划在这些面上视为 superseding owner。
- 不把本计划扩张成整仓 store 架构重写、全量主题系统重做、或 plugin runtime 全新设计。
- 不把 `master-detail`、`ajax.ts` 的拆分演化成大范围命名/目录整理；仅做支持当前 finding closure 的最小分解。
- 不在本计划内落地 native ESM plugin 的完整 shared-modules 支持；若该 finding 仍成立，只能显式接到 `docs/plans/26-plugin-esm-dual-format-follow-up-plan.md`，不能继续悬空。

## Scope

### In Scope

- `apps/main/src/store/authStore.ts`
- `apps/main/src/services/http.ts`
- `apps/main/src/services/authApi.ts`
- `apps/main/src/amis/adapter.ts`
- `apps/main/src/hooks/useAuth.ts`
- `apps/main/src/hooks/useAuth.test.ts`
- `apps/main/src/main.tsx`
- `apps/main/src/extensions/bootstrap.ts`
- `apps/main/src/config/i18n/index.ts`
- `apps/main/src/config/i18n/languages.ts`
- `apps/main/src/router/AppRoutes.tsx`
- `apps/main/src/router/AppRoutes.test.tsx`
- `apps/main/src/router/RouteRenderer.tsx`
- `apps/main/src/router/RouteRenderer.test.tsx`
- `apps/main/src/config/systemMenus.ts`
- `apps/main/src/hooks/useMenuConfig.ts`
- `apps/main/src/hooks/useTabManagement.ts`
- `apps/main/src/router/AppShell.tsx`
- `packages/extension-host/src/loadExtensions.ts`
- `packages/extension-host/src/runtime.ts`
- `packages/extension-host/src/index.test.ts`
- `packages/shared/src/auth/tokenManager.ts`
- `packages/shared/src/types/extension.ts`
- `packages/plugin-bridge/src/types.ts`
- `packages/plugin-bridge/src/index.ts`
- `packages/plugin-bridge/src/index.test.ts`
- `apps/main/src/plugins/sharedModules.ts`
- `apps/main/src/plugins/sharedModules.test.ts`
- `apps/main/src/config/themeRegistry.ts`
- `apps/main/src/pages/data-management/master-detail/index.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`
- `apps/main/src/pages/flow-editor/[id]/useFlowPersistence.ts`
- `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts`
- `apps/main/src/pages/flow-editor/[id]/useFlowHistory.ts`
- `apps/main/src/pages/flow-editor/[id]/useFlowKeyboardShortcuts.ts`
- `apps/main/src/pages/flow-editor/[id]/index.test.ts`
- `packages/amis-core/src/core/ajax.ts`
- `apps/main/src/styles/amis-theme-bridge.css`
- `apps/main/src/styles/amis-fix.css`
- `apps/main/src/lib/tableRowClassName.ts`
- `flux-lib/ui/src/components/ui/table-row-class-name.ts`
- `flux-lib/ui/src/components/ui/*`
- 相关 focused tests、`docs/design/plugin-system.md`、`docs/design/extension-system.md`、`docs/design/backend-integration.md`、`docs/design/styling-system-specification.md`、必要的 `docs/bugs/`

### Out Of Scope

- `docs/plans/23-flow-editor-reactive-cost-plan.md` 已 owner 的 flow editor 响应式 fan-out / dirty-cost 优化
- `docs/plans/24-coverage-and-hygiene-follow-up-plan.md` 已 owner 的旧 coverage/hygiene 尾项
- `docs/plans/25-api-surface-hygiene-follow-up-plan.md` 已 owner 的低风险 export 收敛
- `docs/plans/26-plugin-esm-dual-format-follow-up-plan.md` 已 owner 的 ESM dual-format 决策与参考实现
- Plan 27 已关闭的 AI Workbench lifecycle、dynamic `homePath` dual-home tab、extension help/about/support、以及 runtime `themeId` canonical fallback

## Execution Plan

### Workstream 1 - Shell Auth, I18n, And Route Canonicalization

Status: completed
Targets: `apps/main/src/store/authStore.ts`, `apps/main/src/services/http.ts`, `apps/main/src/services/authApi.ts`, `apps/main/src/amis/adapter.ts`, `apps/main/src/hooks/useAuth.ts`, `apps/main/src/hooks/useAuth.test.ts`, `apps/main/src/main.tsx`, `apps/main/src/extensions/bootstrap.ts`, `apps/main/src/config/i18n/index.ts`, `apps/main/src/config/i18n/languages.ts`, `packages/shared/src/auth/tokenManager.ts`, `apps/main/src/router/AppRoutes.tsx`, `apps/main/src/router/AppRoutes.test.tsx`, `apps/main/src/router/RouteRenderer.tsx`, `apps/main/src/router/RouteRenderer.test.tsx`, `apps/main/src/config/systemMenus.ts`, `apps/main/src/hooks/useMenuConfig.ts`, `apps/main/src/hooks/useTabManagement.ts`, `apps/main/src/router/AppShell.tsx`, related docs/bugs`

- Item Types: `Fix | Decision | Proof`

- [x] Decision: 裁定 auth token 的唯一 canonical owner 以及 `authStore` / shared token manager 的同步方向，消除双源状态而不是继续容忍“多数路径同步”。
- [x] Fix: 将当前用户恢复、401 refresh、登出清理、persist hydrate、extension auth override 对齐到同一条 auth contract；若 `authStore` 继续保留 token 镜像，必须定义并测试唯一写入口与恢复语义。
- [x] Fix: 为 `useAuthBootstrap` 增加请求归属保护，避免旧恢复请求回写当前登录态。
- [x] Fix: 收敛 extension bootstrap 的 auth / i18n 初始化顺序，确保 extension default language、language registry、auth config 在相关消费者 hydrate/initialize 前建立，或以等价方式证明不存在时序分叉。
- [x] Fix: 将 `/auth/login` 与 shell 内 `*` fallback 接入 `systemPages.login` / `systemPages.notFound` 契约，而不是继续绕过 registry。
- [x] Fix: 将首页求值收敛到可访问菜单结果，避免 `homePath` 把用户送到不可访问入口；本 workstream 只 owner route-resolution 结果，不重复 owner Plan 27 已关闭的 dynamic home tab runtime defect。
- [x] Proof: 为 `RouteRenderer` 失败态、`useAuthBootstrap` 会话恢复/失败登录、`useMenuConfigQuery` queryKey/enabled、以及 `AppShell/useTabManagement` 的 homePath/tab 联动补 focused tests；这里 owner 的是 retained test gap，不重复修复 Plan 27 已关闭的 dual-home tab runtime defect。
- [x] Fix: 若 workstream 改变了 supported auth / route / extension-init contract，同步 `docs/design/backend-integration.md`、`docs/design/extension-system.md` 与相关 bug note。

Exit Criteria:

- [x] auth token 不再处于 store 与 shared token manager 双方都可独立漂移的状态；401/refresh/logout/hydrate/extension override 的 focused tests 对最终 contract 有明确断言。
- [x] extension auth / i18n 初始化不存在“先 hydrate/initialize、后覆写 contract”的未定义时序；对应实现与 focused proof 一致。
- [x] `/auth/login` 与 not-found fallback 已使用 `systemPages` registry，首页路径只会导向当前用户可访问入口。
- [x] `RouteRenderer`、`useAuthBootstrap`、`useMenuConfigQuery`、`AppShell/useTabManagement` 的关键分支已有 focused verification；不与 Plan 27 已关闭的 dual-home tab runtime defect 重复 owner。
- [x] `docs/design/backend-integration.md`、`docs/design/extension-system.md` 与必要的 bug note 已同步当前最终语义。
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Plugin And Extension Runtime Boundary Tightening

Status: completed
Targets: `packages/extension-host/src/loadExtensions.ts`, `packages/extension-host/src/runtime.ts`, `packages/extension-host/src/index.test.ts`, `packages/shared/src/types/extension.ts`, `packages/plugin-bridge/src/types.ts`, `packages/plugin-bridge/src/index.ts`, `packages/plugin-bridge/src/index.test.ts`, `apps/main/src/plugins/sharedModules.ts`, `apps/main/src/plugins/sharedModules.test.ts`, `apps/main/src/config/themeRegistry.ts`, related docs/bugs`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 为 `loadExtensions()` 增加 timeout / cancellation / stuck-source containment，避免单个 extension source 无限阻塞宿主启动。
- [x] Fix: 将 `ShellExtension` runtime guard 从“非空 `id` 即通过”收紧到当前 supported public contract 所需的最小验证，并为错误消息提供可定位信息。
- [x] Decision: 裁定 `PluginBridge.stores` 的最终 public contract；如果真实语义是只读快照/selector surface，就收紧类型与文档，不再伪装成 Zustand hook。
- [x] Fix: 将 plugin-facing shared module surface 与 host-only setter surface 分离，至少覆盖 `setPluginBridge()`，并复核是否还暴露其他 host-only setter；禁止 remote plugin 通过公开入口覆写 host runtime state。
- [x] Fix: 让 `usePluginI18n()` 的订阅语义在语言切换时稳定重渲染，并以 focused proof 覆盖 bridge snapshot / i18n 引用变化路径。
- [x] Decision: 重新审计 extension theme registration contract。若当前 runtime 已足够支持，则补 focused proof 与 owner docs；若仍有实际缺口，必须在本 workstream 中落地最小闭环，或显式移交给一个专门 owner extension theme/runtime contract 的 successor plan；不得错误移交给只 owner plugin build-format 的 `docs/plans/26-plugin-esm-dual-format-follow-up-plan.md`。
- [x] Proof: 为 `loadExtensions()` 超时/非法扩展、`ensurePluginSharedModules()` 并发去重/失败重试、`usePluginI18n()` 语言切换、以及 plugin-facing bridge surface 收窄补 focused tests。
- [x] Fix: 同步 `docs/design/plugin-system.md`、`docs/design/extension-system.md` 与必要的 bug note，确保 bridge、extension、theme contract 都只描述当前最终语义。

Exit Criteria:

- [x] extension source 不会因挂死或超宽 guard 而静默阻塞宿主；focused tests 已覆盖 timeout / invalid export / invalid contract。
- [x] plugin-facing public surface 不再暴露 host-only bridge setter；`PluginBridge.stores` 的类型、实现与 docs 语义一致。
- [x] `usePluginI18n()` 在语言切换时具备稳定的 focused proof，不再依赖碰巧替换引用才重渲染。
- [x] extension theme registration contract 已被 landed，或被显式移交给正确 owner extension-theme/runtime contract 的 successor plan；不得继续停留在“看起来已支持但无 proof”的状态。
- [x] `ensurePluginSharedModules()` 的并发与失败重试语义已有直接测试。
- [x] `docs/design/plugin-system.md`、`docs/design/extension-system.md` 与必要的 bug note 已同步当前最终语义。
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Async Ownership Guards For Stateful Pages

Status: completed
Targets: `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`, `apps/main/src/pages/flow-editor/[id]/useFlowPersistence.ts`, `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts`, `apps/main/src/pages/flow-editor/[id]/useFlowHistory.ts`, `apps/main/src/pages/flow-editor/[id]/useFlowKeyboardShortcuts.ts`, `apps/main/src/pages/flow-editor/[id]/index.test.ts`, related docs/bugs`

- Item Types: `Fix | Proof`

- [x] Fix: 为 detail save/load 路径增加请求归属校验，避免切换记录后旧请求继续回写当前页面。
- [x] Fix: 在 detail `id` 切换时清理或隔离旧草稿/临时态，避免旧记录内容在新 URL 下继续展示和编辑。
- [x] Fix: 为 `useFlowPersistence` 的保存/恢复链增加 flow-id 归属保护，避免切换流程后旧保存结果污染当前流程。
- [x] Fix: 为 `useFlowEditorState` 的流程切换建立旧画布失效/禁用语义，避免新流程尚未完成加载时旧画布继续可操作。
- [x] Proof: 为 detail 页面补 focused regression tests，断言旧请求/旧草稿不会污染新 `id`。
- [x] Proof: 为 `useFlowPersistence` 保存/恢复/失败链、`useFlowHistory`、`useFlowKeyboardShortcuts`、以及 flow editor 核心交互与离页保护补 focused tests，覆盖 summary 中 `12-13`、`12-16` 的直接缺口。
- [x] Fix: 将复杂竞态 root cause、修复策略与测试保护面记录到必要的 `docs/bugs/`。

Exit Criteria:

- [x] detail 页面在切换 `id` 后不会继续展示或保存旧记录草稿；focused tests 已断言请求归属与草稿清理语义。
- [x] flow save/load 不会在流程切换后回写当前页面；新流程加载前旧画布不会继续作为 live editable state。
- [x] `useFlowPersistence`、`useFlowHistory`、`useFlowKeyboardShortcuts` 与 flow editor 核心交互缺口已有直接 focused tests，而不是只依赖间接页面 happy path。
- [x] 必要的 `docs/bugs/` 已同步当前基线；若无 owner-doc 变更，必须在实施与日志中显式写 `No owner-doc update required`。
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 4 - Module Decomposition And Style Surface Closure

Status: completed
Targets: `apps/main/src/pages/data-management/master-detail/index.tsx`, `packages/amis-core/src/core/ajax.ts`, `apps/main/src/styles/amis-theme-bridge.css`, `apps/main/src/styles/amis-fix.css`, `apps/main/src/lib/tableRowClassName.ts`, `flux-lib/ui/src/components/ui/table-row-class-name.ts`, `flux-lib/ui/src/components/ui/*`, related docs/bugs`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 将 `master-detail/index.tsx` 中筛选、排序、批量操作、导出、分页、导航等堆积职责拆到 `components/`、`hooks/` 或等价更窄 owner surface，使页面入口文件从当前 500 行降到 `<= 280` 行并保持行为不变。
- [x] Fix: 将 `packages/amis-core/src/core/ajax.ts` 中协议转换、传输、下载、schema 绑定等混合职责拆到更窄 helper/module，使主入口文件从当前 420 行降到 `<= 240` 行，并让网络/下载/schema 绑定责任边界可读。
- [x] Fix: 收敛 AMIS theme bridge CSS 的变量覆盖范围，避免局部 bridge 把宿主 `--background` 等语义变量重写成错误含义。
- [x] Decision: 裁定 `tableRowClassName` 的 canonical owner，消除 `apps/main` 与 `flux-lib/ui` 双实现及 `subtle` 语义分叉。
- [x] Fix: 收敛当前 live repo 仍可定位的 shared UI style-surface drift（例如 `slider.tsx` 的 `bg-white`、多个 overlay primitive 的 `bg-black/10`、以及 `table-row-class-name.ts` 的 `subtle` 裸色语义），改为现有 token/semantic 变量或等价最终语义，避免继续扩大 host theme drift。
- [x] Proof: 为 style-surface 变更补 focused proof；如仓库已有合适位置，可增加 style/lint check 以防 `host-only variable pollution`、重复 row-class helper、或已确认的 shared UI style drift 回归。
- [x] Fix: 若 workstream 改变了当前 styling/module owner baseline，同步 `docs/design/styling-system-specification.md` 与必要的 bug note。

Exit Criteria:

- [x] `master-detail/index.tsx` 行数 `<= 280`，`packages/amis-core/src/core/ajax.ts` 行数 `<= 240`，且新提取模块/测试能直接证明原行为未回归。
- [x] AMIS theme bridge 不再污染宿主语义变量；对应 focused proof 覆盖受影响语义而不只覆盖 class 名存在。
- [x] `tableRowClassName` 只保留一个 canonical 实现，或重复存在理由被显式记录且语义一致。
- [x] shared UI style-surface drift 已针对当前 live repo 中可定位的裸色点 landed，或被显式移交 successor ownership；不得继续停留在“只复核不裁定”的状态。
- [x] `docs/design/styling-system-specification.md` 与必要的 bug note 已同步当前最终语义。
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] 所有 in-scope retained live defects 已修复、被诚实裁定、或被显式移交 successor ownership
- [x] 所有 in-scope public-contract drift 已收敛，尤其是 auth/token、plugin bridge、extension loading、systemPages、theme/style surface
- [x] 所有 in-scope focused verification gaps 已补齐，不再依赖间接 happy-path 覆盖
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect、contract drift、owner-doc drift、或 verification gap
- [x] 受影响的 owner docs 已同步到 live baseline，或对应 workstream 明确记录 `No owner-doc update required`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Flow Editor Reactive Cost Containment

- Classification: `optimization candidate`
- Why Not Blocking Closure: `05-04` 属于响应式成本与 fan-out 收窄，不是本计划 owner 的 async ownership/correctness 面；已由 `docs/plans/23-flow-editor-reactive-cost-plan.md` 接手。
- Successor Required: `yes`
- Successor Path: `docs/plans/23-flow-editor-reactive-cost-plan.md`

## Non-Blocking Follow-ups

- 若 Workstream 4 最终需要更广泛的 shared UI color-token 治理，应在本计划关闭后按 live baseline 新起更窄 successor，而不是把未修复裸色问题继续遗留在本计划下。

## Closure

Status Note: Completed on 2026-05-18 after all four workstreams landed, owner docs/logs were synchronized to the live baseline, final workspace verification passed, and an independent closure audit confirmed there were no remaining in-scope closure blockers.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent independent closure audit (`task_id: ses_1c65d6d20ffe8YSNSJwU4eb00A`)
- Evidence: Initial audit flagged only closure-record inconsistencies: plan status/closure gates/placeholders were not yet synchronized and the daily log lacked explicit Plan 28 closure evidence. After syncing the plan closure gates, closure section, and `docs/logs/2026/05-18.md`, no remaining in-scope execution or verification blockers remained.

Follow-up:

- None.
