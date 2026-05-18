# 27 Adversarial Review Contract & State Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-adversarial-review/summary.md`, `docs/analysis/2026-05-18-adversarial-review/round-01.md`, `docs/analysis/2026-05-18-adversarial-review/round-02.md`
> Related: `docs/plans/22-current-deep-audit-remediation-plan.md`, `docs/plans/21-state-architecture-test-coverage-plan.md`, `docs/plans/25-api-surface-hygiene-follow-up-plan.md`

## Purpose

收口 2026-05-18 对抗性审查中新确认的 7 条问题，重点解决三类当前 supported baseline 仍未闭环的风险：extension 公共契约半连接、运行时状态在重配置场景下发生分叉、以及 AI Workbench 的生命周期残留。计划关闭时，这 7 条 finding 必须全部落到且只落到 `landed`、`adjudicated as residual-risk-only / watch-only`、`moved to explicit successor ownership`、或 `removed from scope through a recorded scope change` 四种状态之一；不得以模糊 follow-up 方式悬置。

## Current Baseline

- `docs/analysis/2026-05-18-adversarial-review/` 已确认 7 条新增问题，其中 3 条为 HIGH、4 条为 MEDIUM。
- 这些问题与 2026-05-17 已关闭的 Plan 22 关注面不同：本轮重点不是 plugin bridge 订阅链、401 契约或 `systemPages` 接线，而是 extension contract 的新增残余、状态一致性、以及 AI Workbench mock 流程的生命周期安全。
- 当前 live repo 中仍存在以下 confirmed gaps：
  - `ShellExtension.plugins`、`helpUrl/aboutUrl/supportUrl` 已进入公共 contract，但 host 产品行为没有完整兑现。
  - `supportedLanguages` 的运行时语义是全量替换，和“扩展 host 语言能力”的直觉契约不一致。
  - `themeId`、`homePath`、`storageCache` 在运行时重配置或跨 tab 清理时会出现分叉或陈旧状态。
  - AI Workbench 的历史加载与流式回复缺少卸载取消路径。
- 本计划 owner 的是这 7 条 finding 本身，以及为它们闭环所必需的最小测试、owner-doc 与脚手架同步工作；不扩张到 extension-host 更深层 teardown、真实 profiler 验证或构建产物审计。

## Findings Coverage

| Finding | Severity | Owner Workstream |
|---|---|---|
| `ShellExtension.plugins` 已公开但 host 不消费 | HIGH | Workstream 1 |
| `supportedLanguages` 为 replace 语义 | HIGH | Workstream 1 |
| `ExtensionShellConfig.helpUrl/aboutUrl/supportUrl` 无消费点 | MEDIUM | Workstream 1 |
| 失效持久化 `themeId` 导致 DOM/store/bridge 分叉 | MEDIUM | Workstream 2 |
| `storageCache` 未处理 `Storage.clear()` 失效事件 | MEDIUM | Workstream 2 |
| 动态 `homePath` 制造双首页 tab | HIGH | Workstream 2 |
| AI Workbench 异步流式/历史加载无卸载取消 | MEDIUM | Workstream 3 |

## Goals

- 收敛全部 7 条当前已确认 finding，不保留 plan-owned live defect 或 contract drift。
- 明确 extension 公共 contract 中哪些能力是真正 supported 的，并让代码、类型、UI、脚手架和文档语义一致。
- 让 `themeId`、`homePath`、storage cache 在运行中被重定义时仍保持单一真实状态。
- 为 AI Workbench 的 mock async 流程补齐最小生命周期安全保证和 focused proof。

## Non-Goals

- 不在本计划中处理 extension-host 更深层 reload / teardown 体系设计。
- 不做广义 extension API redesign；只处理本轮已确认的 3 组 public-contract drift。
- 不把本计划扩张成整仓 theme / storage / tab architecture 重写。
- 不做真实性能 profiling、bundle 产物分析或移动端完整审查。

## Scope

### In Scope

