# 对抗性审查 Round 02

本轮切入视角：运行时时序裂缝、输出契约是否真的被主应用兑现。

## 发现 1：HIGH - 动态 `homePath` 在 tabStore 初始化之后才生效，会制造两个不可关闭的“首页 tab”

- 在哪里：`apps/main/src/store/tabStore.ts:6-13,25-29,61-77`，`apps/main/src/config/systemMenus.ts:160-178`，`apps/main/src/router/AppShell.tsx:77-88`
- 是什么：`tabStore` 在模块初始化时立即调用 `createHomeTab()`，把当时的 `getCurrentHomePath()` 固化成初始首页 tab。默认值是 `/dashboard`。但 extension 的真实首页要等菜单合并阶段由 `mergeBuiltinSystemMenus()` 调用 `setCurrentHomePath()` 才会写入。随后 `AppShell` 在访问 extension 首页时，又会以 `closable: false` 注册新的首页 tab，因为此时 `location.pathname === getCurrentHomePath()` 已经变成新的 extension home。
- 为什么值得关心：这不是旧报告里的“硬编码 `/dashboard`”同一个问题，而是一个更隐蔽的时序缺陷。用户会得到两个都不可关闭的首页 tab：旧的 `/dashboard` 和新的 extension 首页。`closeOtherTabs()` 还会保留所有 `closable: false` 的 tab，导致双首页状态长期存在。现有 `tabStore.test.ts` 只验证了 `setCurrentHomePath()` 之后 `closeAllTabs()` 会回到新首页，但没有覆盖“store 先初始化、homePath 后变更、AppShell 再注册新首页”的真实链路。
- 信心水平：确定

## 发现 2：MEDIUM - `ExtensionShellConfig.helpUrl/aboutUrl/supportUrl` 被 merge 进 runtime config，但主应用没有任何消费点

- 在哪里：`packages/shared/src/types/extension.ts:72-77`，`packages/extension-host/src/runtime.ts:50-57,180-186`，`apps/main/src/hooks/useShellConfig.ts:4-9`，`apps/main/src/components/layout/SidebarUserMenu.tsx:47-130`
- 是什么：extension shell config 类型公开承诺了 `helpUrl`、`aboutUrl`、`supportUrl`。extension-host 也确实把它们 merge 到 `ShellRuntimeConfig.shell` 中，甚至有测试覆盖这个 merge 结果。但主应用里只有 `defaultHomePath` 被实际读取；`helpUrl`、`aboutUrl`、`supportUrl` 在 `apps/main/src` 中没有任何 UI 消费点，用户菜单也仍然只包含本地设置/主题/语言/退出。
- 为什么值得关心：这是一种比“字段完全不处理”更危险的幽灵契约。因为它已经通过 host runtime merge 和测试，看起来像是“功能已完成”，但最后一跳 UI 完全没接。extension 作者会自然地把这些 URL 当成可配置导航入口，结果 host 静默忽略。随着 extension 配置项继续增长，这类“中间层已支持、最终产品没兑现”的半连接能力会比纯死字段更难被发现。
- 信心水平：确定
