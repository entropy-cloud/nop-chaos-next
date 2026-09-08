# 33 Remove Plugin Support Plan

> Plan Status: draft
> Last Reviewed: 2026-09-08
> Source: 调研发现 plugin 是独立的动态组件加载机制，extension 不需要它
> Related: `docs/plans/16-plugin-build-bridge-runtime-plan.md`

## Purpose

完全删除 plugin 支持机制。Plugin 的核心功能是动态加载远程组件（通过 SystemJS），但 extension 机制不需要这个功能。Extension 主要通过配置来影响 shell 的行为，而不是提供动态组件。

## Current Baseline

- Extension 机制位于 `apps/main/src/extensions/`，使用 `ExtensionSource` 类型
- Extension 可以包含 `plugins` 字段（`PluginManifest[]` 类型）
- Plugin 机制位于 `apps/main/src/store/pluginStore.ts`，使用 `PluginManifest` 类型
- 有专门的 plugin 页面：`apps/main/src/pages/plugins/`
- 有 `PluginMountPanel` 组件用于展示 plugin
- 有 `PluginSlot` 组件用于加载远程 plugin 组件
- 有 `plugin-bridge` 包用于 host 和 plugin 之间的通信
- 有 `examples/plugin-demo` 示例，使用 Rollup 构建 SystemJS 格式的 bundle
- Extension 加载时会将 `extension.plugins` 合并到 `pluginStore` 中
- SystemJS 用于注册共享模块和加载远程组件
- `packages/extension-dev` 使用 Rollup 构建 extension，输出格式为 ESM

## Goals

- 删除 plugin 存储机制（`pluginStore`）
- 删除 plugin UI 组件（`PluginMountPanel`、`PluginSlot`）
- 删除 plugin 页面（`apps/main/src/pages/plugins/`）
- 删除 `plugin-bridge` 包
- 删除 `examples/plugin-demo` 示例（包括其 Rollup 构建配置）
- 删除 extension 中的 `plugins` 字段支持
- 删除所有 plugin 相关文档
- 清理 SystemJS 相关代码（保留 `registerSharedModules` 用于 extension）
- 将 `packages/extension-dev` 从 Rollup 迁移到 rolldown

## Non-Goals

- 不修改 extension 的加载机制
- 不修改 extension 的其他功能（语言、主题、页面等）
- 不删除 SystemJS（extension 仍需要它来注册共享模块）

## Scope

### In Scope

- 删除 `apps/main/src/store/pluginStore.ts` 及相关测试
- 删除 `apps/main/src/pages/plugins/` 目录
- 删除 `apps/main/src/components/plugin/PluginMountPanel.tsx`
- 删除 `apps/main/src/services/mockApi/plugins.ts`
- 删除 `packages/plugin-bridge` 包
- 删除 `examples/plugin-demo` 目录
- 修改 `apps/main/src/extensions/bootstrap.ts` 移除 plugin 合并逻辑
- 修改 `packages/shared/src/types/extension.ts` 移除 `plugins` 字段
- 修改 `apps/main/src/pages/dashboard/index.tsx` 移除 `PluginMountPanel` 引用
- 修改 `apps/main/src/store/layoutStore.ts` 移除 plugins 菜单组
- 修改 `apps/main/src/router/pageRegistry.tsx` 移除 plugin 页面注册
- 修改 `apps/main/src/services/menuMapper.ts` 移除 plugin 相关映射
- 修改 `apps/main/src/plugins/sharedModules.ts` 移除 `@nop-chaos/plugin-bridge`
- 更新相关测试文件
- 删除 plugin 相关文档

### Out Of Scope

- 不修改 extension 的加载机制
- 不修改 extension 的其他功能

## Execution Plan

### Phase 1 - 删除 Plugin 核心包和示例

Status: planned
Targets: `packages/plugin-bridge`, `examples/plugin-demo`

- Item Types: `Fix`, `Decision`