- `packages/shared/src/types/extension.ts`
- `packages/extension-host/src/runtime.ts`
- `apps/main/src/extensions/bootstrap.ts`
- `apps/main/src/config/i18n/languages.ts`
- `apps/main/src/config/i18n/languages.test.ts`
- `apps/main/src/config/i18n/index.ts`
- `apps/main/src/store/pluginStore.ts`
- `apps/main/src/store/pluginStore.test.ts`
- `apps/main/src/App.tsx`
- `apps/main/src/App.test.tsx`
- `apps/main/src/router/AppRoutes.tsx`
- `apps/main/src/router/AppRoutes.test.tsx`
- `packages/plugin-bridge/src/index.ts`
- `packages/plugin-bridge/src/index.test.ts`
- `packages/plugin-bridge/src/bridge.ts`
- `apps/main/src/router/RouteRenderer.tsx`
- `apps/main/src/router/RouteRenderer.test.tsx`
- `apps/main/src/pages/plugins/management/index.tsx`
- `apps/main/src/pages/plugins/management/index.test.tsx`
- `apps/main/src/hooks/useShellConfig.ts`
- `apps/main/src/hooks/useShellConfig.test.ts`
- `apps/main/src/components/layout/SidebarUserMenu.tsx`
- `scripts/generate-extension.mjs`（若 extension contract 裁定改变默认脚手架输出）
- `packages/extension-host/src/index.test.ts`
- `examples/extension-demo/src/index.ts`
- `examples/extension-demo/src/index.test.ts`
- `docs/examples/plugin-dev-guide.md`
- `docs/examples/extension-generator.md`
- `apps/main/src/store/themeStore.ts`
- `apps/main/src/utils/themeCss.ts`
- `apps/main/src/utils/storage.ts`
- `apps/main/src/utils/storage.test.ts`
- `apps/main/src/services/mockApi/shared.ts`
- `apps/main/src/store/tabStore.ts`
- `apps/main/src/store/tabStore.test.ts`
- `apps/main/src/config/homePath.ts`
- `apps/main/src/config/systemMenus.ts`
- `apps/main/src/config/systemMenus.test.ts`
- `apps/main/src/router/AppShell.tsx`
- `apps/main/src/pages/ai-workbench/index.tsx`
- `apps/main/src/pages/ai-workbench/index.test.ts`
- 相关 focused tests、`docs/design/extension-system.md`、`docs/design/plugin-system.md`、`docs/design/styling-system-specification.md`、`docs/design/ai-workbench.md`、必要的 `docs/bugs/`

### Out Of Scope

- extension-host 的热重载/卸载/资源回收总方案
- 未在本轮确认的 generator / bundle / profiler 候选问题
- `systemPages`、`builtinPages`、plugin bridge 订阅链等已在旧 plan/旧 finding 中处理过的主题
- 大范围 store 架构改造或 theme system 全量治理
- AI Workbench 的功能扩展、真实后端接入或产品交互重设计

## Execution Plan

### Workstream 1 - Extension Public Contract Closure

Status: completed
Targets: `packages/shared/src/types/extension.ts`, `packages/extension-host/src/runtime.ts`, `packages/extension-host/src/index.test.ts`, `apps/main/src/extensions/bootstrap.ts`, `apps/main/src/config/i18n/languages.ts`, `apps/main/src/config/i18n/languages.test.ts`, `apps/main/src/config/i18n/index.ts`, `apps/main/src/store/pluginStore.ts`, `apps/main/src/store/pluginStore.test.ts`, `apps/main/src/App.tsx`, `apps/main/src/App.test.tsx`, `apps/main/src/router/AppRoutes.tsx`, `apps/main/src/router/AppRoutes.test.tsx`, `packages/plugin-bridge/src/index.ts`, `packages/plugin-bridge/src/index.test.ts`, `packages/plugin-bridge/src/bridge.ts`, `apps/main/src/router/RouteRenderer.tsx`, `apps/main/src/router/RouteRenderer.test.tsx`, `apps/main/src/pages/plugins/management/index.tsx`, `apps/main/src/pages/plugins/management/index.test.tsx`, `apps/main/src/hooks/useShellConfig.ts`, `apps/main/src/hooks/useShellConfig.test.ts`, `apps/main/src/components/layout/SidebarUserMenu.tsx`, `scripts/generate-extension.mjs`, `examples/extension-demo/src/index.ts`, `examples/extension-demo/src/index.test.ts`, `docs/design/extension-system.md`, `docs/design/plugin-system.md`, `docs/examples/plugin-dev-guide.md`, `docs/examples/extension-generator.md`, relevant `docs/bugs/`

- Item Types: `Fix | Decision | Proof`

