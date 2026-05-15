# 插件与扩展系统设计

> 本文档描述当前仓库中 host shell、remote plugin、extension builtin/system page、shared-module 前提与插件管理页的真实合同。

---

## 1. 系统分层

当前仓库存在两类可扩展能力：

- remote plugin：通过 `pageType: 'plugin'` 挂载远程模块，典型参考实现为 `examples/plugin-demo`
- extension builtin/system page：通过 extension manifest 注册 builtin 页面与 system page override，典型参考实现为 `examples/extension-demo`

两者共享的宿主运行时入口是 `@nop-chaos/plugin-bridge`，而不是 `@nop-chaos/core`。

---

## 2. 运行时入口

### 2.1 Host 侧

- 路由与页面注册：`apps/main/src/router/AppRoutes.tsx`、`apps/main/src/router/RouteRenderer.tsx`、`apps/main/src/router/pageRegistry.tsx`
- 插件共享模块注册：`apps/main/src/plugins/sharedModules.ts`
- extension 启动与 i18n 资源加载：`apps/main/src/extensions/bootstrap.ts`
- 插件桥接快照与 hooks：`packages/plugin-bridge/src/index.ts`

### 2.2 Remote plugin 侧

- 入口参考：`examples/plugin-demo/src/index.tsx`
- locale 资源：`examples/plugin-demo/public/locales/{lng}/translation.json`
- focused proof：`examples/plugin-demo/src/index.test.tsx`

### 2.3 Extension 侧

- manifest / builtin page registration：`examples/extension-demo/src/index.ts`
- system page override：`systemPages.login`、`systemPages.notFound`、`systemPages.dashboard`
- locale 资源：`examples/extension-demo/public/locales/{lng}/translation.json`
- focused proof：`examples/extension-demo/src/index.test.ts`

---

## 3. 桥接合同

插件和 extension 页面允许通过 `@nop-chaos/plugin-bridge` 获取：

- 当前用户与主题：`usePluginUser()`、`usePluginThemeConfig()`
- 插件 manifest：`usePluginManifest(pluginId)`
- 宿主通知：`usePluginNotifications()`
- i18n：remote plugin 通常使用自己的 `useTranslation()`；extension builtin/system page 使用 `usePluginI18n()` 读取宿主已注入的 locale 资源
- 导航：细粒度 hooks 优先；若是 extension builtin/system page，则通过 bridge `navigate()` 保持宿主路由所有权

不允许插件直接 import `@nop-chaos/core` 来绕过桥接层读取宿主运行时状态。

---

## 4. Shared Module 前提

`examples/plugin-demo/scripts/build-with-rollup.mjs` 当前输出的是 externalized SystemJS bundle。

这意味着：

- 构建产物不会自带 `react`、`react-dom`、`react-router-dom`、`@tanstack/react-query`、`@nop-chaos/plugin-bridge`、`@nop-chaos/ui`、`recharts` 等共享运行时
- 只有在宿主先注册匹配 shared modules 后，remote plugin 才能正确加载
- 这不是“对任意宿主都可直接运行”的自包含 bundle

该前提已经由构建脚本在输出时打印提示，文档也必须保持同一口径。

---

## 5. 插件 i18n 基线

- remote plugin：若组件调用 `react-i18next` 的 `t()`，必须同时提供真实 locale 资源与 focused test；当前参考实现见 `examples/plugin-demo`
- extension builtin/system page：若 manifest 声明 `i18n.baseUrl` 与 `languages`，页面用户文案必须通过 `usePluginI18n()` 读取真实资源；当前参考实现见 `examples/extension-demo`
- 示例目录已纳入 `eslint.config.js` 的 `i18next/no-literal-string` 约束，不能再用“大量硬编码英文 + 零资源文件”伪装支持多语言

---

## 6. 插件管理页

实现位置：`apps/main/src/pages/plugins/management/index.tsx`

插件管理页当前负责：

- 展示插件清单、版本、作者、来源、更新时间与启用状态
- 通过 `usePluginStore()` 持久化插件 enablement 和本地 settings
- 提供详情对话框与 `configSchema` 驱动的本地配置表单
- 在 loading/error 场景下展示用户可见反馈，而不是静默空白

当前数据来源：

- 查询：`fetchPluginList()` (`apps/main/src/services/mockApi/plugins.ts`)
- 本地状态：`apps/main/src/store/pluginStore.ts`

“插件已注册”与“插件已被路由渲染”仍然是两个层次：

- 注册与 enablement 由插件清单和 store 决定
- 实际渲染由菜单路由和 `pageType: 'plugin'` 页面入口决定

---

## 7. 文档与验证要求

当插件系统相关代码变更时，至少应同步检查：

- `docs/examples/plugin-dev-guide.md`
- `docs/references/build-guide.md`
- extension / plugin demo 的 focused tests

最小验证基线：

- `pnpm --filter @nop-chaos/plugin-demo test`
- `pnpm --filter @nop-chaos/example-extension-demo test`
- 如变更 host 集成，再运行 `pnpm --filter @nop-chaos/main typecheck`
