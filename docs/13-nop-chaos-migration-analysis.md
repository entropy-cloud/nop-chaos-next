# 旧版 Nop Chaos 迁移分析

## 1. 文档目标

本文档用于分析旧仓库 `C:/can/nop/nop-chaos` 中与当前新框架直接相关的能力，并给出迁移范围、差异点、优先级和建议落点。

本次分析聚焦以下四类能力：

- amis 集成与运行时协议
- 登录、鉴权恢复、登出
- 菜单获取、权限过滤、动态路由
- 与 Nop 后端协议强绑定的能力

目标不是直接给出代码实现，而是明确：

- 旧仓库里哪些能力必须迁移
- 当前新框架已经具备哪些基础
- 两边之间最大的缺口在哪里
- 应该按什么顺序分批迁移

## 2. 结论概览

### 当前迁移进度

截至当前仓库状态，以下能力已经从“仅有骨架”推进到“已有首版实现”：

- Phase 1：真实认证 service、auth bootstrap、登录页与 amis adapter 已接线
- Phase 2：真实菜单接口、旧菜单到新菜单模型映射、iframe/external 页面类型已接线
- Phase 3：真实 amis pageProvider / dictProvider 已接线，保留 mock 回退
- Phase 4：`xui:component` 已支持注册、解析和宿主初始化接入

仍未完成的重点是：

- 基于真实后端返回继续校准 auth/menu/page/dict 响应结构
- `xui:import`、`@action:`、作用域规则与旧仓库完全对齐
- 更完整的 amis 页面联调验证与样式稳定性处理

当前新框架已经搭好了新的宿主骨架：

- React 主壳、菜单、权限、tabs、插件页路由已经成型
- amis 已经完成最小闭环，可通过路由加载 schema 并渲染
- `packages/amis-core` 与 `packages/amis-react` 的边界基本合理

但如果目标是“把旧版 Nop Chaos 中的 amis、登录、菜单、权限获取逻辑完整迁移到新框架”，当前仍缺少几类关键能力：

- 基于真实联调继续校准 auth bootstrap 与会话恢复链路
- 基于真实联调继续校准登录 API、当前用户接口、登出接口
- 基于真实联调继续校准后端菜单接口与菜单模型转换
- 基于真实联调继续校准 amis page provider、dict provider、GraphQL / action / page / dict 协议
- 更稳妥的 amis 样式隔离方案

一句话概括当前状态：

“新框架已经具备迁移承载能力，关键链路已接上首版实现，但仍处于真实联调与兼容性细化阶段。”

## 3. 旧仓库能力盘点

### 3.1 amis 集成主链路

旧仓库中的 amis 不是零散接入，而是已经具备较完整的运行时封装。

核心链路：

- 路由命中 `XuiPage`
- `XuiPage` 根据 path 拉取 schema/page
- `XuiSchemaPage` 根据 `xui:schema-type` 分发渲染器
- 默认走 `AmisSchemaPage`
- 渲染前执行 `transformPageJson`、`bindActions`、env 注入
- 由 `nop-core` 提供 graphql、page、dict、action、module、ajax 能力

旧仓库关键文件：

- `C:/can/nop/nop-chaos/packages/nop-site/src/nop/initNopApp.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/router/routes/mainOut.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/router/helper/routeHelper.ts`
- `C:/can/nop/nop-chaos/packages/nop-amis-vue/src/XuiPage.vue`
- `C:/can/nop/nop-chaos/packages/nop-amis-vue/src/XuiSchemaPage.vue`
- `C:/can/nop/nop-chaos/packages/nop-amis-vue/src/AmisSchemaPage.ts`
- `C:/can/nop/nop-chaos/packages/nop-amis-vue/src/page-action.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/index.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/api/page-api.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/core/ajax.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/core/graphql.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/page/action.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/page/transform.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/page/processor.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/page/registry.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/core/module.ts`

### 3.2 旧仓库中的 Nop 扩展能力

旧仓库 amis 运行时明显依赖 Nop 自己的一层扩展协议，而不是只依赖原生 amis。

已确认的协议和扩展：

- `xui:roles`
- `xui:component`
- `xui:import`
- `xui:standalone`
- `xui:schema-type`
- `@action:`
- `@fn:`
- `@query:`
- `@mutation:`
- `@subscription:`
- `@graphql:`
- `@dict:`
- `@page:`
- `dict://`
- `page://`
- `action://`

