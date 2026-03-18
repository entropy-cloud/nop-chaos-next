# 真实后端联调清单

> 本文档只保留当前联调时最需要执行的步骤、入口和排查点。目标是快速判断 auth、menu、amis 链路是否真的与后端跑通。

---

## 1. 联调前准备

最少环境变量：

```env
VITE_ENABLE_MOCK=false
VITE_API_BASE_URL=http://your-backend-origin
```

纯 mock 调试命令：

```bash
pnpm dev:mock
```

说明：

- 联调真实后端时应关闭 mock
- `VITE_API_BASE_URL` 用于真实接口请求基址

---

## 2. 当前真实接口入口

认证：

- `apps/main/src/services/authApi.ts`
- `LoginApi__login`
- `LoginApi__getLoginUserInfo`
- `LoginApi__logout`

菜单：

- `apps/main/src/services/menuApi.ts`
- `SiteMapApi__getSiteMap`

amis：

- `apps/main/src/amis/providers.ts`
- `PageProvider__getPage`
- `DictProvider__getDict`

请求封装：

- `apps/main/src/services/http.ts`

---

## 3. 推荐联调顺序

不要一开始就验证完整 amis 页面，按下面顺序推进更容易定位问题。

### Step 1：登录链路

验证：

- 能登录
- 登录后能进入首页
- 刷新后仍能恢复登录态
- token 失效后能自动回登录页

重点文件：

- `apps/main/src/pages/auth/login/index.tsx`
- `apps/main/src/hooks/useAuth.ts`
- `apps/main/src/store/authStore.ts`
- `apps/main/src/services/authApi.ts`

重点观察：

- 登录接口是否返回 `token` 或 `accessToken`
- 当前用户接口字段是否满足 `normalizeUser()` 的假设

### Step 2：菜单链路

验证：

- 能拉到菜单
- 不同角色菜单是否不同
- `builtin` / `plugin` / `amis` / `iframe` / `external` 是否都能映射

重点文件：

- `apps/main/src/services/menuApi.ts`
- `apps/main/src/hooks/useMenuConfig.ts`
- `apps/main/src/router/AppRoutes.tsx`
- `apps/main/src/router/RouteRenderer.tsx`

重点观察：

- `SiteMapApi__getSiteMap` 返回字段是否与 mapper 假设一致
- builtin 页面打不开时，先检查 `builtinComponentIdMap`

### Step 3：amis preview 运行时

先验证最小运行时入口：

- `apps/main/src/amis/testSchema.ts`
- `apps/main/public/mock/preview.lib.js`

应至少确认：

- `xui:component`
- `xui:import`
- `@action:`
- `@fn:`

### Step 4：真实 amis 页面

最后再验证真实后端 amis 页面：

- 从真实菜单进入 `pageType === 'amis'` 页面
- `PageProvider__getPage` 能返回正确 schema
- `dict://` 能命中 `DictProvider__getDict`
- `@query:` / `@mutation:` / GraphQL DSL 能工作

重点文件：

- `apps/main/src/amis/providers.ts`
- `packages/amis-core/src/core/graphql.ts`
- `packages/amis-core/src/core/ajax.ts`
- `packages/amis-core/src/page/action.ts`
- `packages/amis-core/src/page/transform.ts`

---

## 4. 快速验收清单

### 4.1 认证

- 能登录
- 能刷新恢复
- 能主动登出
- 401 能自动登出

### 4.2 菜单

- 菜单能返回
- 菜单能按角色裁剪
- 菜单路径能命中路由
- builtin 页面能打开
- amis 页面能打开
- iframe / external 类型能处理

### 4.3 amis runtime

- preview 页能渲染
- `xui:component` 生效
- `xui:import` 能加载模块
- `@action:` 能触发模块方法
- `@fn:` 能执行
- `dict://` 能返回 options
- 真实 amis 页面能渲染

---

## 5. 常见问题排查

### 5.1 登录成功但刷新后掉登录态

优先检查：

- `LoginApi__getLoginUserInfo` 是否失败
- token header 名是否与后端要求一致
- 后端是否要求 cookie/session 而不是 token

### 5.2 能登录但菜单为空

优先检查：

- `SiteMapApi__getSiteMap` 返回结构是否真的包含 `resources`
- 是否需要额外 `siteId`
- 菜单 roles 是否与当前用户 roles 不匹配

### 5.3 amis 页面能进路由，但内容加载失败

优先检查：

- `schemaPath` 是否正确
- `PageProvider__getPage` 是否返回 schema 本体
- GraphQL 风格响应是否已完成归一化

### 5.4 dict 返回了，但下拉框还是空

优先检查：

- 后端是否真返回 `options{value,label}`
- dict provider 拿到的是数组本体还是额外包装对象

### 5.5 xui import 不生效

优先检查：

- 模块路径是否可被浏览器访问
- 相对路径是否受 `schemaPath` 基准路径影响

---

## 6. 当前已知限制

- `builtinComponentIdMap` 仍可能需要随真实菜单继续补齐
- auth/menu/page/dict 字段结构仍需基于真实接口继续校准
- `xui:import` 与 `@action:` 仍需要更多真实页面验证
- amis 样式隔离仍采用“不引入 `helper.css`”策略，见 `docs/12-amis-helper-css-conflict.md`

---

## 7. 建议命令

最小类型检查：

- `pnpm --filter @nop-chaos/main typecheck`
- `pnpm --filter @nop-chaos/amis-core typecheck`
- `pnpm --filter @nop-chaos/shared typecheck`

开发态预览：

- `pnpm dev:main`
