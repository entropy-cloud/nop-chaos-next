# Shell Contribution ESM 加载设计

> 本文档定义宿主应用通过 `loadContributions()` 加载外部业务贡献包的设计方案。目标是让业务代码可以保存在独立项目中，并通过 ESM 包或 ESM 入口文件向宿主注册主题、i18n、运行时配置、插件清单等扩展能力，同时保持本地联调体验简单可用。

---

## 1. 设计目标

当前框架已经具备两类扩展能力：

- 页面级扩展：通过 `pageType: 'plugin'` + `SystemJS` 动态加载业务页面
- 宿主级扩展：主题、语言、i18n 资源、插件元数据、菜单、品牌配置等

其中页面级扩展已经具备较成熟的机制，但宿主级扩展仍主要写死在 `apps/main` 内部，例如：

- `apps/main/src/config/themeRegistry.ts`
- `apps/main/src/config/i18n/languages.ts`
- `apps/main/src/config/i18n/index.ts`

因此需要补充一层“Contribution 贡献包”机制，让业务项目可以：

- 在独立仓库维护业务配置与宿主增强能力
- 通过 ESM 方式被宿主加载
- 注册额外 theme、language、i18n resources、plugin manifests、menus、branding 等
- 在开发态方便联调，不要求每次都重新发版宿主

本设计默认不考虑运行时卸载 contribution，因此可以优先采用 ESM 模式，而不是为 contribution 单独引入一套可卸载的模块沙箱。

---

## 2. 为什么 Contribution 采用 ESM

### 2.1 结论

`loadContributions()` 可以并且建议优先加载 ESM 格式的包或入口文件。

### 2.2 原因

- contribution 的职责是“注册宿主能力”，不是“挂载页面组件实例”
- contribution 通常只在应用启动阶段加载一次
- 当前场景不要求运行时卸载或回滚单个 contribution
- ESM 天然适合表达静态依赖、初始化逻辑和一次性注册行为
- Vite 对开发态和构建态的 ESM 支持都比较直接，联调成本低

### 2.3 与插件页面的区别

不要把 contribution 和 plugin page 混为一层：

- `plugin page`：面向页面渲染，仍建议使用 `SystemJS` 远程模块机制
- `contribution`：面向宿主配置注入，建议使用 `ESM` 加载

两者可以由同一个业务仓库同时提供，但运行职责不同：

- contribution 决定“宿主知道有哪些主题、语言、插件、菜单、品牌配置”
- plugin page 决定“某个菜单页面具体渲染什么业务界面”

---

## 3. 适用场景

适合放入 contribution 的内容：

- 应用品牌配置：标题、logo、默认首页、页脚信息
- 主题注册：theme 元数据与对应样式资源
- 语言注册：支持的语言列表
- i18n 资源注册：额外翻译文案
- 插件清单：插件地址、启用状态、默认 settings
- 菜单扩展：增加业务菜单、配置 `pageType`
- 业务运行时配置：接口前缀、功能开关、默认参数

不适合放入 contribution 的内容：

- 需要频繁重建 UI 状态的页面组件树
- 强依赖宿主内部实现细节的逻辑
- 希望运行时独立卸载/替换的能力

---

## 4. 总体模型

建议引入以下概念：

### 4.1 ShellContribution

业务项目向宿主暴露一个或多个 contribution 对象。

```ts
import type { MenuItem, PluginManifest } from '@nop-chaos/shared'

export interface ShellContribution {
  id: string
  order?: number
  app?: {
    name?: string
    shortName?: string
    logoUrl?: string
    defaultHomePath?: string
    defaultLanguage?: string
  }
  env?: Record<string, string>
  languages?: ContributionLanguage[]
  i18nResources?: ContributionI18nResource[]
  themes?: ContributionTheme[]
  plugins?: PluginManifest[]
  menus?: MenuItem[]
  setup?: (context: ContributionSetupContext) => void | Promise<void>
}

export interface ContributionLanguage {
  code: string
  labelKey: string
}

export interface ContributionI18nResource {
  lng: string
  ns?: string
  resource: Record<string, unknown>
}

export interface ContributionTheme {
  id: string
  labelKey: string
  descriptionKey?: string
  cssHref?: string
}
```

