# Amis React 落地实施方案

## 1. 文档目标

本文是当前仓库唯一保留的 amis 迁移方案文档，直接给出面向当前仓库的完整结论与可执行方案：

- 建议的包与目录结构
- 关键 TypeScript 接口设计
- 路由与菜单模型改造方式
- Phase 1 最小闭环的逐文件实施清单
- 后续阶段的拆分建议与测试建议

目标项目：`C:/can/nop/nop-frontend-test/gpt-3`

## 2. 设计原则

1. 不破坏现有三类能力边界
   - 手写 React 页面
   - SystemJS 远程插件页面
   - 新增 amis 低代码页面

2. 不把 amis 逻辑硬塞进现有 `packages/core`
   - `packages/core` 目前偏宿主 shell 和插件加载
   - amis 运行时应有独立边界，避免未来维护混乱

3. 先做最小可运行闭环
   - 静态 schema 渲染
   - route 接入
   - 基本 env
   - 基本 page fetch

4. 逐步兼容 Nop 扩展能力
   - `xui:roles`
   - `xui:component`
   - `xui:import`
   - `@action:`
   - `dict://` / `page://` / `action://`

5. 不在第一阶段强求主题完全统一
   - 先保证可用
   - 再优化视觉融合

## 3. 推荐目录结构

## 3.1 新增包

建议新增两个 workspace package。

### `packages/amis-core`

建议结构：

```text
packages/amis-core/
  package.json
  tsconfig.json
  src/
    index.ts
    types.ts
    adapter/
      index.ts
      link.ts
    page/
      processor.ts
      transform.ts
      action.ts
      registry.ts
      page.ts
    core/
      ajax.ts
      graphql.ts
      module.ts
    api/
      cache.ts
      page-provider.ts
      dict-provider.ts
```

职责：

- 与 React 无关的运行时核心
- schema 处理
- action 绑定
- ajax/graphql 协议层
- page object
- provider 接口与缓存

### `packages/amis-react`

建议结构：

```text
packages/amis-react/
  package.json
  tsconfig.json
  src/
    index.ts
    styles.ts
    env.ts
    page-action.ts
    components/
      AmisSchemaPage.tsx
      AmisPageRoute.tsx
      AmisErrorView.tsx
      AmisLoadingView.tsx
    context/
      AmisRuntimeContext.tsx
```
```

职责：

- React + amis 集成
- env 创建
- React 组件入口
- route 页面容器
- 自定义 amis action 注册

## 3.2 `apps/main` 新增目录

建议新增：

```text
apps/main/src/amis/
  init.ts
  adapter.ts
  providers.ts
  testSchema.ts
```

职责：

- 宿主 adapter 注册
- page/dict provider 接线
- 开发态测试 schema
- 未来 feature flag 或 mock 支撑

## 4. 包职责边界

### `packages/amis-core`

只放低代码运行时，不引用 React 组件。

允许依赖：

- `systemjs`
- `i18next` 类型
- `@nop-chaos/shared`

不建议依赖：

- `react`
- `react-router-dom`
- `@nop-chaos/ui`

### `packages/amis-react`

只负责 React 绑定层。

允许依赖：

- `react`
- `amis`
- `amis-core`
- `@nop-chaos/amis-core` 或最终命名的 workspace 包

### `apps/main`

只负责把当前应用能力接入 amis runtime：

- auth store
- theme store
- router
- i18n
- toast
- schema/dict provider

## 5. 菜单与路由模型改造

当前类型定义：`C:/can/nop/nop-frontend-test/gpt-3/packages/shared/src/types/menu.ts`

建议改造为：

```ts
export interface MenuItem {
  id: string
  title?: string
  titleKey?: string
  path: string
  icon?: AppIconName
  children?: MenuItem[]
  badge?: string
  pageType: 'builtin' | 'plugin' | 'amis'
  componentId?: string
  pluginUrl?: string
  schemaPath?: string
  roles?: string[]
  sort?: number
  hideInMenu?: boolean
}
```

路由渲染策略：

- `builtin` -> 现有 `getBuiltinPage()`
- `plugin` -> 现有 `PluginSlot`
- `amis` -> 新增 `AmisPageRoute`

建议在 `C:/can/nop/nop-frontend-test/gpt-3/apps/main/src/router/RouteRenderer.tsx` 里按上述三分支处理。

## 6. 核心接口建议

## 6.1 `amis-core` 的 adapter

建议不要完全照搬 Vue 版接口，而是更贴近当前项目。

```ts
import type { i18n } from 'i18next'
import type { ThemeConfig, User } from '@nop-chaos/shared'