这些能力背后依赖的并不是普通 REST 约定，而是 Nop 自己的运行时协议层。

### 3.3 登录与鉴权链路

旧仓库登录链路不是简单的“登录页写 token”，而是完整的会话体系。

主链路：

- 登录页提交用户名密码
- 调 `LoginApi__login`
- token / userInfo / loginInfo 写入持久化缓存
- 登录后调用 `getUserInfoAction()` 恢复用户信息
- 再调用 `buildRoutesAction()` 构建动态路由
- 路由守卫中支持刷新后恢复登录态
- 401 时统一触发 logout / session timeout 流程

旧仓库关键文件：

- `C:/can/nop/nop-chaos/packages/nop-site/src/views/sys/login/Login.vue`
- `C:/can/nop/nop-chaos/packages/nop-site/src/views/sys/login/LoginForm.vue`
- `C:/can/nop/nop-chaos/packages/nop-site/src/views/sys/login/TokenLoginPage.vue`
- `C:/can/nop/nop-chaos/packages/nop-site/src/api/sys/user.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/store/modules/user.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/utils/auth/index.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/utils/cache/persistent.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/router/guard/permissionGuard.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/core/ajax.ts`

### 3.4 菜单、权限、动态路由

旧仓库菜单不是静态 JSON，而是由后端站点地图接口驱动。

关键点：

- 菜单来自 `SiteMapApi__getSiteMap`
- 菜单数据会转换成前端路由结构
- `component == 'AMIS'` 会被分流到 `XuiPage`
- 同时支持内置页面、amis 页面、iframe 页面
- 菜单、动态路由、权限过滤是连在一起的

旧仓库关键文件：

- `C:/can/nop/nop-chaos/packages/nop-site/src/api/sys/menu.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/api/sys/model/menuModel.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/store/modules/permission.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/router/helper/routeHelper.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/router/menus/index.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/router/guard/permissionGuard.ts`

## 4. 当前新框架现状

### 4.1 amis 现状

当前仓库中 amis 已经具备最小闭环。

关键文件：

- `apps/main/src/amis/init.ts`
- `apps/main/src/amis/adapter.ts`
- `apps/main/src/amis/providers.ts`
- `apps/main/src/router/RouteRenderer.tsx`
- `packages/amis-core/src/index.ts`
- `packages/amis-core/src/page/action.ts`
- `packages/amis-core/src/page/transform.ts`
- `packages/amis-core/src/core/ajax.ts`
- `packages/amis-core/src/core/graphql.ts`
- `packages/amis-react/src/components/AmisPageRoute.tsx`
- `packages/amis-react/src/components/AmisSchemaPage.tsx`
- `packages/amis-react/src/env.ts`

已具备：

- `pageType === 'amis'` 的页面分流
- schema 拉取与渲染
- `xui:roles` 基础裁剪
- `xui:import`、`@action:`、`@fn:` 的最小支持
- `dict://`、`page://`、`action://`、GraphQL DSL 的协议框架
- 401 时的 amis 请求层登出收口

仍明显简化：

- `pageProvider` 仍是 mock / 直接 fetch
- `dictProvider` 目前返回空数组
- `xui:component` 未实现
- 初始化与缓存策略偏轻
- 样式隔离仍以“禁用 `helper.css`”为主

### 4.2 登录与鉴权现状

关键文件：

- `apps/main/src/pages/auth/login/index.tsx`
- `apps/main/src/hooks/useAuth.ts`
- `apps/main/src/store/authStore.ts`
- `apps/main/src/services/mockApi.ts`
- `apps/main/src/router/AppRoutes.tsx`

已具备：

- Zustand auth store
- localStorage persist
- 登录页与登出入口
- 基础路由保护
- amis 请求层与普通页面共享 logout 落点

明显缺失：

- bootstrap 几乎为空
- 登录、登出、当前用户接口仍是 mock
- 没有真实 token 校验 / 续期 / 恢复
- 只靠本地持久化的 `isAuthenticated` 判断登录态

### 4.3 菜单、权限、路由现状

关键文件：