### 4.2 ContributionSource

宿主侧维护一组 contribution 来源配置：

```ts
export interface ContributionSource {
  id: string
  entry: string
  enabled?: boolean
}
```

其中 `entry` 指向一个 ESM 入口：

- 本地开发地址：`http://127.0.0.1:4180/src/contribution.ts`
- 构建产物地址：`https://cdn.example.com/biz-shell/contribution.js`
- 同仓 workspace 包：`@your-org/biz-contribution`

---

## 5. `loadContributions()` 加载方式

### 5.1 设计原则

- 仅在宿主启动阶段执行一次
- 采用原生动态 `import()` 加载 ESM 模块
- 加载完成后做规范化、校验、合并、注册
- 不提供运行时卸载 API
- 如单个 contribution 加载失败，不应阻塞整个宿主启动；应记录错误并降级

### 5.2 建议接口

```ts
export interface LoadContributionsOptions {
  sources: ContributionSource[]
  context: ContributionSetupContext
}

export interface LoadedContribution {
  source: ContributionSource
  contribution: ShellContribution
}

export async function loadContributions(
  options: LoadContributionsOptions
): Promise<LoadedContribution[]>
```

### 5.3 建议实现

```ts
export async function loadContributions({
  sources,
  context
}: LoadContributionsOptions): Promise<LoadedContribution[]> {
  const loaded: LoadedContribution[] = []

  for (const source of sources.filter((item) => item.enabled !== false)) {
    try {
      const mod = await import(/* @vite-ignore */ source.entry)
      const raw = mod.default ?? mod.contribution ?? mod.getContribution?.()
      const contribution = normalizeContribution(raw, source)

      await contribution.setup?.(context)
      loaded.push({ source, contribution })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown contribution load error'
      context.logger.error(`Failed to load contribution '${source.id}': ${message}`)
    }
  }

  return loaded.sort((a, b) => (a.contribution.order ?? 0) - (b.contribution.order ?? 0))
}
```

### 5.4 导出约定

贡献包建议支持以下任一导出约定：

- 默认导出 `export default contribution`
- 命名导出 `export const contribution = ...`
- 工厂导出 `export function getContribution() { ... }`

推荐优先使用默认导出，最简单直接。

---

## 6. Contribution 的 ESM 形态

### 6.1 同仓 workspace 包

适用于 monorepo 内部扩展：

```ts
import bizContribution from '@your-org/biz-contribution'
```

此模式适合：

- 同一仓库开发
- 类型复用要求高
- 发布边界不强

### 6.2 跨仓远程 ESM 入口

适用于独立业务仓库：

```ts
await import('http://127.0.0.1:4180/src/contribution.ts')
await import('https://cdn.example.com/biz/contribution.js')
```

此模式适合：

- 宿主与业务分仓维护
- 本地联调需要热更新
- 生产部署由业务方独立发包

### 6.3 构建建议

contribution 构建产物建议保留为 ESM：

- `format: 'es'`
- 尽量输出稳定文件名，如 `contribution.js`
- 避免把过多宿主运行时依赖耦合进去

contribution 一般不需要 `System.register(...)` 输出。

---

## 7. 宿主侧注册流程

建议宿主在 `main.tsx` 或 `App` 启动前增加如下流程：

1. 读取 contribution source 列表
2. 调用 `loadContributions()`
3. 合并并注册语言列表
4. 注册 i18n resources
5. 注入主题注册表与主题 CSS
6. 合并插件 manifests
7. 合并菜单配置
8. 最后再渲染应用

伪代码如下：

```ts
async function bootstrap() {
  const sources = await resolveContributionSources()
  const loaded = await loadContributions({
    sources,
    context: createContributionSetupContext()
  })

  registerContributionLanguages(loaded)
  registerContributionI18nResources(loaded)
  await registerContributionThemes(loaded)
  registerContributionPlugins(loaded)
  registerContributionMenus(loaded)

  renderApp()
}

void bootstrap()
```

