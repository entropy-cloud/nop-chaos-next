# 07 Demo Reference Surface Plan

> Plan Status: in_progress
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-review/round-02-demo-quality.md`
> Related: `docs/plans/06-accessibility-and-i18n-contract-plan.md`

## Purpose

将 `examples/plugin-demo`、`examples/extension-demo` 以及 `docs/examples/plugin-dev-guide.md` 收口到“可以作为仓库内参考实现和开发说明使用”的最低可信基线：依赖声明完整、没有会误导复制者的安全反模式、最小测试存在、文档与 live repo 一致、示例目录受到最小静态约束。

## Current Baseline

- `examples/plugin-demo` 与 `examples/extension-demo` 当前均为零测试，`test` 脚本依赖 `--passWithNoTests`。
- `examples/extension-demo/package.json` 缺少 `lucide-react` 声明，且 runtime/peer dependency 边界不完整。
- `examples/plugin-demo` 调用 `t()` 但没有 locale 文件；`examples/extension-demo` 拥有 locale 文件但页面大量硬编码英文。
- `examples/extension-demo/src/pages/ExtensionLoginPage.tsx` 存在硬编码密码、硬编码 token 与不安全类型转换。
- `examples/plugin-demo/src/index.tsx` 存在 `import type` hygiene drift；`scripts/sync-to-host.mjs` 使用仓库硬编码路径；`scripts/build-with-rollup.mjs` 与 host shared-module 注册之间存在竞态提示缺口。
- `docs/examples/plugin-dev-guide.md` 的目录结构、依赖版本和示例声明与 live repo 不一致。
- `eslint.config.js` 当前未将 examples 纳入 i18n literal-string 约束。

## Goals

- 修复 demo 中已确认的依赖声明缺口和安全反模式。
- 让两个 demo 都具备最小测试基线，并确保 workspace 能发现这些测试配置。
- 让 plugin-demo 与 extension-demo 的 i18n 状态诚实且可用，不再出现“假装支持但实际失效”的双基线。
- 让 `docs/examples/plugin-dev-guide.md` 与 live repo 的目录、依赖、脚本约定一致。
- 为示例目录补充最小可行的静态约束，阻止本轮已确认问题快速回归。

## Non-Goals

- 不把 demo 提升为生产级模板或完整脚手架。
- 不在本计划中处理主应用或 flux-lib 的 a11y / i18n 合同问题。
- 不在本计划中处理 `recharts` 异步共享模块竞态之外的更大插件系统架构调整。
- 不为 extension / plugin demo 引入大量新的抽象层或完整国际化框架重构。

## Scope

### In Scope

- `examples/plugin-demo/package.json`
- `examples/plugin-demo/src/index.tsx`
- `examples/plugin-demo/scripts/build-with-rollup.mjs`
- `examples/plugin-demo/scripts/sync-to-host.mjs`
- `examples/plugin-demo/public/**`
- `examples/plugin-demo/vitest.config.ts`
- `examples/plugin-demo/src/**/*.test.ts?(x)`
- `examples/extension-demo/package.json`
- `examples/extension-demo/src/index.ts`
- `examples/extension-demo/src/pages/ExtensionLoginPage.tsx`
- `examples/extension-demo/src/pages/ExtensionBuiltinPage.tsx`
- `examples/extension-demo/src/pages/ExtensionNotFoundPage.tsx`
- `examples/extension-demo/public/locales/**`
- `examples/extension-demo/vitest.config.ts`
- `examples/extension-demo/src/**/*.test.ts?(x)`
- `docs/examples/plugin-dev-guide.md`
- `eslint.config.js`
- `vitest.workspace.ts`

### Out Of Scope

- 主应用、core、flux-lib、plugin-bridge 的生产代码修复
- demo 视觉风格优化与组件抽象美化
- 完整解决 `build-with-rollup.mjs` 与 `sharedModules.ts` 的架构竞态以外的所有插件加载问题
- extension system 的设计扩展与新 API 增加

## Execution Plan

### Phase 1 - 依赖声明与安全反模式修复

Status: completed
Targets: `examples/extension-demo/package.json` `examples/plugin-demo/package.json` `examples/plugin-demo/src/index.tsx` `examples/plugin-demo/scripts/sync-to-host.mjs` `examples/extension-demo/src/pages/ExtensionLoginPage.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 为 `examples/extension-demo/package.json` 补齐 `lucide-react` 等已确认缺失的运行时依赖声明。
- [x] Fix: 纠正 extension demo 的 runtime / peer dependency 边界，确保移出 monorepo 时不依赖 workspace hoist 才能运行。
- [x] Fix: 为 `examples/plugin-demo/src/index.tsx` 对齐 `import type` 使用，消除与仓库约定不一致的类型导入模式。
- [x] Fix: 让 `examples/plugin-demo/scripts/sync-to-host.mjs` 不再依赖硬编码仓库路径，至少支持显式配置目标输出路径。
- [x] Decision: 为 `examples/plugin-demo/scripts/build-with-rollup.mjs` 和相关说明明确 shared-module 竞态前提，保证 demo 不再暗示“当前构建脚本对所有共享模块都无前置条件”。
- [x] Fix: 移除 `ExtensionLoginPage.tsx` 中硬编码密码 `123456` 与硬编码 token，改为显式 demo-only mock 机制。
- [x] Fix: 去除 `ExtensionLoginPage.tsx` 中不安全的 `as unknown as` 类型转换，改成可检查的边界类型。
- [x] Decision: 明确 plugin-demo 是否继续要求 `react` / `react-dom` 仅作为本地开发依赖，并让文档与 package 声明一致。
- [x] Proof: 为上述依赖和 mock 登录路径补充 focused verification。

