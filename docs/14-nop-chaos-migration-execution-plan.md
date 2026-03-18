# 旧版 Nop Chaos 迁移执行清单

## 1. 文档目标

本文档基于 `docs/13-nop-chaos-migration-analysis.md`，把迁移分析转成可执行计划。

重点输出：

- 每一批迁移要改哪些文件
- 每一批要从旧仓库参考哪些文件
- 每一批的目标、风险点、验收标准
- 每一批完成后建议运行的验证命令

本文档默认旧仓库路径为：

- `C:/can/nop/nop-chaos`

当前新框架仓库为：

- `C:/can/nop/nop-chaos-next-wt/nop-chaos-next-feat-upgrade-amis`

## 2. 执行原则

### 2.1 不整块拷贝旧代码

旧仓库包含：

- Vue 壳层
- 旧权限体系
- Nop 协议层
- 混合历史逻辑

当前新仓库已经有新的 React 主壳、插件机制、菜单模型和 amis 包边界，因此迁移应遵循：

- 协议与业务能力迁移
- 壳层实现重写
- 不把 Vue / 旧框架耦合直接带进来

### 2.2 先打通真实链路，再补高级能力

优先级顺序：

1. 认证与会话恢复
2. 菜单与动态路由
3. amis provider 与协议
4. Nop 扩展能力补齐
5. 样式与稳定性收尾

### 2.3 保留新框架已有边界

迁移过程中保持这些边界不被打破：

- `packages/amis-core` 负责协议、schema 处理、运行时逻辑
- `packages/amis-react` 负责 React + amis 渲染桥接
- `apps/main` 负责宿主能力接线
- `packages/core` 继续负责 shell、权限辅助、插件容器

## 3. Phase 1 - 真实认证与会话恢复

状态：进行中（首版已接线）

### 3.1 目标

把当前 mock 级认证改为真实后端认证，使主壳、菜单、amis 请求层都建立在真实会话之上。

### 3.2 当前仓库改造文件

- `apps/main/src/store/authStore.ts`
- `apps/main/src/hooks/useAuth.ts`
- `apps/main/src/services/` 下新增真实认证 API 封装
- `apps/main/src/pages/auth/login/index.tsx`
- `apps/main/src/router/AppRoutes.tsx`
- `apps/main/src/router/AppShell.tsx`
- `apps/main/src/amis/adapter.ts`
- 如需要，新增 `apps/main/src/services/http.ts` 或等价请求封装

### 3.3 旧仓库参考来源

- `C:/can/nop/nop-chaos/packages/nop-site/src/api/sys/user.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/store/modules/user.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/router/guard/permissionGuard.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/core/ajax.ts`

### 3.4 本阶段具体任务

#### A. 认证 API 封装

在 `apps/main/src/services/` 中新增真实接口封装，至少覆盖：

- 登录
- 获取当前用户
- 登出
- 如旧接口需要，验证码获取

建议不要直接散落在页面内调用。

#### B. authStore 扩展

`authStore` 至少增加：

- `bootstrapStatus` 或等价状态
- `setToken`
- `setUser`
- `setAuthenticated`
- `logout` 统一收口
- 可选：`lastValidatedAt`

#### C. `useAuthBootstrap()` 落地

当前它基本是空实现，需要改为：

- 启动时检查本地 token
- 有 token 时调用“当前用户”接口
- 成功则恢复用户状态
- 失败则清理认证状态并回到登录页

#### D. 路由保护补强

`AppRoutes.tsx` 不应只看本地 `isAuthenticated`，还应区分：

- bootstrap 未完成
- bootstrap 成功
- bootstrap 失败 / 未登录

#### E. amis adapter 对齐

`apps/main/src/amis/adapter.ts` 中：

- `getCurrentUser`
- `getAuthToken`
- `setAuthToken`
- `logout`

要确保与真实 authStore 完全一致。

### 3.5 风险点

- 旧后端登录返回字段可能与当前 mock payload 不一致
- 旧仓库可能有 token 自动刷新或 header 续签逻辑，需要确认是否保留
- 如果 bootstrap 做得不完整，菜单和 amis 请求会出现“假登录态”问题

### 3.6 验收标准