- [x] Decision: 裁定 `ShellExtension.plugins` 的 supported baseline，且在同一 workstream 内完成“真正接线”或“显式收窄 public contract”二选一，不允许继续保持类型存在但 host 静默忽略。
- [x] Fix: 若保留 `plugins` contract，则将 extension 提供的 plugin manifests 接入 host 的 runtime/plugin surface，并让 `pluginStore`、插件管理页、`RouteRenderer`/plugin route resolution、bridge snapshot / `getPluginManifest()` 四个面上的可见语义一致；若裁定移除，则同步 shared types、runtime merge 逻辑、相关测试、脚手架和 owner docs，消除幽灵能力。
- [x] Fix: 将 `supportedLanguages` 从 replace 语义改为与 host 默认语言及多个 extension 共存的 canonical 语义，或以等价方式重新定义并落地 public contract，确保 `apps/main/src/config/i18n/languages.test.ts`、运行时实现、示例 extension 与文档表达一致。
- [x] Decision: 裁定 `helpUrl/aboutUrl/supportUrl` 是要提供真实 shell UI 消费，还是要从 supported public contract 中移出/弃用；禁止保留“runtime merge 存在、产品不使用”的半连接状态。
- [x] Fix: 若 `helpUrl/aboutUrl/supportUrl` 被保留为 supported 能力，则在 shell UI 中分别提供明确消费点并补 focused tests；若被降为 unsupported / deprecated，则同步 shared types、runtime config、现有 merge tests、示例与 docs，避免继续误导 extension 作者。
- [x] Fix: 如 workstream 改变了推荐 extension authoring surface，同步 `scripts/generate-extension.mjs` 和相关示例/文档，避免脚手架继续生成过时 contract 用法。
- [x] Proof: 为多 extension 语言注册、`plugins` 契约四个消费面、以及 `help/about/support` 最终裁定补 focused tests，证明代码路径、`examples/extension-demo` proof 与 owner docs 描述一致。
- [x] Fix: 新增对应 `docs/bugs/` 记录，保存 `plugins` / `supportedLanguages` / shell URL contract drift 的 root cause、修复方式与回归测试保护面。

Exit Criteria:

- [x] `plugins`、`supportedLanguages`、`helpUrl`、`aboutUrl`、`supportUrl` 不再存在“类型承诺已出现、运行时或产品语义未兑现”的状态。
- [x] 多 extension 并存时，host 默认语言与各 extension 语言不会被最后一个 extension 静默抹掉；focused tests 对这一语义有明确断言。
- [x] 若保留 `plugins` 为 supported contract，则 `pluginStore`、插件管理页、`RouteRenderer`/plugin route resolution、bridge snapshot / `getPluginManifest()` 四个消费面都已可观察且有 focused proof；若不保留，则 public surface、测试、脚手架与 docs 已显式收窄。
- [x] 若保留 `helpUrl`、`aboutUrl`、`supportUrl` 为 supported contract，则三者各自都有明确 UI 消费与 focused proof；若不保留，则 shared types、runtime merge tests、示例与 docs 已同步收窄。
- [x] extension 脚手架/示例不会继续生成与当前 supported contract 冲突的默认写法。
- [x] `docs/design/extension-system.md` 与 `docs/design/plugin-system.md` 已更新为当前 extension / plugin public contract 的最终语义，不再保留半连接能力描述。
- [x] 必要的 `docs/examples/plugin-dev-guide.md`、`docs/examples/extension-generator.md` 与 `docs/bugs/` 已同步到当前基线。
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Runtime State Coherence

Status: completed
Targets: `apps/main/src/store/themeStore.ts`, `apps/main/src/utils/themeCss.ts`, `apps/main/src/utils/storage.ts`, `apps/main/src/utils/storage.test.ts`, `apps/main/src/services/mockApi/shared.ts`, `apps/main/src/store/tabStore.ts`, `apps/main/src/store/tabStore.test.ts`, `apps/main/src/config/homePath.ts`, `apps/main/src/config/systemMenus.ts`, `apps/main/src/config/systemMenus.test.ts`, `apps/main/src/router/AppShell.tsx`, `apps/main/src/router/AppRoutes.tsx`, `apps/main/src/router/AppRoutes.test.tsx`, `apps/main/src/App.tsx`, `apps/main/src/App.test.tsx`, `packages/plugin-bridge/src/index.ts`, `packages/plugin-bridge/src/index.test.ts`, `apps/main/src/pages/settings/theme/index.test.tsx`, `docs/design/styling-system-specification.md`, `docs/design/extension-system.md`, relevant `docs/bugs/`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 为持久化 `themeId` 建立单一 canonical fallback 语义，确保 DOM、store、settings UI 与 plugin bridge（含 `App.tsx` 中的 `pluginThemeConfig` / `bridgeSnapshot` / `getThemeConfig()`）观察到同一个最终主题，而不是“DOM 回退、状态保留旧值”的分叉。
- [x] Fix: 为 `storageCache` 补齐 `Storage.clear()` / `event.key === null` 的缓存失效路径，并确认当前使用 `getStorageItem()` / `readStoredJson()` 的调用链不会在跨 tab 清空后继续读取旧值。
- [x] Fix: 收敛 `homePath` 与 `tabStore` 的时序契约，确保运行时 homePath 变化后系统仍只保留一个 canonical non-closable home tab，不出现旧 `/dashboard` 与新 extension home 并存的双首页状态。
- [x] Decision: 明确 runtime home tab 的 canonical source 和变更时机（store 初始化、menu merge、AppShell 注册链路），避免同类时序裂缝再次出现。
- [x] Proof: 为失效主题 fallback、storage clear 失效、以及动态 homePath 下 tab 行为添加 focused tests，覆盖初始化、变更和回归关键路径。
- [x] Fix: 新增对应 `docs/bugs/` 记录，保存 `themeId` / `storageCache` / `homePath` 时序分叉的 root cause、修复方式与回归测试保护面。

