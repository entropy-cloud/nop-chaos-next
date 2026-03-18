# 主框架复用实现计划

> 本文档是 `docs/20-shell-reuse-boundaries.md` 的落地计划版，重点说明如何在不破坏现有 router / page component 扩展机制的前提下，补齐 shell contribution 对品牌、全局元信息和默认系统页配置的支持。

---

## 1. 实现目标

本次改造的目标不是重做主框架，而是在现有能力上补齐两件事：

- 保留系统页通过 `builtinPages` 直接替换的能力
- 为 shell 级信息建立统一的 contribution 配置消费链路

最终效果应满足：

- 不同应用可以共用同一套主框架布局、权限、菜单、插件装载机制
- 不同应用可以替换品牌信息、浏览器标题、favicon、默认首页、默认登录页品牌文案
- 结构差异很大的页面仍然通过 page component 注册替换，不强制配置化

---

## 2. 范围与非目标

### 2.1 本次范围

- shell branding 运行时配置
- contribution 中品牌字段的统一消费
- 默认登录页读取品牌配置
- 默认首页路径与 contribution 的衔接
- router 级系统页替换能力的规范化
- `document.title` / `favicon` 的运行时更新

### 2.2 明确不在本次范围内

- 不重写插件加载协议
- 不把所有系统页都改成纯配置渲染
- 不支持运行时卸载 contribution
- 不在本次引入复杂认证编排，例如完整 SSO 流程设计
- 不改动业务菜单、插件菜单的主合并策略

---

## 3. 当前实现现状

### 3.1 contribution 类型

当前类型定义在 `packages/shared/src/types/contribution.ts`，其中已经包含：

- `app.name`
- `app.shortName`
- `app.logoUrl`
- `app.defaultHomePath`
- `builtinPages`

问题在于：

- `builtinPages` 已经有完整消费链路
- `app.defaultHomePath` 还没有进入统一 home 决策链
- `app.name` / `app.shortName` / `app.logoUrl` 没有统一 runtime config

### 3.2 启动阶段

当前入口：`apps/main/src/contributions/bootstrap.ts`

已做的事：

- 加载 contribution 模块
- 注册 auth config
- 注册语言、主题、样式、builtin pages
- 初始化 i18n

缺失的事：

- 没有构建统一 shell config
- 没有写入 `document.title`
- 没有处理 favicon
- 没有把 branding 信息暴露给 `AppBrand` 和登录页

### 3.3 页面与路由

当前系统页分为两类：

- 特殊页：`AppRoutes.tsx` 直接使用 `LoginPage`、`ForbiddenPage`、`NotFoundPage`、`ServerErrorPage`
- 普通 builtin 页：通过 `RouteRenderer.tsx` -> `getBuiltinPage(componentId)` 获取

这意味着：

- dashboard 等菜单页替换能力已经统一
- login / 403 / 404 / 500 还没有纳入同一套 builtin page 解析入口

---

## 4. 总体设计

本次建议增加一层“shell runtime config”，作为 contribution 配置与宿主组件之间的统一桥梁。

设计原则：

- contribution 负责声明
- bootstrap 负责归并
- runtime 负责缓存
- hook / selector 负责读取
- 组件不直接遍历 contribution 列表

建议形成两套并行能力：

- `page-level override`
  - 用于 login、dashboard、403、404、500 等页面级完整替换
- `shell-level config`
  - 用于品牌、标题、favicon、默认首页、默认登录页文案等全局配置

---

## 5. 数据模型设计

### 5.1 调整 contribution 类型

建议在 `packages/shared/src/types/contribution.ts` 中把当前较平的 `app` 字段细化，至少拆出 `branding` 与 `shell`。为兼容现有实现，可以保留 `app` 一段时间，内部转译到新结构。

建议类型如下：

