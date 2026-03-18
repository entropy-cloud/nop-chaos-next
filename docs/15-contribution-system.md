# Contribution 系统

> 本文档描述 contribution 系统的设计、类型定义、加载机制和使用方式。

---

## 1. 概述

Contribution 是宿主应用的扩展机制，用于注入：
- 品牌配置（名称、logo、标题等）
- 主题和样式资源
- 语言和 i18n 资源
- 菜单扩展
- 内置页面注册
- 插件清单声明
- 认证配置

与页面级插件的区别：
- **Contribution**：声明配置和资源，启动时加载一次
- **Plugin Page**：通过 SystemJS 远程加载，负责页面渲染

---

## 2. 类型定义

类型定义位置：`packages/shared/src/types/contribution.ts`

### 2.1 核心结构

```ts
interface ShellContribution {
  id: string
  order?: number                    // 加载顺序，后者覆盖前者
  
  // 品牌配置
  app?: ContributionAppConfig       // 兼容旧字段
  branding?: ContributionBrandingConfig
  loginUi?: ContributionLoginUiConfig
  shell?: ContributionShellConfig
  systemPages?: ContributionSystemPagesConfig
  
  // 扩展配置
  languages?: ContributionLanguage[]
  i18nResources?: ContributionI18nResource[]
  themes?: ContributionTheme[]
  styles?: ContributionStyleAsset[]
  builtinPages?: ContributionBuiltinPage[]
  plugins?: PluginManifest[]
  menus?: MenuItem[]
  auth?: ContributionAuthConfig
  
  // 初始化钩子
  setup?: (context: ContributionSetupContext) => void | Promise<void>
}
```

### 2.2 品牌配置

```ts
interface ContributionBrandingConfig {
  name?: string           // 应用全名
  shortName?: string      // 应用简称
  logoUrl?: string        // Logo URL
  markUrl?: string        // 图标标记 URL
  documentTitle?: string  // 浏览器标题
  faviconUrl?: string     // Favicon URL
}
```

### 2.3 登录页配置

```ts
interface ContributionLoginUiConfig {
  heroTitleKey?: string
  heroDescriptionKey?: string
  cardTitleKey?: string
  cardDescriptionKey?: string
  features?: ContributionLoginUiFeature[]
  showDemoHint?: boolean
}
```

### 2.4 Shell 配置

```ts
interface ContributionShellConfig {
  defaultHomePath?: string   // 默认首页路径
  helpUrl?: string
  aboutUrl?: string
  supportUrl?: string
}
```

### 2.5 系统页替换

```ts
interface ContributionSystemPagesConfig {
  login?: string       // 登录页 componentId
  forbidden?: string   // 403 页 componentId
  notFound?: string    // 404 页 componentId
  serverError?: string // 500 页 componentId
  dashboard?: string   // Dashboard componentId
}
```

---

## 3. 加载机制

### 3.1 加载入口

文件：`apps/main/src/contributions/loadContributions.ts`

宿主通过动态 `import()` 加载 ESM 模块，支持三种导出方式：
- `export default contribution`
- `export const contribution = ...`
- `export function getContribution() { ... }`

### 3.2 启动流程

文件：`apps/main/src/contributions/bootstrap.ts`

1. 读取 contribution source 列表
2. 逐个动态 import ESM 模块
3. 校验 contribution 结构
4. 执行 `setup()` 钩子
5. 归并 shell runtime config
6. 注册语言、主题、样式、内置页面
7. 合并菜单和插件清单

### 3.3 Runtime 配置

文件：`apps/main/src/contributions/runtime.ts`

提供统一的运行时配置访问：

```ts
// 获取 shell 运行时配置
getShellRuntimeConfig(): ShellRuntimeConfig

// 获取默认首页路径
getContributionDefaultHomePath(): string | undefined

// 获取系统页 componentId
getSystemPageComponentId(page: keyof ContributionSystemPagesConfig): string | undefined
```

---

## 4. 归并策略

多个 contribution 按 `order` 排序后归并，后者覆盖前者：

| 字段类型 | 归并策略 |
|----------|----------|
| 标量字段（name, logoUrl 等） | 后者覆盖 |
| 数组字段（menus, plugins） | 合并 |
| i18n 资源 | 按语言合并 |
| builtinPages | 按 componentId 覆盖 |

兼容性：如果 `branding` 未提供，回退到 `app` 字段。

---

## 5. 页面级扩展

### 5.1 Builtin Pages

通过 `builtinPages` 注册可替换的页面组件：

```ts
builtinPages: [
  {
    componentId: 'custom-dashboard',
    component: CustomDashboard
  }
]
```

### 5.2 系统页替换

通过 `systemPages` 映射系统页到自定义 componentId：

```ts
systemPages: {
  login: 'custom-login',
  dashboard: 'custom-dashboard'
}
```

路由入口保持不变（`/auth/login`、`/404` 等），只是渲染的组件来源可替换。

---

## 6. 扩展边界

### 6.1 适合 Contribution 处理

- 应用品牌信息
- 主题和样式资源
- 语言与 i18n 资源
- 菜单扩展
- 插件清单声明
- 默认首页路径
- 系统页替换

### 6.2 适合 Page Component 替换

- 结构差异大的页面（完全不同的登录流程）
- 需要独立维护的页面
- 数据来源完全不同的页面

### 6.3 不适合

- 频繁重建 UI 状态的页面组件树
- 需要独立卸载的页面实例能力

---

## 7. 调试与部署

### 7.1 同仓开发

Contribution 可作为 workspace 包直接被宿主加载。

### 7.2 跨仓联调

`entry` 可指向业务仓库的 ESM dev 地址。

### 7.3 生产部署

- Contribution 输出稳定 ESM 文件
- 插件页面继续输出 `*.system.js`
- Source 列表来自静态配置或后端

---

## 8. 错误处理

### 8.1 加载失败

- 单个 contribution 加载失败不阻塞宿主启动
- 记录清晰错误日志
- 失败项不参与后续合并

### 8.2 冲突处理

对关键主键冲突（theme id、menu path、plugin id）打出告警日志。

---

## 9. 相关文件

| 文件 | 用途 |
|------|------|
| `packages/shared/src/types/contribution.ts` | 类型定义 |
| `apps/main/src/contributions/loadContributions.ts` | 加载逻辑 |
| `apps/main/src/contributions/bootstrap.ts` | 启动引导 |
| `apps/main/src/contributions/runtime.ts` | 运行时配置 |
| `apps/main/src/contributions/demo/index.ts` | 示例 contribution |
