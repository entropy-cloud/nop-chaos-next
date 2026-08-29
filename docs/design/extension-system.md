# Extension 系统

> 本文档描述 extension 系统的设计、类型定义、加载机制和使用方式。

> **上下文**：本系统是通用应用壳（详见 [overview.md](./overview.md)），extension 是壳的配置和资源注入机制（启动时加载一次），与运行时远程加载的 plugin 页面互补。

---

## 1. 概述

Extension 是宿主应用的扩展机制，用于注入：

- 品牌配置（名称、logo、标题等）
- 主题和样式资源
- 语言和 i18n 资源
- 左下角用户菜单扩展
- 内置页面注册
- 插件清单声明
- 认证配置

与页面级插件的区别：

- **Extension**：声明配置和资源，启动时加载一次
- **Plugin Page**：通过 SystemJS 远程加载，负责页面渲染

---

## 2. 类型定义

类型定义位置：`packages/shared/src/types/extension.ts`

### 2.1 核心结构

```ts
interface ShellExtension {
  id: string;
  order?: number; // 加载顺序，后者覆盖前者

  // 品牌配置
  app?: ExtensionAppConfig; // 兼容旧字段
  branding?: ExtensionBrandingConfig;
  loginUi?: ExtensionLoginUiConfig;
  shell?: ExtensionShellConfig;
  systemPages?: ExtensionSystemPagesConfig;

  // 扩展配置
  languages?: ExtensionLanguage[];
  i18nResources?: ExtensionI18nResource[];
  themes?: ExtensionTheme[];
  styles?: ExtensionStyleAsset[];
  builtinPages?: ExtensionBuiltinPage[];
  plugins?: PluginManifest[];
  menus?: MenuItem[]; // deprecated: 主导航菜单由后端 SiteMap 决定
  overrideMenus?: boolean; // deprecated
  userMenuItems?: ExtensionUserMenuItem[];
  auth?: ExtensionAuthConfig;

  // 初始化钩子
  setup?: (context: ExtensionSetupContext) => void | Promise<void>;

  // 环境变量
  env?: Record<string, string>;
}
```

### 2.2 品牌配置

```ts
interface ExtensionBrandingConfig {
  name?: string; // 应用全名
  shortName?: string; // 应用简称
  logoUrl?: string; // Logo URL
  markUrl?: string; // 图标标记 URL
  documentTitle?: string; // 浏览器标题
  faviconUrl?: string; // Favicon URL
}
```

### 2.3 登录页配置

```ts
interface ExtensionLoginUiConfig {
  heroTitleKey?: string;
  heroDescriptionKey?: string;
  cardTitleKey?: string;
  cardDescriptionKey?: string;
  features?: ExtensionLoginUiFeature[];
  showDemoHint?: boolean;
}
```

### 2.4 Shell 配置

```ts
interface ExtensionShellConfig {
  defaultHomePath?: string; // 默认首页路径
  helpUrl?: string;
  aboutUrl?: string;
  supportUrl?: string;
  sidebarWidthRem?: number; // 宿主左侧主菜单展开宽度默认值
  sidebarCollapsedWidthRem?: number; // 宿主左侧主菜单折叠宽度默认值
}
```

当前这 3 个外链字段属于 supported shell 合同，而不是仅做 runtime merge 的保留位：

- `helpUrl`：显示在侧栏用户菜单的 Help 项
- `aboutUrl`：显示在侧栏用户菜单的 About 项
- `supportUrl`：显示在侧栏用户菜单的 Support 项
- `sidebarWidthRem` / `sidebarCollapsedWidthRem`：为宿主左侧主菜单提供 extension 级默认宽度；只有在用户尚未通过 layout settings 手动修改对应宽度时才会生效

主应用消费点位于 `apps/main/src/components/layout/SidebarUserMenu.tsx`，点击后通过 `window.open(url, '_blank', 'noopener,noreferrer')` 打开外链。

### 2.5 系统页替换