```ts
export interface ContributionBrandingConfig {
  name?: string
  shortName?: string
  logoUrl?: string
  markUrl?: string
  documentTitle?: string
  faviconUrl?: string
}

export interface ContributionLoginUiConfig {
  heroTitleKey?: string
  heroDescriptionKey?: string
  cardTitleKey?: string
  cardDescriptionKey?: string
  featureKeys?: string[]
  showDemoHint?: boolean
}

export interface ContributionShellConfig {
  defaultHomePath?: string
  helpUrl?: string
  aboutUrl?: string
  supportUrl?: string
}

export interface ShellContribution {
  id: string
  order?: number
  app?: ContributionAppConfig
  branding?: ContributionBrandingConfig
  loginUi?: ContributionLoginUiConfig
  shell?: ContributionShellConfig
  ...
}
```

### 5.2 宿主运行时模型

建议在 `apps/main/src/contributions/runtime.ts` 增加统一 runtime 结构：

```ts
export interface ShellRuntimeConfig {
  branding: {
    name: string
    shortName: string
    logoUrl?: string
    markUrl?: string
    documentTitle: string
    faviconUrl?: string
  }
  loginUi: {
    heroTitleKey?: string
    heroDescriptionKey?: string
    cardTitleKey?: string
    cardDescriptionKey?: string
    featureKeys: string[]
    showDemoHint: boolean
  }
  shell: {
    defaultHomePath?: string
    helpUrl?: string
    aboutUrl?: string
    supportUrl?: string
  }
  pageOverrides: {
    login?: string
    forbidden?: string
    notFound?: string
    serverError?: string
    dashboard?: string
  }
}
```

这里的 `pageOverrides` 不一定非要在 contribution 类型中显式声明，也可以通过约定的 `componentId` 命名推导。但从可维护性看，推荐显式声明，避免宿主散落硬编码。

---

## 6. 运行时归并策略

### 6.1 归并原则

多个 contribution 同时存在时，统一按 `order` 排序后归并，后者覆盖前者。

规则建议：

- 标量字段：后者覆盖前者
- 数组字段：按语义决定，`featureKeys` 可整体覆盖，不做拼接
- URL / title / logo：后者覆盖前者
- `builtinPages`：当前逻辑保持，后注册覆盖先注册

### 6.2 兼容旧字段

如果 `branding` 未提供，则回退到旧字段：

- `branding.name <- app.name`
- `branding.shortName <- app.shortName`
- `branding.logoUrl <- app.logoUrl`
- `shell.defaultHomePath <- app.defaultHomePath`

这样可以保证已有 contribution 不需要立刻全部修改。

---

## 7. 代码改造点

### 7.1 `packages/shared/src/types/contribution.ts`

改造内容：

- 新增 `ContributionBrandingConfig`
- 新增 `ContributionLoginUiConfig`
- 新增 `ContributionShellConfig`
- 视情况新增 `ContributionSystemPageConfig`
- 在 `ShellContribution` 中接入新字段
- 保留旧 `app` 结构一段时间用于兼容

注意事项：

- 不要直接删除 `ContributionAppConfig`
- 要在类型注释或文档中说明旧字段兼容策略

### 7.2 `apps/main/src/contributions/runtime.ts`

改造内容：

- 在现有 `loadedContributions` 之外新增 `shellRuntimeConfig`
- 增加 `setShellRuntimeConfig()` / `getShellRuntimeConfig()`
- 增加 `resolveShellRuntimeConfig(loadedContributions)`
- 菜单合并逻辑继续保留在该文件，避免分散

建议新增能力：

- `getContributionDefaultHomePath()`
- `getSystemPageComponentId(pageKey)`

这样 router 与组件层不需要理解 contribution 合并细节。

### 7.3 `apps/main/src/contributions/bootstrap.ts`

改造内容：

- 在 `applyContributionDefinitions()` 后增加 shell runtime config 归并
- 设置 runtime config
- 执行 `document.title` 与 favicon 应用逻辑

建议新增辅助函数：

- `applyDocumentTitle(config)`
- `applyFavicon(config)`

实现要点：

- title 只在启动后先应用一次
- 后续页面级标题如果有单独策略，可再叠加
- favicon 更新通过查找或创建 `link[rel~='icon']`

### 7.4 `apps/main/src/components/layout/AppBrand.tsx`

