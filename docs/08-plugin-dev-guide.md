# 插件开发规范

> 本文档定义插件在开发态、集成态、生产态的依赖边界、调试方式与构建约定，用于保证插件既具备普通业务包开发体验，又能作为 SystemJS 远程模块稳定运行。

---

## 1. 设计目标

插件体系需要同时满足以下目标：

- 插件开发体验尽量接近普通 React 业务包
- 插件可以在 monorepo 中独立开发、调试、构建
- 调试时可以直接嵌入主应用页面进行联调
- 生产构建时输出 SystemJS 格式，由主应用远程加载
- 插件与宿主之间保持清晰、稳定、可演进的运行时契约

这意味着插件系统不能只关注“怎么打包”，还需要明确“插件能依赖什么”和“插件如何访问宿主能力”。

---

## 2. 三层能力边界

插件开发时，将依赖能力分为三层：

| 层级 | 内容 | 获取方式 |
|------|------|------|
| 通用运行时 | React、Router、状态库等 | 直接依赖共享库 |
| 通用 UI 能力 | UI 组件、图表、国际化 hook 等 | 直接依赖共享库 |
| 宿主运行时能力 | 当前用户、主题、通知、插件配置等 | 通过 `@nop-chaos/plugin-bridge` |

核心原则：

- 通用能力直接 import 对应库
- React 组件内的 i18n 和 router 优先直接使用共享外部模块
- 宿主特有能力统一从 bridge 获取
- 不把 `@nop-chaos/core` 当成插件运行时 API

---

## 3. 为什么需要 `plugin-bridge`

`plugin-bridge` 的职责是提供“宿主到插件”的稳定能力协议，而不是替代普通开发方式。

如果插件直接依赖 `@nop-chaos/core`，会出现几个问题：

- 插件依赖了宿主内部实现，而不是稳定插件接口
- `core` 重构时，插件容易被迫跟着修改
- 远程插件会默认要求宿主暴露整套 `core`，耦合面过大
- 插件能力边界不清晰，后续难以控制兼容性

引入 `plugin-bridge` 后：

- 插件仍然可以像普通 React 包一样写组件
- 宿主只暴露最小必要能力给插件
- 插件协议更稳定，更适合 SystemJS 场景
- 宿主内部实现可以演进，而不直接影响插件代码

---

## 4. 允许直接依赖的内容

以下内容属于通用共享库，插件可以直接导入使用：

| 类别 | 示例 |
|------|------|
| React 运行时 | `react`、`react/jsx-runtime` |
| 路由库 | `react-router-dom` |
| 状态库 | `zustand` |
| 数据请求 | `@tanstack/react-query` |
| 国际化库 | `i18next`、`react-i18next` |
| UI 组件库 | `@nop-chaos/ui` |
| 图标/图表 | `lucide-react`、`recharts` |
| 提示组件 | `sonner` |
| 共享类型 | `@nop-chaos/shared` |

例如：

- 可以直接使用 `useTranslation`
- 可以直接使用 `Card`、`Button`
- 可以直接使用 `AreaChart`
- 可以直接使用共享类型定义

这些依赖在开发态由 workspace 提供，在生产态通过主应用共享模块注册提供。

---

## 5. 必须通过 bridge 获取的内容

以下能力属于宿主运行时上下文，不应通过普通 import 假定存在：

| 能力 | 说明 |
|------|------|
| 当前用户 | 当前登录用户信息 |
| 通知能力 | 调用宿主 toast |
| 当前主题 | 获取宿主主题配置 |
| 插件配置 | 读取插件 manifest 和 settings |
| 宿主 store | 访问主应用的 auth/theme/plugin store |

这些能力统一通过 `@nop-chaos/plugin-bridge` 暴露。

当前桥接接口可抽象为：

```typescript
interface PluginBridge {
  i18n: i18n
  notifications: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
  stores: {
    authStore: BoundStore<{ user: User | null; isAuthenticated: boolean }>
    themeStore: BoundStore<{ themeConfig: ThemeConfig }>
    pluginStore: BoundStore<{ plugins: PluginManifest[] }>
  }
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void
  getCurrentUser: () => User | null
  getCurrentPath: () => string
  getThemeConfig: () => ThemeConfig
  getPluginManifest: (pluginId: string) => PluginManifest | undefined
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => BridgeSnapshot
}
```

说明：

- `i18n` 和 `navigate` 仍会出现在 bridge 中，便于非 React 场景或底层封装使用。
- 但对于 React 组件本身，推荐直接使用 `useTranslation()`、`useNavigate()`、`useLocation()`，而不是把它们再包一层 bridge API。

---

## 6. React 插件中的推荐使用方式

在 React 插件组件里，建议按“共享外部模块优先，bridge hook 补宿主能力”的方式组织：

| 场景 | 推荐方式 |
|------|------|
| 文案翻译 | `useTranslation()` |
| 路由跳转 | `useNavigate()` |
| 当前路由 | `useLocation()` |
| 当前主题配置 | `usePluginThemeConfig()` |
| 当前用户 | `usePluginUser()` |
| 当前插件 manifest / settings | `usePluginManifest(pluginId)` |
| 宿主通知 | `usePluginNotifications()` |
| 少数底层能力整包访问 | `usePluginBridge()` |

推荐原因：

- `react-i18next` 和 `react-router-dom` 已通过共享模块直接复用宿主上下文，直接使用其 hook 最自然。
- `plugin-bridge` 更适合承载宿主特有能力，而不是重复包装所有通用库 API。
- 常见宿主能力应优先暴露成精简 hook，减少插件页面里对整包 bridge 对象的依赖。