Exit Criteria:

- [x] 失效主题场景下，DOM `data-theme`、store `themeConfig.themeId`、settings 页面高亮、plugin bridge `getThemeConfig()` 对最终主题语义一致；focused tests 已覆盖 bridge-facing 语义而不只覆盖 DOM/store。
- [x] 跨 tab `Storage.clear()` 后，本 tab 不会继续通过缓存返回已清空的数据；focused tests 已明确覆盖 `event.key === null` 分支。
- [x] 任意时刻仅存在一个 canonical non-closable home tab；动态 homePath 切换后不会再制造双首页残留。
- [x] `docs/design/styling-system-specification.md` 与 `docs/design/extension-system.md` 已同步为当前 theme/homePath 语义；storage cache 若无 owner-doc update，则本 plan 的 Workstream 2 Exit Criteria 与对应 `docs/logs/` 条目已明确记录 `No owner-doc update required`。
- [x] 必要的 `docs/bugs/` 已同步到当前基线。
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - AI Workbench Lifecycle Hardening

Status: completed
Targets: `apps/main/src/pages/ai-workbench/index.tsx`, `apps/main/src/pages/ai-workbench/index.test.ts`, `docs/design/ai-workbench.md`, relevant `docs/bugs/`

- Item Types: `Fix | Proof`

- [x] Fix: 为 `loadOlderMessages()` 的延迟任务增加可清理的 timer 生命周期，避免页面卸载后继续补写状态。
- [x] Fix: 为 `streamAssistantReply()` 建立组件卸载 / 会话切换 / 用户停止时都能共享的取消语义，避免后台继续推进逐字回复链。
- [x] Fix: 审核 AI Workbench 内与流式会话相关的状态更新路径，确保取消后不会留下永久 `streaming=true`、悬挂 assistant message 或 stale timer。
- [x] Proof: 添加 focused tests，覆盖“开始流式回复后立即离页/卸载”“历史加载未完成即卸载”“用户 stop 后不再继续补字”“会话切换后旧流不再继续补写”四类关键场景。
- [x] Fix: 新增对应 `docs/bugs/` 记录，保存 AI Workbench 生命周期残留的 root cause、修复方式与回归测试保护面。

Exit Criteria:

- [x] AI Workbench 在卸载、路由离开、会话切换或显式 stop 后，不再继续推进历史加载或逐字回复链；focused tests 已断言这些取消语义。
- [x] 取消流式回复后，`streaming` 状态、assistant message 内容和后续用户操作入口保持一致、可恢复。
- [x] `docs/design/ai-workbench.md` 已检查并在需要时同步为当前取消/停止语义；若实现仅属内部生命周期修补且不改变 owner-facing 行为，则明确写 `No owner-doc update required`。
- [x] 必要的 `docs/bugs/` 已同步到当前基线。
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Workstream 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 全部 7 条 in-scope finding 已 landed、被 adjudicated as residual-risk-only / watch-only 裁定、被明确移交 successor ownership、或通过 recorded scope change 移出本计划
- [x] 不存在继续处于“类型/接口已存在，但 live behavior 未兑现”的 in-scope public-contract drift
- [x] theme / homePath / storage / AI lifecycle 的关键行为已具备 focused verification
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline，或对应 Workstream 已明确记录 `No owner-doc update required`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure Mapping

> 关闭本计划前，必须把每个 finding 写入且只写入以下一种状态：`landed`、`adjudicated as residual-risk-only / watch-only`、`moved to explicit successor ownership`、或 `removed from scope through a recorded scope change`。
>
> `Evidence` 必须引用 live repo 中可核对的代码 / 测试 / 文档 / 日志路径，不能只写抽象结论。