export interface AmisRequestOptions {
  method?: string
  url: string
  query?: Record<string, unknown>
  data?: unknown
  headers?: Record<string, string>
  responseType?: 'json' | 'blob'
  silent?: boolean
  rawResponse?: boolean
}

export interface AmisFetcherResult<T = unknown> {
  status: number
  data: T
  headers?: Record<string, string>
}

export interface AmisPageProvider {
  getPage: (schemaPath: string) => Promise<unknown>
}

export interface AmisDictProvider {
  getDict: (dictName: string, options: AmisRequestOptions) => Promise<AmisFetcherResult>
}

export interface AmisRuntimeAdapter {
  getI18n: () => i18n
  getLocale: () => string
  getCurrentUser: () => User | null
  getAuthToken: () => string | undefined
  setAuthToken: (token?: string) => void
  hasRole: (role: string) => boolean
  getThemeConfig: () => ThemeConfig
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void
  isCurrentUrl: (to: string) => boolean
  notify: (type: 'info' | 'success' | 'error' | 'warning', message: string) => void
  alert: (message: string, title?: string) => Promise<void>
  confirm: (message: string, title?: string) => Promise<boolean>
  logout: (reason: string) => void
  pageProvider: AmisPageProvider
  dictProvider: AmisDictProvider
  processRequest?: (request: AmisRequestOptions) => AmisRequestOptions
  processResponse?: <T>(response: Promise<T>) => Promise<T>
  compileFunction?: (code: string, page: AmisPageObject) => Function
}
```

## 6.2 page object

```ts
export interface AmisPageObject {
  id: string
  schemaPath?: string
  registerAction: (name: string, action: Function) => void
  getAction: (name: string) => Function | undefined
  resetActions: () => void
  getComponent: (name: string) => unknown
  getScopedStore: (name: string) => unknown
  getState: (name: string) => unknown
  setState: (name: string, value: unknown) => void
  destroy: () => void
}
```

## 6.3 React 页面容器 props

```ts
export interface AmisPageRouteProps {
  item: {
    id: string
    title?: string
    schemaPath?: string
  }
}

export interface AmisSchemaPageProps {
  schema: unknown
  schemaPath?: string
  initialData?: Record<string, unknown>
}
```

## 7. `apps/main` 适配层建议

建议在 `C:/can/nop/nop-frontend-test/gpt-3/apps/main/src/amis/adapter.ts` 中提供一个工厂函数：

```ts
import i18n from '../config/i18n'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { toast } from '@nop-chaos/ui'

export function createMainAmisAdapter(deps: {
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void
  isCurrentUrl: (to: string) => boolean
  pageProvider: AmisPageProvider
  dictProvider: AmisDictProvider
}): AmisRuntimeAdapter {
  return {
    getI18n: () => i18n,
    getLocale: () => i18n.language,
    getCurrentUser: () => useAuthStore.getState().user,
    getAuthToken: () => useAuthStore.getState().token,
    setAuthToken: (token) => {
      const state = useAuthStore.getState()
      if (!token) {
        state.logout()
        return
      }
      if (state.user) {
        state.login({ user: state.user, token })
      }
    },
    hasRole: (role) => (useAuthStore.getState().user?.roles ?? []).includes(role),
    getThemeConfig: () => useThemeStore.getState().themeConfig,
    navigate: deps.navigate,
    isCurrentUrl: deps.isCurrentUrl,
    notify: (type, message) => {
      if (type === 'success') toast.success(message)
      else if (type === 'error') toast.error(message)
      else toast(message)
    },
    alert: async () => undefined,
    confirm: async () => true,
    logout: () => useAuthStore.getState().logout(),
    pageProvider: deps.pageProvider,
    dictProvider: deps.dictProvider
  }
}
```

说明：

- `alert` / `confirm` 第一阶段可以先给最小实现。
- 后续再对接统一对话框组件。
- `setAuthToken` 是否真正写回 store，可根据后端需要再细化。

## 8. Phase 1 最小闭环实施清单

目标：在不接入复杂后端协议的前提下，让一个 amis 页面在当前主壳中按路由正常展示。

### 8.1 新增文件

建议第一批新增文件如下：

```text
packages/amis-core/src/index.ts
packages/amis-core/src/types.ts
packages/amis-core/src/adapter/index.ts
packages/amis-core/src/page/page.ts
packages/amis-core/src/page/processor.ts
packages/amis-core/src/page/transform.ts