---

## 8. 主题扩展设计

当前主题注册表为静态数组，后续建议改为可注册模型：

```ts
export interface ThemeDefinition {
  id: string
  labelKey: string
  descriptionKey?: string
}

export function registerThemes(themes: ThemeDefinition[]): void
export function getThemeRegistry(): ThemeDefinition[]
```

contribution 中的 theme 可以这样声明：

```ts
const contribution = {
  id: 'biz-shell',
  themes: [
    {
      id: 'enterprise',
      labelKey: 'theme.enterprise',
      descriptionKey: 'theme.enterpriseDescription',
      cssHref: 'http://127.0.0.1:4180/themes/enterprise.css'
    }
  ]
}
```

对应 CSS 只要提供 token：

```css
:root[data-theme='enterprise'][data-mode='light'] {
  --primary: 211 100% 45%;
}

:root[data-theme='enterprise'][data-mode='dark'] {
  --primary: 211 100% 62%;
}
```

由于不考虑卸载，主题 CSS 被注入后可长期保留，无需做回收。

---

## 9. i18n 扩展设计

当前语言列表和资源加载路径是固定配置，后续建议拆成两层：

- 基础语言清单：宿主默认提供
- contribution 扩展语言与资源：启动时合并注册

建议约定：

- contribution 可以注册新的语言选项
- contribution 可以直接内嵌资源对象
- 也可以在 `setup()` 中自行调用 `i18n.addResourceBundle()`

例如：

```ts
const contribution = {
  id: 'biz-shell',
  languages: [
    { code: 'zh-CN', labelKey: 'settings.languageOptions.zhCN' },
    { code: 'en', labelKey: 'settings.languageOptions.en' },
    { code: 'ja-JP', labelKey: 'settings.languageOptions.jaJP' }
  ],
  i18nResources: [
    {
      lng: 'zh-CN',
      resource: {
        biz: {
          title: '业务驾驶舱'
        }
      }
    }
  ]
}
```

如果业务希望把翻译文件拆分管理，也可以在 contribution 的 `setup()` 中懒加载 JSON 后再注入。

---

## 10. 插件与菜单协同

contribution 负责把业务插件“声明给宿主”，典型方式是同时输出：

- `plugins`: 告诉宿主有哪些插件入口
- `menus`: 告诉宿主菜单如何指向这些插件

例如：

```ts
const contribution = {
  id: 'biz-shell',
  plugins: [
    {
      id: 'sales-report',
      name: 'Sales Report',
      enabled: true,
      entry: 'http://127.0.0.1:4174/sales-report.system.js',
      settings: {
        reportTitle: '销售驾驶舱'
      }
    }
  ],
  menus: [
    {
      id: 'sales-report',
      path: '/sales/report',
      title: '销售驾驶舱',
      pageType: 'plugin',
      componentId: 'sales-report',
      pluginUrl: 'http://127.0.0.1:4174/sales-report.system.js'
    }
  ]
}
```

这样 contribution 与 plugin page 的关系就很清晰：

- contribution 负责声明入口和配置
- plugin page 负责实际渲染

---

## 11. 样式与 Tailwind 4 设计

### 11.1 问题背景

当前宿主样式体系有几个关键特征：

- 宿主入口 `apps/main/src/styles/index.css` 先引入 `@nop-chaos/ui/styles.css`
- `@nop-chaos/ui/styles.css` 当前实际导出 `packages/ui/src/styles/tailwind.css`
- `packages/ui/src/styles/tailwind.css` 内部直接 `@import "tailwindcss"`
- 当前 Tailwind 扫描范围主要覆盖宿主仓库内源码

这意味着一旦业务系统拆到独立仓库，就会遇到两个问题：

- 宿主构建时扫描不到业务仓库源码，因此不会为业务新增类名生成 CSS
- 当前 `@nop-chaos/ui/styles.css` 带有 monorepo 内部相对 `@config` 路径，不适合作为跨仓稳定发布能力

