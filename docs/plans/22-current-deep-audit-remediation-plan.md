# 22 Current Deep-Audit Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-deep-audit-v1/summary.md`
> Related: `docs/plans/15-route-permission-robustness-plan.md`, `docs/plans/16-plugin-build-bridge-runtime-plan.md`, `docs/plans/17-network-async-safety-extension-plan.md`, `docs/plans/21-state-architecture-test-coverage-plan.md`

## Purpose

收口 2026-05-17 深度审核中经独立复核后仍然成立的 P1 项，以及与这些 P1 风险直接耦合的高价值 P2 项，消除 5 个当前仍然存在的跨维度风险模式：PluginBridge 订阅链不稳定、401 处理分裂、iframe 安全缺口、homePath 契约漂移、以及关键路径测试缺口。

## Ownership Note

- 本计划只 owner `docs/analysis/2026-05-17-deep-audit-v1/summary.md` 中**当前仍然保留**、且会阻塞当前 supported baseline 的 retained P1，以及与这些 P1 同源的少量 retained P2。
- `docs/plans/15-route-permission-robustness-plan.md`、`16-plugin-build-bridge-runtime-plan.md`、`17-network-async-safety-extension-plan.md`、`21-state-architecture-test-coverage-plan.md` 仅对 2026-05-16 baseline 的关闭结论成立；若本次 2026-05-17 审计在相同区域发现新的 retained gap，则以本计划的 current baseline 为准，不视为自动复用旧 plan 的 closure。
- 本计划不重新 owner 旧计划中所有历史主题，只 owner 下文 `Retained Findings Coverage` 中明确映射到本计划 workstream 的条目，以及为这些 retained findings 闭环所必需、在各 Workstream 中显式列出的最小 adjunct contract hardening 项。

## Current Baseline

- `docs/analysis/2026-05-17-deep-audit-v1/summary.md` 已确认当前 live baseline 下无 P0，但仍有 10 项保留的 P1 和一组保留的 P2。
- 当前最关键的 live risk 集中在 5 组：
  - PluginBridge 构建/订阅链：`apps/main/src/App.tsx`、`packages/plugin-bridge/src/index.ts`、`packages/core/src/components/PluginSlot.tsx`
  - 401 / auth async safety：`packages/shared/src/http/client.ts`、`packages/amis-core/src/core/ajax.ts`、`apps/main/src/pages/auth/login/index.tsx`
  - Route safety / shell navigation：`apps/main/src/router/RouteRenderer.tsx`、`apps/main/src/pages/errors/*.tsx`、`apps/main/src/hooks/useTabManagement.ts`
  - 关键路径测试缺口：`tabStore`、`PluginSlot`、权限 E2E
- 2026-05-16 的相邻计划（15/16/17/21）覆盖了更早一轮审计中的部分问题，但不能替代本次 audit 的 current retained baseline；本计划以 2026-05-17 审核结果为准。
- 深挖追加轮次在本次审计中被跳过，因此本计划只 owner 当前已经独立复核成立的 retained items，不扩张到未复核的 P3 列表。

## Retained Findings Coverage

| Finding | Severity | Owner Workstream |
|---|---|---|
| 05-02 pluginBridge 依赖 pathname 重建 | P1 | Workstream 2 |
| 05-04 usePluginNotifications 不响应 bridge 变化 | P1 | Workstream 2 |
| 06-01 HTTP second-401 无终止路径 | P1 | Workstream 1 |
| 06-02 amis-core 401 直接 logout | P1 | Workstream 1 |
| 07-04 iframe 缺少 sandbox | P1 | Workstream 1 |
| 10-01 settings/theme 已导入 Button 仍用原生 button | P1 | Workstream 4 |
| 10-02 plugins/management 已导入 Button 仍用原生 button | P1 | Workstream 4 |
| 12-1 tabStore 无单元测试 | P1 | Workstream 3 |
| 12-10 PluginSlot 无单元测试 | P1 | Workstream 1 |
| 12-17 E2E 缺权限场景 | P1 | Workstream 3 |
| 08-02 bridge 未注入时遗漏内部订阅 | P2 | Workstream 2 |
| 08-12 loadRemoteComponent 未验证 default export | P2 | Workstream 1 |
| 07-01 错误页硬编码 /dashboard | P2 | Workstream 3 |
| 07-02 closeAllTabs 硬编码 /dashboard | P2 | Workstream 3 |