- `apps/main/src/hooks/useMenuConfig.ts`
- `apps/main/src/services/mockApi.ts`
- `apps/main/public/data/menu-config.json`
- `apps/main/src/router/AppRoutes.tsx`
- `apps/main/src/router/RouteRenderer.tsx`
- `apps/main/src/router/pageRegistry.tsx`
- `packages/shared/src/types/menu.ts`
- `packages/shared/src/utils/menu.ts`
- `packages/core/src/hooks/usePermissionGuard.ts`

已具备：

- 菜单模型已统一支持 `builtin | plugin | amis`
- 菜单层角色过滤
- 路由层权限兜底
- builtin / plugin / amis 三分流已落地

仍明显简化：

- 菜单来源仍是静态 JSON
- 权限仍只是简单 roles 数组
- 未接入真实后端站点地图/菜单模型

## 5. 差异矩阵

| 能力 | 旧仓库 | 当前仓库 | 差异判断 | 优先级 |
|---|---|---|---|---|
| amis schema 渲染 | 已完整接入 | 已最小接入 | 可承载迁移，但 provider 与扩展不完整 | 高 |
| page provider | 后端 `PageProvider__getPage` | mock / 直接 fetch | 必须替换为真实 provider | 最高 |
| dict provider | 后端 `DictProvider__getDict` | 空实现 | 必须补齐 | 最高 |
| GraphQL DSL | 已强绑定 Nop 协议 | 协议层已初步实现 | 需要按旧接口细节校准 | 高 |
| `xui:roles` | 已实现 | 已实现 | 需要结合真实用户权限验证 | 中 |
| `xui:component` | 已实现 | 未实现 | 若旧页面依赖该能力，必须补齐 | 高 |
| `xui:import` / `@action:` / `@fn:` | 已实现 | 已最小实现 | 需对齐旧仓库作用域与模块规则 | 高 |
| 登录接口 | 真实 Nop 接口 | mock | 必须替换 | 最高 |
| bootstrap | 完整恢复链路 | 几乎为空 | 必须补齐 | 最高 |
| 登出 | 真实接口 + 401 收口 | mock + 基础收口 | 需接入真实接口 | 高 |
| 菜单来源 | 真实 `SiteMapApi__getSiteMap` | 静态 JSON | 必须替换 | 最高 |
| 动态路由 | 登录后动态构建 | 前端静态生成 | 需重构为后端菜单驱动 | 高 |
| 内置/amis 分流 | 已有 | 已有 | 新框架更清晰，可复用 | 中 |
| 插件页 | 旧仓库未见完整 pageType 级插件分流 | 新框架已支持 | 迁移时需保留现有插件体系 | 中 |
| amis 样式隔离 | 旧仓库默认 helper 体系 | 新仓库避免 helper.css 污染 | 迁移时需专项验证 | 高 |

## 6. 建议迁移范围

### 6.1 第一批必须迁移

这批能力决定系统能否进入“真实后端联调”状态。

- 登录 API 接线
- 当前用户信息接口接线
- auth bootstrap 补齐
- 登出与 401 收口改为真实链路
- 菜单接口接线
- 菜单数据模型转换
- page provider / dict provider 接线

### 6.2 第二批高优先迁移

这批能力决定旧版 amis 页面能否真正迁过来。

- `xui:component`
- `xui:import` 与模块作用域对齐
- GraphQL DSL 与旧后端协议对齐
- `page://` / `dict://` / `action://` 的完整验证
- amis renderer 扩展评估

### 6.3 第三批迁移

这批能力更偏稳定性与体验一致性。

- amis 样式兼容策略
- schema / dict / page 缓存策略
- amis route 错误恢复与重试
- adapter 全局单例的进一步稳固方案

## 7. 当前仓库建议落点

### 7.1 认证与用户体系

建议主要改造位置：

- `apps/main/src/store/authStore.ts`
- `apps/main/src/hooks/useAuth.ts`
- `apps/main/src/services/`
- `apps/main/src/router/AppRoutes.tsx`

建议职责：

- `authStore` 负责 token / user / bootstrap 状态 / logout 收口
- `useAuthBootstrap` 负责启动时恢复当前会话
- `services` 负责封装真实登录、登出、当前用户接口
- 路由层只消费“是否已完成 bootstrap”和“是否允许进入”的最终状态

### 7.2 菜单与动态路由

