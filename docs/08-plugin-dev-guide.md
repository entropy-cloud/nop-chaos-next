# 插件开发规范

> 本文档只保留当前插件开发最需要的规则。目标是让插件像普通 React 包一样开发，同时在运行时通过 SystemJS 和宿主协议稳定集成。

---

## 1. 当前结论

- 插件页面继续使用 `SystemJS` 远程加载
- 插件共享依赖由宿主统一注册，插件构建时应 external 掉这些依赖
- 宿主特有能力统一通过 `@nop-chaos/plugin-bridge` 获取
- React、Router、i18n、UI、图表等通用能力可以直接 import 共享库
- 插件不应把 `@nop-chaos/core` 当作运行时 API

---

## 2. 依赖边界

### 2.1 可以直接依赖的内容

插件可以直接使用这些共享依赖：

- `react`
- `react/jsx-runtime`
- `react-router-dom`
- `@tanstack/react-query`
- `zustand`
- `i18next`
- `react-i18next`
- `@nop-chaos/ui`
- `@nop-chaos/shared`
- `lucide-react`
- `recharts`
- `sonner`

说明：

- 它们在开发态由 workspace 提供
- 在集成态由宿主共享模块注册提供

### 2.2 必须通过 bridge 获取的内容

以下能力属于宿主运行时上下文：

- 当前用户
- 当前主题配置
- 宿主通知能力
- 插件 manifest / settings
- 宿主 auth/theme/plugin store

统一入口：`@nop-chaos/plugin-bridge`

当前桥接接口见：`packages/plugin-bridge/src/index.ts`

---

## 3. React 插件中的推荐写法

优先级建议如下：

| 场景 | 推荐方式 |
|------|------|
| 文案翻译 | `useTranslation()` |
| 路由跳转 | `useNavigate()` |
| 当前路由 | `useLocation()` |
| 当前主题 | `usePluginThemeConfig()` |
| 当前用户 | `usePluginUser()` |
| 当前插件配置 | `usePluginManifest(pluginId)` |
| 宿主通知 | `usePluginNotifications()` |
| 少数底层访问 | `usePluginBridge()` |

简化原则：

- 通用 React 能力直接用共享库 hook
- 宿主能力优先使用 bridge 暴露的窄 hook
- 不要在页面层大面积直接读取整包 bridge 对象

---

## 4. 开发、集成、生产三种状态

### 4.1 开发态

目标：像普通业务包一样开发。

要求：

- 插件有自己的 `package.json`
- 插件有自己的 `vite.config.ts`
- 可以单独启动 dev server
- 可以在主应用中联调

### 4.2 集成态

宿主负责：

- 注册共享模块
- 调用 `setPluginBridge(...)` 注入宿主能力

相关入口：`apps/main/src/plugins/sharedModules.ts`

### 4.3 生产态

要求：

- 输出 SystemJS 格式产物
- 共享依赖全部 external
- 宿主通过 URL 加载插件入口

---

## 5. 依赖声明约定

推荐规则：

- 共享依赖出现在 `peerDependencies`
- 开发期需要本地安装的共享依赖也可以同时出现在 `devDependencies`
- `@nop-chaos/plugin-bridge` 必须出现在 `peerDependencies`
- 宿主内部实现包不应作为插件运行时依赖

当前参考实现：`apps/plugin-demo/package.json`

---

## 6. 构建约定

插件产物要求：

- 默认导出一个 React 组件
- 输出格式为 `system`
- 文件名保持稳定
- 共享依赖通过 external 排除

当前参考实现：

- `apps/plugin-demo/package.json`
- `apps/plugin-demo/vite.config.ts`
- `apps/plugin-demo/scripts/build-with-rollup.mjs`

宿主已注册的共享模块可参考：`apps/main/src/plugins/sharedModules.ts`

---

## 7. 目录组织建议

推荐按普通业务包组织：

```text
apps/plugin-demo/
  src/
    components/
    hooks/
    services/
    types/
    index.tsx
  package.json
  tsconfig.json
  vite.config.ts
```

建议：

- `components/` 放展示组件
- `hooks/` 放插件内部组合逻辑
- `services/` 放数据获取逻辑
- `types/` 放本地类型
- `index.tsx` 保持为薄入口

---

## 8. 参考实现

当前 `plugin-demo` 已覆盖这些约定：

- 使用 `@nop-chaos/ui` 组件
- 使用 `recharts` 图表
- 使用共享 i18n 和 router hook
- 使用 `@nop-chaos/plugin-bridge` 获取宿主能力
- 输出可被宿主加载的插件产物

参考路径：

- `apps/plugin-demo/src/index.tsx`
- `apps/plugin-demo/package.json`
- `apps/main/src/plugins/sharedModules.ts`
- `packages/plugin-bridge/src/index.ts`

---

## 9. 不推荐做法

- 直接 import `@nop-chaos/core` 获取运行时能力
- 在插件里假定宿主内部实现细节稳定不变
- 在插件内复制一套 React、i18n 或 UI 运行时
- 让页面组件过度依赖整包 `usePluginBridge()`

---

## 10. 最终规则

1. 插件页面使用 SystemJS 远程加载
2. 通用共享能力直接使用共享库
3. 宿主特有能力必须通过 `@nop-chaos/plugin-bridge`
4. 插件不直接依赖 `@nop-chaos/core` 作为运行时 API
5. 插件构建必须保持 external 共享依赖约定