Adjunct in-scope contract hardening（不是独立 retained finding，但属于当前 closure 所需最小修补面）：

- `examples/plugin-demo/package.json` 的 peerDependencies 完整性（至少 `react` / `react-dom`），作为 Workstream 2 中 host/plugin shared dependency contract 闭环的一部分。

以下 retained P2 **不在本计划内**，因为它们不阻塞上述 10 个 retained P1 的 closure：flow-editor 响应式热路径、`packages/core/package.json` 未使用依赖、`layoutStore` / `themeStore` / `shared/http/url.ts` / `shared/http/payload.ts` 测试补齐、`extension-demo` E2E CI 入口、以及低风险 package hygiene / structure 项。

## Goals

- 修复全部 10 项当前保留的 P1 问题。
- 收敛与这些 P1 直接耦合、且已复核保留的少量高价值 P2 问题，避免修完表层后保留同源回归入口。
- 让 PluginBridge 的 React 订阅语义稳定、可测试、且不再因路由变化造成全量级联更新。
- 统一主 HTTP client 与 amis-core 的 401 / refresh 契约。
- 让 route/homePath/permissions 的关键行为具备 focused unit/E2E 证明。
- 收口当前已复核保留的两个 Button 使用不一致 P1，而不扩张到整仓 UI 一致性治理。

## Non-Goals

- 不处理所有 P3 项，也不把整份深度审核结果一次性清零。
- 不做广义的 UI 统一重构；仅修复当前已复核保留的 Button 使用不一致问题。
- 不引入插件系统的 breaking API redesign；仅在现有契约内修复订阅与加载行为。
- 不在本计划中推进 ESM 双格式插件产物；当前支持基线仍是 SystemJS。
- 不处理 flow-editor 的性能治理、低 ROI 的目录整理项（如 `lib/` / `utils/` 归并）、大范围 API 表面积瘦身、以及泛测试补齐。

## Scope

### In Scope

- `apps/main/src/App.tsx`
- `packages/plugin-bridge/src/index.ts`
- `packages/shared/src/http/client.ts`
- `packages/amis-core/src/core/ajax.ts`
- `apps/main/src/router/RouteRenderer.tsx`
- `apps/main/src/pages/errors/403.tsx`
- `apps/main/src/pages/errors/404.tsx`
- `apps/main/src/pages/errors/500.tsx`
- `apps/main/src/hooks/useTabManagement.ts`
- `apps/main/src/store/tabStore.ts`
- `packages/core/src/components/PluginSlot.tsx`
- `packages/core/src/utils/systemjs.ts`
- `apps/main/src/pages/settings/theme/index.tsx`
- `apps/main/src/pages/plugins/management/index.tsx`
- `examples/plugin-demo/package.json`
- 相关 focused tests 与 `tests/e2e/` 权限场景

### Out Of Scope

- 未独立复核的 P3 列表
- Theme token 的广义清理、硬编码颜色治理、目录层级优化
- `examples/plugin-demo` 的 ESM 双产物输出
- 全量 store 架构迁移或大规模 React Query / Zustand 改造
- 与当前 retained findings 无直接因果关系的 API 桶文件/类型导出治理
- flow-editor 响应式热路径优化
- 泛测试补齐（`layoutStore`、`themeStore`、`shared/http/url.ts`、`shared/http/payload.ts`、`extension-demo` E2E CI 入口、`packages/core/package.json` 依赖清理）

## Execution Plan

### Workstream 1 - Runtime Safety And Security

