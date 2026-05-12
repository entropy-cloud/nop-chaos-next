# 后端联调指南

> 本文档描述如何与真实后端进行联调，包括环境配置、接口入口、联调顺序和常见问题排查。

---

## 1. 环境配置

联调真实后端时需要关闭 mock 模式。

### 环境变量

```env
VITE_ENABLE_MOCK=false
VITE_API_BASE_URL=http://your-backend-origin
```

### 启动命令

```bash
# 使用 mock 数据
pnpm dev:mock

# 联调真实后端
pnpm dev
```

---

## 2. 接口入口

### 认证接口

| 文件                                | 导出函数            | 后端端点                            |
| ----------------------------------- | ------------------- | ----------------------------------- |
| `apps/main/src/services/authApi.ts` | `loginWithPassword` | `/r/LoginApi__login`                |
| `apps/main/src/services/authApi.ts` | `fetchCurrentUser`  | `@query:LoginApi__getLoginUserInfo` |
| `apps/main/src/services/authApi.ts` | `logoutRequest`     | `@mutation:LoginApi__logout`        |

### 菜单接口

| 文件                                | 导出函数          | 后端端点                    |
| ----------------------------------- | ----------------- | --------------------------- |
| `apps/main/src/services/menuApi.ts` | `fetchMenuConfig` | `/r/SiteMapApi__getSiteMap` |

### AMIS 接口

| 文件                              | 导出对象               | 方法                          |
| --------------------------------- | ---------------------- | ----------------------------- |
| `apps/main/src/amis/providers.ts` | `mainAmisPageProvider` | `.getPage(schemaPath)`        |
| `apps/main/src/amis/providers.ts` | `mainAmisDictProvider` | `.getDict(dictName, options)` |

### HTTP 客户端

| 文件                             | 说明                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `apps/main/src/services/http.ts` | 基于 `@nop-chaos/shared` 的 HTTP 客户端，导出 `mainHttpClient`、`ajaxFetch`、`ajaxQuery` |

---

## 3. 联调顺序

按以下顺序推进更容易定位问题：

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

### Step 2：菜单链路

验证：

- 能拉取菜单
- 不同角色菜单是否不同
- `builtin` / `plugin` / `amis` / `iframe` / `external` 类型都能映射

重点文件：

- `apps/main/src/services/menuApi.ts`
- `apps/main/src/services/menuMapper.ts`
- `apps/main/src/hooks/useMenuConfig.ts`
- `apps/main/src/router/AppRoutes.tsx`
- `apps/main/src/router/RouteRenderer.tsx`

### Step 3： AMIS 页面

验证：

- 从菜单进入 `pageType === 'amis'` 页面
- `PageProvider__getPage` 能返回正确 schema
- `dict://` 能命中 `DictProvider__getDict`

重点文件：

- `apps/main/src/amis/providers.ts`
- `apps/main/src/amis/testSchema.ts`

---

## 4. 常见问题

### 登录成功但刷新后掉登录态

检查：

- `LoginApi__getLoginUserInfo` 是否失败
- token header 名是否与后端要求一致
- 后端是否要求 cookie/session 而不是 token

### 菜单为空

检查：

- `SiteMapApi__getSiteMap` 返回结构是否包含 `resources`
- 是否需要额外 `siteId`
- 菜单 roles 是否与当前用户 roles 不匹配

### AMIS 页面内容加载失败

检查：

- `schemaPath` 是否正确
- `PageProvider__getPage` 是否返回 schema 本体
- GraphQL 风格响应是否已完成归一化

### 下拉框为空（dict 返回了）

检查：

- 后端是否真返回 `options{value,label}`
- dict provider 拿到的是数组本体还是额外包装对象

---

## 5. 类型检查

```bash
pnpm --filter @nop-chaos/main typecheck
pnpm --filter @nop-chaos/amis-core typecheck
pnpm --filter @nop-chaos/shared typecheck
```