因此，独立业务系统不能只依赖宿主已经打包好的 Tailwind CSS，还必须拥有自己的 Tailwind 编译过程；但它不应该重复维护一整套主题和基础样式。

### 11.2 设计结论

推荐把样式能力拆成三层：

- 主题令牌层：提供 CSS variables，例如 `--primary`、`--border`、`--card-surface`
- 共享基础样式层：提供基础 reset、公共语义类、UI 共享样式，例如 `.theme-card`
- 业务增量样式层：由业务项目自己扫描源码并编译出新增 Tailwind utilities 与业务组件样式

也就是说：

- 宿主复用和输出的是“token + 基础样式 + Tailwind preset”
- 业务项目复用这些规则，再单独编译自己的增量 CSS

### 11.3 为什么不能只吃宿主 CSS

Tailwind 4 仍然是“按源码扫描并生成 CSS”的模式。

如果业务仓库新增了：

```tsx
<div className='grid grid-cols-[1.2fr_0.8fr] gap-6 rounded-2xl bg-background/80 p-6' />
```

但宿主构建时没有扫描到这段源码，那么宿主已有 CSS 中就不会包含这些类。也就是说：

- 宿主 CSS 可以复用旧类
- 业务新类必须由业务自己编译出来

因此“不重新编译业务 CSS，只依赖宿主 Tailwind 产物”不适合作为正式方案。

### 11.4 推荐的样式包拆分

建议把当前样式体系逐步拆成以下能力：

#### A. `@nop-chaos/theme-tokens`

职责：

- 提供宿主支持的主题 token
- 只包含 CSS variables，不包含业务页面具体布局样式
- 支持 contribution 额外注册主题 CSS

典型内容：

```css
:root[data-theme='classic'][data-mode='light'] {
  --primary: 217 89% 53%;
  --border: 214 32% 91%;
}

:root[data-theme='classic'][data-mode='dark'] {
  --primary: 217 89% 63%;
  --border: 217 33% 18%;
}
```

#### B. `@nop-chaos/ui/base.css`

职责：

- 提供公共 reset、基础层和语义类
- 提供跨宿主/插件都能复用的公共样式约定
- 不再依赖 monorepo 私有相对 `@config` 路径

典型内容：

- `html`、`body` 基础排版
- `.theme-card`
- 少量稳定公共 utility
- 组件库依赖的基础层规则

#### C. `@nop-chaos/tailwind-preset`

职责：

- 提供共享 Tailwind theme 扩展
- 把颜色、圆角、阴影、字体、动画等统一映射到 token
- 供宿主和业务仓库共同复用

例如：

```ts
import type { Config } from 'tailwindcss'

export const nopTailwindPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        }
      }
    }
  }
}
```

### 11.5 宿主与业务的职责边界

宿主负责：

- 加载 `theme-tokens`
- 加载 `@nop-chaos/ui/base.css`
- 注册 contribution 带来的额外 theme CSS
- 提供统一主题上下文和 CSS variables

业务项目负责：

- 使用共享 `tailwind-preset`
- 扫描自己仓库的 `src/**/*.{ts,tsx}`
- 编译自己的增量 Tailwind CSS
- 管理自己的业务组件样式和 `@layer components`

最终效果是：

- 视觉 token 统一
- 共享语义样式统一
- 业务新增类名各自编译
- 业务页面自动跟随宿主主题变化

### 11.6 业务仓库推荐写法

业务仓库保留独立 `tailwind.config.ts`，但通过 preset 复用宿主规则：

```ts
import type { Config } from 'tailwindcss'
import { nopTailwindPreset } from '@nop-chaos/tailwind-preset'

const config: Config = {
  presets: [nopTailwindPreset],
  content: ['./src/**/*.{ts,tsx}']
}

export default config
```

业务样式入口建议类似：

