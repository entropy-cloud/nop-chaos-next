# Mock 数据说明

> 本文档描述当前仓库里的 mock 运行方式、数据入口和适用范围。当前实现以 `apps/main/src/services/mockApi/*` 为主，不使用 MSW 作为主链路。

---

## 1. 当前结论

- 主应用通过环境变量 `VITE_ENABLE_MOCK` 控制 mock 开关
- 推荐使用 `pnpm dev:mock` 启动主应用 mock 模式
- 当前 mock 数据主入口是 `apps/main/src/services/mockApi.ts`
- 具体数据按领域拆分在 `apps/main/src/services/mockApi/*`
- mock 既覆盖认证、菜单、amis provider 回退，也覆盖演示页面数据

---

## 2. 启动方式

### 2.1 推荐命令

```bash
pnpm dev:mock
```

对应主应用脚本位置：`apps/main/package.json`

该命令实际执行：

```bash
vite --mode mock
```

### 2.2 环境变量

```env
VITE_ENABLE_MOCK=true
```

默认约定：

| 场景 | 行为 |
|------|------|
| `pnpm dev` / `pnpm dev:main` | 按当前本地 env 运行 |
| `pnpm dev:mock` | 进入 mock 模式 |
| 生产构建 | 默认不应启用 mock，除非显式注入 env |

---

## 3. 当前 mock 覆盖范围

### 3.1 认证

相关文件：

- `apps/main/src/services/authApi.ts`
- `apps/main/src/services/mockApi/auth.ts`

开启 mock 时：

- 登录走 `mockLoginWithPassword(...)`
- 当前用户信息走 `fetchMockCurrentUser(...)`
- 登出走 `mockLogoutRequest()`

### 3.2 菜单

相关文件：

- `apps/main/src/services/menuApi.ts`
- `apps/main/src/services/mockApi/menu.ts`

开启 mock 时：

- 菜单由本地 mock 数据返回
- 返回结果仍会继续经过系统内置菜单合并逻辑

### 3.3 amis page / dict 回退

相关文件：

- `apps/main/src/amis/providers.ts`

当前行为：

- `mock://preview` 固定返回内置测试 schema
- dict provider 在 mock 模式下返回空数组结构，作为低风险回退
- 真实 page provider / dict provider 联调时，应关闭 mock

### 3.4 演示页面数据

当前 mock 聚合入口：`apps/main/src/services/mockApi.ts`

已包含：

- `mockApi/dashboard.ts`
- `mockApi/flow.ts`
- `mockApi/orders.ts`
- `mockApi/plugins.ts`
- `mockApi/aiWorkbench.ts`

这些数据主要服务于：

- Dashboard
- Flow Editor
- Master-Detail
- Plugins Management
- AI Workbench

---

## 4. 当前目录结构

```text
apps/main/src/services/
  mockApi.ts
  mockApi/
    aiWorkbench.ts
    auth.ts
    dashboard.ts
    flow.ts
    menu.ts
    orders.ts
    plugins.ts
    shared.ts
    types.ts
```

说明：

- `mockApi.ts` 是统一导出入口
- `mockApi/shared.ts` 提供 wait、本地存储读写等通用辅助方法
- `mockApi/types.ts` 放 mock 相关类型
- 每个领域模块维护自己的 seed 数据和读取逻辑

---

## 5. 数据组织约定

### 5.1 建议遵循的规则

- 每个业务域单独一个 mock 文件
- 能复用共享类型时，优先复用 `@nop-chaos/shared`
- 允许使用 `localStorage` 做轻量持久化，便于页面刷新后保留演示状态
- 模拟异步时统一使用共享的延迟方法，避免页面交互表现过于“瞬时”

### 5.2 当前已有示例

例如插件数据：`apps/main/src/services/mockApi/plugins.ts`

当前实现包含：

- `seedPluginManifests`
- `getPluginSeeds()`
- `persistPluginSeeds(...)`
- `fetchPluginList()`

这种模式适合继续扩展到其他演示数据。

---

## 6. 适用边界

mock 适合用于：

- UI 演示
- 页面联调前的结构验证
- 本地开发时避免依赖真实后端
- 演示复杂交互状态，例如插件启停、流程编辑、AI 会话等

mock 不适合用于：

- 验证真实接口字段结构
- 验证真实鉴权与会话恢复链路
- 验证真实 amis schema / dict / action 协议兼容性

这些场景应参考：`docs/16-nop-chaos-integration-checklist.md`

---

## 7. 后续维护建议

- 新增演示页面时，优先在 `apps/main/src/services/mockApi/` 下补领域文件
- 不要把未采用的 MSW 目录结构写成当前事实
- 如果未来真的切换到 MSW，应新建文档说明迁移，而不是继续沿用本文