- [ ] 1.1 删除 `packages/plugin-bridge` 目录
- [ ] 1.2 删除 `examples/plugin-demo` 目录
- [ ] 1.3 修改 `pnpm-workspace.yaml` 移除 plugin-demo workspace
- [ ] 1.4 修改根 `package.json` 移除 plugin-demo 相关脚本和 systemjs 依赖
- [ ] 1.5 修改 `packages/shared/src/plugins/sharedModuleNames.ts` 移除 `@nop-chaos/plugin-bridge`
- [ ] 1.6 修改 `apps/main/src/plugins/sharedModules.ts` 移除 `@nop-chaos/plugin-bridge` 导入和注册

Exit Criteria:

- [ ] 上述目录和文件已删除
- [ ] `pnpm install` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - 删除 Plugin 存储和 UI

Status: planned
Targets: `apps/main/src/store/pluginStore.ts`, `apps/main/src/pages/plugins/`, `apps/main/src/components/plugin/`

- Item Types: `Fix`, `Decision`

- [ ] 2.1 删除 `apps/main/src/store/pluginStore.ts` 文件
- [ ] 2.2 删除 `apps/main/src/store/pluginStore.test.ts` 文件
- [ ] 2.3 删除 `apps/main/src/pages/plugins/` 目录
- [ ] 2.4 删除 `apps/main/src/components/plugin/PluginMountPanel.tsx` 文件
- [ ] 2.5 删除 `apps/main/src/services/mockApi/plugins.ts` 文件
- [ ] 2.6 修改 `apps/main/src/services/mockApi/index.ts` 移除 plugin 导出

Exit Criteria:

- [ ] 上述文件已删除
- [ ] `pnpm typecheck` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - 修改 Extension 类型和引用

Status: planned
Targets: `packages/shared/src/types/extension.ts`, `apps/main/src/extensions/bootstrap.ts`, `apps/main/src/plugins/sharedModules.ts`

- Item Types: `Fix`

- [ ] 3.1 修改 `packages/shared/src/types/extension.ts` 移除 `plugins` 字段
- [ ] 3.2 修改 `apps/main/src/extensions/bootstrap.ts` 移除 plugin 合并逻辑
- [ ] 3.3 修改 `apps/main/src/plugins/sharedModules.ts` 移除 `@nop-chaos/plugin-bridge`
- [ ] 3.4 修改 `apps/main/src/pages/dashboard/index.tsx` 移除 `PluginMountPanel` 引用
- [ ] 3.5 修改 `apps/main/src/store/layoutStore.ts` 移除 `plugins` 从 `expandedMenuIds`
- [ ] 3.6 修改 `apps/main/src/router/pageRegistry.tsx` 移除 `plugins-management` 和 `plugins-overview` 页面注册
- [ ] 3.7 修改 `apps/main/src/services/menuMapper.ts` 移除 plugin 相关映射

Exit Criteria:

- [ ] 上述文件已修改
- [ ] `pnpm typecheck` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - 清理测试和文档

Status: planned
Targets: 测试文件, 文档

- Item Types: `Fix`

- [ ] 4.1 更新 `apps/main/src/extensions/bootstrap.test.ts` 移除 plugin 相关测试
- [ ] 4.2 更新 `apps/main/src/store/tabStore.test.ts` 移除 plugin 相关测试
- [ ] 4.3 删除 `docs/design/plugin-system.md`
- [ ] 4.4 删除 `docs/examples/plugin-dev-guide.md`
- [ ] 4.5 删除 `docs/plans/16-plugin-build-bridge-runtime-plan.md`
- [ ] 4.6 删除 `docs/plans/26-plugin-esm-dual-format-follow-up-plan.md`
- [ ] 4.7 删除 `docs/plans/2026-07-20-1930-6-pageobject-migration-flow-editor-plugin-specs.md`
- [ ] 4.8 删除 `docs/bugs/32-plugin-bridge-unstable-snapshot-loop.md`
- [ ] 4.9 删除 `docs/bugs/43-vite-plugin-configure-server-async-fire-and-forget.md`
- [ ] 4.10 删除 `docs/analysis/2026-05-18-deep-audit-full/08-plugin-bridge.md`
- [ ] 4.11 删除 `docs/analysis/2026-05-15-deep-audit-next/08-plugin-bridge.md`
- [ ] 4.12 删除 `docs/analysis/2026-05-16-deep-audit-full-run/08-plugin-bridge.md`
- [ ] 4.13 更新 `AGENTS.md` 移除 plugin-demo 相关内容
- [ ] 4.14 更新 `docs/index.md` 移除 plugin 相关引用
- [ ] 4.15 更新 `docs/skills/code-refactor-prompt.md` 移除 plugin 相关内容
- [ ] 4.16 更新 `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md` 移除 plugin 相关内容
- [ ] 4.17 更新 `docs/skills/react19-best-practices-review.md` 移除 plugin 相关内容
- [ ] 4.18 更新 `docs/skills/code-refactor-discovery-prompt.md` 移除 plugin 相关内容
- [ ] 4.19 更新 `docs/skills/deep-audit-execution-framework.md` 移除 plugin 相关内容
- [ ] 4.20 更新 `docs/references/mock-data.md` 移除 plugin 相关内容
- [ ] 4.21 更新 `docs/references/workspace-package-build-for-node-esm.md` 移除 plugin 相关内容
- [ ] 4.22 更新 `docs/bugs/36-extension-contract-half-connection-closure.md` 移除 plugin 相关内容
- [ ] 4.23 运行完整测试套件验证