- 登录页可以通过真实接口登录
- 刷新页面后能恢复当前用户
- token 无效时自动清空会话
- 主壳与 amis 请求层统一走同一套 logout 收口

### 3.7 建议验证命令

- `pnpm --filter @nop-chaos/main typecheck`
- `pnpm --filter @nop-chaos/main test`

手动验证：

- 登录 -> 进入首页
- 刷新页面 -> 状态恢复
- 人工让 token 失效 -> 返回登录页

## 4. Phase 2 - 后端菜单与动态路由

状态：进行中（真实接口与旧模型映射已接线）

### 4.1 目标

把当前静态 `menu-config.json` 替换为真实菜单接口，并保留新框架已有的 `builtin | plugin | amis` 三分流。

### 4.2 当前仓库改造文件

- `apps/main/src/hooks/useMenuConfig.ts`
- `apps/main/src/services/` 下新增菜单接口封装
- `packages/shared/src/types/menu.ts`
- `packages/shared/src/utils/menuConfig.ts`
- `apps/main/src/router/AppRoutes.tsx`
- `apps/main/src/router/RouteRenderer.tsx`
- `apps/main/src/router/pageRegistry.tsx`
- 视需要新增 `apps/main/src/router/menuMappers.ts`

### 4.3 旧仓库参考来源

- `C:/can/nop/nop-chaos/packages/nop-site/src/api/sys/menu.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/api/sys/model/menuModel.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/store/modules/permission.ts`
- `C:/can/nop/nop-chaos/packages/nop-site/src/router/helper/routeHelper.ts`

### 4.4 本阶段具体任务

#### A. 菜单接口接线

用真实接口替换：

- `apps/main/public/data/menu-config.json`
- `apps/main/src/services/mockApi.ts` 中的菜单逻辑

#### B. 菜单模型转换

新增“旧菜单模型 -> 新 `MenuItem` 模型”的映射函数，至少要处理：

- 内置页面
- amis 页面
- 插件页
- iframe / 外链页面
- `hideInMenu`
- title/icon/path
- 权限字段

#### C. 动态路由来源切换

保留当前 `AppRoutes.tsx` 动态生成 routes 的方式，但 route 数据源改成真实菜单接口结果。

#### D. 与插件分流兼容

旧仓库没有当前新框架这种明确 `pageType=plugin` 体系，因此：

- 旧菜单模型中映射不到插件页的，仍按旧逻辑处理
- 新框架已有的插件页模型必须保留，不能被旧模型“回退覆盖”

### 4.5 风险点

- 旧菜单字段与当前 `MenuItem` 模型不完全等价
- 旧仓库 `component == 'AMIS'` 的映射逻辑需要适配到当前 `pageType: 'amis'`
- iframe / 外链页在新框架里可能还没有完整类型表达

### 4.6 验收标准

- 菜单来自真实后端
- 不同用户角色能看到不同菜单
- builtin / amis / plugin 页面都能通过菜单进入
- 路由保护仍正常工作

### 4.7 建议验证命令

- `pnpm --filter @nop-chaos/main typecheck`

手动验证：

- 登录不同角色用户查看菜单差异
- 进入 builtin 页面
- 进入 amis 页面
- 进入 plugin 页面

## 5. Phase 3 - amis provider 与 Nop 协议接线

状态：进行中（pageProvider / dictProvider 已接线首版）

### 5.1 目标

让 amis 不再只做 preview，而是能跑旧仓库风格的真实页面协议。

### 5.2 当前仓库改造文件

- `apps/main/src/amis/providers.ts`
- `apps/main/src/amis/adapter.ts`
- `apps/main/src/amis/init.ts`
- `packages/amis-core/src/core/ajax.ts`
- `packages/amis-core/src/core/graphql.ts`
- `packages/amis-core/src/page/action.ts`
- `packages/amis-core/src/page/transform.ts`
- 视需要新增 `packages/amis-core/src/api/page-provider.ts`
- 视需要新增 `packages/amis-core/src/api/dict-provider.ts`
- 视需要新增 `packages/amis-core/src/core/module.ts`

### 5.3 旧仓库参考来源

