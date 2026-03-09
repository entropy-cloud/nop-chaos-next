# NOP Chaos Next

一个现代化的企业级前端模板项目，基于 React 19 + TypeScript + Vite 构建，集成了动态模块加载、多主题系统、国际化等企业级特性。

## 特性亮点

- **动态模块加载** - 基于 SystemJS 的微前端架构，支持运行时加载独立编译的插件模块
- **多主题系统** - 内置 5 种精心设计的主题，支持 CSS 变量动态切换
- **国际化 (i18n)** - 基于 i18next 的完整多语言解决方案
- **Tab 页管理** - 多标签页导航系统，支持状态持久化
- **权限控制** - 完整的认证流程和路由保护
- **流程图编辑器** - 集成 @xyflow/react，支持可视化流程设计
- **AI 集成** - 内置 Vercel AI SDK，支持 OpenAI 等大模型接入
- **Mock 数据** - 开发环境 MSW 拦截 API，前后端并行开发

## 技术栈

### 核心框架

| 技术             | 版本   | 说明     |
| ---------------- | ------ | -------- |
| React            | 19.2.0 | UI 框架  |
| TypeScript       | 5.9.3  | 类型系统 |
| Vite             | 7.3.1  | 构建工具 |
| React Router DOM | 7.13.1 | 路由管理 |

### UI 组件

| 技术         | 版本    | 说明            |
| ------------ | ------- | --------------- |
| Radix UI     | Latest  | 无障碍组件原语  |
| TailwindCSS  | 3.4.19  | 原子化 CSS 框架 |
| Lucide React | 0.577.0 | 图标库          |
| Sonner       | 2.0.7   | Toast 通知      |

### 状态管理

| 技术           | 版本    | 说明           |
| -------------- | ------- | -------------- |
| Zustand        | 5.0.11  | 轻量级全局状态 |
| TanStack Query | 5.90.21 | 服务端状态管理 |

### 特色功能

| 技术          | 版本    | 说明          |
| ------------- | ------- | ------------- |
| i18next       | 25.8.14 | 国际化核心    |
| @xyflow/react | 12.10.1 | 流程图/节点图 |
| Recharts      | 3.7.0   | 数据可视化    |
| SystemJS      | 6.15.1  | 动态模块加载  |
| Vercel AI SDK | 6.0.116 | AI 功能集成   |

### 开发工具

| 技术       | 版本    | 说明       |
| ---------- | ------- | ---------- |
| Vitest     | 4.0.18  | 单元测试   |
| Playwright | 1.58.2  | E2E 测试   |
| MSW        | 2.12.10 | API Mock   |
| ESLint     | 9.39.1  | 代码检查   |
| Prettier   | 3.8.1   | 代码格式化 |
| Husky      | 9.1.7   | Git 钩子   |

## 项目结构

```
nop-chaos-next/
├── public/                    # 静态资源
│   └── locales/              # 国际化翻译文件
├── src/
│   ├── api/                  # API 接口层
│   │   ├── auth.ts          # 认证接口
│   │   ├── user.ts          # 用户接口
│   │   └── ai.ts            # AI 接口
│   │
│   ├── assets/               # 静态资源（图片等）
│   │
│   ├── components/           # 公共组件
│   │   ├── ui/              # UI 基础组件（基于 Radix UI）
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   ├── DynamicModuleLoader.tsx    # 动态模块加载器
│   │   ├── DynamicPageWrapper.tsx     # 动态页面包装器
│   │   └── ProtectedRoute.tsx         # 路由守卫
│   │
│   ├── hooks/                # 自定义 Hooks
│   │
│   ├── i18n/                 # 国际化配置
│   │   └── index.ts         # i18next 配置
│   │
│   ├── layouts/              # 布局组件
│   │   ├── MainLayout.tsx   # 主布局
│   │   ├── Header.tsx       # 顶部导航
│   │   ├── Sidebar.tsx      # 侧边栏
│   │   └── TabBar.tsx       # 标签页栏
│   │
│   ├── lib/                  # 工具库
│   │   └── builtinComponents.ts    # 内置组件注册
│   │
│   ├── mocks/                # Mock 数据
│   │   ├── browser.ts       # MSW 浏览器配置
│   │   └── handlers.ts      # API 处理器
│   │
│   ├── modules/              # 业务模块
│   │   ├── ai/              # AI 模块
│   │   ├── auth/            # 认证模块（登录页）
│   │   ├── chart/           # 图表演示
│   │   ├── crud/            # CRUD 示例
│   │   ├── dashboard/       # 仪表盘
│   │   ├── flow/            # 流程图编辑器
│   │   ├── layout/          # 布局演示
│   │   ├── orders/          # 订单模块
│   │   └── settings/        # 设置页面
│   │
│   ├── providers/            # Context Providers
│   │   └── ThemeProvider.tsx
│   │
│   ├── routes/               # 路由配置
│   │   └── index.tsx
│   │
│   ├── stores/               # Zustand 状态仓库
│   │   ├── auth.ts          # 认证状态
│   │   ├── menu.ts          # 菜单状态
│   │   ├── tabs.ts          # 标签页状态
│   │   ├── theme.ts         # 主题状态
│   │   └── dynamic-modules.ts  # 动态模块状态
│   │
│   ├── themes/               # 主题定义
│   │   ├── types.ts         # 主题类型
│   │   ├── index.ts         # 主题注册
│   │   ├── ocean-depths.ts
│   │   ├── tech-innovation.ts
│   │   ├── forest-canopy.ts
│   │   ├── sunset-boulevard.ts
│   │   └── modern-minimalist.ts
│   │
│   ├── types/                # TypeScript 类型定义
│   │
│   ├── index.css             # 全局样式
│   └── main.tsx              # 应用入口
│
├── plugins/                  # 插件目录
│   └── demo/                # 示例插件
│       ├── src/
│       ├── vite.config.ts
│       └── package.json
│
├── tests/                    # E2E 测试
│   └── app.spec.ts
│
├── vite.config.ts            # Vite 配置
├── tailwind.config.js        # Tailwind 配置
├── tsconfig.json             # TypeScript 配置
├── vitest.config.ts          # Vitest 配置
└── playwright.config.ts      # Playwright 配置
```

