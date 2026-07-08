# 系统架构总览

> 本文档描述 `nop-chaos-next` 作为**通用应用壳**的顶层设计目标、架构分层、页面模型和数据流。是 `docs/design/` 的导航入口文档，所有其他 design 文档描述的是本文档中特定层次的详细合同。

---

## 1. 设计愿景

**NOP Chaos Next 是一个通用应用壳（Generic Application Shell）。**

- 它本身不包含硬编码的业务逻辑或业务页面内容
- 所有页面内容来自**后端配置**（菜单 + schema）或**扩展注入**（extension / plugin）
- 它只提供：Shell 骨架（布局/侧栏/标签页/主题/i18n）、路由分发引擎、渲染引擎（AMIS / Flux）和扩展加载机制
- 业务团队通过**声明式 JSON Schema**（AMIS / Flux）、**远程 Plugin** 或 **Extension 注入**来填充页面内容，无需修改壳代码

### 1.1 核心原则

| 原则 | 说明 |
| --- | --- |
| **后端驱动** | 菜单结构、页面路由、页面 Schema 均来自后端接口，壳不硬编码任何导航或页面引用 |
| **渲染无关** | 壳不关心页面如何渲染，只按 `pageType` 委托给对应渲染引擎 |
| **可扩展** | 所有 shell 行为（品牌、主题、语言、系统页、认证）均可被 Extension 覆盖 |
| **插件友好** | 远程插件通过 SystemJS 独立部署，与壳通过 `@nop-chaos/plugin-bridge` 通信 |

### 1.2 三类受众

| 受众 | 工作内容 | 入口文档 |
| --- | --- | --- |
| **业务应用开发者** | 编写 AMIS/Flux JSON Schema，配置后端菜单和 schemaPath | [backend-integration.md](./backend-integration.md) |
| **插件开发者** | 开发远程 SystemJS 插件 | [plugin-system.md](./plugin-system.md)、[plugin-dev-guide.md](../examples/plugin-dev-guide.md) |
| **平台团队 / Extension 开发者** | 定制 shell 品牌、主题、语言、系统页、注入插件清单 | [extension-system.md](./extension-system.md) |

---

## 2. 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                     Shell Layer                              │
│  AppShell / Sidebar / TabsBar / Theme / i18n / Auth / Layout │
│  统一由 Backend Menu + Extension ShellConfig 驱动             │
├─────────────────────────────────────────────────────────────┤
│                   Routing & Dispatch Layer                    │
│  AppRoutes → RouteRenderer                                   │
│  按 pageType 分发到对应渲染器                                  │
│  pageType: builtin | plugin | amis | flux | iframe | external │
├─────────────────────────────────────────────────────────────┤
│                   Rendering Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Builtin  │  │  Plugin  │  │ AMIS Schema│  │Flux Schema│  │
│  │ (React)  │  │(SystemJS)│  │ JSON→UI    │  │ JSON→UI   │  │
│  └──────────┘  └──────────┘  └────────────┘  └───────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Extension Layer                            │
│  Bootstrap → loadExtensions → merge ShellRuntimeConfig        │
│  注入: branding / theme / i18n / builtinPages / plugins / auth │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Shell Layer

壳的主入口。提供：

- **AppShell**：整体布局框架，侧栏 + 顶栏 + 标签页 + 内容区
- **Sidebar / TabsBar**：导航 UI
- **Theme 系统**：CSS 自定义属性驱动，运行时可切换
- **i18n 系统**：i18next，Extension 可注入语言和资源
- **Auth 系统**：登录/登出/Token 管理/权限过滤
- **Layout Settings**：侧栏宽度、折叠、多标签页开关

参见：[layout-settings.md](./layout-settings.md)、[styling-system-specification.md](./styling-system-specification.md)

### 2.2 Routing & Dispatch Layer

- **AppRoutes** (`apps/main/src/router/AppRoutes.tsx`)：从后端 `SiteMapApi__getSiteMap` 获取菜单数据，扁平化后生成 React Router 路由表
- **RouteRenderer** (`apps/main/src/router/RouteRenderer.tsx`)：根据 `MenuItem.pageType` 分发到不同渲染器

两层权限模型：
1. 菜单层：`filterMenusByRoles` 过滤侧栏可见入口
2. 路由层：`RouteRenderer` 内的 `usePermissionGuard` 对直接 URL 访问也做检查，命中但无权限时渲染 `ForbiddenPage` 而非 404