Status: completed
Targets: `packages/shared/src/http/client.ts`, `packages/amis-core/src/core/ajax.ts`, `apps/main/src/router/RouteRenderer.tsx`, `packages/core/src/utils/systemjs.ts`, `packages/core/src/components/PluginSlot.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: 在 `client.ts` 中为 401 refresh-retry 增加明确的 second-401 终止路径；重试后仍为 401 时必须触发 unauthorized flow 并返回一致的错误语义。
- [x] Fix: 在 `amis-core/src/core/ajax.ts` 中复用或对齐主 HTTP client 的 refresh 策略，避免 amis 页面遇到 401 时直接 logout。
- [x] Fix: 在 `RouteRenderer.tsx` 的 iframe 渲染路径上补齐 `sandbox` 策略，并基于当前支持场景明确允许集合。
- [x] Fix: 在 `loadRemoteComponent` 中验证远程模块 `default` 导出是合法 React 组件；不合规则抛出明确错误。
- [x] Fix: 为 `PluginSlot` 增加受控的加载超时与清晰错误态，避免永久 loading。
- [x] Proof: 为 401 second-retry、amis 401 refresh、PluginSlot timeout / invalid module export 添加 focused tests。

Exit Criteria:

- [x] 主 HTTP client 与 amis-core 在 refresh 成功后 second-401、refresh 失败、无 refresh token 三种场景下走同一条 unauthorized 语义：清理认证态并进入统一错误/登出路径；对应 focused tests 已断言该结果。
- [x] iframe 路径包含明确、固定的 `sandbox` 允许集合，且对应渲染测试或 focused verification 证明当前受支持的内嵌页面仍可正常工作。
- [x] 远程模块 `default` 非法导出与加载超时都会落到明确的 error UI / error message，而不是隐式挂起或 React invalid element 报错。
- [x] `PluginSlot` 对成功加载、超时、非法导出三种核心路径均有 focused tests。
- [x] `pnpm --filter @nop-chaos/shared test`、`pnpm --filter @nop-chaos/amis-core test`、`pnpm --filter @nop-chaos/core test` 通过。
- [x] `docs/design/plugin-system.md`、`docs/examples/plugin-dev-guide.md`、`docs/references/build-guide.md` 已按当前插件加载 / 故障隔离 / iframe 安全基线完成同步检查；如有口径变化，已同步更新。
- [x] `docs/design/backend-integration.md` 已更新为当前 401 / refresh / unauthorized 契约。
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - PluginBridge Contract Stabilization

Status: completed
Targets: `apps/main/src/App.tsx`, `packages/plugin-bridge/src/index.ts`, `packages/core/src/components/PluginSlot.tsx`, `examples/plugin-demo/package.json`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 从 `App.tsx` 的 bridge 构建依赖中移除 `location.pathname`，改为 runtime getter，避免每次路由切换全量重建 bridge。
- [x] Fix: 将 `usePluginNotifications` 改为与其余 bridge hooks 相同的响应式订阅语义（`useSyncExternalStore` 或等效安全方案）。
- [x] Fix: 统一 `subscribeBridgeSnapshot` / bridge.subscribe / setPluginBridge 之间的单一通知路径，消除双重通知与 bridge 未注入时遗漏订阅的问题。
- [x] Fix: 审核并补齐 `examples/plugin-demo/package.json` 的 peerDependencies（至少 `react` / `react-dom`），使 host/plugin 契约完整。
- [x] Proof: 为 notifications、bridge 首次注入、route change 不重建 bridge、bridge store 通知次数等场景补充 focused tests。

Exit Criteria:

- [x] route change 不会改变 bridge identity，且不会单独触发由 `pathname` 依赖导致的 `setPluginBridge` 重建；对应 focused tests 已断言这一点。
- [x] `usePluginNotifications` 在 bridge 首次注入与 bridge 替换后都能拿到最新 notifications 引用，测试覆盖 fallback -> live bridge 的切换。
- [x] bridge snapshot 的 React 订阅只通过一条明确的 fan-out 路径更新；对应测试对单次 store 变化的 listener / notification 次数有明确断言。
- [x] plugin-demo 的 peer contract 与宿主共享依赖声明一致。
- [x] `pnpm --filter @nop-chaos/plugin-bridge test` 与 `pnpm --filter @nop-chaos/plugin-demo build` 通过。
- [x] `docs/design/plugin-system.md`、`docs/examples/plugin-dev-guide.md`、`docs/references/build-guide.md` 已按当前 bridge 注入与 shared dependency 契约完成同步检查；如有口径变化，已同步更新。
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Route, HomePath, And Permission Proof

Status: completed
Targets: `apps/main/src/pages/errors/403.tsx`, `apps/main/src/pages/errors/404.tsx`, `apps/main/src/pages/errors/500.tsx`, `apps/main/src/hooks/useTabManagement.ts`, `apps/main/src/store/tabStore.ts`, `tests/e2e/`

- Item Types: `Fix | Proof`

- [x] Fix: 将错误页与 `closeAllTabs` 的 `/dashboard` 硬编码改为读取当前 supported baseline 下的动态 homePath。
- [x] Proof: 为 `tabStore` 添加 focused unit tests，覆盖 `closeTab` 路径选择、`closeAllTabs`、不可关闭 tab 保留等行为。
- [x] Proof: 新增权限/角色过滤 E2E 场景，覆盖菜单过滤与直接 URL 访问 Forbidden page 的双层模型。
- [x] Decision: 明确 extension/homePath 读取来源（menu query、shell config 或 store），避免再次出现多点硬编码。

Exit Criteria:

- [x] `homePath` 的唯一 canonical source 已明确写入代码与文档；错误页与 `closeAllTabs` 都通过同一来源读取，不再依赖 `/dashboard` 硬编码。
- [x] `tabStore` 关键路径有 unit tests 保护。
- [x] E2E 至少覆盖一个低权限用户看不到菜单项 + 一个直接访问受限 URL 被拒绝的场景。
- [x] `pnpm --filter @nop-chaos/main test` 与 `pnpm test:e2e -- --grep "permission|forbidden|role"`（或等价 spec）通过。
- [x] `docs/design/extension-system.md` 已更新为当前 homePath 来源 / error-page return-home / permission proof 基线。
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 4 - UI Consistency Fixes In Retained P1 Paths

Status: completed
Targets: `apps/main/src/pages/settings/theme/index.tsx`, `apps/main/src/pages/plugins/management/index.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: 将 `settings/theme/index.tsx` 中已导入 `Button` 但仍使用原生 `button` 的主题卡片选择区统一为 `Button` / `Toggle` 体系，保持文件内一致性。
- [x] Fix: 将 `plugins/management/index.tsx` 中已导入 `Button` 但仍使用原生 `button` 的选项芯片统一为 `Button` / `Toggle` 体系，保持文件内一致性。
- [x] Proof: 补充 focused UI tests 或更新现有交互测试，证明上述两个交互区在替换后行为未回归。

