# Icon 命名与渲染约定

> 本文档整理当前仓库里 icon 的命名规范、通用渲染方式、适用范围与已知不一致点，作为菜单、低代码配置、插件清单等场景的实现依据。

---

## 1. 文档目标

当前仓库已经存在一套基于 `lucide-react` 的 icon 使用方式，但规范主要沉淀在源码类型和工具函数里，缺少一份单独的说明文档。

本文档回答以下问题：

- 是否存在“根据名称渲染 Lucide icon”的通用组件
- 当前 icon 名称是否有统一规范
- 菜单、低代码、插件等场景分别如何处理 icon
- 当前实现中有哪些已统一部分与已知不一致点

---

## 2. 当前结论

### 2.1 有通用名称渲染能力

当前仓库已经提供通用 icon 渲染能力，核心入口包括：

- `packages/core/src/utils/iconMap.tsx`
  - `iconRegistry`: 维护受支持的名称到 Lucide 组件的映射
  - `getIconByName()`: 根据名称返回 Lucide 组件
  - `renderIcon()`: 直接根据名称渲染图标
- `packages/core/src/components/LowCodeIcon.tsx`
  - `LowCodeIcon`: 面向组件层的通用封装，接收 `name` 和常规 `LucideProps`
- `packages/core/src/index.ts`
  - 已导出 `LowCodeIcon`、`getIconByName`、`renderIcon`、`resolveIcon`

因此，从“传入一个字符串名称并渲染出对应 Lucide icon”这个能力来看，仓库里已经有通用方案。

### 2.2 不是任意 Lucide 名称都能直接渲染

当前实现不是“把任意 `lucide-react` 导出名直接传进来即可”，而是：

- 先定义业务侧允许使用的 icon 名称集合
- 再通过映射表把这些名称映射到具体 Lucide 组件

也就是说，当前仓库使用的是“受控白名单”模式，而不是“自由透传 Lucide 组件名”模式。

---

## 3. 命名规范

### 3.1 规范类型

当前统一类型为 `AppIconName`，定义在：

- `packages/shared/src/types/icon.ts`

并通过 `isAppIconName()` 做运行时校验。

### 3.2 命名风格

当前 `AppIconName` 使用以下命名风格：

- 全小写
- 多单词使用 `kebab-case`
- 名称尽量贴近 Lucide 原始语义，但不要求与 Lucide 导出名完全一致

示例：

- `home`
- `bot`
- `blocks`
- `git-branch`
- `book-open-text`
- `layout-dashboard`
- `settings-2`
- `plug-zap`

不推荐直接在业务配置里使用：

- `Blocks`
- `LayoutDashboard`
- `Settings2`

这些更像是 `lucide-react` 的组件导出名，而不是当前仓库约定的业务 icon 名称。

### 3.3 当前受支持名称

截至当前版本，`AppIconName` 包含以下值：

- `badge-help`
- `blocks`
- `book-open-text`
- `bot`
- `database`
- `edit`
- `git-branch`
- `globe-2`
- `home`
- `languages`
- `layout-dashboard`
- `list`
- `palette`
- `panels-top-left`
- `plug-zap`
- `puzzle`
- `settings-2`
- `table`
- `workflow`

新增业务可配置 icon 时，应同时更新：

- `packages/shared/src/types/icon.ts`
- `packages/core/src/utils/iconMap.tsx`

---

## 4. 通用渲染链路

### 4.1 类型与校验

icon 规范先在 shared 层定义：

- `packages/shared/src/types/icon.ts`

该文件负责：

- 声明 `appIconNames`
- 导出 `AppIconName`
- 提供 `isAppIconName()` 校验函数

### 4.2 名称到组件映射

core 层负责把规范名称映射成 Lucide 组件：

- `packages/core/src/utils/iconMap.tsx`

这里的 `iconRegistry` 是当前唯一的通用映射表。

### 4.3 组件层封装

组件层有两种常用方式：

- 直接调用 `renderIcon(name, props)`
- 使用 `<LowCodeIcon name="..." />`

其中：

- `renderIcon()` 更适合已有渲染函数的场景
- `LowCodeIcon` 更适合 JSX 组件树里直接使用

### 4.4 兜底策略

当前通用实现支持 fallback，默认兜底为 `home`。

这意味着：

- 名称合法时，渲染对应图标
- 名称缺失或不合法时，渲染 fallback 图标

---