```css
@import 'tailwindcss';
@config './tailwind.config.ts';

@import '@nop-chaos/ui/base.css';

@layer components {
  .biz-kpi-panel {
    @apply rounded-xl border bg-background/70 p-4 shadow-sm;
  }
}
```

这个入口包含三类内容：

- 业务项目需要的新 Tailwind utilities
- 共享基础样式
- 业务自定义组件层样式

### 11.7 独立调试与宿主运行的差异

业务项目在宿主内运行时，会直接使用宿主已经注入的主题 token。

但业务项目单独开发时，如果没有这些 token，以下类会失去意义或表现异常：

- `bg-background`
- `text-foreground`
- `border-border`
- `text-primary`

因此建议业务项目提供一个本地 preview 壳：

- 在独立调试模式下，引入默认 theme token CSS
- 提供最小路由、i18n、bridge mock
- 挂载业务页面做开发预览

这样可以保证：

- 单独开发时，业务页面可运行
- 宿主联调时，业务页面自动跟随真实主题与上下文

### 11.8 运行时加载建议

建议区分两种样式加载模式：

#### 开发态 / 独立预览

- 业务项目可自行引入 `theme-tokens` 与 `@nop-chaos/ui/base.css`
- 业务项目再额外加载自己的 `biz.css`

#### 宿主联调 / 生产态

- 宿主统一加载 `theme-tokens` 与 `@nop-chaos/ui/base.css`
- 业务插件只加载自己的增量 CSS

这样做的好处是：

- 独立调试时不依赖宿主存在
- 宿主运行时避免重复注入整份共享样式

### 11.9 与 contribution 的关系

contribution 不负责为业务页面动态生成 Tailwind CSS，它负责的是“声明和注册样式资源”：

- 注册额外 theme 元数据
- 声明额外 theme CSS 地址
- 可选声明业务 CSS 入口地址

但真正的业务 utility 生成仍由业务项目自己的构建完成。

建议 contribution 在样式层只承担“资源声明”职责，而不是“编译职责”。

### 11.10 单示例的 Tailwind 共享方式

当前仓库中的 `examples/contribution-demo` 已经展示了 contribution 页面如何共享和使用 Tailwind：

- 页面组件位于 `examples/contribution-demo/src/pages/ContributionBuiltinPage.tsx`
- 页面样式入口位于 `examples/contribution-demo/src/component-page.css`
- contribution 自己维护 `examples/contribution-demo/tailwind.config.ts`

这个示例的关键点是：

1. 页面组件使用普通 Tailwind 类，如 `bg-background`、`border-border`、`shadow-sm`
2. contribution 自己编译 `component-page.css`
3. `component-page.css` 复用宿主共享基础设施：
   - `@nop-chaos/tailwind-preset`
   - `@nop-chaos/ui/base.css`
   - `@nop-chaos/theme-tokens/styles.css`
4. 宿主只负责注入这份 CSS，并注册 builtin component

示例入口：

```css
@import 'tailwindcss';
@config '../tailwind.config.ts';

@import '@nop-chaos/ui/base.css';
@import '@nop-chaos/theme-tokens/styles.css';
```

因此这个示例清楚展示了：

- 宿主不替 contribution 动态生成 Tailwind utilities
- contribution 需要自己编译增量 CSS
- 但它可以和宿主共享完全一致的 token、base css 和 Tailwind preset

### 11.11 当前仓库的落地改造建议

结合当前仓库结构，建议按“先拆公共样式能力，再接 contribution”推进。

#### 第一步：拆分主题 token

当前 `apps/main/src/styles/index.css` 同时承担了两类职责：

- 主题 token 定义
- 宿主页面特有样式

建议拆成两部分：

- `packages/theme-tokens/src/themes.css`
  - 仅保留 `:root[data-theme='...'][data-mode='...']` 变量定义
  - 后续也可以按主题拆为多个文件，例如 `classic.css`、`glass.css`
- `apps/main/src/styles/index.css`
  - 只保留宿主页面布局、blob 背景、滚动条、flow editor 样式等 app-specific 规则
  - 通过 `@import '@nop-chaos/theme-tokens/styles.css'` 引入公共 token