```ts
interface ExtensionSystemPagesConfig {
  login?: string; // 登录页 componentId
  forbidden?: string; // 403 页 componentId
  notFound?: string; // 404 页 componentId
  serverError?: string; // 500 页 componentId
  dashboard?: string; // Dashboard componentId
}
```

---

## 3. 加载机制

### 3.1 加载入口

文件：`apps/main/src/extensions/loadExtensions.ts`

宿主现在支持两类 source：

```ts
type ExtensionSource =
  | {
      id: string;
      entry: string;
      enabled?: boolean;
    }
  | {
      id: string;
      load: () => Promise<ExtensionModule>;
      enabled?: boolean;
    };
```

- `entry`: 运行时按 URL 动态 `import()` 远程 ESM
- `load`: 由宿主构建直接引入本地或外部目录模块，适合同机联调或跨仓源码接入

Extension 模块本身仍支持三种导出方式：

- `export default extension`
- `export const extension = ...`
- `export function getExtension() { ... }`

### 3.2 启动流程

文件：`apps/main/src/extensions/bootstrap.ts`

1. 读取 extension source 列表
2. 逐个动态 import ESM 模块
3. 校验 extension 结构
4. 执行 `setup()` 钩子
5. 归并 shell runtime config
6. 注册语言、主题、样式、内置页面
7. 合并菜单和插件清单

当前 live bootstrap 还有两条语义约束：

- `bootstrapExtensions()` 在宿主首次渲染前完成，且 `initializeI18n()` 会在 extension 定义落地后才执行；因此 extension 的 auth config、default language、supported languages、theme 和 builtin page 注册不会再晚于首次 i18n 初始化或首次页面渲染。
- 语言注册优先使用 `supportedLanguages`；`languages` 仅保留为兼容旧 manifest 的 deprecated alias。bootstrap 会先 `resetLanguages()` 回到 host 默认语言表，再按 extension 顺序执行 `registerLanguages(...)`，因此多个 extension 会叠加语言能力，而不是由最后一个 extension 覆盖前面的注册结果。
- `plugins` 不再是“类型存在但 host 忽略”的半连接字段。`apps/main/src/extensions/bootstrap.ts` 会把 extension 提供的 plugin manifests 合并进 `apps/main/src/store/pluginStore.ts`，因此插件管理页和 plugin bridge 快照都能观察到同一份扩展后的插件清单。
- 主导航菜单现在完全以后端 `SiteMapApi__getSiteMap` / mock menu response 为准。extension 不再通过 `menus` / `overrideMenus` 合并或替换左侧主导航；这些字段仅保留为 deprecated 兼容输入。extension 如需暴露入口，应注册 `builtinPages` / `systemPages` 保证路由存在，再通过 `userMenuItems` 定制左下角用户弹出菜单。
- `systemPages.login` 和 `systemPages.notFound` 现在都会被 `apps/main/src/router/AppRoutes.tsx` 消费；extension 可以在不改动宿主 URL 结构的前提下覆盖登录页和 shell fallback 页面。

### 3.3 Runtime 配置

文件：`apps/main/src/extensions/runtime.ts`

提供统一的运行时配置访问：

```ts
// 获取 shell 运行时配置
getShellRuntimeConfig(): ShellRuntimeConfig

// 订阅 shell 运行时配置变化
subscribeShellRuntimeConfig(listener: () => void): () => void

// 获取默认首页路径
getExtensionDefaultHomePath(): string | undefined

// 获取系统页 componentId
getSystemPageComponentId(page: keyof ExtensionSystemPagesConfig): string | undefined
```

主应用中的 `useShellConfig()` 已改为通过 `useSyncExternalStore` 订阅这份 runtime config，因此 extension bootstrap 完成后若 branding / loginUi / systemPages 发生变化，消费这些字段的 React 组件会自动重新渲染。

为满足 `useSyncExternalStore` 的快照契约，`getShellRuntimeConfig()` 现在会在配置未变化时返回稳定的对象引用；只有 `setShellRuntimeConfig()` 落地新配置时才替换快照，避免登录页等消费方因每次读取都拿到新对象而触发额外渲染或白屏错误。

