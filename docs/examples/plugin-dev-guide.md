# 插件开发规范

> 本文档描述插件开发的依赖边界、构建约定和推荐写法。

---

## 1. 核心原则

- 插件远程加载支持 `SystemJS` 和原生 `ESM`
- 共享依赖由宿主统一注册，插件构建时 external
- 宿主特有能力通过 `@nop-chaos/plugin-bridge` 获取
- 插件不应直接依赖 `@nop-chaos/core`

---

## 2. 依赖边界

### 可以直接依赖

- `react` / `react/jsx-runtime`
- `react-router-dom`
- `@tanstack/react-query`
- `zustand`
- `systemjs`
- `i18next` / `react-i18next`
- `@nop-chaos/ui` / `@nop-chaos/shared`
- `lucide-react`
- `recharts`
- `sonner`

### 必须通过 bridge 获取

- 当前用户、主题配置
- 宿主通知能力
- 插件 manifest / settings

统一入口：`@nop-chaos/plugin-bridge`

---

## 3. 推荐写法

| 场景     | 推荐方式                      |
| -------- | ----------------------------- |
| 文案翻译 | 远程插件用 `useTranslation()`；extension builtin/system page 用 `usePluginI18n()` |
| 路由跳转 | 远程插件用 `useNavigate()`；extension builtin/system page 用 bridge `navigate()` |
| 当前主题 | `usePluginThemeConfig()`      |
| 当前用户 | `usePluginUser()`             |
| 宿主通知 | `usePluginNotifications()`    |
| 插件配置 | `usePluginManifest(pluginId)` |

---

## 4. i18n 基线

- `examples/plugin-demo` 是远程插件参考实现：组件内使用 `react-i18next` 的 `useTranslation()`，locale 文件位于 `examples/plugin-demo/public/locales/{lng}/translation.json`
- `examples/extension-demo` 是 extension 内建页 / system page 参考实现：页面文案通过 `@nop-chaos/plugin-bridge` 的 `usePluginI18n()` 读取，locale 文件位于 `examples/extension-demo/public/locales/{lng}/translation.json`
- extension manifest 声明语言时优先使用 `supportedLanguages`；`languages` 仅为兼容旧 manifest 的 deprecated alias，不再作为新示例或脚手架默认写法
- 如果示例代码声明自己支持多语言，就必须同时提交对应 locale 资源与最小 focused test；不要保留“调用 `t()` 但没有资源文件”的假基线
- 示例目录已纳入 `eslint.config.js` 的 `i18next/no-literal-string` 约束；demo-only 文案例外需要显式收口到翻译资源或明确的非用户可见常量

---

## 5. 构建约定

### 产物要求

- 默认导出 React 组件
- 可输出为 `system`（通过 Rollup 构建）或原生 `esm`
- 共享依赖通过 external 排除

### 参考实现

- `examples/plugin-demo/package.json` — 查看 build 脚本
- `examples/plugin-demo/scripts/build-with-rollup.mjs` — Rollup 构建配置
- `apps/main/src/plugins/sharedModules.ts` — 共享模块注册

---

## 6. 目录结构

```text
examples/plugin-demo/
  public/locales/
    en-US/translation.json
    zh-CN/translation.json
  src/
    index.tsx         # 远程插件入口组件
    index.test.tsx    # plugin-demo i18n focused test
  scripts/
    build-with-rollup.mjs
    sync-to-host.mjs
  vitest.config.ts
  package.json

examples/extension-demo/
  public/locales/
    en-US/translation.json
    fr-FR/translation.json
  src/
    index.ts          # extension manifest / builtin page registration
    index.test.ts     # extension-demo i18n focused test
    pages/
      ExtensionLoginPage.tsx
      ExtensionBuiltinPage.tsx
      ExtensionNotFoundPage.tsx
  vitest.config.ts
  package.json
```

---

## 7. 依赖声明

```json
{
  "devDependencies": {
    "@nop-chaos/plugin-bridge": "workspace:*",
    "@nop-chaos/shared": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    "@tanstack/react-query": "^5.96.1",
    "i18next": "26.0.5",
    "lucide-react": "^1.7.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-i18next": "17.0.4",
    "react-router-dom": "^7.14.0",
    "recharts": "^3.8.1",
    "sonner": "^2.0.7",
    "systemjs": "^6.15.1",
    "zustand": "^5.0.12"
  },
  "peerDependencies": {
    "@nop-chaos/plugin-bridge": "workspace:*",
    "@nop-chaos/shared": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    "@tanstack/react-query": "^5.96.1",
    "i18next": "26.0.5",
    "lucide-react": "^1.7.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-i18next": "17.0.4",
    "react-router-dom": "^7.14.0",
    "recharts": "^3.8.1",
    "sonner": "^2.0.7",
    "systemjs": "^6.15.1",
    "zustand": "^5.0.12"
  }
}
```

> 注意：`plugin-demo` 将 `react` / `react-dom` 保留在 devDependencies 中用于本地开发与测试，运行时依赖仍由宿主提供；其余共享运行时能力会同时出现在 devDependencies 与 peerDependencies 中，以兼顾 monorepo 内本地构建/测试和脱离 workspace 后的宿主契约声明。

---

## 8. 不推荐做法

- 直接 import `@nop-chaos/core` 获取运行时能力
- 在插件里复制 React、i18n 或 UI 运行时
- 过度依赖整包 `usePluginBridge()`（推荐使用细粒度 hooks）
- 在示例里保留“调用翻译 API 但没有 locale 资源”的假 i18n 基线
- 在 extension builtin/system page 里直接写大量用户可见英文文案而不走 locale 资源

---

## 9. 参考实现

- `examples/plugin-demo/src/index.tsx`
- `examples/plugin-demo/src/index.test.tsx`
- `examples/extension-demo/src/index.ts`
- `examples/extension-demo/src/index.test.ts`
- `examples/extension-demo/src/pages/ExtensionLoginPage.tsx`
- `examples/extension-demo/src/pages/ExtensionBuiltinPage.tsx`
- `examples/extension-demo/src/pages/ExtensionNotFoundPage.tsx`
- `packages/plugin-bridge/src/index.ts`