Exit Criteria:

- [x] 两个已复核保留的 Button 不一致 P1 已落地修复，不再在同文件内混用原生 `button` 与 `Button` 组件表达相同交互。
- [x] 相关 focused UI proof 已完成（至少覆盖 theme page 与 plugins management 中对应交互的 click / toggle 行为未回归）。
- [x] No owner-doc update required。
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Workstream 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 全部 10 项当前保留的 P1 已修复或被更高质量的 live-baseline 裁定替代
- [x] 全部 10 项当前保留的 P1 均已逐项映射为 landed / adjudicated replacement，不存在 owner 缺口
- [x] 与 P1 同源、已列入本计划的高价值 P2 已收敛
- [x] PluginBridge 订阅模型、401 处理模型、route/homePath 契约都已具备 focused proof
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline，或每个 Workstream 明确记录 `No owner-doc update required`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### ESM Dual-Format Plugin Output

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 当前支持基线仍是 SystemJS；只要 peer contract 与错误处理正确，单格式输出不阻塞当前 retained P1/P2 的关闭。
- Successor Required: `yes`
- Successor Path: `docs/plans/26-plugin-esm-dual-format-follow-up-plan.md`（若关闭 22 时仍 deferred，必须先创建此 successor）

### `lib/` / `utils/` 目录归并