这样做之后：

- 宿主和业务预览壳都能共享同一套主题变量
- 新增主题时可以通过 contribution 注入独立 CSS 文件

#### 第二步：拆分 UI 基础样式

当前 `packages/ui/src/styles/tailwind.css` 同时承担了三类职责：

- Tailwind 入口
- base layer
- 公共语义类

建议拆成：

- `packages/ui/src/styles/base.css`
  - 放基础 reset、`@layer base`、`.theme-card` 等共享语义样式
- `packages/ui/src/styles/tailwind.css`
  - 作为 monorepo 内部开发入口，保留 `@import 'tailwindcss'`
- `@nop-chaos/ui/base.css`
  - 对外导出不依赖私有路径的稳定基础样式文件
- `@nop-chaos/ui/styles.css`
  - 对内保留当前 monorepo 兼容入口

目标是让跨仓业务项目可以安全地：

- 直接 import UI 基础样式
- 不依赖当前仓库的相对 `@config` 路径

#### 第三步：抽出共享 Tailwind preset

当前 `tailwind.config.ts` 里的核心共享能力建议抽到独立包，例如：

- `packages/tailwind-preset/src/index.ts`

建议迁移的内容包括：

- token 映射颜色
- 圆角映射
- 阴影映射
- 字体栈
- 动画和 keyframes
- 通用插件，例如 `tailwindcss-animate`

宿主改为：

```ts
import type { Config } from 'tailwindcss'
import { nopTailwindPreset } from '@nop-chaos/tailwind-preset'

const config: Config = {
  presets: [nopTailwindPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}']
}

export default config
```

业务项目也使用相同 preset，只替换 `content` 扫描路径。

#### 第四步：为业务 CSS 增加显式入口

建议每个独立业务插件或业务前端都输出自己的一份样式文件，例如：

- `biz-plugin.css`
- `biz-shell.css`

其内容包括：

- 业务页面新增 utility 对应的 Tailwind 编译结果
- 业务组件层 `@layer components`
- 业务自定义动画或少量覆盖样式

推荐不要把宿主 token 和共享 UI base 再次完全打进这份文件里，避免生产态重复注入。

#### 第五步：由 contribution 声明样式资源

当业务仓库既有贡献包又有插件页面时，建议 contribution 增加样式声明字段，例如：

```ts
export interface ContributionStyleAsset {
  id: string
  href: string
  scope?: 'shell' | 'plugin'
}

export interface ShellContribution {
  id: string
  styles?: ContributionStyleAsset[]
}
```

使用建议：

- `shell`：面向宿主全局能力，例如新增 theme CSS
- `plugin`：面向业务插件页面自身的增量 CSS

宿主加载 contribution 后，可统一注入这些资源，但注入行为本身不参与 Tailwind 编译。

### 11.12 最小可行改造路径

如果希望尽快落地，而不是一次性大改，可以按以下最小路径推进：

1. 保持当前宿主现状不大动
2. 先把 `tailwind.config.ts` 抽成共享 preset
3. 让独立业务仓库使用这个 preset 编译自己的 CSS
4. 让业务仓库在独立预览时手动引入一份宿主 token CSS
5. 后续再把 `apps/main/src/styles/index.css` 中的主题变量正式抽到公共包

这样能先解决“外部业务仓库怎么写样式”的核心问题，再逐步收敛宿主样式结构。

### 11.13 推荐目录形态

落地后，样式相关目录建议接近下面结构：

```text
packages/
  theme-tokens/
    src/
      styles.css
  tailwind-preset/
    src/
      index.ts
  ui/
    src/
      styles/
        base.css
        index.css
        tailwind.css
apps/
  main/
    src/
      styles/
        index.css
```

业务仓库则建议：

```text
src/
  styles/
    index.css
    preview.css
  contribution.ts
  index.tsx
tailwind.config.ts
```

其中：

- `index.css` 用于宿主运行时的业务增量样式
- `preview.css` 用于独立开发时补齐 token/base 依赖