改造内容：

- 不再写死 `Nop Chaos`
- 不再默认使用固定副标题 `common.operationsConsole`
- 改为读取 shell runtime config

建议行为：

- `compact = false` 时显示 logo + shortName + name 或 slogan
- `compact = true` 时只显示图形标识
- 如果未配置 logo，则回退到内置图标

### 7.5 新增 shell config hook

建议新增：`apps/main/src/hooks/useShellConfig.ts`

职责：

- 读取 `getShellRuntimeConfig()`
- 返回稳定结构，屏蔽兼容与默认值细节

建议返回：

```ts
export function useShellConfig() {
  return {
    branding,
    loginUi,
    shell,
    pageOverrides
  }
}
```

如果未来需要响应式更新，可把 runtime 挂到 Zustand；但就当前启动时一次性加载的模型，先用静态 runtime + hook 封装即可。

### 7.6 `apps/main/src/pages/auth/login/index.tsx`

改造内容：

- 读取 shell runtime config
- logo 与标题通过 `AppBrand` 或 shell config 渲染
- hero title / description 允许由 contribution 配置 key 覆盖
- card description 允许覆盖
- demo hint 是否显示改为读取 config，默认继承当前 mock 行为

建议策略：

- 文案优先读 contribution 配置 key
- 未配置则回退到当前 `login.*` i18n key
- 表单行为、登录 API、语言切换逻辑保持不变

这样能让默认登录页“可换壳不换逻辑”。

### 7.7 `apps/main/src/router/pageRegistry.tsx`

改造内容：

- 把当前导出的 `LoginPage`、`ForbiddenPage`、`NotFoundPage`、`ServerErrorPage` 纳入 builtin registry
- 为这些页面定义稳定 `componentId`

建议内置 id：

- `system-login`
- `system-forbidden`
- `system-not-found`
- `system-server-error`
- `dashboard`

并增加读取函数：

```ts
export function getSystemPage(pageKey: 'login' | 'forbidden' | 'notFound' | 'serverError')
```

实现方式可以是：

- 先读取 runtime 中该 pageKey 对应的 override componentId
- 再调用 `getBuiltinPage(componentId)`
- 未命中时回退到默认内置 page

### 7.8 `apps/main/src/router/AppRoutes.tsx`

改造内容：

- 不再直接硬编码使用 `LoginPage`、`ForbiddenPage`、`NotFoundPage`、`ServerErrorPage`
- 改为统一使用 `getSystemPage()`

建议实现：

- 在模块顶部或组件内解析 `ResolvedLoginPage`
- 特殊页依旧在 router 中保留固定 path
- 只是把具体 component 的选择交给 registry/runtime

这样 login 与错误页也进入“可替换但仍由宿主掌控路由”的模型。

### 7.9 `apps/main/src/config/systemMenus.ts`

改造内容：

- `mergeBuiltinSystemMenus()` 计算 home 时，增加 contribution default home 的参与

建议优先级：

1. 后端返回且有效的 `menuResponse.home`
2. contribution `shell.defaultHomePath` 或兼容字段 `app.defaultHomePath`
3. `/dashboard`

注意：

- 必须校验候选 home 是否存在于可访问菜单路径中
- 不合法时回退到 `/dashboard`

### 7.10 `apps/main/src/services/menuApi.ts`

改造内容：

- 继续返回 `mergeBuiltinSystemMenus(...)`
- 不必知道 contribution 细节

即：

- `systemMenus` 内部读取 runtime config
- `menuApi` 保持简单

---

## 8. 系统页替换方案细节

### 8.1 方案选择

login / 403 / 404 / 500 有两种做法：

- 方案 A：继续像今天这样单独 import，但允许 contribution 只配品牌
- 方案 B：统一纳入 builtin page registry，通过系统页 key 再映射到 componentId

推荐方案 B。

原因：

- 能统一 dashboard 与 login 的扩展模型
- 可以清晰区分“路由固定”与“组件可替换”
- 避免 `AppRoutes.tsx` 再出现多套并行判断

### 8.2 路由保持不变

