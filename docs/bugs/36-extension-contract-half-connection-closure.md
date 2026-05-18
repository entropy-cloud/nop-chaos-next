# 36 Extension Contract Half-Connection Closure

## Problem

- `ShellExtension.plugins`、`supportedLanguages`、`helpUrl/aboutUrl/supportUrl` 已出现在 shared public contract 中，但 host 对这些字段的兑现程度不一致。
- 结果上 extension 作者能在类型层看到这些能力，却无法稳定依赖它们在 host runtime、管理页或 shell UI 中生效。

## Diagnostic Method

- 先对照 `docs/analysis/2026-05-18-adversarial-review/round-01.md` 与 live repo，确认问题不在 shared type 缺失，而在 host 消费面未闭环。
- 检查 `apps/main/src/extensions/bootstrap.ts`、`apps/main/src/store/pluginStore.ts`、`packages/plugin-bridge/src/index.ts`，确认 `plugins` 只到类型层或局部状态层时会形成半连接 contract。
- 检查 `apps/main/src/components/layout/SidebarUserMenu.tsx` 与主应用 UI 流程，确认 `helpUrl/aboutUrl/supportUrl` 已 merge 到 runtime config，但此前没有产品消费点。
- 检查 generator 和 example surfaces，确认脚手架仍生成 deprecated `languages`，会继续传播过时 contract 写法。

## Root Cause

- extension contract 扩张后，host 没有把所有字段都落实到最终消费面，导致“shared type 已出现”被误当成“supported baseline 已成立”。
- contract owner surface 分散在 shared types、bootstrap、plugin store、plugin bridge、shell UI 和 generator 之间，缺少一次端到端的收口校验。

## Fix

- `apps/main/src/extensions/bootstrap.ts` 改为把 extension `plugins` 合并进 host `pluginStore`，并保留 persisted overrides 与当前 baseline 的合并语义。
- `apps/main/src/config/i18n/languages.ts` / `bootstrap.ts` 建立 `resetLanguages()` + `registerLanguages(...)` 语义，让 host 默认语言与多个 extension 语言共存；新默认写法改为 `supportedLanguages`。
- `apps/main/src/components/layout/SidebarUserMenu.tsx` 增加 Help / About / Support 菜单项，实际消费 shell URL contract。
- `scripts/generate-extension.mjs`、设计文档与示例文档同步为当前 supported contract，避免脚手架继续生成 deprecated `languages`。

## Tests

- `apps/main/src/extensions/bootstrap.test.ts` - 验证多个 extension 的 `supportedLanguages` 与 `plugins` 会一起进入 host runtime。
- `apps/main/src/store/pluginStore.test.ts` - 验证 persisted plugins 会与当前 baseline 合并，不会抹掉 extension 注入结果。
- `apps/main/src/hooks/useShellConfig.test.ts` - 验证 shell runtime config 暴露 Help / About / Support URLs。
- `apps/main/src/components/layout/SidebarUserMenu.test.tsx` - 验证用户菜单真实消费并打开 Help / About / Support 外链。
- `apps/main/src/App.test.tsx`、`packages/plugin-bridge/src/index.test.ts` - 验证 bridge snapshot 能观察到 host 解析后的 extension-related runtime state。

## Affected Files

- `apps/main/src/extensions/bootstrap.ts`
- `apps/main/src/config/i18n/languages.ts`
- `apps/main/src/store/pluginStore.ts`
- `apps/main/src/components/layout/SidebarUserMenu.tsx`
- `scripts/generate-extension.mjs`
- `docs/design/extension-system.md`
- `docs/design/plugin-system.md`
- `docs/examples/plugin-dev-guide.md`
- `docs/examples/extension-generator.md`

## Notes For Future Refactors

- 不能把 extension public contract 的“字段存在”当成 supported baseline；必须同步检查 host runtime、UI、bridge 和脚手架是否都兑现语义。
- 新增 extension contract 字段时，至少同时审查 bootstrap、bridge、example、docs 和 generator surface。