### 3.5 首页路径合同

当前首页路径不是多点硬编码，而是通过 `apps/main/src/config/homePath.ts` 维护单一 canonical source：

- 默认值仍为 `/dashboard`
- `apps/main/src/config/systemMenus.ts` 在 merge 菜单响应后调用 `setCurrentHomePath(...)`
- 解析优先级为：后端 `menuResponse.home` 且路径仍存在于当前菜单，其次 extension `shell.defaultHomePath` 且路径存在，最后回退到默认 `/dashboard`
- `apps/main/src/store/tabStore.ts`、`apps/main/src/hooks/useTabManagement.ts`、以及 `apps/main/src/pages/errors/{403,404,500}.tsx` 都通过 `getCurrentHomePath()` 读取当前首页，而不是再硬编码 `/dashboard`

这意味着 extension 可以声明默认首页，但 live runtime 仍以当前可访问菜单中的实际 homePath 为准。

### 3.6 菜单过滤与路由守卫

当前宿主保留两层权限模型：

- 菜单层：侧边导航基于过滤后的菜单决定哪些入口可见
- 路由层：`apps/main/src/router/AppRoutes.tsx` 继续基于完整菜单注册路由，`apps/main/src/router/RouteRenderer.tsx` 在渲染时执行权限检查

该设计是有意的。结果上，低权限用户看不到受限菜单项，但若直接访问受限 URL，仍会命中对应路由并渲染 `ForbiddenPage`，而不是因为路由缺失退化成 `404`。

### 3.4 Bootstrap 并发保护

`bootstrapExtensions()` 现在带有 Promise 级别的并发去重：

- 启动期重复调用会复用同一条 bootstrap promise
- 失败时会重置 promise，允许后续重试
- 成功后保留已完成结果，避免重复应用语言、主题、样式和 builtin page 注册

---

## 4. 归并策略

多个 extension 按 `order` 排序后归并，后者覆盖前者：

| 字段类型                     | 归并策略            |
| ---------------------------- | ------------------- |
| 标量字段（name, logoUrl 等） | 后者覆盖            |
| 数组字段（plugins）          | 合并                |
| i18n 资源                    | 按语言合并          |
| builtinPages                 | 按 componentId 覆盖 |

`userMenuItems` 使用类似 Nop Delta 的同名节点合并语义：

- `override` 不写或为 `merge`：按 `id` 合并字段；不存在则新增
- `override: 'replace'`：按 `id` 整体替换该菜单项
- `override: 'remove'`：按 `id` 删除该菜单项

示例：

```ts
userMenuItems: [
  {
    id: 'settings-theme',
    titleKey: 'settings.themeTitle',
    path: '/settings/theme',
  },
  {
    id: 'help-guide',
    override: 'remove',
  },
  {
    id: 'vendor-docs',
    title: 'Vendor Docs',
    href: 'https://example.com/docs',
  },
];
```

兼容性：如果 `branding` 未提供，回退到 `app` 字段。

语言字段的兼容策略单独约定如下：

- 推荐字段：`supportedLanguages`
- 兼容字段：`languages`（deprecated）
- 运行时语义：host 默认语言 + 所有 extension 追加注册后的去重合集

---

## 5. 页面级扩展

### 5.1 Builtin Pages

通过 `builtinPages` 注册可替换的页面组件：