参见：[plugin-system.md](./plugin-system.md#3-桥接合同)

### 2.3 Rendering Layer

| pageType | 渲染器 | 说明 |
| --- | --- | --- |
| `builtin` | 从 `pageRegistry` 查找 React 组件 | 壳内置的参考页面模板 + Extension 注册的 builtin 页面 |
| `plugin` | `PluginSlot` → SystemJS 远程加载 | 独立构建部署的远程插件 |
| `amis` | `AmisRouteEntry` → AMIS Schema 渲染 | JSON Schema 驱动的 AMIS 页面 |
| `flux` | `FluxRouteEntry` → Flux Schema 渲染 | JSON Schema 驱动的 Flux 页面 |
| `iframe` | `<iframe sandbox>` | 嵌入外部页面 |
| `external` | 外链（新窗口打开） | 配置化的外链菜单项 |

参见：[amis-flux-rendering-engine-integration.md](./amis-flux-rendering-engine-integration.md)

### 2.4 Extension Layer

Extension 在壳启动时加载一次，用于注入配置和资源，不涉及运行时页面渲染。

注入能力：
- 品牌配置（名称、logo、标题、favicon）
- 主题和样式资源
- 语言和 i18n 资源
- 内置页面注册和系统页替换
- 插件清单声明
- 认证配置
- 左下角用户菜单扩展

参见：[extension-system.md](./extension-system.md)

---

## 3. 页面模型

```typescript
interface MenuItem {
  id: string;
  title?: string;
  titleKey?: string;
  path: string;
  icon?: string;
  children?: MenuItem[];
  pageType: 'builtin' | 'plugin' | 'amis' | 'flux' | 'iframe' | 'external';
  componentId?: string;    // builtin 页面 ID 或 plugin ID
  pluginUrl?: string;      // plugin 的 SystemJS URL
  schemaPath?: string;     // AMIS/Flux schema 接口路径
  frameSrc?: string;       // iframe 的 src
  externalUrl?: string;    // 外链 URL
  roles?: string[];        // 权限角色
  hideInMenu?: boolean;    // 是否在侧栏隐藏（但路由仍存在）
}
```

- 页面实例完全由 `MenuItem` 配置描述
- 后端返回的菜单树直接决定路由结构和页面内容
- `pageType` 决定了使用哪种渲染引擎
- `componentId` 引用 Extension 或壳注册的 React 组件

---

## 4. 内置页面定位

`apps/main/src/router/pageRegistry.tsx` 中注册的内置页面（如 Dashboard、Flow Editor、AI Workbench、Master-Detail CRUD 等）是**参考页面模板**，而非壳项目的核心组成部分。

| 角色 | 说明 |
| --- | --- |
| **参考实现** | 展示如何在壳中开发 builtin 页面 |
| **开箱即用** | 新项目 clone 后立即可见的功能页面，便于评估框架能力 |
| **可替换** | 通过 Extension `systemPages` 或 `builtinPages` 可以被完全替换 |
| **非核心** | 壳的核心能力是 Shell + Dispatch + Extension 加载，不与任何特定页面绑定 |

业务团队的实际页面应通过以下方式提供：
- **AMIS/Flux Schema**：配置后端 schemaPath，壳自动渲染
- **Extension builtinPages**：注册自定义 React 组件
- **Plugin 页面**：独立部署远程插件

---

## 5. 典型数据流

```
后端 (SiteMap API)
  │
  ▼
AppRoutes (获取菜单 → 扁平化 → 生成路由表)
  │
  ▼
AppShell (折叠状态 / 侧栏宽度 / 标签页 / 用户菜单 / 品牌)
  │
  ▼
用户点击菜单项或直接 URL 导航
  │
  ▼
RouteRenderer
  ├─ pageType === 'builtin'   → getBuiltinPage(componentId)  → 渲染 React 组件
  ├─ pageType === 'plugin'     → PluginSlot(url)              → SystemJS 加载远程组件
  ├─ pageType === 'amis'       → AmisRouteEntry(schemaPath)   → 从后端加载 JSON → AMIS 渲染
  ├─ pageType === 'flux'       → FluxRouteEntry(schemaPath)   → 从后端加载 JSON → Flux 渲染
  ├─ pageType === 'iframe'     → <iframe src={frameSrc}>
  └─ pageType === 'external'   → 外链跳转
```

---

## 6. 相关文档索引

| 文档 | 内容 | 对应分层 |
| --- | --- | --- |
| [plugin-system.md](./plugin-system.md) | 插件系统与桥接合同 | Rendering + Dispatch |
| [extension-system.md](./extension-system.md) | Extension 加载、归并、部署 | Extension |
| [amis-flux-rendering-engine-integration.md](./amis-flux-rendering-engine-integration.md) | AMIS/Flux 双引擎集成 | Rendering |
| [amis-theme-bridge.md](./amis-theme-bridge.md) | AMIS CSS 变量映射 | Shell |
| [backend-integration.md](./backend-integration.md) | HTTP 合同、bootstrap、401 | Shell |
| [layout-settings.md](./layout-settings.md) | 布局设置交互 | Shell |
| [styling-system-specification.md](./styling-system-specification.md) | 样式系统 | Shell |
| [shell-profiles.md](./shell-profiles.md) | 多客户端形态（web/mobile/kiosk）profile 机制 | Shell + Routing |
| [main-bundle-dependency-spec.md](./main-bundle-dependency-spec.md) | 构建依赖 | 跨层 |
| [package-exports-spec.md](./package-exports-spec.md) | 包导出规则 | 跨层 |