---

## 12. 调试模式设计

### 12.1 同仓开发

- contribution 作为 workspace 包直接被宿主 import
- 修改后通过宿主 dev server 热更新

### 12.2 跨仓联调

- 业务仓库启动 Vite dev server，例如 `4180`
- 宿主配置 contribution source 指向 `http://127.0.0.1:4180/src/contribution.ts`
- 插件页面入口仍指向业务仓库输出的 `system.js`

推荐把联调拆成两个地址：

- contribution ESM 入口：`4180`
- plugin page SystemJS 入口：`4174` 或同一个业务 dev server 的构建输出地址

### 12.3 生产部署

- contribution 构建为稳定 ESM 文件，例如 `contribution.js`
- 插件页面仍构建为 `*.system.js`
- 宿主从配置中心或静态配置读取 contribution source 列表

---

## 13. 错误处理与边界

### 13.1 加载失败

单个 contribution 加载失败时：

- 记录错误日志
- toast 或控制台提示可选
- 不阻塞宿主基础能力启动
- 失败的 contribution 不参与后续合并

### 13.2 冲突处理

可能冲突的字段：

- 主题 id
- 语言 code
- 菜单 path
- 插件 id
- 文案 key

建议策略：

- 默认按 `order` + source 顺序合并
- 对关键主键冲突打印明确警告
- 对显式可覆盖项允许后者覆盖前者
- 对不可覆盖项直接报错并跳过该条

### 13.3 安全边界

由于 ESM contribution 会执行初始化逻辑，因此必须明确其信任边界：

- 仅允许加载受信任来源
- 生产环境建议固定白名单域名
- 入口 URL 建议来自静态配置或后端下发配置
- 不建议让普通用户可编辑 contribution 地址

---

## 14. 推荐实施顺序

建议按以下阶段推进：

### Phase 1：定义数据结构与加载器

- 新增 `ShellContribution` 与 `ContributionSource` 类型
- 实现 `loadContributions()`，支持 ESM 动态导入
- 增加基础校验与错误处理

### Phase 2：改造宿主静态配置为注册式

- 把 theme registry 改为 `registerThemes()` 模型
- 把 language options 改为 `registerLanguages()` 模型
- 把 i18n resource 注入改为可扩展模型

### Phase 2.5：拆分样式基础设施

- 把 `tailwind.config.ts` 抽成共享 preset
- 把主题 token 从宿主 app 样式中拆出
- 把 UI 基础样式从 monorepo 专用入口中拆出
- 明确宿主共享样式与业务增量样式的边界

### Phase 3：接入 plugin/menu 协同

- 支持 contribution 注册插件 manifest
- 支持 contribution 合并菜单
- 明确冲突处理策略

### Phase 4：补齐联调与部署规范

- 支持从配置文件读取 contribution sources
- 提供跨仓联调样例
- 提供生产构建样例

---

## 15. 最终建议

本项目后续推荐采用“双轨扩展模型”：

- 页面渲染扩展继续使用 `SystemJS plugin`
- 宿主配置扩展新增 `ESM contribution`

原因是：

- 页面插件更适合远程组件挂载和共享模块协议
- contribution 更适合一次性初始化和注册行为
- 当前不考虑卸载，ESM 足够简单、直接、易调试

因此，`loadContributions()` 完全可以以 ESM 为主设计，不需要为了 contribution 额外引入可卸载模块机制。

---

## 16. 参考文件

- `docs/08-plugin-dev-guide.md`
- `apps/main/src/router/RouteRenderer.tsx`
- `apps/main/src/plugins/sharedModules.ts`
- `apps/main/src/config/themeRegistry.ts`
- `apps/main/src/config/i18n/languages.ts`
- `apps/main/src/config/i18n/index.ts`
- `apps/main/src/styles/index.css`
- `packages/ui/src/styles/base.css`
- `packages/ui/src/styles/tailwind.css`
- `tailwind.config.ts`
- `packages/plugin-bridge/src/index.ts`