```ts
builtinPages: [
  {
    componentId: 'custom-dashboard',
    component: CustomDashboard,
  },
];
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

### 6.1 适合 Extension 处理

- 应用品牌信息
- 主题和样式资源
- 语言与 i18n 资源
- 左下角用户菜单扩展
- 插件清单声明
- 默认首页路径
- Help / About / Support 外链
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

Extension 可作为 workspace 包直接被宿主加载。

### 7.2 跨仓联调

有两种常用方式：

- 远程 SystemJS/ESM 模式：`entry` 指向业务仓库暴露的产物地址（SystemJS bundle 或 ESM）
- 本地 alias 模式：宿主通过 `VITE_DEMO_EXTENSION_ALIAS_PATH` 把 `@demo-extension` 指向外部目录源码入口

示例：

```env
VITE_ENABLE_MOCK=true
VITE_DEMO_EXTENSION_ALIAS_PATH=../external-extension/src/index.ts
```

说明：

- alias 模式下不需要单独启动 extension dev server
- `apps/main/vite.config.ts` 会把 `@demo-extension` 指向该路径，并放开对应目录的 `server.fs.allow`
- 这类接入更像“外部代码库依赖”，会进入宿主的 Vite 构建图
- 若要验证真正的独立部署形态，仍建议保留远程 `entry` 联调或生产 ESM 产物加载

### 7.3 生产部署

- Extension 构建为 **标准 ESM bundle**（`assets/index.js`），把 `SHARED_MODULE_NAMES` 全部 external（保留裸名 import）；宿主构建后由 `scripts/build-nop-shared.mjs` 生成原生 `<script type="importmap">` 与 `nop-shared/<name>.mjs` facade（转发 `__NOP_SHARED__` 宿主实例，导出构建期自动枚举），扩展经 `import()` 加载时共享名解析到宿主同一实例（避免双 React）。`.system.js` 旧入口仍被兼容（`packages/extension-host` 保留 SystemJS 分支）。
- Source 列表来自静态配置或后端。
- 完整的「无宿主源码」开发/调试/打包流程见 [extension-development-guide.md](./extension-development-guide.md)；生产构建统一使用官方工具 `nop-extension-dev build`（`packages/extension-dev`）。

### 7.4 Extension Manifest（`extension.json`）

每个 extension 的构建产物根目录包含一个 `extension.json` 清单文件，供服务端发现和加载扩展。

#### 7.4.1 清单格式

```json
{
  "id": "example-extension-demo",
  "name": "Harbor Operations Suite",
  "version": "0.0.1",
  "entry": "./assets/index-COw24fxy.js",
  "styleAssets": ["./assets/index-3Z9nCm1K.css"]
}
```

| 字段         | 类型       | 必填 | 说明                                   |
| ------------ | ---------- | ---- | -------------------------------------- |
| `id`         | `string`   | 是   | Extension 唯一标识                     |
| `name`       | `string`   | 是   | 显示名称                               |
| `version`    | `string`   | 否   | 语义版本                               |
| `description`| `string`   | 否   | 描述                                   |
| `entry`      | `string`   | 是   | 相对于 extension 根目录的 JS 入口路径  |
| `styleAssets`| `string[]` | 否   | 相对于 extension 根目录的 CSS 文件路径 |

类型定义：`ExtensionManifest`（`packages/shared/src/types/extension.ts`）

#### 7.4.2 部署目录结构

Java 后端部署产物（`META-INF/resources/`）：

```
META-INF/resources/
  index.html                                    ← 宿主 HTML（含 <!--NOP_EXTENSIONS_INJECT--> 占位符）
  assets/                                       ← 宿主资源
  extensions/                                    ← 扩展根（复数，与 URL base path 对齐）
    {extension-name}/
      extension.json                            ← 扩展清单（ExtensionManifest）
      assets/                                   ← 扩展资源（Vite 产物）
        index-COw24fxy.js                       ← entry
        index-3Z9nCm1K.css                      ← styleAsset