- Classification: `optimization candidate`
- Why Not Blocking Closure: 属于低 ROI 结构整理，不影响当前 runtime safety / contract correctness / focused verification 成立。
- Successor Required: `no`
- Successor Path: N/A

### Flow Editor Reactive Cost Containment

- Classification: `optimization candidate`
- Why Not Blocking Closure: 属于 retained P2，但不阻塞当前 10 个 retained P1 的 closure；需要独立的性能 proof 和更窄 owner surface，单独成 plan 更诚实。
- Successor Required: `yes`
- Successor Path: `docs/plans/23-flow-editor-reactive-cost-plan.md`（若关闭 22 时仍 deferred，必须先创建此 successor）

### Coverage And Hygiene Tail Work

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `layoutStore` / `themeStore` / `shared/http/url.ts` / `shared/http/payload.ts` 测试补齐、`extension-demo` E2E CI 入口、`packages/core` 未使用依赖清理都不阻塞当前 retained P1 风险面关闭。
- Successor Required: `yes`
- Successor Path: `docs/plans/24-coverage-and-hygiene-follow-up-plan.md`（若关闭 22 时仍 deferred，必须先创建此 successor）

### API Surface Low-Risk Cleanup

- Classification: `watch-only residual`
- Why Not Blocking Closure: 当前 plan 只 owner 与 retained P1/P2 直接耦合的 API/contract 问题；其余低风险桶文件和导出瘦身不影响当前关闭。
- Successor Required: `yes`
- Successor Path: `docs/plans/25-api-surface-hygiene-follow-up-plan.md`（若关闭 22 时仍 deferred，必须先创建此 successor）

## Non-Blocking Follow-ups

- 为 iframe sandbox、hardcoded homePath、已导入 Button 仍用原生 button 添加自动化检查规则。
- 将 extension-demo E2E 入口并入 CI 后，再评估是否需要扩大到多浏览器矩阵。

## Closure Mapping

> 关闭本计划前，必须把每个 retained P1 写入且只写入以下一种状态：`landed`、`adjudicated replacement`、或 `moved to successor ownership`。
>
> `adjudicated replacement`：指原 finding 不再按初始修法落地，但经 live code、focused tests、owner-doc 更新与独立 closure audit 确认，已被一个更高质量、同等收口的实现或裁定结果替代。
>
> 若为 `moved to successor ownership`，`Evidence` 列必须填写 successor plan 路径与接手范围，不能只写“已转移”。