- `C:/can/nop/nop-chaos/packages/nop-core/src/index.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/api/page-api.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/core/ajax.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/core/graphql.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/page/action.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/page/transform.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/core/module.ts`

### 5.4 本阶段具体任务

#### A. pageProvider 接线

将 `apps/main/src/amis/providers.ts` 的 `getPage()` 改为真实 page provider 接口。

#### B. dictProvider 接线

将 `getDict()` 改为真实字典接口，而不是返回空数组。

#### C. GraphQL DSL 对齐

对照旧仓库 GraphQL 处理逻辑，校准：

- 查询 URL 解析
- 变量映射
- 响应结构标准化
- 错误结构处理

#### D. action / fn / import 对齐

校准：

- `@action:`
- `@fn:`
- `xui:import`
- 作用域与向上查找规则

#### E. 统一 runtime init

`apps/main/src/amis/init.ts` 需要承担真正的初始化职责，而不是只做样式引入。

### 5.5 风险点

- 旧后端 page provider 返回格式与当前 schema 假设可能不完全一致
- GraphQL 响应结构可能强依赖旧仓库中的 `extensions` 约定
- 如果引入更多 amis CSS，可能再次污染宿主样式

### 5.6 验收标准

- 至少一个真实 amis 页面可从真实菜单进入并完整运行
- `dict://`、`page://`、GraphQL 请求可正常工作
- amis 页面中的动作可触发 host 能力

### 5.7 建议验证命令

- `pnpm --filter @nop-chaos/amis-core typecheck`
- `pnpm --filter @nop-chaos/amis-react typecheck`
- `pnpm --filter @nop-chaos/main typecheck`

## 6. Phase 4 - Nop 扩展能力补齐

状态：进行中（`xui:component` 已落地首版）

### 6.1 目标

补齐旧仓库中真正会影响 amis 页面迁移成功率的扩展能力。

### 6.2 当前仓库改造文件

- `packages/amis-core/src/page/transform.ts`
- `packages/amis-core/src/page/processor.ts`
- 视需要新增 `packages/amis-core/src/page/registry.ts`
- 视需要新增宿主组件注册入口

### 6.3 旧仓库参考来源

- `C:/can/nop/nop-chaos/packages/nop-core/src/page/registry.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/page/transform.ts`
- `C:/can/nop/nop-chaos/packages/nop-core/src/page/processor.ts`

### 6.4 本阶段具体任务

#### A. 实现 `xui:component`

这是当前最明确缺失的一项能力。

当前进度：已在 `packages/amis-core/src/page/registry.ts`、`packages/amis-core/src/page/transform.ts` 和 `apps/main/src/amis/init.ts` 中落地首版注册与解析机制。

建议实现：

- 组件注册表
- schema 节点转换钩子
- 宿主 app 注册入口

#### B. 明确 schema-type 是否继续保留扩展位

如果旧仓库中确实使用 `xui:schema-type` 做多渲染器分发，需要评估当前仓库是否保留这层抽象。

#### C. 评估旧 renderer 扩展

如果旧仓库中有自定义 amis renderer：

- 先盘点是否是真业务必需
- 再决定迁入 `packages/amis-react` 还是新的扩展包

### 6.5 风险点

- `xui:component` 一旦设计不好，容易把宿主业务逻辑散落到 schema transform 层
- 自定义 renderer 迁移可能引入更重的 React / amis / 业务耦合

### 6.6 验收标准

- 旧仓库依赖 `xui:component` 的典型页面能迁入
- 宿主组件注册方式明确、可维护

当前仓库内的最小验证入口：

- `apps/main/src/amis/testSchema.ts`
- `apps/main/public/mock/preview.lib.js`

当前 preview schema 已覆盖这些运行时验证点：

- `xui:component`
- `xui:import`
- `@action:`
- `@action:` 带后缀时的作用域查找
- `@fn:` 编译链路

## 7. Phase 5 - 样式与稳定性加固

### 7.1 目标

在能力打通之后，处理 amis 样式兼容、缓存、稳定性、初始化方式等问题。

### 7.2 当前仓库改造文件

- `apps/main/src/amis/init.ts`
- `packages/amis-react/src/components/AmisPageRoute.tsx`
- `packages/amis-core/src/adapter/index.ts`
- 视需要新增 cache / runtime context 相关文件

