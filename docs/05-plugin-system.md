# 插件管理详细设计

> 本文档描述插件管理模块的交互细节。

---

## 1. 插件管理页面

### 1.1 列表字段

| 字段 | 说明 |
|------|------|
| 插件图标 | 插件的图标 |
| 插件名称 | 插件的显示名称 |
| 简短描述 | 插件的功能描述 |
| 当前状态 | 启用 / 禁用 |
| 版本号 | 插件版本 |
| 作者/来源 | 插件的作者或来源 |

### 1.2 操作支持

| 操作 | 说明 |
|------|------|
| 启用/禁用 | 开关切换 |
| 查看详情 | 查看插件详细信息 |
| 配置插件 | 如有配置项 |

### 1.3 交互要求

- 启用/禁用状态切换时显示确认提示
- 状态需要被持久化，刷新页面后可以恢复

### 1.4 视觉要求

- 插件列表需要支持玻璃拟态效果

---

## 2. 插件示例页面

### 2.1 功能说明

为 demo 插件提供一个独立页面

### 2.2 插件启用时展示

| 功能 | 说明 |
|------|------|
| 自定义统计报表 | 使用主应用共享的图表库 |
| 仪表卡片 | 使用主应用共享的 UI 组件 |
| 与主应用交互 | 访问主应用状态、触发通知等 |

### 2.3 插件禁用时展示

展示清晰的提示：插件未启用，请联系管理员启用

### 2.4 视觉要求

- 页面需要支持玻璃拟态效果

---

## 3. 插件挂载区域

### 3.1 位置说明

主应用中（例如 Dashboard 或某个"工作台"页面）要预留区块

### 3.2 功能说明

- 用于动态加载插件渲染的内容
- 例如：插件提供的小组件、小卡片等

### 3.3 状态处理

| 状态 | 显示 |
|------|------|
| 有启用的插件 | 显示插件内容 |
| 没有启用的插件 | 显示占位内容或隐藏 |

### 3.4 布局要求

- 挂载区域需要与整体布局协调

---

## 4. 插件通信能力

### 4.1 通信接口列表

| 能力 | 说明 |
|------|------|
| 状态管理 | 插件可以访问主应用的 Zustand store |
| 国际化 | 插件可以访问主应用的 i18n |
| 主题系统 | 插件可以获取当前主题、响应主题变化 |
| 通知 | 插件可以触发主应用的 toast |
| 用户信息 | 插件可以获取当前用户信息 |

### 4.2 通信接口示例

```typescript
interface PluginBridge {
  i18n: i18n;
  notifications: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  stores: {
    authStore: BoundStore<{ user: User | null; isAuthenticated: boolean }>;
    themeStore: BoundStore<{ themeConfig: ThemeConfig }>;
    pluginStore: BoundStore<{ plugins: PluginManifest[] }>;
  };
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void;
  getCurrentUser: () => User | null;
  getCurrentPath: () => string;
  getThemeConfig: () => ThemeConfig;
  getPluginManifest: (pluginId: string) => PluginManifest | undefined;
}
```

### 4.3 为什么需要 `plugin-bridge`

`plugin-bridge` 的职责不是替代普通 React 开发方式，而是定义一个稳定的“宿主能力协议”。

- 插件仍然可以像普通业务包一样开发 React 组件
- 插件仍然可以直接依赖通用共享库，例如 `react`、`react-i18next`、`@nop-chaos/ui`、`recharts`
- 但插件不应该直接依赖 `@nop-chaos/core` 来获取宿主内部实现
- 宿主暴露给插件的运行时能力统一通过 `@nop-chaos/plugin-bridge` 提供

这样设计的原因：

- `@nop-chaos/core` 是宿主框架实现，不等于插件 API
- 如果插件直接依赖 `core`，会和主框架内部结构强耦合
- 主应用未来重构 `core` 时，插件不应被迫跟着调整非必要细节
- `plugin-bridge` 只暴露最小能力面，更适合作为 SystemJS 远程插件的稳定契约