Exit Criteria:

- [ ] 测试文件已更新
- [ ] 所有 plugin 相关文档已删除或更新
- [ ] `pnpm test` 通过
- [ ] `pnpm lint` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 5 - 更新 Vite 生态和工具链到最新版本

Status: planned
Targets: `package.json`, `packages/extension-dev`

- Item Types: `Fix`, `Decision`

**版本更新清单**:

| 包名 | 当前版本 | 最新稳定版 | 更新说明 |
|------|----------|------------|----------|
| `vite` | `^8.0.3` | `8.2.2` | 核心构建工具 |
| `turbo` | `^2.9.6` | `2.10.12` | Monorepo 编排 |
| `@vitejs/plugin-react` | `^6.0.1` | `6.1.1` | React Vite 插件 |
| `vitest` | `^4.1.2` | `5.0.0` | 测试框架（重大版本） |
| `@vitest/coverage-v8` | `^4.1.4` | `5.0.0` | 测试覆盖率 |
| `rolldown` | N/A | `1.2.7` | 替换 Rollup（新增） |

- [ ] 5.1 更新根 `package.json` 中 `vite` 到 `^8.2.2`
- [ ] 5.2 更新根 `package.json` 中 `turbo` 到 `^2.10.12`
- [ ] 5.3 更新根 `package.json` 中 `@vitejs/plugin-react` 到 `^6.1.1`
- [ ] 5.4 更新根 `package.json` 中 `vitest` 到 `^5.0.0`（重大版本，需检查迁移指南）
- [ ] 5.5 更新根 `package.json` 中 `@vitest/coverage-v8` 到 `^5.0.0`
- [ ] 5.6 在根 `package.json` 添加 `rolldown` 依赖 `^1.2.7`
- [ ] 5.7 将 `packages/extension-dev` 从 Rollup 迁移到 rolldown：
  - 修改 `packages/extension-dev/package.json`：移除 `rollup` 和 `rollup-plugin-esbuild`，添加 `rolldown`
  - 修改 `packages/extension-dev/src/build.mjs`：将 Rollup API 替换为 rolldown API
- [ ] 5.8 检查 vitest 5.x 迁移指南，更新测试配置（如有 breaking changes）
- [ ] 5.9 运行 `pnpm install` 验证依赖解析
- [ ] 5.10 运行 `pnpm typecheck && pnpm build && pnpm test` 验证全部通过

Exit Criteria:

- [ ] 根 `package.json` 中所有依赖已更新到最新版本
- [ ] `packages/extension-dev` 使用 rolldown 替代 Rollup
- [ ] vitest 5.x 迁移完成，所有测试通过
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [ ] 所有 plugin 相关文件和目录已删除
- [ ] 所有引用 plugin 的文件已修改
- [ ] 所有测试已更新
- [ ] 所有相关文档已删除或更新
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全过
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 未来可考虑为 extension 添加动态组件加载功能（如果需要）

## Closure

Status Note: 待执行完成后填写

Closure Audit Evidence:

- Auditor / Agent: 待填写
- Evidence: 待填写

Follow-up:

- 待填写
