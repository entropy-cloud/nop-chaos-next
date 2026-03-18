# Nop Chaos 真实后端联调清单

## 1. 目标

本文档用于指导当前新框架与旧版 Nop Chaos 后端能力进行真实联调。

当前仓库已经具备首版接线能力：

- 真实登录 / 当前用户 / 登出
- 真实菜单接口
- 真实 amis page provider / dict provider
- `xui:component`
- `xui:import` / `@action:` / `@fn:` 的首版兼容

本清单的目标是把这些“代码已接线”的能力转化成“实际接口已验证”的能力。

## 2. 联调前准备

### 2.1 必要环境变量

当前仓库至少需要以下环境变量：

```env
VITE_ENABLE_MOCK=false
VITE_API_BASE_URL=http://your-backend-origin
```

如果需要本地纯 mock 调试，可直接使用：

```bash
pnpm dev:mock
```

该命令会加载 `apps/main/.env.mock`，并让主应用登录、菜单、amis provider 以及演示页都停留在本地 mock 链路。

说明：

- `VITE_ENABLE_MOCK=false` 表示关闭 mock 菜单与 mock amis dict/provider 回退
- `VITE_API_BASE_URL` 用于给 `ajaxFetch` / `ajaxQuery` 拼接真实后端地址

当前声明位置：

- `apps/main/src/vite-env.d.ts`

### 2.2 当前代码里的真实接口入口

认证：

- `apps/main/src/services/authApi.ts`
- `LoginApi__login`
- `LoginApi__getLoginUserInfo`
- `LoginApi__logout`

菜单：

- `apps/main/src/services/menuApi.ts`
- `SiteMapApi__getSiteMap`

amis page / dict：

- `apps/main/src/amis/providers.ts`
- `PageProvider__getPage`
- `DictProvider__getDict`

请求封装：

- `apps/main/src/services/http.ts`
- 统一通过 `ajaxFetch` / `ajaxQuery`

## 3. 联调顺序

不要一上来就验证完整 amis 页面。建议按下面顺序逐步推进。

### Step 1: 登录链路

先验证：

- 打开登录页
- 输入真实账号密码
- 成功进入首页
- 刷新页面后仍能保持登录态
- token 失效后能自动退回登录页

涉及文件：

- `apps/main/src/pages/auth/login/index.tsx`
- `apps/main/src/hooks/useAuth.ts`
- `apps/main/src/store/authStore.ts`
- `apps/main/src/services/authApi.ts`

重点观察：

- 登录接口是否真的返回 `token` / `accessToken`
- `LoginApi__getLoginUserInfo` 返回字段是否真的包含：
  - `userName`
  - `nickName`
  - `roleInfos`
- 如果字段不一致，需要优先调整 `normalizeUser()`

### Step 2: 菜单链路

登录成功后验证：

- 是否能正常拉到菜单
- 不同角色用户菜单是否不同
- `builtin` / `plugin` / `amis` / `iframe` / `external` 是否都能正常映射

涉及文件：

- `apps/main/src/services/menuApi.ts`
- `apps/main/src/hooks/useMenuConfig.ts`
- `apps/main/src/router/AppRoutes.tsx`
- `apps/main/src/router/RouteRenderer.tsx`

重点观察：

- `SiteMapApi__getSiteMap` 的返回资源字段名是否与当前 mapper 假设一致
- `component`、`url`、`routePath`、`target`、`roles` 是否真的存在
- 如果 builtin 页面打不开，优先检查 `builtinComponentIdMap`

### Step 3: amis preview 页面

在菜单正常后，先进入当前预置的 amis preview 页面，验证运行时能力是否正常。

当前验证入口：

- `apps/main/src/amis/testSchema.ts`
- `apps/main/public/mock/preview.lib.js`

当前 preview 页面可验证：

- `xui:component`
- `xui:import`
- `@action:`
- `@action:` 带后缀时的查找行为
- `@fn:`

说明：

- 这是项目内的最小运行时验证页
- 即便还没切到真实 page schema，也能先检查运行时能力本身是否稳定

### Step 4: 真实 amis 页面

最后再验证真实后端页面：

