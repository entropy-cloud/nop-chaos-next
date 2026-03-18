# Mock 数据要求

> 本文档描述开发环境中 Mock 数据的要求和控制方式。

---

## 1. 必须 Mock 的数据

### 1.1 数据类型列表

| 数据类型 | 说明 | 关联模块 |
|---------|------|----------|
| 仪表盘指标和图表数据 | 支持时间范围过滤 | Dashboard |
| 流程列表与流程详情 | 完整的流程结构 | Flow Editor |
| 插件列表与状态 | 至少一个 demo 插件 | Plugins |
| AI 助手的回复文本 | 支持流式输出 | AI Workbench |
| 菜单配置数据 | 符合 `MenuItem` 结构 | Navigation |
| 用户信息 | 符合 `User` 结构 | Auth |
| 主子表数据 | 主表 + 多个子表 | Master-Detail |

---

## 2. Mock 控制方式

### 2.1 环境变量

```bash
VITE_ENABLE_MOCK=true  # 启用 Mock
VITE_ENABLE_MOCK=false # 禁用 Mock
```

主应用已提供专用启动命令：

```bash
pnpm dev:mock
```

该命令会启动 `@nop-chaos/main` 的 `mock` mode，并加载 `apps/main/.env.mock`。

### 2.2 默认行为

| 环境 | 默认状态 |
|------|----------|
| `pnpm dev` / `pnpm dev:main` | 读取本地 env，按当前配置运行 |
| `pnpm dev:mock` | 强制启用 Mock |
| 生产构建 | 默认禁用 Mock，除非显式注入 env |

### 2.3 当前主应用覆盖范围

- `VITE_ENABLE_MOCK=true` 时，登录、当前用户、登出不访问后台 HTTP
- 菜单、amis page provider、amis dict provider 会走 mock 分支
- dashboard、flow editor、master-detail、plugin management、ai workbench 等演示页继续使用本地 mock 数据
- 仍会读取前端静态资源，如 `/data/menu-config.json` 或本地 schema 文件；这属于前端资源加载，不是访问后台业务接口

---

## 3. Mock 数据场景覆盖

### 3.1 场景要求

Mock 数据需要足够丰富，支持各种场景：

| 场景 | 说明 |
|------|------|
| 正常数据 | 标准的、完整的数据 |
| 空数据 | 空列表、空状态 |
| 错误数据 | 模拟接口错误 |
| 大量数据 | 用于测试性能和分页 |
| 边界数据 | 极端值、特殊字符 |

---

## 4. Mock 实现方式

### 4.1 推荐工具

- Mock Service Worker (MSW)

### 4.2 文件结构

```
apps/main/src/
├── mocks/
│   ├── handlers/
│   │   ├── dashboard.ts
│   │   ├── flow.ts
│   │   ├── plugins.ts
│   │   ├── ai.ts
│   │   ├── menu.ts
│   │   ├── auth.ts
│   │   └── master-detail.ts
│   ├── data/
│   │   ├── dashboard.ts
│   │   ├── flows.ts
│   │   ├── plugins.ts
│   │   └── ...
│   └── browser.ts
```

---

## 5. 各模块 Mock 数据示例

### 5.1 仪表盘数据

```typescript
// mocks/data/dashboard.ts
export const dashboardMetrics = {
  todayRequests: { value: 12580, trend: '+12.5%', up: true },
  successRate: { value: '99.2%', trend: '+0.3%', up: true },
  avgResponseTime: { value: '45ms', trend: '-5ms', up: false },
  activeSessions: { value: 342, trend: '+28', up: true }
};

export const trendData = [
  { date: '2024-01-01', requests: 8500, success: 8400, error: 100 },
  // ... 7天数据
];
```

### 5.2 流程数据

```typescript
// mocks/data/flows.ts
export const flows = [
  {
    id: 'flow-1',
    name: '用户注册流程',
    description: '新用户注册验证流程',
    status: 'enabled',
    nodes: [...],
    edges: [...],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  // ... 更多流程
];
```

### 5.3 AI 回复（流式）

```typescript
// mocks/handlers/ai.ts
// 使用定时器模拟流式输出
const simulateStreamOutput = async (message: string, onChunk: (chunk: string) => void) => {
  const words = message.split(' ');
  for (const word of words) {
    await new Promise(resolve => setTimeout(resolve, 100));
    onChunk(word + ' ');
  }
};
```

### 5.4 主子表数据

```typescript
// mocks/data/master-detail.ts
export const orders = [
  {
    id: 'order-1',
    orderNo: 'ORD-2024-001',
    customerName: '张三',
    status: 'completed',
    items: [
      { id: 'item-1', productName: '商品A', quantity: 2, unitPrice: 100 },
      { id: 'item-2', productName: '商品B', quantity: 1, unitPrice: 200 },
    ],
    addresses: [
      { id: 'addr-1', receiverName: '张三', phone: '13800138000', province: '北京', city: '北京', address: 'xxx街道', isDefault: true },
    ],
    logistics: [
      { id: 'log-1', company: '顺丰', trackingNo: 'SF123456', status: '已签收', estimatedDelivery: '2024-01-18' },
    ]
  },
  // ... 更多订单
];
```