Exit Criteria:

- [x] extension-demo 不再依赖缺失声明或 workspace hoist 才能运行。
- [x] plugin-demo 的示例入口与同步脚本不再包含已确认的 hygiene / portability defect。
- [x] plugin-demo 的构建脚本与相关说明不再对 shared-module 竞态前提保持沉默。
- [x] demo 中不再包含硬编码密码和硬编码 token 这种可复制的安全反模式。
- [x] `ExtensionLoginPage.tsx` 的类型边界不再使用 `as unknown as`。
- [x] 相关 package 声明与文档口径一致。
- [x] `docs/examples/plugin-dev-guide.md` 已同步更新依赖边界与 demo 脚本约定
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - 示例 i18n 诚实化

Status: completed
Targets: `examples/plugin-demo/src/index.tsx` `examples/plugin-demo/public/**` `examples/extension-demo/src/pages/ExtensionLoginPage.tsx` `examples/extension-demo/src/pages/ExtensionBuiltinPage.tsx` `examples/extension-demo/src/pages/ExtensionNotFoundPage.tsx` `examples/extension-demo/public/locales/**`

- Item Types: `Fix | Decision | Proof`

- [x] Fix: 为 plugin-demo 提供最小可工作的 locale 资源与加载路径，或删去无效 `t()` 调用并明确当前限制；不得继续保持“使用 i18n API 但无资源”的假象。
- [x] Fix: 让 extension-demo 页面与已存在 locale 文件对齐，消除大面积硬编码英文。
- [x] Decision: 明确 demo 的 i18n 支持基线，并在示例代码与文档中保持同一口径。
- [x] Proof: 为两个 demo 至少各增加一个 i18n 相关 focused test，验证文案路径真实可用。

Exit Criteria:

- [x] plugin-demo 的 i18n 状态真实可用，或已被明确裁定为不支持且代码/文档一致。
- [x] extension-demo 页面不再与其 locale 资产自相矛盾。
- [x] 两个 demo 至少各有一条测试证明其 i18n 路径真实成立。
- [x] 如 demo 对外开发说明发生变化，`docs/examples/plugin-dev-guide.md` 已同步更新
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - 测试发现与文档对齐