## 5. 当前各场景的处理方式

### 5.1 菜单与侧边栏

菜单链路已经接入统一规范，是当前最完整的一条链路。

相关位置：

- `packages/shared/src/types/menu.ts`
  - `MenuItem.icon?: AppIconName`
- `packages/shared/src/utils/menuConfig.ts`
  - 校验菜单配置里的 icon 是否是支持的名称
- `apps/main/src/services/menuApi.ts`
  - 旧接口返回的 `icon?: string` 会通过 `toIcon()` 规范化
- `packages/core/src/components/Sidebar.tsx`
  - 通过 `renderIcon()` 渲染菜单 icon

结论：

- 菜单配置层已经统一要求使用 `AppIconName`
- 菜单渲染层已经统一复用 `renderIcon()`

### 5.2 低代码 / 通用组件场景

当前已有 `LowCodeIcon` 作为通用组件：

- `packages/core/src/components/LowCodeIcon.tsx`

它本质上是对 `renderIcon()` 的组件化封装，适合低代码配置驱动或 JSX 模板中按名称渲染 icon。

### 5.3 插件开发场景

插件开发文档说明插件可以直接依赖：

- `lucide-react`

见：

- `docs/08-plugin-dev-guide.md`

这表示插件内部可以直接 import Lucide 图标组件来使用。但这和“宿主侧统一的业务 icon 命名规范”是两件事：

- 插件内部 UI 可以直接使用 Lucide 组件
- 宿主配置字段若希望可配置、可校验、可兜底，仍更适合走 `AppIconName`

### 5.4 插件管理页

插件管理页当前没有复用通用 icon 映射，而是本地维护了一份单独的 map：

- `apps/main/src/pages/plugins/management/index.tsx`

该页面里的 `pluginIconMap` 与 `iconRegistry` 高度相似，但并不是同一个来源。

同时，插件清单类型当前仍是：

- `packages/shared/src/types/plugin.ts`
  - `icon: string`

这说明插件清单链路目前尚未完全统一到 `AppIconName`。

---

## 6. 已知不一致点

### 6.1 菜单链路已统一，插件链路未完全统一

当前状态：

- 菜单：`AppIconName` + `isAppIconName()` + `renderIcon()`
- 插件管理页：本地 `pluginIconMap`
- 插件 manifest：`icon: string`

因此，插件链路还存在：

- 类型不够收敛
- 可能出现 `Blocks` 与 `blocks` 混用
- 渲染映射存在重复维护

### 6.2 文档层没有统一规范来源

当前 docs 中虽然有零散提及 icon 字段，但此前没有一份专门的规范文档说明：

- 应该使用什么命名格式
- 哪些名称是当前支持的
- 哪些场景该用通用渲染链路

本文档即用于补齐这一空白。

---

## 7. 推荐使用约定

### 7.1 配置型字段优先使用 `AppIconName`

凡是以下场景，推荐优先使用 `AppIconName`：

- 菜单配置
- 低代码 schema
- 服务端下发的 icon 名称
- 需要运行时校验和 fallback 的 icon 字段

原因：

- 可以统一校验
- 可以统一兜底
- 可以减少渲染层重复映射

### 7.2 业务组件内部可直接使用 Lucide 组件

对于纯手写页面组件，如果 icon 不是配置驱动，而是写死在页面结构中的视觉元素，可以继续直接使用：

- `import { Bot, Blocks, Settings2 } from 'lucide-react'`

这类用法适合：

- 页面局部装饰
- 操作按钮图标
- 非配置型 icon

### 7.3 新增可配置 icon 的标准步骤

当某个配置字段需要支持新的 icon 名称时，建议按以下步骤扩展：

1. 在 `packages/shared/src/types/icon.ts` 中追加新名称
2. 在 `packages/core/src/utils/iconMap.tsx` 中补充映射
3. 若该字段属于配置输入，确保经过 `isAppIconName()` 校验
4. 在对应文档中补充示例

---

## 8. 后续整理建议

如果后续要继续收敛 icon 体系，建议优先做两件事：

1. 把插件 manifest 的 `icon: string` 收敛为 `AppIconName` 或兼容 `AppIconName`
2. 把插件管理页的本地 `pluginIconMap` 统一替换为 `renderIcon()` / `getIconByName()` / `LowCodeIcon`

这样可以让“菜单、低代码、插件清单”三条链路共用同一套 icon 规范与渲染实现。