### 7.3 旧仓库参考来源

- `C:/can/nop/nop-chaos/packages/nop-core/src/api/cache.ts`
- `C:/can/nop/nop-chaos/packages/nop-amis-vue/src/XuiPage.vue`

### 7.4 本阶段具体任务

#### A. amis 样式兼容策略确认

需要明确：

- 是否继续禁用 `amis/lib/helper.css`
- 是否采用局部隔离
- 是否需要样式沙箱

#### B. page / dict / schema 缓存

建议为真实页面接入后补上：

- schema cache
- dict cache
- 可选的 locale 维度 cache key

#### C. route 级容错与重试

为 amis 页面增加：

- 加载失败重试
- 错误恢复
- 可选的 debug 信息

#### D. adapter 生命周期优化

当前 `amis-core` 的 adapter 更接近全局单例，后续需要确认是否足够稳妥。

### 7.5 风险点

- 样式修复可能重新引入宿主污染
- 缓存策略如果过早引入，可能掩盖协议错误

### 7.6 验收标准

- amis 页面样式不污染宿主主壳
- 页面切换与重复访问体验稳定
- 错误恢复路径清晰

## 8. 文件级映射速查表

| 新仓库落点 | 主要目标 | 旧仓库参考 |
|---|---|---|
| `apps/main/src/store/authStore.ts` | token/user/bootstrap 状态模型 | `packages/nop-site/src/store/modules/user.ts` |
| `apps/main/src/hooks/useAuth.ts` | 启动恢复与 logout 收口 | `packages/nop-site/src/store/modules/user.ts`, `packages/nop-site/src/router/guard/permissionGuard.ts` |
| `apps/main/src/services/` | 登录/登出/当前用户/菜单接口 | `packages/nop-site/src/api/sys/user.ts`, `packages/nop-site/src/api/sys/menu.ts` |
| `apps/main/src/hooks/useMenuConfig.ts` | 菜单 query 切换为真实接口 | `packages/nop-site/src/api/sys/menu.ts` |
| `packages/shared/src/utils/menuConfig.ts` | 菜单模型转换与校验 | `packages/nop-site/src/api/sys/model/menuModel.ts`, `packages/nop-site/src/router/helper/routeHelper.ts` |
| `apps/main/src/router/AppRoutes.tsx` | 真实菜单驱动路由生成 | `packages/nop-site/src/store/modules/permission.ts` |
| `apps/main/src/router/RouteRenderer.tsx` | 保持 builtin/plugin/amis 分流 | `packages/nop-site/src/router/helper/routeHelper.ts` |
| `apps/main/src/amis/providers.ts` | pageProvider/dictProvider 接线 | `packages/nop-core/src/api/page-api.ts` |
| `apps/main/src/amis/adapter.ts` | 宿主能力与真实 auth/menu 对齐 | `packages/nop-site/src/nop/initNopApp.ts` |
| `packages/amis-core/src/core/ajax.ts` | 请求协议、401、response 处理 | `packages/nop-core/src/core/ajax.ts` |
| `packages/amis-core/src/core/graphql.ts` | GraphQL DSL 对齐 | `packages/nop-core/src/core/graphql.ts` |
| `packages/amis-core/src/page/action.ts` | `@action:` / `@fn:` / `xui:import` | `packages/nop-core/src/page/action.ts` |
| `packages/amis-core/src/page/transform.ts` | `xui:roles` / `xui:component` | `packages/nop-core/src/page/transform.ts` |

## 9. 推荐执行方式

建议按批次推进，每一批都：

- 单独提交
- 单独验证
- 单独更新文档

不要同时做：

- auth 改造
- 菜单模型改造
- amis 协议改造

否则问题定位会非常困难。

## 10. 下一步建议

完成本文档后，最自然的下一步是直接进入 Phase 1。

建议按以下顺序开始实作：

1. 用真实后端接口验证当前 auth/menu/page/dict 首版接线是否命中正确返回结构
2. 校准 `xui:import`、`@action:` 与作用域规则
3. 用至少一个真实 amis 页面完成端到端联调
4. 再处理样式隔离、缓存和稳定性收尾