Status: completed
Targets: `examples/plugin-demo/vitest.config.ts` `examples/extension-demo/vitest.config.ts` `vitest.workspace.ts` `docs/examples/plugin-dev-guide.md`

- Item Types: `Fix | Proof`

- [x] Fix: 为两个 demo 增加 `vitest.config.ts`，让 workspace 能发现各自测试配置。
- [x] Fix: 确保 demo 的 `test` 脚本与 workspace discovery 一致，不再依赖“零测试也通过”的假象来充当基线。
- [x] Fix: 更新 `docs/examples/plugin-dev-guide.md` 的目录结构、依赖声明、版本、脚本说明，使其与 live repo 一致。
- [x] Proof: 验证 workspace 能发现并执行 demo 测试。

Exit Criteria:

- [x] `vitest.workspace.ts` 能发现两个 demo 的测试配置。
- [x] 两个 demo 都至少有一个测试文件，并可通过各自 package script 运行。
- [x] `docs/examples/plugin-dev-guide.md` 的目录、版本、脚本、依赖边界与 live repo 一致。
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - 示例目录最小静态约束

Status: completed
Targets: `eslint.config.js` `examples/plugin-demo/**` `examples/extension-demo/**`

- Item Types: `Fix | Proof | Decision`

- [x] Fix: 将 `examples/plugin-demo/**` 与 `examples/extension-demo/**` 纳入 `eslint.config.js` 的 `i18next/no-literal-string` 约束，覆盖本轮已确认的硬编码用户文案问题。
- [x] Decision: 为 examples 明确允许的 demo-only 例外边界，避免把真实缺陷重新包成“示例可以不管”。
- [x] Proof: 验证新增静态约束不会错误阻断当前已裁定允许的示例代码模式。

Exit Criteria:

- [x] `eslint.config.js` 中已存在针对 examples 的可见规则配置，且 `pnpm lint` 能覆盖示例目录。
- [x] 对 examples 的允许例外边界有明确规则，而非依赖隐式惯例。
- [x] `pnpm lint` 通过。
- [x] `docs/examples/plugin-dev-guide.md` 已记录 examples 的相关开发约束
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复或被明确移出当前 scope
- [ ] demo/reference surface 已达到仓库内最低可信基线，不再误导复制者
- [ ] 两个 demo 均有最小测试基线，且 workspace discovery 可验证
- [ ] 文档与 live repo 已同步，不存在目录/版本/脚本漂移
- [ ] examples 的最小静态约束已建立
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Plugin Shared Module 竞态生产级治理

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本计划仅认领 demo 侧的文档与说明诚实性，不认领生产 sharedModules 架构修复；closure 前必须确保 demo 文档明确该限制或避免暗示“现有脚本完全无竞态前提”。
- Successor Required: `yes`
- Successor Path: `docs/plans/11-dx-store-security-plan.md`

## Non-Blocking Follow-ups

- 如后续需要，可为 demo 提供脚手架化生成模板而非仅参考实现

## Closure

Status Note: Live repo 已完成 demo 依赖/安全反模式修复、plugin-demo 与 extension-demo i18n 资源对齐、focused tests 补齐与 plugin dev guide 同步；closure 仍待本轮总体验证与独立 closure-audit 回填。

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit（earlier pass in current session）
- Evidence: 审核结论曾将 `examples/extension-demo/src/pages/ExtensionLoginPage.tsx`、`ExtensionBuiltinPage.tsx`、`ExtensionNotFoundPage.tsx`、`docs/examples/plugin-dev-guide.md`、`examples/plugin-demo/src/index.test.tsx`、`examples/extension-demo/src/index.test.ts` 识别为 closure blocker；本轮已逐项补齐 live code、locale assets、focused tests 与文档，但需要在总计划 closure audit 中重新验证后再标记整计划完成。

Follow-up:

- <<只记录 non-blocking follow-up>>