以下 path 不应变化：

- `/auth/login`
- `/403`
- `/404`
- `/500`

变化的是它们渲染的组件来源，而不是路由协议本身。

### 8.3 contribution 如何声明

可选做法一：只通过 `builtinPages` 注册，然后约定 componentId。

例如：

```ts
builtinPages: [
  {
    componentId: 'system-login-custom',
    component: CustomLoginPage
  }
],
systemPages: {
  login: 'system-login-custom'
}
```

推荐保留 `systemPages` 显式映射，因为它比“靠命名猜用途”更直观。

---

## 9. 品牌渲染与标题策略

### 9.1 `AppBrand` 展示策略

建议展示优先级：

- 图形：`logoUrl` -> `markUrl` -> 默认图标
- 标题主文案：`shortName` -> `name` -> 内置默认名
- 副文案：`name` 与主文案不同则显示 `name`，否则回退到默认描述 key

这样既兼容“短品牌 + 全称”，又兼容只有一个品牌名的场景。

### 9.2 `document.title`

启动时：

- 先设置为 `branding.documentTitle`
- 如果未提供，则使用 `branding.name` 或内置默认标题

后续增强可以考虑页面标题模板，例如：

- `当前页 - 应用名`

但这不必在本次一次性做完。

### 9.3 favicon

实现要求：

- 找到已有 `link[rel='icon']` 时直接替换 `href`
- 未找到时新建节点
- 允许 contribution 不提供 favicon，宿主保留默认

---

## 10. 默认登录页配置细节

### 10.1 配置项粒度

默认登录页建议只暴露少量高价值槽位：

- hero title key
- hero description key
- card title key
- card description key
- feature keys
- showDemoHint

不要在第一版把登录页拆成大量零碎开关，否则维护成本会很高。

### 10.2 i18n 约定

建议配置里存 key，不直接存最终文案：

- contribution 通过 `i18nResources` 注册资源
- login UI 配置只负责告诉宿主“该用哪些 key”

这样做的好处：

- 中英文等语言切换自动生效
- 宿主不需要处理“配置里同时携带多语言对象”

### 10.3 默认回退

如果 `loginUi` 未配置：

- hero 仍用现有 `login.heroTitle` / `login.heroDescription`
- card 仍用现有 `auth.login` / `login.cardDescription`
- features 仍用 `layout` / `routing` / `themes`
- demo hint 仍按当前 mock 模式判断

---

## 11. 具体实施阶段

### Phase 1：类型与 runtime 打底

目标：先把 shell config 统一存起来。

步骤：

1. 扩展 `packages/shared/src/types/contribution.ts`
2. 在 `apps/main/src/contributions/runtime.ts` 增加 runtime config 与归并逻辑
3. 在 `apps/main/src/contributions/bootstrap.ts` 中设置 runtime config
4. 增加单测覆盖归并与兼容行为

完成标准：

- 宿主可拿到统一的 shell runtime config
- 旧 contribution 不报错

### Phase 2：品牌消费接入

目标：让壳层先吃到配置。

步骤：

1. 新增 `useShellConfig()`
2. 改造 `AppBrand.tsx`
3. 在 bootstrap 或 App 启动阶段应用 `document.title` 与 favicon
4. 补充组件层测试

完成标准：

- 侧边栏与登录页中的品牌展示不再写死
- 浏览器标题与 favicon 可被 contribution 覆盖

### Phase 3：系统页统一接入

目标：把 login / 403 / 404 / 500 纳入统一 page override 模型。

步骤：

1. 扩展 `pageRegistry.tsx`
2. 增加 `systemPages` 配置解析
3. 改造 `AppRoutes.tsx` 使用 `getSystemPage()`
4. 补充 router 层测试

完成标准：

- 登录页与错误页既可用默认版本，也可被 contribution 替换

### Phase 4：默认登录页配置化

目标：让默认登录页支持品牌换壳。

步骤：

1. 给 `LoginPage` 接入 `useShellConfig()`
2. 接入 `loginUi` 的 key 配置
3. 保持表单与 API 逻辑不变
4. 补充登录页渲染测试

