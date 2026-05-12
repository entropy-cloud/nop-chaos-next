# Mock 数据

> 本文档描述 mock 数据的组织方式、环境变量控制和使用场景。

---

## 1. 启动方式

### 推荐命令

```bash
pnpm dev:mock
```

实际执行 `vite --mode mock`，加载 `.env.mock` 配置。

### 环境变量

```env
VITE_ENABLE_MOCK=true
```

| 场景                         | 行为            |
| ---------------------------- | --------------- |
| `pnpm dev` / `pnpm dev:main` | 按当前 env 运行 |
| `pnpm dev:mock`              | 进入 mock 模式  |
| 生产构建                     | 默认不启用 mock |

---

## 2. 目录结构

```text
apps/main/src/services/
  mockApi.ts              # 统一导出入口
  mockApi/
    aiWorkbench.ts       # AI 工作台数据
    auth.ts              # 认证数据
    dashboard.ts         # 仪表板数据
    flow.ts              # 流程数据
    menu.ts              # 菜单配置
    orders.ts            # 订单数据
    plugins.ts           # 插件数据
    shared.ts            # 共享工具函数
    types.ts             # 类型定义
```

---

## 3. Mock 覆盖范围

| 模块      | 文件                     | 说明                 |
| --------- | ------------------------ | -------------------- |
| 认证      | `mockApi/auth.ts`        | 登录、登出、用户信息 |
| 菜单      | `mockApi/menu.ts`        | 菜单配置             |
| 仪表板    | `mockApi/dashboard.ts`   | 指标、趋势数据       |
| 流程      | `mockApi/flow.ts`        | 流程文档数据         |
| 订单      | `mockApi/orders.ts`      | 订单数据             |
| 插件      | `mockApi/plugins.ts`     | 插件列表             |
| AI 工作台 | `mockApi/aiWorkbench.ts` | AI 会话数据          |

---

## 4. 数据持久化

部分 mock 数据支持 localStorage 持久化（如流程数据），便于页面刷新后保留演示状态。

工具函数（`mockApi/shared.ts`）：

- `wait<T>(value, ms)` - 模拟网络延迟
- `readStoredJson` / `writeStoredJson` - localStorage 读写

---

## 5. 适用场景

### 适合使用 mock

- UI 演示和开发
- 页面联调前的结构验证
- 本地开发避免依赖真实后端

### 不适合使用 mock

- 验证真实接口字段结构
- 验证真实鉴权与会话恢复
- 验证 amis schema/dict 协议兼容性

这些场景应参考：`docs/16-backend-integration.md`