- 从真实菜单进入 `pageType === 'amis'` 页面
- 看 `PageProvider__getPage` 是否返回正确 schema
- 看 `dict://` 是否能命中 `DictProvider__getDict`
- 看 `@query:` / `@mutation:` / GraphQL DSL 是否可正常工作

涉及文件：

- `apps/main/src/amis/providers.ts`
- `packages/amis-core/src/core/graphql.ts`
- `packages/amis-core/src/core/ajax.ts`
- `packages/amis-core/src/page/action.ts`
- `packages/amis-core/src/page/transform.ts`

## 4. 验证清单

### 4.1 认证

- 能登录
- 能刷新恢复
- 能主动登出
- 401 会自动登出

### 4.2 菜单

- 菜单能返回
- 菜单能按角色裁剪
- 菜单路径能命中路由
- builtin 页面能打开
- amis 页面能打开
- iframe / external 类型能正常处理

### 4.3 amis runtime

- preview 页能正常渲染
- `xui:component` 生效
- `xui:import` 能加载模块
- `@action:` 能触发模块方法
- `@fn:` 能正常执行
- `dict://` 能返回 options
- 真实 amis 页面能渲染

## 5. 常见问题排查

### 5.1 登录成功但刷新后掉登录态

优先检查：

- `LoginApi__getLoginUserInfo` 是否失败
- token header 是否需要的名字不是 `x-access-token`
- 后端是否要求 cookie / session，而不是 token 方案

排查位置：

- `apps/main/src/services/http.ts`
- `apps/main/src/services/authApi.ts`
- `apps/main/src/hooks/useAuth.ts`

### 5.2 能登录但菜单为空

优先检查：

- `SiteMapApi__getSiteMap` 返回结构是否真的是 `resources`
- 是否需要额外 `siteId`
- 菜单 roles 是否与当前用户 roles 不匹配

排查位置：

- `apps/main/src/services/menuApi.ts`
- `packages/shared/src/utils/menu.ts`

### 5.3 amis 页面路由能进，但内容加载失败

优先检查：

- `schemaPath` 是否正确
- `PageProvider__getPage` 返回的是否是 schema 本体，而不是被额外包了一层字段
- GraphQL 风格响应是否已经过 `status/msg/data` 归一化

排查位置：

- `apps/main/src/amis/providers.ts`
- `apps/main/src/services/http.ts`
- `packages/amis-core/src/core/ajax.ts`

### 5.4 dict 返回了，但下拉框还是空

优先检查：

- 后端是否真的返回 `options{value,label}`
- 当前 dict provider 是否拿到的是数组本体，还是还包了一层对象

排查位置：

- `apps/main/src/amis/providers.ts`

### 5.5 xui import 不生效

优先检查：

- 模块路径是否可被浏览器访问
- 是否被 `VITE_ENABLE_MOCK=false` 后的真实模式切换影响
- 是否使用了相对路径但 `schemaPath` 不是预期 base URL

排查位置：

- `packages/amis-core/src/page/action.ts`
- `apps/main/public/mock/preview.lib.js`

## 6. 当前已知限制

截至当前状态，以下部分仍属于“首版接线”，不代表已完全对齐旧仓库：

- `builtinComponentIdMap` 仍需结合真实菜单继续补齐
- auth/menu/page/dict 的字段结构仍需基于真实接口校准
- `xui:import` 与 `@action:` 已完成关键规则补齐，但仍需要真实页面验证
- amis 样式隔离仍采用“不引入 `helper.css`”策略，见 `docs/12-amis-helper-css-conflict.md`

## 7. 建议验证命令

最小类型检查：

- `pnpm --filter @nop-chaos/main typecheck`
- `pnpm --filter @nop-chaos/amis-core typecheck`
- `pnpm --filter @nop-chaos/shared typecheck`

开发态预览：

- `pnpm dev:main`

## 8. 建议联调节奏

推荐按以下节奏推进：

1. 先跑通登录
2. 再跑通菜单
3. 再验证 preview amis runtime
4. 最后进入真实 amis 页面联调

这样出问题时更容易定位，不会把 auth、menu、schema、dict、action 全部混在一起。