| Finding | Final State | Evidence |
|---|---|---|
| `ShellExtension.plugins` 已公开但 host 不消费 | `landed` | `apps/main/src/extensions/bootstrap.ts`, `apps/main/src/store/pluginStore.ts`, `apps/main/src/router/RouteRenderer.test.tsx`, `apps/main/src/pages/plugins/management/index.test.tsx`, `apps/main/src/App.test.tsx`, `docs/design/extension-system.md`, `docs/design/plugin-system.md`, `docs/bugs/36-extension-contract-half-connection-closure.md`, `docs/logs/2026/05-18.md` |
| `supportedLanguages` 为 replace 语义 | `landed` | `apps/main/src/config/i18n/languages.ts`, `apps/main/src/extensions/bootstrap.ts`, `apps/main/src/config/i18n/languages.test.ts`, `apps/main/src/extensions/bootstrap.test.ts`, `examples/extension-demo/src/index.ts`, `examples/extension-demo/src/index.test.ts`, `docs/design/extension-system.md`, `docs/examples/extension-generator.md`, `docs/bugs/36-extension-contract-half-connection-closure.md`, `docs/logs/2026/05-18.md` |
| `ExtensionShellConfig.helpUrl/aboutUrl/supportUrl` 无消费点 | `landed` | `apps/main/src/components/layout/SidebarUserMenu.tsx`, `apps/main/src/components/layout/SidebarUserMenu.test.tsx`, `apps/main/src/hooks/useShellConfig.test.ts`, `docs/design/extension-system.md`, `docs/bugs/36-extension-contract-half-connection-closure.md`, `docs/logs/2026/05-18.md` |
| 失效持久化 `themeId` 导致 DOM/store/bridge 分叉 | `landed` | `apps/main/src/config/themeResolution.ts`, `apps/main/src/store/themeStore.ts`, `apps/main/src/utils/themeCss.ts`, `apps/main/src/App.tsx`, `apps/main/src/utils/themeCss.test.ts`, `apps/main/src/App.test.tsx`, `packages/plugin-bridge/src/index.test.ts`, `docs/design/styling-system-specification.md`, `docs/bugs/37-runtime-state-canonicalization-fixes.md`, `docs/logs/2026/05-18.md` |
| `storageCache` 未处理 `Storage.clear()` 失效事件 | `landed` | `apps/main/src/utils/storage.ts`, `apps/main/src/utils/storage.test.ts`, `docs/bugs/37-runtime-state-canonicalization-fixes.md`, `docs/logs/2026/05-18.md`（No owner-doc update required） |
| 动态 `homePath` 制造双首页 tab | `landed` | `apps/main/src/store/tabStore.ts`, `apps/main/src/router/AppRoutes.tsx`, `apps/main/src/store/tabStore.test.ts`, `apps/main/src/router/AppRoutes.test.tsx`, `docs/design/extension-system.md`, `docs/bugs/37-runtime-state-canonicalization-fixes.md`, `docs/logs/2026/05-18.md` |
| AI Workbench 异步流式/历史加载无卸载取消 | `landed` | `apps/main/src/pages/ai-workbench/index.tsx`, `apps/main/src/pages/ai-workbench/index.test.ts`, `docs/design/ai-workbench.md`, `docs/bugs/38-ai-workbench-lifecycle-cancellation.md`, `docs/logs/2026/05-18.md` |

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 对 extension-host 更深层 reload / teardown 语义做独立审查，前提是本计划已先收口当前 public contract 和 runtime consistency。
- 对 AI Workbench 做真实 profiler / runtime instrumentation 验证，确认生命周期修补后不存在新的性能残留。

## Closure

Status Note: 7 条 in-scope finding 已全部 landed，并完成 focused verification、owner-doc 同步、bug note 记录和独立 closure audit。最终基线已消除 extension contract 半连接、runtime canonical state 分叉、以及 AI Workbench 生命周期残留；本计划无剩余 plan-owned work。

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit task + final repo re-audit
- Evidence: closure audit initially returned `not ready to close` because `docs/plans/27-adversarial-review-contract-state-closure-plan.md` still had unchecked statuses, `docs/index.md` missed bug entries `36-38`, `docs/design/styling-system-specification.md` had stale resolver text, and Workstream 1 needed stronger host-surface proof. Those gaps are now closed via `apps/main/src/router/RouteRenderer.test.tsx`, `apps/main/src/pages/plugins/management/index.test.tsx`, `apps/main/src/App.test.tsx`, `docs/index.md`, `docs/design/styling-system-specification.md`, and this plan file; green verification evidence remains recorded in `docs/logs/2026/05-18.md`.

Follow-up:

- no remaining plan-owned work