## 核心设计

### 1. 动态模块加载（微前端）

项目支持运行时动态加载独立编译的插件模块，实现微前端架构：

```typescript
// 插件配置
interface DynamicModuleConfig {
  id: string // 模块唯一标识
  name: string // 模块名称
  path: string // 模块路径
  componentPath: string // 组件路径
}

// 加载插件
const { loadModule } = useDynamicModulesStore()
await loadModule({
  id: "plugin-demo",
  name: "Demo Plugin",
  path: "/plugins/demo",
  componentPath: "/plugins/demo.js",
})
```

**插件开发流程：**

1. 在 `plugins/` 目录创建插件项目
2. 配置 `peerDependencies` 声明共享依赖
3. 使用 Vite 构建 UMD/ESM 格式
4. 主应用通过 SystemJS 动态加载

### 2. 多主题系统

基于 CSS 变量的主题系统，支持运行时切换：

```typescript
// 内置主题
const themes = {
  "ocean-depths": {
    /* 深海蓝主题 */
  },
  "tech-innovation": {
    /* 科技创新主题 */
  },
  "forest-canopy": {
    /* 森林主题 */
  },
  "sunset-boulevard": {
    /* 日落主题 */
  },
  "modern-minimalist": {
    /* 现代简约主题 */
  },
}

// 主题定义结构
interface ThemeDefinition {
  id: string
  name: string
  colors: {
    background: string
    foreground: string
    primary: string
    secondary: string
    // ... 更多颜色变量
  }
}
```

### 3. 国际化 (i18n)

完整的 i18next 集成方案：

```typescript
// 配置
i18n
  .use(HttpBackend)           // HTTP 加载翻译文件
  .use(LanguageDetector)      // 浏览器语言检测
  .use(initReactI18next)      // React 集成
  .init({
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'en-US'],
    backend: {
      loadPath: '/locales/{{lng}}/translation.json'
    }
  })

// 使用
const { t } = useTranslation()
<h1>{t('dashboard.title')}</h1>
```

### 4. Tab 页管理

多标签页导航系统，支持状态持久化：

```typescript
// Tab 状态管理
interface Tab {
  key: string
  label: string
  labelKey?: string // 支持国际化 key
  path: string
  closable: boolean
}

// 使用
const { tabs, addTab, removeTab, setActiveTab } = useTabStore()
```

### 5. 布局系统

三层布局结构：

```
┌─────────────────────────────────────┐
│              Header                  │
├──────────┬──────────────────────────┤
│          │        TabBar            │
│ Sidebar  ├──────────────────────────┤
│          │                          │
│          │       Content            │
│          │                          │
└──────────┴──────────────────────────┘
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动主应用
npm run dev

# 同时启动主应用和插件开发
npm run dev:all
```

### 构建

```bash
# 构建主应用
npm run build

# 构建插件
npm run build:plugin

# 同时构建主应用和插件
npm run build:all
```

### 测试

```bash
# 单元测试
npm run test:unit

# 单元测试（监听模式）
npm run test:unit:watch

# E2E 测试
npm run test

# E2E 测试（UI 模式）
npm run test:ui
```

### 代码检查

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix
```

## 开发指南

### 添加新页面

1. 在 `src/modules/` 创建模块目录
2. 创建页面组件 `index.tsx`
3. 配置路由（支持动态路由）

### 添加新主题

1. 在 `src/themes/` 创建主题文件
2. 定义 `ThemeDefinition` 对象
3. 在 `src/themes/index.ts` 注册

### 添加新插件

1. 在 `plugins/` 创建插件项目
2. 配置 `peerDependencies`
3. 配置 Vite 构建为 SystemJS 模块
4. 主应用通过菜单配置加载

### API Mock

开发环境自动启用 MSW Mock：

```typescript
// src/mocks/handlers.ts
export const handlers = [
  http.get("/api/user", () => {
    return HttpResponse.json({ name: "User" })
  }),
]
```

## 代码规范

- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Husky** - Git 钩子
- **lint-staged** - 提交前检查

### Git 提交规范

建议使用约定式提交：

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

## 浏览器支持

| 浏览器  | 版本          |
| ------- | ------------- |
| Chrome  | 最新 2 个版本 |
| Firefox | 最新 2 个版本 |
| Safari  | 最新 2 个版本 |
| Edge    | 最新 2 个版本 |

## License

MIT