| Finding | Final State | Evidence |
|---|---|---|
| 05-02 pluginBridge 依赖 pathname 重建 | `landed` | `apps/main/src/App.tsx`, `apps/main/src/App.test.tsx`, `pnpm --filter @nop-chaos/main exec vitest run src/App.test.tsx`, `pnpm --filter @nop-chaos/main test`, `docs/design/plugin-system.md`, `docs/logs/2026/05-17.md` |
| 05-04 usePluginNotifications 不响应 bridge 变化 | `landed` | `packages/plugin-bridge/src/bridge.ts`, `packages/plugin-bridge/src/index.ts`, `packages/plugin-bridge/src/index.test.ts`, `pnpm --filter @nop-chaos/plugin-bridge test`, `docs/design/plugin-system.md`, `docs/logs/2026/05-17.md` |
| 06-01 HTTP second-401 无终止路径 | `landed` | `packages/shared/src/http/client.ts`, `packages/shared/src/http/client.test.ts`, `pnpm --filter @nop-chaos/shared exec vitest run src/http/client.test.ts`, `pnpm --filter @nop-chaos/shared test`, `docs/design/backend-integration.md`, `docs/logs/2026/05-17.md` |
| 06-02 amis-core 401 直接 logout | `landed` | `packages/amis-core/src/core/ajax.ts`, `packages/amis-core/src/core/ajax.test.ts`, `packages/amis-core/src/types.ts`, `pnpm --filter @nop-chaos/amis-core exec vitest run src/core/ajax.test.ts`, `pnpm --filter @nop-chaos/amis-core test`, `docs/design/backend-integration.md`, `docs/logs/2026/05-17.md` |
| 07-04 iframe 缺少 sandbox | `landed` | `apps/main/src/router/RouteRenderer.tsx`, `apps/main/src/router/RouteRenderer.test.tsx`, `pnpm --filter @nop-chaos/main exec vitest run src/router/RouteRenderer.test.tsx`, `pnpm --filter @nop-chaos/main test`, `docs/logs/2026/05-17.md` |
| 10-01 settings/theme Button 混用 | `landed` | `apps/main/src/pages/settings/theme/index.tsx`, `apps/main/src/pages/settings/theme/index.test.tsx`, `pnpm --filter @nop-chaos/main exec vitest run src/pages/settings/theme/index.test.tsx`, `docs/logs/2026/05-17.md` |
| 10-02 plugins/management Button 混用 | `landed` | `apps/main/src/pages/plugins/management/index.tsx`, `apps/main/src/pages/plugins/management/index.test.tsx`, `pnpm --filter @nop-chaos/main exec vitest run src/pages/plugins/management/index.test.tsx`, `docs/logs/2026/05-17.md` |
| 12-1 tabStore 无单元测试 | `landed` | `apps/main/src/store/tabStore.test.ts`, `pnpm --filter @nop-chaos/main exec vitest run src/store/tabStore.test.ts`, `pnpm --filter @nop-chaos/main test`, `docs/design/extension-system.md`, `docs/logs/2026/05-17.md` |
| 12-10 PluginSlot 无单元测试 | `landed` | `packages/core/src/components/PluginSlot.test.tsx`, `pnpm --filter @nop-chaos/core exec vitest run src/components/PluginSlot.test.tsx`, `pnpm --filter @nop-chaos/core test`, `docs/design/plugin-system.md`, `docs/logs/2026/05-17.md` |
| 12-17 E2E 缺权限场景 | `landed` | `tests/e2e/permission.spec.ts`, `pnpm test:e2e -- tests/e2e/permission.spec.ts`, `apps/main/src/router/AppRoutes.test.tsx`, `docs/design/extension-system.md`, `docs/logs/2026/05-17.md` |

## Closure

Status Note: 独立 closure audit 已确认全部 10 项 retained P1、与之耦合的 in-scope P2、focused verification、owner-doc sync、以及 successor ownership 均已落地；Plan 22 已不存在剩余的 plan-owned live defect、contract drift、或未裁定 closure blocker。

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent, task `ses_1c9646590ffeN3qmgHfJcBWX9J`
- Evidence: 初次 closure audit 先发现 `examples/plugin-demo/package.json` 缺少 `react` / `react-dom` peer contract，修复后复审结论变为可关闭；复审明确确认 Workstream 1-4 语义、`docs/design/plugin-system.md`、`docs/design/backend-integration.md`、`docs/design/extension-system.md`、`docs/logs/2026/05-17.md` 与 successor plans `23/24/25/26` 均与 live repo 一致。执行侧验证包括 `pnpm --filter @nop-chaos/plugin-bridge test`、`pnpm --filter @nop-chaos/plugin-demo build`、`pnpm --filter @nop-chaos/main exec vitest run src/App.test.tsx src/store/tabStore.test.ts src/router/RouteRenderer.test.tsx src/router/AppRoutes.test.tsx src/pages/settings/theme/index.test.tsx src/pages/plugins/management/index.test.tsx`、`pnpm test:e2e -- tests/e2e/permission.spec.ts`、以及全仓 `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`。

Follow-up:

- no remaining plan-owned work beyond non-blocking follow-ups already listed above
