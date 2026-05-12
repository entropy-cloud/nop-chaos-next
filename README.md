# NOP Chaos Next

<div align="center">

**一个基于 AMIS 的前端应用框架，提供扩展系统和插件化能力。**

[Docs Index](docs/00-index.md) |
[Extension System](docs/15-extension-system.md) |
[Plugin Dev Guide](docs/08-plugin-dev-guide.md)

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8.svg)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-10-f69220.svg)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Flux Migration](https://img.shields.io/badge/Flux-Planned-blue.svg)](../nop-chaos-flux/)

</div>

---

## What This Repo Is

NOP Chaos Next 是一个基于 AMIS 的前端应用框架，提供完整的扩展系统和插件化能力。它是一个业务应用开发脚手架，允许团队通过声明式配置和插件机制快速构建复杂的企业级应用。

此仓库适合以下受众：

- 业务团队需要快速开发企业级管理后台和工作台
- 平台团队需要可扩展的应用框架，支持多租户、多主题、多语言
- 插件开发者需要标准化的插件开发和分发机制

## 与 NOP Chaos Flux 的关系

| 维度         | NOP Chaos Flux                      | NOP Chaos Next               |
| ------------ | ----------------------------------- | ---------------------------- |
| **定位**     | 低代码 Runtime 和渲染框架           | 前端应用框架和脚手架         |
| **核心能力** | 七个 primitives 构建的 runtime      | Extension 系统 + Plugin 系统 |
| **渲染层**   | 自研 renderer 架构                  | 基于 AMIS（React 19 迁移版） |
| **使用场景** | 平台团队构建低代码基础设施          | 业务团队构建企业级应用       |
| **设计器**   | 内置 Flow/Report/Spreadsheet 设计器 | 集成第三方设计器             |
| **状态管理** | 框架无关的 Zustand stores           | 混合 Zustand + React Query   |
| **依赖关系** | 独立的 runtime，不依赖 AMIS         | 依赖 AMIS 作为核心渲染层     |
| **插件加载** | 未提供                              | SystemJS 远程插件加载        |

简单来说：

- **Flux** = "如何从 JSON 生成 UI"（底层 runtime）
- **Next** = "如何构建可扩展的业务应用"（应用框架）

两个项目可以协作：Next 可以集成 Flux 的设计器和运行时能力。

## 迁移路线图

### 当前状态（Phase 0）

- Next 基于 AMIS（React 19 迁移版）作为核心渲染层
- Flux 作为独立的 runtime 项目并行发展
- 两者通过集成点可协作使用

### 迁移策略（Phase 1-3）

#### Phase 1: 共存期（当前）

- Next 继续使用 AMIS 作为主要渲染层
- 引入 Flux 作为可选的渲染层
- 开发 **AMIS to Flux** JSON 转换兼容层
- 新页面可选择使用 Flux 或 AMIS
- 兼容层保证现有 AMIS schema 可在 Flux 上运行

#### Phase 2: 过渡期

- 逐步将新页面迁移到 Flux
- 转换层逐步优化，提升兼容性和性能
- 重构关键页面和组件到 Flux
- 保留 AMIS 用于存量页面和遗留功能
- 提供迁移工具和最佳实践文档

#### Phase 3: 完整取代期

- 完成所有页面迁移到 Flux
- 移除 AMIS 依赖和转换层
- Flux 成为 Next 唯一的 runtime 和渲染层
- 统一 schema DSL（Flux schema）
- 保持 Extension 和 Plugin 系统不变

### AMIS to Flux 转换层

转换层负责：

- Schema 映射：AMIS schema → Flux schema
- 表达式转换：AMIS 表达式 → Flux 表达式
- 事件处理：AMIS 事件系统 → Flux ActionScope
- 数据绑定：AMIS 数据流 → Flux ScopeRef
- 渲染适配：AMIS renderer → Flux renderer

示例：

```tsx
// AMIS schema（当前）
const amisSchema = {
  type: 'form',
  body: [
    {
      type: 'input-text',
      name: 'username',
      label: '用户名',
      required: true,
    },
  ],
};

// 转换后运行在 Flux
const fluxSchema = amisToFlux(amisSchema);
```

### 迁移验证策略

- **页面级迁移**：逐页迁移，保证功能等价
- **视觉回归**：确保迁移前后 UI 一致
- **性能对比**：验证 Flux 性能优势
- **测试覆盖**：保证迁移不破坏现有测试
- **灰度发布**：按功能模块逐步切换到 Flux

### 开发者影响

- **现有开发者**：继续使用 AMIS schema，转换层透明处理
- **新功能开发**：推荐使用 Flux schema，享受更好的性能和类型安全
- **迁移期间**：AMIS 和 Flux schema 可并存，按需选择

查看详细的迁移计划：`docs/plans/amis-to-flux-migration.md`（待创建）

## At A Glance

- AMIS 驱动的声明式 UI，已迁移到 React 19
- Extension 系统：品牌、主题、菜单、语言、系统页的统一配置
- Plugin 系统：基于 SystemJS 的远程插件加载和隔离
- 完整的业务页面模板：Dashboard、AI Workbench、Flow Editor、Master-Detail CRUD
- 多租户和多主题支持，运行时可切换
- 国际化（i18n）完整支持
- Mock 数据和开发工具链
- **打包优化**：AMIS/Flux 按需加载，基于菜单配置动态决定加载策略，最小化初始包体积
- **迁移计划**：逐步引入 Flux runtime，通过 AMIS to Flux 转换层兼容现有 schema，最终完整取代 AMIS

## 项目结构

```
nop-chaos-next/
├── apps/main/              # 主应用（宿主）
├── packages/
│   ├── core/               # 核心工具和类型
│   ├── shared/             # 共享类型定义
│   ├── theme-tokens/       # 主题 token
│   ├── tailwind-preset/    # Tailwind 预设
│   └── ui/                 # 共享 UI 组件
├── examples/
│   ├── plugin-demo/        # 插件示例
│   └── extension-demo/     # Extension 示例
├── tests/e2e/              # E2E 测试
└── docs/                   # 文档
```

## 核心特性

### 1. Extension 系统

Extension 是宿主应用的扩展机制，用于注入：

- 品牌配置（名称、logo、标题等）
- 主题和样式资源
- 语言和 i18n 资源
- 菜单扩展
- 内置页面注册
- 插件清单声明
- 认证配置

Extension 在启动时加载一次，用于配置和资源注入。

**查看详情**：[Extension 系统](docs/15-extension-system.md)

### 2. Plugin 系统

Plugin 是页面级扩展，通过 SystemJS 远程加载：

- 独立的页面渲染逻辑
- 独立的构建和部署
- 运行时动态加载和卸载
- 与宿主的隔离通信机制

Plugin 适用于业务页面、工作台、管理界面等需要独立开发和部署的场景。

**查看详情**：[插件开发指南](docs/08-plugin-dev-guide.md)

### 3. 内置页面模板

项目提供完整的业务页面模板：

| 页面              | 说明               | 文档                                          |
| ----------------- | ------------------ | --------------------------------------------- |
| Dashboard         | 数据概览和统计卡片 | [Dashboard](docs/01-dashboard.md)             |
| AI Workbench      | AI 辅助工作台      | [AI Workbench](docs/02-ai-workbench.md)       |
| Flow Editor       | 流程编辑器         | [Flow Editor](docs/03-flow-editor.md)         |
| Master-Detail     | 主子表 CRUD        | [Master-Detail](docs/04-master-detail.md)     |
| Plugin Management | 插件管理页面       | [Plugin System](docs/05-plugin-system.md)     |
| Layout Settings   | 布局设置           | [Layout Settings](docs/06-layout-settings.md) |

## Quick Start

Prerequisites: `Node.js LTS`, `pnpm 10+`

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 启动插件示例模式
pnpm dev:extensions

# 启动 mock 数据模式
pnpm dev:mock
```

Local playground: `http://localhost:5173`

### 验证命令

```bash
pnpm typecheck    # 类型检查
pnpm build        # 构建所有包
pnpm lint         # 代码检查
pnpm test         # 单元测试
pnpm test:e2e     # E2E 测试
```

## Extension 开发

创建一个新的 Extension：

```bash
# 使用生成器创建 Extension 模板
pnpm generate:extension
```

查看文档：[Extension Generator](docs/22-extension-generator.md)

### 本地联调

有两种方式：

1. **远程 ESM 模式**：指向业务仓库 dev server 暴露的 ESM 地址
2. **本地 alias 模式**：通过环境变量指向外部目录源码

```env
# apps/main/.env.local
VITE_ENABLE_MOCK=true
VITE_DEMO_EXTENSION_ALIAS_PATH=../external-extension/src/index.ts
```

查看详情：[Extension 系统 - 调试与部署](docs/15-extension-system.md#73-调试与部署)

## Plugin 开发

查看完整的插件开发指南：[Plugin Dev Guide](docs/08-plugin-dev-guide.md)

### Plugin 示例

项目包含一个完整的插件示例：

```bash
# 启动插件示例模式
pnpm dev:extensions
```

示例位置：`examples/plugin-demo/`

## 文档索引

- [文档索引](docs/00-index.md)
- [Mock 数据说明](docs/07-mock-data.md)
- [样式与交互规则](docs/09-style-interaction-guidelines.md)
- [后端联调指南](docs/16-backend-integration.md)
- [AMIS 主题桥接](docs/18-amis-theme-bridge.md)

## 技术栈

- **框架**: React 19
- **构建**: Vite 8, TypeScript 6
- **UI**: AMIS (React 19 迁移版), TailwindCSS 4
- **状态**: Zustand, React Query
- **路由**: React Router 7
- **国际化**: i18next
- **图表**: Recharts
- **测试**: Vitest, Playwright
- **插件**: SystemJS

## 项目状态

- 适合于：企业级应用开发、插件化架构、多租户系统
- 当前状态：活跃开发，包含完整的业务页面模板
- 主入口：`apps/main`

## 贡献指南

- 使用 `pnpm` 脚本进行跨 workspace 工作
- 保持相关包的 `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm lint` 通过
- 遵循 [样式与交互规则](docs/09-style-interaction-guidelines.md)

## License

MIT — see [LICENSE](LICENSE).

基于 [Baidu AMIS](https://github.com/baidu/amis) 构建，已迁移到 React 19。

## 与 NOP Chaos Flux 的集成建议

如果需要同时使用两个项目的能力：

1. **Next 作为宿主框架**：使用 Next 的 Extension 和 Plugin 系统
2. **Flux 作为渲染层**：在 Next 的插件中集成 Flux 的 renderer
3. **设计器集成**：使用 Flux 的 Flow/Report/Spreadsheet 设计器作为 Next 的页面组件

示例集成模式：

```tsx
// 在 Next 的插件中使用 Flux
import { FluxRenderer } from '@nop-chaos/flux-react';

function MyCustomPage() {
  return (
    <FluxRenderer
      schema={{
        type: 'form',
        // Flux schema
      }}
    />
  );
}
```