完成标准：

- 不重写登录页也能替换 logo 与主要文案

### Phase 5：默认首页路径接入

目标：让 contribution default home 真正生效。

步骤：

1. 调整 `systemMenus.ts` 的 home 决策
2. 验证 login 后跳转与根路由跳转行为
3. 补充菜单相关测试

完成标准：

- `defaultHomePath` 在后端未指定 home 时可生效

---

## 12. 测试计划

### 12.1 单元测试

建议补充位置：

- `apps/main/src/contributions/index.test.ts`
- 新增 shell runtime config 归并测试
- 新增 system page override 解析测试

重点覆盖：

- 旧 `app.*` 到新结构的兼容映射
- 多 contribution 按 `order` 覆盖
- `builtinPages` 与 `systemPages` 联动解析
- `defaultHomePath` 非法时回退

### 12.2 组件测试

建议覆盖：

- `AppBrand` 在有 / 无 logo 情况下的渲染
- `LoginPage` 在默认配置与覆盖配置下的渲染

### 12.3 E2E 验证

建议最小验证链路：

1. 注入一个 demo contribution
2. 覆盖品牌与默认登录文案
3. 验证登录页显示新品牌
4. 登录成功后进入 contribution 指定首页
5. 替换 404 或 login 页面时验证路由仍正常

---

## 13. 风险与规避

### 13.1 兼容风险

风险：旧 contribution 只写了 `app.*`，新实现若只读取 `branding` 会失效。

规避：

- 保留旧字段兼容映射
- 在文档中标记旧字段为兼容态，而不是立即删除

### 13.2 page override 冲突

风险：多个 contribution 都声明 login override。

规避：

- 明确按 `order` 后者覆盖前者
- 控制台输出警告日志，标明被覆盖的 pageKey 与 contribution id

### 13.3 标题与 favicon 时机

风险：如果过早设置，可能在应用初始化前被后续逻辑覆盖。

规避：

- 在 `bootstrapContributions()` 完成后统一应用
- 后续如引入页面级标题，再采用追加模板策略

---

## 14. 建议交付顺序

建议拆成两次提交：

- 提交 1：类型、runtime、branding、title、favicon、default login config
- 提交 2：system page override 统一化与相关测试

这样做的好处：

- 第一阶段即可解决“换品牌不用重写壳”的核心问题
- 第二阶段再收敛 login / 错误页的替换模型，风险更可控

---

## 15. 结论

这次实现不应理解为“把系统页都配置化”，而应理解为：

- 路由入口仍由宿主掌控
- 页面替换仍由 `builtinPages` 提供自由度
- shell 级配置由 contribution 统一注入并在 runtime 消费

落地后，主框架会形成更清晰的三层：

- 主框架内核：布局、路由、权限、插件装载
- shell runtime config：品牌与全局元信息
- page override：少数结构差异大的系统页替换

这正是“复用主框架，但可用于各种应用”的最小且稳妥的实现路径。

---

## 附录：主包体诊断与优化

当前 `apps/main` 已增加主包分析脚本：

```bash
pnpm build:main:analyze
```

构建完成后可查看：

- `apps/main/dist/stats.html`

当前优化策略包括：

- 为 `amis`、编辑器、图表、文档处理类依赖建立更稳定的 vendor chunk
- 合并较轻的业务页到 `page-secondary`，减少内部小 chunk 数量
- 将 Font Awesome CSS 迁移到 `apps/main/public/vendor/fontawesome/all.min.css`
- 保留 Font Awesome 版权头，并把 webfonts 作为静态资源提供
- 对超过约 `100 KB` 的 `.js` 构建产物额外生成 `.gz` 文件，便于静态资源服务器直接回源压缩产物

后续建议继续处理：

- 将 amis 基础主题 CSS 与宿主业务 CSS 进一步分离
- 评估 `tailwind.css` 中来自 `packages/ui` / `packages/core` 的体积占比
- 对 dashboard / ai-workbench / flow-editor 的大依赖继续按能力域做懒加载收敛