```

Java 端扫描根路径 = `nop.web.index-extensions-dir`（缺省 `/extensions`，VFS 绝对路径），URL 根路径 = `nop.web.index-extensions-base-path`（缺省 `/extensions`）。扩展子目录名必须与 `extension.json.id` 一致。

静态资源部署在 `META-INF/resources/extensions/{id}/`。Spring/Quarkus 默认把 `classpath:/META-INF/resources/**` 暴露为 `/`，因此 HTTP `/extensions/{id}/...` 自动路由到 `META-INF/resources/extensions/{id}/...`，无需额外 `addResourceHandlers` 配置。

`IndexHtmlProvider` 检索 `extension.json` 的优先级（`getExtensionResource()`）：

1. **VFS**（`VirtualFileSystem.getResource(path, true)`）—— 允许通过 Delta 定制机制在 `_vfs/` 下覆盖扩展资源
2. **classpath 静态资源**（`classpath:META-INF/resources/{path}`）—— VFS 中不存在时，直接读取生产部署在 `META-INF/resources/extensions/{id}/` 的清单
3. **classpath 根**（`classpath:{path}`）—— 允许其它约定位置

`extension.json` 内的路径字段（`entry` / `styleAssets` / `assets`）使用**相对 `extension.json` 自身**的相对路径，如 `./assets/index.js`。Java `IndexHtmlProvider` 拼接 URL 时去除 `./` 前缀（`normalizePath`），把 Vite build 产物（`dist/extension.json` + `dist/assets/...`）直接复制到 `META-INF/resources/extensions/{id}/` 即可由前端通过 `/extensions/{id}/...` URL 访问，无需任何路径重写。

#### 7.4.3 服务端集成合同（Java / `IndexHtmlProvider`）

Java 后端（`nop-entropy-master/nop-frontend-support/nop-web/.../IndexHtmlProvider`）通过以下步骤实现 extension 注入：

1. **扫描** `extensions/*/extension.json`（`nop.web.index-extensions-dir` 配置项控制根路径，缺省 `/extensions`；VFS 优先，classpath fallback）
2. **白名单过滤** `nop.web.index-extension-names`（逗号分隔）— 只有被列出的扩展才会被加载
3. **构建 HTML 片段**：
   - 每个启用扩展的 `styleAssets` 依次渲染为 `<link rel="stylesheet" data-nop-extension data-nop-extension-id="<id>" href="{basePath}/{id}/{styleAsset}">`
   - 每个启用扩展的 `entry` 渲染为 `<script type="module" data-nop-extension data-nop-extension-id="<id>" src="{basePath}/{id}/{entry}">`
   - `basePath` 由 `nop.web.index-extensions-base-path` 控制（缺省 `/extensions`）
4. **替换** 宿主 HTML 中的 `<!--NOP_EXTENSIONS_INJECT-->` 占位符为上述 HTML 片段
5. **静态资源映射**由后端把 `/{basePath}/{id}/{asset}` 路由到 VFS `extension/{id}/{asset}`

`data-nop-extension` 与 `data-nop-extension-id` 是前端 DOM 扫描的稳定锚点，由 Java `IndexHtmlProvider` 在注入时主动写入。前端 `apps/main/src/extensions/config.ts` 的 `getDomExtensionSources()` 通过这两个属性识别扩展并把每个扩展的 `styleAssets` 一并写入 `ExtensionSource.styleAssets`，避免 bootstrap 二次注入。

示例注入结果：

```html
<div id="root"></div>
<link rel="stylesheet" data-nop-extension data-nop-extension-id="example-extension-demo" href="/extensions/example-extension-demo/assets/index-3Z9nCm1K.css" />
<script type="module" data-nop-extension data-nop-extension-id="example-extension-demo" src="/extensions/example-extension-demo/assets/index-COw24fxy.js"></script>
```

> **当前 Java 实现状态**（截至 2026-08-28）：`IndexHtmlProvider` 已实现按 `extension.json` 扫描、按 `nop.web.index-extension-names` 白名单过滤、按顺序渲染 `<link>` / `<script type="module">` 注入占位符。`data-nop-extension` / `data-nop-extension-id` 属性的写入需要在 Java 端补一次补丁（计划在 `nop-entropy-master` 仓库单独拟 plan）；在该补丁落地前，前端 DOM 扫描虽然代码就绪，但生产环境实际不会匹配到任何 `<script>` 标签。Prototype 模式下不受影响：`vite-plugin-prototype-server` 仍然注入 `window.__NOP_EXTENSIONS__` 数组，前端 `getWindowExtensionSources()` 仍按原契约工作。

#### 7.4.4 宿主发现优先级

宿主通过 `apps/main/src/extensions/config.ts` 中的 `getExtensionSources()` 发现扩展，按以下顺序回退：

1. **最高优先级**：`window.__NOP_EXTENSIONS__`（prototype / 自定义 dev server 注入）— 支持多扩展数组；通过 `vite-plugin-prototype-server` 的 `transformIndexHtml` 写入
2. **次优先级**：DOM 扫描 `<script type="module" data-nop-extension>`（Java `IndexHtmlProvider` 生产契约）— 每个扩展的 `styleAssets` 通过同 id 的 `<link rel="stylesheet" data-nop-extension>` 标签收集
3. **回退一**：环境变量 `VITE_DEMO_EXTENSION_ENTRY`（运行时入口路径）
4. **回退二**：开发 alias `VITE_DEMO_EXTENSION_ALIAS_PATH`（构建时 alias 路径；走 `load: () => import('@demo-extension')`）
5. **最终回退**：`VITE_ENABLE_DEMO_EXTENSION=true`（内置 demo 扩展）

两条契约并存关系：

- **prototype / 独立 dev server**（`vite-plugin-prototype-server` 或自研 dev 工具）：注入 `window.__NOP_EXTENSIONS__` 数组；前端走优先级 1；适用于无 Java 后端的开发联调
- **生产部署**（Java 后端打包扩展产物到 `META-INF/resources/extensions/`，复数与 URL base path `/extensions` 对齐）：`IndexHtmlProvider` 扫描 `extension.json` 后渲染 `<script type="module" data-nop-extension>`；前端走优先级 2；适用于多扩展静态产物集成

`window.__NOP_EXTENSIONS__` 与 DOM 扫描的 source 都包含 `styleAssets` 字段（前者恒为 undefined，后者由 DOM 收集），bootstrap 据此判断是否需要重复注入 CSS。两条契约共同走同一条 `bootstrapExtensions()` 流水线，扩展的 `ShellExtension` 字段（languages / themes / builtinPages / auth / plugins / userMenuItems / i18n 等）合并语义一致。

> 详细实现：apps/main/src/extensions/config.ts 中 `getWindowExtensionSources()` 与 `getDomExtensionSources()`，合并由 `getExtensionSources()` 完成。

#### 7.4.5 清单生成与构建 pipeline

每个扩展的 Vite 构建自动生成 `extension.json`。`examples/extension-demo/vite.config.ts` 是参考实现，包含两个关键配置：

1. **Production build 用 library mode**，以 `src/index.ts` 为唯一入口（不是 `index.html`）。`pnpm build` 走 production config；`pnpm dev` / `pnpm preview` 走 dev config（HTML + standalone preview）：

```ts
export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return devConfig; // SPA + HTML 入口走 src/standalone/main.tsx
  }
  return productionConfig; // library mode + src/index.ts 入口
});
```

   关键：`build.rollupOptions.input = 'src/index.ts'`，`format: 'es'`，`entryFileNames: 'assets/index.js'`。这样打包产物是 ESM library (`export default extension`)，而不是 standalone React 页面。

2. **`extensionManifestPlugin` 在 entry transform 中扫描 `new URL('./xxx', import.meta.url)` 字面量**，在 `closeBundle` 中把对应资源复制到 `dist/assets/`，并在 `writeBundle` 中写 `extension.json`：

```ts
extensionManifestPlugin({
  id: 'example-extension-demo',
  name: 'Harbor Operations Suite',
  version: '0.0.1',
})
```

构建后自动在 `dist/` 目录下生成包含正确哈希文件名的 `extension.json`：

```json
{
  "id": "example-extension-demo",
  "name": "Harbor Operations Suite",
  "version": "0.0.1",
  "entry": "./assets/index.js",
  "styleAssets": ["./assets/harbor-xxx.css", "./assets/shell-xxx.css", "./assets/component-page-xxx.css"],
  "assets": ["./assets/harbor-mark-xxx.svg"]
}
```

字段语义：

- `entry`：相对 `extension.json` 的 ESM 入口路径，模块必须 `export default extension`（或 `export const extension` / `getExtension()`）。
- `styleAssets`：相对路径 CSS 资源，由 Java `IndexHtmlProvider` 注入 `<link rel="stylesheet">`。
- `assets`：相对路径非 CSS 静态资源（SVG / 字体 / JSON 等）。这些由 `ShellExtension` 字段（`branding.logoUrl`、`themes[].cssHref`、`styles[].href`、`i18n.baseUrl` 等）通过 `new URL('./xxx', import.meta.url)` 引用；host 前端运行时把它们与 `data-nop-extension-id` 拼接后形成完整 URL。

类型定义：`ExtensionManifest`（`packages/shared/src/types/extension.ts`）。

Java `IndexHtmlProvider` 当前 `appendExtensionHtml()` 实现（截至 2026-08-27，commit `ff641f7dee`）已包含：

- 按 `nop.web.index-extension-names` 白名单过滤
- 把 `styleAssets` 渲染为 `<link rel="stylesheet" href="...">`
- 把 `entry` 渲染为 `<script type="module" src="...">`
- 按 `nop.web.index-extensions-base-path` + `id` + `path` 拼接完整 URL

`data-nop-extension` 属性（用于前端 DOM 扫描锚点）的写入需在 Java 端补一次补丁（计划在 `nop-entropy-master` 仓库单独拟 plan）。一旦该补丁落地，生产部署链路上 Java 端会写入锚点属性，前端 DOM 扫描（见 §7.4.4）即可识别由 Java 注入的扩展资源。

回归测试：`examples/extension-demo/src/build.test.ts` 跑一次完整 `pnpm build`，断言 `dist/extension.json` schema 与 `dist/assets/` 中每个 per-extension 资源的存在。

---

## 8. 错误处理

### 8.1 加载失败

- 单个 extension 加载失败不阻塞宿主启动
- 记录清晰错误日志
- 失败项不参与后续合并
- `loadExtensions()` 对 `load` / `resolve` / `setup` 三个阶段都施加 `10_000ms` timeout；挂死或永不 resolve 的 source 会被记录为失败并跳过，而不会无限阻塞宿主启动

### 8.2 冲突处理

对关键主键冲突（theme id、menu path、plugin id）打出告警日志。

### 8.3 Contract Guard

- `ShellExtension` 不再以“非空 `id`”作为唯一通过条件。
- 当前 runtime guard 还会校验 `setup` 必须是函数、`supportedLanguages` 条目必须具备合法 `code` 与 `labelKey`、`themes` 条目必须具备合法 `id` / `labelKey`，以及可选 `descriptionKey` / `cssHref` 的类型正确。
- 不满足这些最小 public contract 的扩展会被按加载失败处理，并输出带 source id 的错误信息。

---

## 9. 相关文件

| 文件                                         | 用途           |
| -------------------------------------------- | -------------- |
| `packages/shared/src/types/extension.ts`     | 类型定义       |
| `packages/shared/src/version.ts`             | HOST_API_VERSION 契约 |
| `packages/shared/src/plugins/sharedModuleNames.ts` | 共享模块名单（单一来源） |
| `apps/main/src/extensions/config.ts`         | 扩展发现逻辑   |
| `packages/extension-host/src/loadExtensions.ts` | 加载逻辑（SystemJS/ESM 入口） |
| `apps/main/src/extensions/bootstrap.ts`      | 启动引导       |
| `packages/extension-host/src/runtime.ts`     | 运行时配置     |
| `packages/extension-dev`                     | 官方开发工具（构建/代理/静态服务/注入/userscript） |
| `examples/extension-demo`                    | 示例 extension（SystemJS 构建） |
| `scripts/sync-extension-demo.sh`             | 扩展产物同步脚本 |
| `docs/design/extension-development-guide.md` | 无宿源码开发指南 |
