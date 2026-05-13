# NOP Chaos Next

[English](README.en.md)

<div align="center">

**基于 AMIS 的前端应用框架，提供扩展系统和插件化能力。**

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8.svg)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-10-f69220.svg)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 项目简介

NOP Chaos Next 是基于 AMIS 的前端应用框架，提供完整的扩展系统和插件化能力。它是一个业务应用开发脚手架，允许团队通过声明式配置和插件机制快速构建复杂的企业级应用。

适合以下受众：

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

- **Flux** = "如何从 JSON 生成 UI"（底层 runtime）
- **Next** = "如何构建可扩展的业务应用"（应用框架）

Next 当前从 Flux 同步 `ui`、`theme-tokens`、`tailwind-preset` 三个包，后续将引入 Flux 渲染引擎作为可选的页面渲染层。

## 核心特性一览

- AMIS 驱动的声明式 UI，已迁移到 React 19；Flux 作为可选渲染层逐步引入
- Extension 系统：品牌、主题、菜单、语言、系统页的统一配置
- Plugin 系统：基于 SystemJS 的远程插件加载和隔离
- 完整的业务页面模板：Dashboard、AI Workbench、Flow Editor、主子表 CRUD
- 多租户和多主题支持，运行时可切换
- 国际化（i18n）完整支持
- Mock 数据和开发工具链
- 打包优化：AMIS/Flux 按需加载，基于菜单配置动态决定加载策略

## 项目结构

```
nop-chaos-next/
├── apps/main/              # 主应用（宿主）
├── packages/
│   ├── core/               # 核心工具和类型
│   ├── shared/             # 共享类型定义
│   ├── amis-core/          # AMIS 宿主桥接层
│   ├── amis-react/         # AMIS React 集成
│   ├── plugin-bridge/      # 插件通信桥
│   ├── theme-tokens/       # 主题 token（来自 nop-chaos-flux）
│   ├── tailwind-preset/    # Tailwind 预设（来自 nop-chaos-flux）
│   └── ui/                 # 共享 UI 组件（来自 nop-chaos-flux）
├── flux-lib/
│   └── ui/                 # @nop-chaos/ui workspace 包（来自 nop-chaos-flux）
├── examples/
│   ├── plugin-demo/        # 插件示例
│   └── extension-demo/     # Extension 示例
├── tests/e2e/              # E2E 测试
├── scripts/                # 构建、分析、同步脚本
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

## 快速开始

### 前置条件

| 工具    | 版本    |
| ------- | ------- |
| Node.js | 20+     |
| pnpm    | 10.0.0  |
| Git     | 任意    |

### 1. 克隆仓库及兄弟仓库

本项目依赖两个兄弟仓库：

| 兄弟仓库 | 用途 | 集成方式 |
|---------|------|---------|
| [amis-react19](https://gitee.com/canonical-entropy/amis-react19) | AMIS React 19 分支 | `file:*.tgz` 依赖 |
| [nop-chaos-flux](https://gitee.com/canonical-entropy/nop-chaos-flux) | Flux UI/主题包 | 通过 `pnpm sync:flux` 源码同步 |

三个仓库必须克隆到同一父目录下：

```bash
cd /path/to/parent
git clone https://gitee.com/canonical-entropy/amis-react19.git
git clone https://gitee.com/canonical-entropy/nop-chaos-flux.git
git clone <本仓库地址>
```

目录布局：

```
<parent>/
  amis-react19/        # AMIS 分支（必需）
  nop-chaos-flux/      # Flux UI 包（必需）
  nop-chaos-next/      # 本仓库
```

### 2. 构建 AMIS 包

```bash
cd amis-react19
npm install
npm run pack:nop-chaos
```

此命令在 `dist-packages/` 下生成 `*.tgz` 包，供 nop-chaos-next 使用。

### 3. 安装、同步、运行

```bash
cd ../nop-chaos-next
pnpm install
pnpm sync:flux          # 从 ../nop-chaos-flux 同步 UI 包
pnpm dev
```

`pnpm sync:flux` 将 `ui`、`theme-tokens`、`tailwind-preset` 从兄弟仓库复制到本 workspace 并刷新安装。

本地访问：`http://localhost:5173`

完整的构建指南（包括 AMIS 开发工作流、CI 流水线、常见问题）请参考 [构建指南](docs/references/build-guide.md)。

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
pnpm generate:extension
```

查看文档：[Extension 生成器](docs/22-extension-generator.md)

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

查看完整的插件开发指南：[插件开发指南](docs/08-plugin-dev-guide.md)

### Plugin 示例

项目包含一个完整的插件示例：

```bash
pnpm dev:extensions
```

示例位置：`examples/plugin-demo/`

## 文档索引

- [文档索引](docs/00-index.md)
- [构建指南](docs/references/build-guide.md)
- [Mock 数据说明](docs/07-mock-data.md)
- [样式与交互规则](docs/09-style-interaction-guidelines.md)
- [后端联调指南](docs/16-backend-integration.md)
- [AMIS 主题桥接](docs/18-amis-theme-bridge.md)

## 技术栈

- **框架**：React 19
- **构建**：Vite 8、TypeScript 6
- **UI**：AMIS（React 19 迁移版）、TailwindCSS 4
- **状态**：Zustand、React Query
- **路由**：React Router 7
- **国际化**：i18next
- **图表**：Recharts
- **测试**：Vitest、Playwright
- **插件**：SystemJS

## 项目状态

- 适合于：企业级应用开发、插件化架构、多租户系统
- 当前状态：活跃开发，包含完整的业务页面模板
- 主入口：`apps/main`

## 贡献指南

- 使用 `pnpm` 脚本进行跨 workspace 工作
- 保持相关包的 `pnpm typecheck`、`pnpm build`、`pnpm test`、`pnpm lint` 通过
- 遵循[样式与交互规则](docs/09-style-interaction-guidelines.md)

## 许可证

MIT — 详见 [LICENSE](LICENSE)。

基于 [Baidu AMIS](https://github.com/baidu/amis) 构建，已迁移到 React 19。