---

## 7. 推荐开发模式

### 7.1 开发态

开发态目标是让插件尽量像普通业务包：

- 插件拥有自己的 `package.json`
- 插件拥有自己的 `vite.config.ts`
- 插件可以单独启动 dev server
- 插件代码放在独立目录中维护
- 插件可被主应用直接联调

推荐做法：

- 将插件作为 monorepo 中的独立 app 或 package
- 开发态直接通过 workspace 依赖本地共享库
- 在主应用中预留插件挂载页或插件路由
- 通过 mock 插件配置或宿主注入能力完成联调

### 7.2 集成态

主应用负责两件事：

- 注册共享模块给 SystemJS 使用
- 调用 `setPluginBridge(...)` 注入宿主能力

这一步由宿主完成，插件不关心主应用内部 store、router、toast 的具体实现。

### 7.3 生产态

生产态下：

- 插件输出 SystemJS 格式文件
- 插件共享依赖全部 external
- 主应用通过 URL 远程加载插件入口
- 主应用统一提供共享模块与 bridge

---

## 8. 依赖声明规范

插件依赖通常分为两类：

- `devDependencies`：用于本地开发、类型检查、构建
- `peerDependencies`：声明运行时要求宿主提供的共享依赖

推荐规则：

| 依赖类型 | 约定 |
|------|------|
| 通用共享库 | 同时出现在 `peerDependencies`，开发时可出现在 `devDependencies` |
| `@nop-chaos/plugin-bridge` | 必须出现在 `peerDependencies`，开发时可出现在 `devDependencies` |
| 宿主内部实现包 | 不允许作为插件运行时依赖 |

示例：

```json
{
  "peerDependencies": {
    "@nop-chaos/plugin-bridge": "workspace:*",
    "@nop-chaos/shared": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-i18next": "^16.5.6",
    "react-router-dom": "^7.13.1",
    "i18next": "^25.8.14",
    "zustand": "^5.0.11",
    "recharts": "^2.12.0"
  }
}
```

---

## 9. 构建规范

插件产物必须满足以下要求：

- 默认导出一个 React 组件作为插件入口
- 构建格式使用 `system`
- 文件名稳定，便于主应用通过 URL 配置加载
- 所有共享依赖通过 `external` 排除

示例：

```typescript
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.tsx',
      fileName: () => 'plugin-demo.system.js',
      formats: ['system']
    },
    rollupOptions: {
      external: [
        '@nop-chaos/plugin-bridge',
        '@nop-chaos/shared',
        '@nop-chaos/ui',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-router-dom',
        '@tanstack/react-query',
        'zustand',
        'i18next',
        'react-i18next',
        'lucide-react',
        'recharts',
        'sonner'
      ]
    }
  }
})
```

---

## 10. 推荐代码组织方式

建议插件内部按普通业务包组织：

```text
apps/plugin-demo/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── index.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

建议约束：

- `components/` 放纯展示组件
- `hooks/` 放插件内部状态与组合逻辑
- `services/` 放插件数据获取逻辑
- `types/` 放插件本地类型定义
- `index.tsx` 只保留插件入口装配逻辑

---

## 11. 开发实践建议

### 10.1 推荐做法

- 直接使用共享库提供的 hook 和组件
- React 组件内直接使用 `useTranslation()`、`useNavigate()`、`useLocation()`
- 优先使用 `plugin-bridge` 暴露的精简 hook，如 `usePluginThemeConfig()`、`usePluginUser()`、`usePluginManifest()`、`usePluginNotifications()`
- 对 bridge 返回值做空值兜底，便于本地开发和独立预览
- 尽量让插件入口保持薄，复杂逻辑下沉到内部模块

### 10.2 不推荐做法

- 直接 import `@nop-chaos/core` 获取运行时能力
- 在插件里假定宿主一定暴露某个内部 store 结构以外的实现细节
- 将插件和主应用页面结构写死耦合
- 在插件内部复制一套 React、i18n 或 UI 运行时
- 在 React 页面组件里大面积直接读取整包 `usePluginBridge()`，导致宿主能力访问过宽

---

## 12. plugin-demo 参考约定

当前 `plugin-demo` 作为参考实现，体现以下约定：

- 直接使用 `@nop-chaos/ui` 组件渲染界面
- 直接使用 `recharts` 绘制图表
- 直接使用 `useTranslation()` 和共享 `react-router-dom` hook
- 通过 `@nop-chaos/plugin-bridge` 获取用户、主题、插件配置和通知能力
- 通过 Vite 构建产出 `plugin-demo.system.js`
- 由主应用注册共享模块并完成远程加载

它展示的是一种“双层模型”：

- 写法上像普通 React 业务包
- 运行时上遵守插件协议

---

## 13. 最终规范

为避免插件体系失控，最终执行以下规则：

1. 插件允许直接依赖通用共享库
2. React 组件中的 i18n 和 router 优先直接使用共享外部模块
3. 插件必须通过 `@nop-chaos/plugin-bridge` 访问宿主特有能力
4. 宿主特有能力优先通过精简 hook 暴露，避免页面层直接依赖整包 bridge
5. 插件不应直接依赖 `@nop-chaos/core` 作为运行时 API
6. 插件开发态允许嵌入主应用调试
7. 插件生产态必须保持 SystemJS 输出与 external 共享依赖约定

满足以上规则后，插件既能获得接近普通业务包的开发体验，也能在远程加载场景中保持清晰、稳定的边界。