packages/amis-react/src/index.ts
packages/amis-react/src/env.ts
packages/amis-react/src/components/AmisSchemaPage.tsx
packages/amis-react/src/components/AmisPageRoute.tsx
packages/amis-react/src/components/AmisLoadingView.tsx
packages/amis-react/src/components/AmisErrorView.tsx

apps/main/src/amis/adapter.ts
apps/main/src/amis/providers.ts
apps/main/src/amis/init.ts
apps/main/src/amis/testSchema.ts
```

### 8.2 需要修改的文件

第一阶段建议只改这些入口：

- `C:/can/nop/nop-frontend-test/gpt-3/packages/shared/src/types/menu.ts`
- `C:/can/nop/nop-frontend-test/gpt-3/apps/main/src/router/RouteRenderer.tsx`
- `C:/can/nop/nop-frontend-test/gpt-3/apps/main/src/App.tsx`
- `C:/can/nop/nop-frontend-test/gpt-3/package.json`
- `C:/can/nop/nop-frontend-test/gpt-3/pnpm-workspace.yaml` 仅当新增包目录需要被包含时确认即可

### 8.3 Phase 1 文件级职责

`packages/amis-core/src/adapter/index.ts`

- 注册和读取全局 adapter
- 保持无 React 依赖

`packages/amis-core/src/page/page.ts`

- 创建 page object
- 维护 action map
- 提供最小 state 容器

`packages/amis-core/src/page/processor.ts`

- 提供通用 schema 递归处理能力

`packages/amis-core/src/page/transform.ts`

- 先实现 `xui:roles`
- 预留 `xui:component`

`packages/amis-react/src/env.ts`

- 实现 amis `fetcher`
- 映射 notify、alert、confirm、jumpTo

`packages/amis-react/src/components/AmisSchemaPage.tsx`

- 接收 schema
- 创建 page object
- 执行 transform
- 调用 amis render 或官方 React 入口

`packages/amis-react/src/components/AmisPageRoute.tsx`

- 根据 `schemaPath` 拉取 schema
- 展示 loading / error
- 渲染 `AmisSchemaPage`

`apps/main/src/amis/providers.ts`

- 提供开发态 page provider
- 提供最小 dict provider

`apps/main/src/amis/testSchema.ts`

- 放一个最小静态 schema
- 便于本地验证

`apps/main/src/amis/init.ts`

- 注册 adapter
- 注册 amis 自定义 action

### 8.4 Phase 1 验收标准

满足以下 6 项即可进入下一阶段：

1. 项目能成功安装和构建。
2. `pageType: 'amis'` 的路由能进入主壳内容区。
3. 静态 schema 能正确渲染。
4. `xui:roles` 能根据当前用户角色裁剪节点。
5. `jumpTo` 和通知能力可用。
6. 现有 builtin/plugin 页面行为不受影响。

## 9. Phase 2 到 Phase 4 的拆分建议

### Phase 2

- 接入真实 page provider
- 从 mock schema 切换到真实 schemaPath 获取
- 加入 `AmisPageRoute` 缓存与错误恢复

### Phase 3

- 迁移 `bindActions`
- 接入 `xui:import`
- 支持 `@action:`
- 评估是否开启 `@fn:`

### Phase 4

- 迁移 `ajax.ts`
- 支持 `dict://`
- 支持 `page://`
- 支持 GraphQL URL DSL
- 标准化 401 与错误提示

## 10. 测试建议

### 单元测试

建议新增给 `amis-core`：

- `processor.test.ts`
- `transform.test.ts`
- `page.test.ts`

首批重点测：

- `xui:roles` 裁剪
- page action 注册/重置
- schema 递归处理行为

### 集成测试

建议在 `apps/main` 增加：

- amis route 渲染 smoke test
- route fallback test

### E2E

等 Phase 1 打通后，可增加一个 Playwright 用例：

- 从菜单进入 amis 页面
- 页面能看到静态 schema 内容
- 点击简单按钮能触发通知或跳转

## 11. 推荐实施顺序

最推荐的执行顺序是：

1. 新建 `packages/amis-core` 和 `packages/amis-react`
2. 做静态 schema 验证页
3. 改造 `MenuItem` 和 `RouteRenderer`
4. 打通 `apps/main` adapter 与 provider
5. 增加最小单测
6. 再开始迁移 `bindActions` 和协议层

这样可以尽快得到一个“能跑的最小版本”，并把风险压缩在最前面。
