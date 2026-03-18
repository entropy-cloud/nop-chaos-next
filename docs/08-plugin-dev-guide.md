# 插件开发规范

> 本文档描述插件开发的依赖边界、构建约定和推荐写法。

---

## 1. 核心原则

- 插件使用 `SystemJS` 远程加载
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

| 场景 | 推荐方式 |
|------|----------|
| 文案翻译 | `useTranslation()` |
| 路由跳转 | `useNavigate()` |
| 当前主题 | `usePluginThemeConfig()` |
| 当前用户 | `usePluginUser()` |
| 宿主通知 | `usePluginNotifications()` |
| 插件配置 | `usePluginManifest(pluginId)` |

---

## 4. 构建约定

### 产物要求

- 默认导出 React 组件
- 输出格式为 `system`
- 共享依赖通过 external 排除

### 叺考实现

- `apps/plugin-demo/package.json`
- `apps/plugin-demo/vite.config.ts`
- `apps/main/src/plugins/sharedModules.ts`

---

## 5. 目录结构

```text
apps/plugin-demo/
  src/
    components/
    hooks/
    services/
    types/
    index.tsx         # 入口组件
  package.json
  vite.config.ts
```

---

## 6. 依赖声明

```json
{
  "peerDependencies": {
    "react": "^18",
    "@nop-chaos/plugin-bridge": "workspace:*"
  }
}
```

---

## 7. 不推荐做法

- 直接 import `@nop-chaos/core` 获取运行时能力
- 在插件里复制 React、i18n 或 UI 运行时
- 过度依赖整包 `usePluginBridge()`

---

## 8. 参考实现

- `apps/plugin-demo/src/index.tsx`
- `packages/plugin-bridge/src/index.ts`