### 4.4 依赖边界约定

推荐将插件依赖划分为两类：

| 类型 | 推荐来源 | 说明 |
|------|------|------|
| 通用共享库 | 直接 import 对应库 | 如 `react`、`react-i18next`、`@nop-chaos/ui`、`recharts` |
| 宿主运行时能力 | `@nop-chaos/plugin-bridge` | 如当前用户、路由跳转、toast、主题配置、插件配置、宿主 store |

明确约束如下：

- 可以直接使用 `react-i18next` 的 `useTranslation`
- 可以直接使用主应用共享注册的 UI 组件库和图表库
- 不建议从 `@nop-chaos/core` 转手导入这些通用能力
- 禁止把插件对宿主的访问建立在 `@nop-chaos/core` 的内部导出之上

### 4.5 开发态与生产态约定

插件系统需要同时满足“普通业务开发体验”和“远程插件部署能力”：

- 开发态：允许插件像普通包一样在 monorepo 中开发，并直接嵌入主应用调试
- 集成态：主应用负责注册共享模块，并通过 `setPluginBridge(...)` 注入宿主能力
- 生产态：插件仍然输出 SystemJS 格式，供主应用按 URL 远程加载

因此，`plugin-bridge` 与“像普通业务包一样开发”并不冲突；它只是在运行时补上宿主上下文这层协议。

---

## 5. plugin-demo 子项目

### 5.1 目录位置

`apps/plugin-demo`

### 5.2 项目要求

| 要求 | 说明 |
|------|------|
| 独立开发 | 插件必须能够独立开发、构建、部署 |
| 配置文件 | 需要有自己的 package.json 和 vite 配置 |
| 构建格式 | 必须使用 SystemJS 格式构建 |
| 依赖声明 | 通用共享库与 bridge 需要声明为 peerDependencies，并在开发态可同时出现在 devDependencies |
| 入口组件 | 必须默认导出一个 React 组件作为入口 |

### 5.3 插件开发规则

插件开发时遵循以下规则：

1. UI、图表、国际化 hook 等通用能力，优先直接从共享库导入
2. 用户信息、路由跳转、主题配置、通知、插件配置等宿主能力，统一从 `@nop-chaos/plugin-bridge` 获取
3. 不直接依赖 `@nop-chaos/core` 作为插件运行时 API
4. 打包时继续 external 掉共享依赖，由主应用统一提供

### 5.4 功能要求

插件需要实现至少 **3 个功能点**来展示与主应用的集成能力：

| 功能点 | 说明 |
|-------|------|
| 功能点1 | 使用主应用的 UI 组件 |
| 功能点2 | 使用主应用的图表库 |
| 功能点3 | 与主应用状态交互（读取/修改状态、触发通知） |

### 5.5 构建配置示例

```typescript
// apps/plugin-demo/vite.config.ts
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'PluginDemo',
      formats: ['system'],
      fileName: () => 'plugin-demo.system.js'
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand',
        '@nop-chaos/plugin-bridge',
        '@nop-chaos/shared',
        '@nop-chaos/ui',
        'react/jsx-runtime',
        'i18next',
        'react-i18next',
        // ... 其他共享库
      ]
    }
  }
});
```

### 5.6 package.json 示例

```json
{
  "name": "@nop-chaos/plugin-demo",
  "version": "1.0.0",
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

### 5.7 plugin-demo 当前实现说明

当前 `plugin-demo` 的实现约定如下：

- 使用 `@nop-chaos/ui` 渲染卡片、按钮等共享组件
- 使用 `recharts` 渲染统计图表
- 通过 `@nop-chaos/plugin-bridge` 读取当前用户、主题、插件配置、当前路由，并调用通知与导航能力
- 打包输出 `plugin-demo.system.js`，由主应用通过 SystemJS 进行加载