建议主要改造位置：

- `apps/main/src/hooks/useMenuConfig.ts`
- `apps/main/src/services/`
- `packages/shared/src/types/menu.ts`
- `packages/shared/src/utils/menuConfig.ts`
- `apps/main/src/router/AppRoutes.tsx`

建议职责：

- `services` 负责请求真实菜单接口
- `shared` 负责菜单模型转换与校验
- `AppRoutes` 继续保留 builtin / plugin / amis 三分流
- 将旧仓库中的 AMIS、iframe、外链等模型映射到当前统一菜单类型

### 7.3 amis 运行时协议

建议主要改造位置：

- `apps/main/src/amis/providers.ts`
- `apps/main/src/amis/adapter.ts`
- `apps/main/src/amis/init.ts`
- `packages/amis-core/src/core/ajax.ts`
- `packages/amis-core/src/core/graphql.ts`
- `packages/amis-core/src/page/transform.ts`
- `packages/amis-core/src/page/action.ts`

建议职责：

- `apps/main/src/amis/providers.ts` 接真实 page / dict provider
- `apps/main/src/amis/adapter.ts` 接真实 auth、locale、logout、导航能力
- `packages/amis-core` 继续承载 Nop 协议与 schema 处理逻辑
- `apps/main/src/amis/init.ts` 负责统一初始化，而不是只做 CSS 引入

## 8. 迁移顺序建议

建议按以下顺序推进，而不是直接“把旧代码整块拷过来”。

### Phase 1: 真实登录态打通

- 接真实登录 API
- 接当前用户 API
- 补 auth bootstrap
- 统一 401 / logout 行为

验收标准：

- 刷新页面后能恢复真实登录态
- token 失效后能统一回到登录页
- amis 请求层和普通页面请求层行为一致

### Phase 2: 后端菜单打通

- 替换静态 `menu-config.json`
- 接真实菜单接口
- 对齐旧仓库菜单字段映射
- 验证 builtin / plugin / amis 三类页面路由生成

验收标准：

- 不改前端静态文件即可根据用户权限返回不同菜单
- amis 页面能从真实菜单进入

### Phase 3: amis provider 与协议打通

- page provider 接真实页面接口
- dict provider 接真实字典接口
- 校准 GraphQL DSL
- 验证 `page://`、`dict://`、`action://`

验收标准：

- 至少一个真实 amis 页面可完整运行
- 字典、动作、查询、跳转都不再依赖 mock

### Phase 4: Nop 扩展能力补齐

- 实现 `xui:component`
- 对齐 `xui:import`、作用域、模块加载规则
- 评估旧 renderer / ext 包迁移方式

验收标准：

- 旧仓库中的典型复杂 amis 页面可迁入运行

### Phase 5: 样式与稳定性加固

- 评估 amis 样式隔离方案
- 增加 schema / dict / page 缓存
- 增强错误恢复与调试能力

## 9. 风险点

### 9.1 最大风险：协议接上了，但模型没对齐

即便把接口地址改成真实后端，如果：

- 菜单字段模型不一致
- GraphQL 响应结构不一致
- page / dict provider 参数不一致

也会出现“能请求，但不能运行”的状态。

### 9.2 第二风险：旧 amis 页面依赖更多 helper 样式

当前仓库已经确认 `amis/lib/helper.css` 会污染宿主 Tailwind 4 样式，见：

- `docs/12-amis-helper-css-conflict.md`

迁移旧 amis 页面时，需要专项确认它们是否依赖 `helper.css` 的全局类。

### 9.3 第三风险：旧仓库存在混合链路

旧仓库里并不是所有能力都已经 100% 统一到 Nop 协议。

例如：

- 登录主链路是 Nop 风格
- 某些第三方登录链路仍可能保留旧风格接口

迁移时需要先识别“真正需要保留的旧逻辑”，不要把旧仓库历史包袱原样搬到新框架。

## 10. 推荐下一步

基于本次分析，最合理的下一步不是直接开始大面积改代码，而是先补一份“迁移执行清单”。

建议紧接着输出：

- 第一批迁移文件清单
- 每个文件的改造目标
- 需要从旧仓库搬运的核心函数/模型
- 每一批的验证命令与验收标准

这样可以把“分析结论”转成真正可执行的迁移计划。
