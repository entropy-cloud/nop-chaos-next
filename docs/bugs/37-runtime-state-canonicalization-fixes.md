# 37 Runtime State Canonicalization Fixes

## Problem

- 主题、storage cache 和 dynamic homePath 在重配置场景下各自维护局部真相，导致 DOM、store、bridge 或 tab state 之间出现分叉。
- 用户能看到的症状包括：失效 `themeId` 时 DOM 已回退但 bridge 仍暴露旧主题、跨 tab `Storage.clear()` 后仍读到缓存旧值、以及动态 homePath 切换后出现双首页 tab。

## Diagnostic Method

- 检查 `apps/main/src/utils/themeCss.ts`、`apps/main/src/store/themeStore.ts` 和 `apps/main/src/App.tsx`，对比 DOM 应用层与 bridge snapshot 是否共用同一套主题解析逻辑。
- 检查 `apps/main/src/utils/storage.ts` 的 `storage` 事件处理，确认只处理了具体 key 失效，没有覆盖 `event.key === null` 的 `Storage.clear()` 语义。
- 检查 `apps/main/src/store/tabStore.ts` 与 `apps/main/src/config/homePath.ts` 的协作路径，确认 non-closable home tab 会因为 canonical home 变化而留下 legacy `/dashboard` 残留。
- 用 focused regression tests 证明这些问题都不是单点 UI 现象，而是跨 store / DOM / bridge 的状态真相不一致。

## Root Cause

- 同一份 runtime state 在多个入口各自做 fallback 或缓存，缺少统一 canonical source。
- `storageCache` 把跨 tab clear 视作“无事件”，而 `tabStore` 把旧 non-closable home tab 当作普通稳定 baseline，导致时序变化后残留旧状态。

## Fix

- 在 `apps/main/src/utils/themeCss.ts` 引入 `resolveThemeConfig()`，并让 `themeStore` hydrate、DOM 应用和 `App.tsx` bridge snapshot 共享同一 canonical theme fallback。
- 在 `apps/main/src/utils/storage.ts` 处理 `event.key === null` 时清空内存缓存，确保跨 tab `Storage.clear()` 后不会继续返回陈旧值。
- 在 `apps/main/src/store/tabStore.ts` 中把 canonical home tab 视为单例：当新的 non-closable home tab 打开时替换 legacy home tab，而不是并存。
- 在 `apps/main/src/router/AppRoutes.tsx` 中改用 `getCurrentHomePath()` 作为认证后跳转的 canonical source。

## Tests

- `apps/main/src/utils/themeCss.test.ts` - 验证失效主题会回退到默认主题。
- `apps/main/src/App.test.tsx` - 验证 plugin bridge snapshot 暴露的是 host-resolved theme。
- `packages/plugin-bridge/src/index.test.ts` - 验证 plugin hooks 读取的是 bridge snapshot 中的 canonical theme。
- `apps/main/src/utils/storage.test.ts` - 验证 `Storage.clear()` / `event.key === null` 会清空内存缓存。
- `apps/main/src/store/tabStore.test.ts` - 验证 canonical home tab 不会与 legacy home tab 并存。
- `apps/main/src/router/AppRoutes.test.tsx` - 验证认证后重定向遵循 `getCurrentHomePath()`。

## Affected Files

- `apps/main/src/utils/themeCss.ts`
- `apps/main/src/store/themeStore.ts`
- `apps/main/src/App.tsx`
- `apps/main/src/utils/storage.ts`
- `apps/main/src/store/tabStore.ts`
- `apps/main/src/router/AppRoutes.tsx`
- `docs/design/styling-system-specification.md`
- `docs/design/extension-system.md`

## Notes For Future Refactors

- 任何 runtime fallback 都应先确认是否已经存在 canonical resolver，避免 DOM、store、bridge 各自重复实现一套近似逻辑。
- 对跨 tab / persisted state 的修补必须覆盖事件分支和初始化分支，不能只看单 tab happy path。
