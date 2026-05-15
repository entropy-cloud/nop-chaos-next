# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

### [维度03-01] @nop-chaos/shared 使用无限制 export *，无 API 门控

- **文件**: `packages/shared/src/index.ts:1-15`
- **严重程度**: P1
- **现状**: 所有 15 行为 `export * from './...'`。暴露了内部辅助函数、可变模块级状态变量和理应私有化的函数（如 decodeJwtPayload, getTokenStorage, resetTokenStorage, setRefreshTokenFetcher, appIconAliasMap）。
- **风险**: 子模块任何新增函数自动成为公共 API；消费者无法区分公共契约和内部实现；模块级可变状态暴露允许外部代码破坏共享状态。
- **建议**: 替换为明确具名导出列表；内部状态设变函数放 `host/` 子路径导出或明确文档化。

### [维度03-02] toIconLookupKey 在 3 个包中重复实现且有行为分歧

- **文件**: `packages/shared/src/types/icon.ts:52-59`, `packages/core/src/utils/iconMap.tsx:64-66`, `flux-lib/ui/src/lib/icon-utils.ts:14-22`
- **严重程度**: P2
- **现状**: 三个独立的相同 icon key 规范化函数实现。core 版本缺少 Font Awesome 前缀剥离的两个 regex 替换，与 shared 和 ui 版本行为不一致。
- **风险**: 带 FA 前缀的 icon 名称在不同路径下被不同规范化，导致 Lucide icon 查找静默失败。
- **建议**: core 从 shared 导入 toIconLookupKey，消除重复。

### [维度03-03] @nop-chaos/plugin-bridge 有僵尸/未使用依赖

- **文件**: `packages/plugin-bridge/package.json:8-14`
- **严重程度**: P1
- **现状**: dependencies 包含 zustand, sonner, i18next，但源码中均未 import。
- **风险**: 安全漏洞误报；lockfile 膨胀；维护者误以为 zustand 是 bridge 消费者的必需依赖。
- **建议**: 从 dependencies 移除 zustand, sonner, i18next。

### [维度03-04] @nop-chaos/shared 从 types/ 目录导出运行时函数

- **文件**: `packages/shared/src/types/icon.ts:1-76`, `packages/shared/src/types/theme.ts:4-10`
- **严重程度**: P2
- **现状**: types/icon.ts 包含可变别名映射 appIconAliasMap 和运行时守卫函数；types/theme.ts 包含 normalizeThemeId 运行时函数。
- **风险**: 维护者可能在 types/ 下新增运行时逻辑；目录名称暗示纯类型定义，造成误导性接口契约。
- **建议**: 将运行时函数移至 `shared/src/utils/icon.ts` 和 `shared/src/utils/theme.ts`。

### [维度03-05] iconRegistry 在 @nop-chaos/core 中作为可变全局状态导出

- **文件**: `packages/core/src/utils/iconMap.tsx:42-62`
- **严重程度**: P2
- **现状**: iconRegistry 作为 `Record<AppIconName, string>` 导出。任何运行时消费者可覆写条目，影响所有其他消费者的图标解析。
- **风险**: 恶意或有 bug 的插件可做 `iconRegistry.home = 'bug'` 静默破坏所有 home icon 渲染。
- **建议**: 改为 `Readonly<Record<>>` 或仅通过 getter 函数暴露。

### [维度03-06] apps/main/src/types/menu.ts 和 user.ts 是冗余的 re-export 包装器

- **文件**: `apps/main/src/types/menu.ts:1`, `apps/main/src/types/user.ts:1`
- **严重程度**: P3
- **现状**: 两个文件都是单行 `export type { ... } from '@nop-chaos/shared'`，零价值。
- **风险**: 两个同等有效导入路径造成混乱；工具可能标记一个路径未使用而另一个在使用。
- **建议**: 删除两个文件，所有导入直接引用 @nop-chaos/shared。

### [维度03-07] pageRegistry.tsx 重新导出页面组件，拓宽 API 表面积

- **文件**: `apps/main/src/router/pageRegistry.tsx:82`
- **严重程度**: P3
- **现状**: 文件名为 pageRegistry 但公共 API 混合了注册功能和组件 re-export。
- **建议**: 移除 re-export，在 AppRoutes.tsx 中直接导入；或将 re-export 命名为更具体的 SystemErrorPages 常量。

### [维度03-08] getBaseOrigin() 在 3 个包中重复实现完全相同

- **文件**: `packages/shared/src/http/url.ts:1-3`, `packages/core/src/utils/systemjs.ts:18-20`, `packages/amis-core/src/page/action.ts:18-19`
- **严重程度**: P1
- **现状**: 同一工具函数在三个包中独立定义，均为私有函数。
- **风险**: SSR/base URL 逻辑需变更时三处独立更新，是维护定时炸弹。
- **建议**: 从 shared 导出 getBaseOrigin，core 和 amis-core 从 shared 导入。

### [维度03-09] extension-host 在运行时调用 validateMenuResponse 可能抛出

- **文件**: `packages/extension-host/src/runtime.ts:7,209`
- **严重程度**: P2
- **现状**: mergeExtensionMenus 调用 validateMenuResponse，后者对每次校验失败抛 Error。
- **风险**: extension 提供格式错误的菜单项会导致整个 shell 崩溃白屏。
- **建议**: 在 mergeExtensionMenus 中 try/catch 包裹校验，跳过无效项。
