# AMIS 与 Flux JSON 原型调试 Demo

> 本文档描述两个 demo extension 的设计：一个为 AMIS 提供 JSON 原型即时渲染，另一个为 Flux 提供相同能力。

---

## 1. 背景与目的

当前主项目已经支持 `pageType: 'amis'` 和 `pageType: 'flux'` 两种运行时页面类型，但在原型开发阶段存在以下摩擦：

- 需要手动编辑 `menu-config.json` 并重启 dev server 才能看到新页面
- 每个原型页面 JSON 文件需要手动放到 `public/` 或服务端路径
- 缺少一个"改 JSON → 即时预览"的最小循环
- AMIS 和 Flux 的原型调试路径不一致

这两个 demo 解决的是同一件事：让开发者在一个可配置的目录下放置 `menu.json` 和若干页面 JSON 文件，由 mock server 统一 serving，宿主 extension 自动加载并渲染。

---

## 2. 约束

1. 两个 demo 分别为独立的 `examples/` 目录项目，不相互依赖
2. AMIS demo 依赖主项目的 AMIS 运行时（`@nop-chaos/amis-react`、`@nop-chaos/amis-core`）
3. Flux demo 依赖 `@nop-chaos/flux` facade 包
4. mock server 通过 Vite plugin 实现，不污染主项目构建图
5. 页面 JSON 文件按约定目录放置，不做运行时动态扫描（dev server 可 watch）
6. 两个 demo 遵循已有的 `examples/extension-demo` 结构模式
7. 只使用 nop 平台标准 `MenuResponse` 格式，不新增菜单格式变体

---

## 3. 共享概念

### 3.1 `menu.json` 格式

使用 nop 平台标准 `MenuResponse` 格式（与 `apps/main/public/data/menu-config.json` 一致）：

```json
{
  "home": "/demo/page-1",
  "items": [
    {
      "id": "demo-page-1",
      "title": "Demo Page 1",
      "path": "/demo/page-1",
      "icon": "file-text",
      "pageType": "amis",
      "schemaPath": "./pages/page1.json"
    },
    {
      "id": "demo-page-2",
      "title": "Demo Page 2",
      "path": "/demo/page-2",
      "pageType": "flux",
      "schemaPath": "./pages/page2.json"
    }
  ]
}
```

- `schemaPath` 相对于 `menu.json` 所在目录
- `pageType` 为 `"amis"` 或 `"flux"` 取决于使用的 demo
- 支持嵌套 children 和 `hideInMenu` 等标准字段

### 3.2 目录布局约定

```
prototypes/
  my-prototype-1/
    menu.json              ← 菜单定义
    pages/
      page1.json           ← AMIS 或 Flux schema JSON
      page2.json
    assets/                ← 可选：图片等静态资源
```

该目录通过环境变量 `VITE_PROTOTYPE_DIR` 配置，指向任意本地路径。

### 3.3 Mock Server 设计

每个 demo 自带一个 Vite plugin，在 dev 模式下：

1. 读取 `VITE_PROTOTYPE_DIR/menu.json`
2. 为每个 `schemaPath` 注册虚拟路由，返回对应 JSON 文件内容
3. 使用 `server.watch` 监听 `menu.json` 和页面 JSON 文件变化
4. 文件变化时通知宿主 extension 刷新（通过 WebSocket HMR 或 extension store）

Mock server 不需要在产品构建中运行。

#### 路由映射

| 请求路径                          | 来源                                |
| --------------------------------- | ----------------------------------- |
| `GET /api/prototype/menu.json`    | `{VITE_PROTOTYPE_DIR}/menu.json`    |
| `GET /api/prototype/pages/*.json` | `{VITE_PROTOTYPE_DIR}/pages/*.json` |
| `GET /api/prototype/assets/*`     | `{VITE_PROTOTYPE_DIR}/assets/*`     |

#### 与已有 Mock 中间件共存

`dms-prototype` 这类独立项目通常自带 mock API（如 `mock/index.mjs`，提供 `/api/mock/*` 端点给 AMIS schema 中的 `api` 调用）。Vite plugin **不应覆盖或禁用**这些已有中间件，而是：

1. 不接管 `/api/mock/*` 路径
2. 仅注册 `/api/prototype/*` 等专属前缀
3. 如果原型目录下存在 `mock/` 子目录，自动将其中的 middleware 加载到 dev server 中

这样开发者可以指向一个已有原型目录，无需改动 mock API 代码。

#### 页面 JSON 中的 `x:extends` 解析

加载页面 JSON 时，mock server 会递归解析每个节点的 `x:extends` 属性，实现 Nop 平台标准的 Delta 差量合并（详见 §3.4）。例如：

```json
{
  "x:extends": "./base-page.json",
  "title": "覆盖后的标题",
  "body": {
    "x:override": "replace",
    "type": "form",
    ...
  }
}
```

加载 `./pages/page1.json` 时，如果它包含 `x:extends`，server 会先加载被引用的文件，执行 delta 合并后再返回结果。`x:extends` 指向的路径相对于 `pages/` 目录。

#### HMR 通知

文件变化时，Vite plugin 通过 `server.ws.send` 发送自定义事件，extension 内的 store 订阅该事件后重新 fetch 菜单和页面 JSON。

### 3.4 `x:extends` Delta 合并机制

原型页面 JSON 支持 `x:extends` 属性，实现 Nop 平台可逆计算理论中的 Delta 差量合并。这是一种页面分解机制：将一个页面拆分为基础模板 + 多个差量覆盖文件。

#### 核心规则

1. **`x:extends`** 的值是相对于当前 JSON 文件的路径，指向一个或多个基础 JSON（逗号分隔，右侧覆盖左侧）
2. **合并顺序**：被引用的基础文件先合并，然后当前文件覆盖其上的同名属性；对同一节点，当前文件的属性优先级最高
3. **`x:override`** 控制当前节点如何覆盖基础节点

#### `x:override` 算子

| 值              | 语义                                                           |
| --------------- | -------------------------------------------------------------- |
| `merge`（缺省） | 递归合并子属性：同名属性覆盖，同名子对象递归合并，新增属性追加 |
| `replace`       | 当前节点完全替换基础模型中的对应节点                           |
| `remove`        | 从结果中删除该节点                                             |
| `bounded-merge` | 与 `merge` 类似，但只保留基础模型和当前模型中都存在的子属性    |
| `merge-replace` | 合并第一层属性，但子对象或内容完全替换                         |

#### 合并示例

```json
// base-page.json
{
  "type": "page",
  "title": "基础页面",
  "body": {
    "type": "service",
    "api": "/api/mock/data",
    "body": { "type": "table", "columns": [...] }
  }
}
```

```json
// derived-page.json
{
  "x:extends": "./base-page.json",
  "title": "派生页面",
  "body": {
    "body": {
      "x:override": "replace",
      "type": "form",
      "api": "/api/mock/form-data"
    }
  }
}
```

合并结果：

```json
{
  "type": "page",
  "title": "派生页面",              ← 覆盖
  "body": {
    "type": "service",             ← 继承
    "api": "/api/mock/data",       ← 继承
    "body": {
      "type": "form",              ← replace，整个 body.body 被替换
      "api": "/api/mock/form-data"
    }
  }
}
```

#### 数组合并策略

数组项按 `id` 字段匹配合并（与 Nop 平台 `xdef:key-attr` 逻辑一致）。如果数组元素的 `id` 匹配，则递归合并；否则追加到末尾。

#### `x:extends` 链式组合

支持多级继承：

```json
// page-a.json
{ "x:extends": "./common.json", ... }

// page-b.json
{ "x:extends": "./page-a.json", ... }
```

合并链为：`page-b x-extends page-a x-extends common`，右侧的 common 最先合并，page-b 最后覆盖。

#### 合并后清理

合并完成后，所有 `x:*` 开头的属性（`x:extends`、`x:override`、`x:prototype` 等）自动从结果中删除，不传递到 AMIS 或 Flux 渲染引擎。

---

#### `x:prototype` 同层克隆

除 `x:extends` 外，还支持 `x:prototype`：在当前 JSON 对象的同层兄弟中，按 `id` 找到匹配节点，克隆作为模板，再应用当前节点的覆盖。

```json
{
  "forms": [
    { "id": "edit", "title": "编辑", "body": [...] },
    {
      "id": "add",
      "x:prototype": "edit",
      "title": "新增"
    }
  ]
}
```

`x:prototype` 合并发生在 `x:extends` 链合并**之后**，使用 `x:prototype-override` 控制合并行为（算子与 `x:override` 相同）。

---

## 4. AMIS JSON 原型 Demo

### 4.1 标识与定位

- 目录：`examples/amis-prototype-demo/`
- 包名：`@nop-chaos/example-amis-prototype`
- extension id：`example-amis-prototype`

### 4.2 Extension 职责

作为一个 `ShellExtension`，它负责：

| 职责                            | 实现                                            |
| ------------------------------- | ----------------------------------------------- |
| 从 mock server 获取 `menu.json` | 启动时 fetch `/api/prototype/menu.json`         |
| 将菜单项注入宿主左侧导航        | 通过 `userMenuItems` 注册                       |
| 路由到对应 AMIS 页面            | 使用 `pageType: 'amis'` + `schemaPath`          |
| 监听 HMR 事件并刷新菜单         | 通过 WebSocket 或 polling                       |
| 展示原型名称作为 shell 配置     | `branding.name` 从 menu.json 中 `home` 字段覆盖 |

### 4.3 启动命令

```bash
# 主应用联调模式（含 mock server）
pnpm dev:main:amis-prototype
```

依赖环境变量：

```env
VITE_ENABLE_MOCK=true
VITE_PROTOTYPE_DIR=../prototypes/my-prototype-1
```

### 4.4 与现有 AMIS 路由的关系

复用 `apps/main/src/router/RouteRenderer.tsx` 中 `pageType === 'amis'` 的分支，由 `AmisRouteEntry` → `AmisRouteRenderer` → `AmisPageRoute` 渲染。

不需要新增 AMIS 渲染组件。

---

## 5. Flux JSON 原型 Demo

### 5.1 标识与定位

- 目录：`examples/flux-prototype-demo/`
- 包名：`@nop-chaos/example-flux-prototype`
- extension id：`example-flux-prototype`

### 5.2 Extension 职责

与 AMIS demo 对称：

| 职责                            | 实现                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| 从 mock server 获取 `menu.json` | 同 AMIS demo                                                |
| 将菜单项注入宿主左侧导航        | 通过 `userMenuItems` 注册                                   |
| 路由到对应 Flux 页面            | 使用 `pageType: 'flux'` + `schemaPath`                      |
| 监听 HMR 事件并刷新菜单         | 同 AMIS demo                                                |
| 初始化 Flux 运行时              | 调用 `ensureFluxRuntime()` 确保 Flux CSS 和 renderer 已注册 |

### 5.3 启动命令

```bash
pnpm dev:main:flux-prototype
```

依赖环境变量（与 AMIS demo 共用 `VITE_PROTOTYPE_DIR`）：

```env
VITE_ENABLE_MOCK=true
VITE_PROTOTYPE_DIR=../prototypes/my-prototype-2
```

### 5.4 与现有 Flux 路由的关系

复用 `apps/main/src/router/RouteRenderer.tsx` 中 `pageType === 'flux'` 的分支，由 `FluxRouteEntry` → `FluxRouteRenderer` → `FluxSchemaRenderer` 渲染。

需要注意 `FluxRouteRenderer` 中直接访问的 `schemaPath` 现在是 mock server URL（如 `/api/prototype/pages/page1.json`），而不再是 `mock://flux-demo`。现有的 `fetchFluxPage` 已支持 `.json` 结尾的 schemaPath，因此可直接复用。

---

## 6. 共享的 Vite Plugin

两个 demo 的 mock server 功能抽取为独立的 Vite plugin，放在 `packages/vite-plugin-prototype-server/`：

```ts
interface PrototypeServerOptions {
  dir: string; // VITE_PROTOTYPE_DIR 的解析值
  prefix?: string; // 路由前缀，默认 '/api/prototype'
}

// 注册虚拟路由
// 1. GET {prefix}/menu.json → 返回 {dir}/menu.json
// 2. GET {prefix}/pages/:file → 返回 {dir}/pages/{file}（含 x:extends 解析）
// 3. WebSocket HMR: 监听 {dir}/ 下的 JSON 变化
```

返回页面 JSON 前，使用 `@nop-chaos/delta-merge` 递归解析 `x:extends`，合并后返回纯 JSON（不含 `x:*` 属性）。

该 plugin 在 `apps/main/vite.config.ts` 条件引入（仅在 `VITE_PROTOTYPE_DIR` 设置时启用）。

---

## 7. Delta Merge 核心包

Delta 合并算法抽取为独立包 `packages/delta-merge/`，包名 `@nop-chaos/delta-merge`。

### 7.1 定位

纯 JSON 差量合并引擎，不依赖 React、Vite 或任何运行时框架。可被 `vite-plugin-prototype-server`、测试工具或任何需要 JSON 合并的地方独立使用。

### 7.2 API

```ts
// 合并一个 JSON 节点，递归解析 x:extends
function mergeNode(node: unknown, options: MergeOptions): unknown;

interface MergeOptions {
  // 加载 x:extends 引用的 JSON 文件
  loader: (path: string) => Promise<unknown>;
  // 当前节点所在目录（用于解析相对路径）
  baseDir: string;
}
```

### 7.3 算法流程

```
function mergeNode(node, { loader, baseDir }):
  1. 如果 node 不是对象或 null，直接返回 node
  2. 如果 node 包含 x:extends:
     a. 解析 x:extends 值的路径列表（逗号分隔，右侧优先）
     b. 对每个路径，调用 loader 加载，递归 mergeNode（支持链式继承）
     c. 将多个基础结果按顺序合并：result = 空对象，(result = merge(result, loaded[i]))
  3. 对于 node 中的每个属性 k:
     a. 如果 k 是 x:prototype，暂不处理
     b. 如果 k 以 x: 开头且 k 不是 x:prototype，跳过（合并后清理）
     c. 否则调用 mergeProperty(result[k], node[k], node.x:override 或 k 上的 x:override)
  4. 对 x:prototype 进行第二阶段合并
  5. 删除结果中所有 x: 开头的属性
  6. 返回 result
```

### 7.4 `mergeProperty` 规则

```ts
function mergeProperty(baseVal, derivedVal, overrideOp = 'merge'):
  if overrideOp === 'replace':
    return deepClone(derivedVal)
  if overrideOp === 'remove':
    return undefined  // 从结果中删除
  if overrideOp === 'merge-replace':
    // 如果都是对象，合并第一层属性后替换子内容
    if both objects: return { ...baseVal, ...derivedVal }
    return deepClone(derivedVal)
  if overrideOp === 'bounded-merge':
    // 递归合并，但只保留 base 和 derived 中都存在的 key
    if both objects:
      result = {}
      for k in intersection(baseVal.keys, derivedVal.keys):
        result[k] = mergeProperty(baseVal[k], derivedVal[k])
      return result
    return deepClone(derivedVal)
  if overrideOp === 'merge' (default):
    // 默认合并
    if both are scalars: return derivedVal
    if both are arrays: return mergeArray(baseVal, derivedVal)
    if both are objects: return mergeObjects(baseVal, derivedVal)
    return deepClone(derivedVal)
```

### 7.5 `mergeArray` 规则

```ts
function mergeArray(baseArr, derivedArr):
  按 id 建立 base 索引: Map<id, item>
  结果 = []
  遍历 derivedArr:
    如果 item 有 x:override === 'remove':
      从 base 索引中删除对应 id 的项
    如果 item 有 id 且 id 在 base 索引中:
      递归 mergeNode 合并 base 和 derived
      从 base 索引中移除已处理的项
      push 到结果
    否则:
      push deepClone(item) 到结果
  // 保留 base 中未被 derived 覆盖或删除的项
  for 剩余 base items:
    if item 不含 x:override === 'remove':
      push deepClone(item) 到结果
  return 结果
```

### 7.6 测试策略

```ts
// 核心合并逻辑的单元测试，覆盖：
// - 标量覆盖
// - 对象递归合并
// - x:override: replace / remove / bounded-merge / merge-replace
// - 数组合并（按 id 匹配）
// - x:extends 链式继承（A -> B -> C）
// - x:prototype 同层克隆
// - 合并后 x:* 属性清理
// - 循环引用检测
```

---

## 8. 依赖关系

```
nop-chaos-next/
  apps/main/
    vite.config.ts ──────── 条件引入 vite-plugin-prototype-server
    src/router/
      RouteRenderer.tsx ─── 已有：pageType 分发（两个 demo 无需修改）
  packages/
    delta-merge/ ────────── @nop-chaos/delta-merge，纯 JSON 差量合并引擎
    vite-plugin-prototype-server/ ── 依赖 @nop-chaos/delta-merge
  examples/
    amis-prototype-demo/ ── 依赖 @nop-chaos/shared（类型）、ShellExtension 合同
    flux-prototype-demo/ ── 依赖 @nop-chaos/shared、@nop-chaos/flux（渲染）
  prototypes/ (gitignored) ─ 用户侧原型目录
```

`@nop-chaos/delta-merge` 是纯逻辑包，零外部依赖。
`vite-plugin-prototype-server` 依赖 `@nop-chaos/delta-merge`，作为 `apps/main` 的 devDependency。
两个 demo extension 不引入新的 package 依赖（除 `@nop-chaos/flux` 已作为主项目依赖）。

---

## 9. 选择理由

| 决策                     | 选择                          | 替代方案及排除原因                                                          |
| ------------------------ | ----------------------------- | --------------------------------------------------------------------------- |
| mock server 形式         | Vite plugin                   | 独立 Express 服务需要额外端口和代理配置，增加 setup 成本                    |
| 目录配置方式             | 环境变量 `VITE_PROTOTYPE_DIR` | 固定目录不够灵活，运行时配置需要后端支持                                    |
| 菜单注入方式             | Extension `userMenuItems`     | 直接修改 `menu-config.json` 需要开发者手动编辑，且 dev server 不 watch      |
| 页面 JSON 路径           | 相对于 `menu.json` 目录       | 绝对路径在跨机器时失效，相对路径可保持原型目录可移动                        |
| 共享 plugin 还是各写一个 | 共享                          | 两个 demo 的 mock server 逻辑完全相同，抽离避免重复                         |
| delta-merge 独立包       | `packages/delta-merge/`       | 内联在 Vite plugin 中会导致算法不可单独测试和复用；独立包可被任意消费方使用 |
| `x:extends` 解析时机     | Vite plugin 加载 JSON 时      | 在浏览器端解析需要额外加载基础文件，增加网络延迟；服务端解析后返回纯 JSON   |

---

## 10. 实体验证：`dms-prototype`

已有独立项目 `C:\can\sources\dms-prototype` 是真实场景的实例。它的结构：

```
dms-prototype/
├── public/
│   ├── menu.json          ← Flat Array 格式（格式 B）
│   └── pages/
│       ├── dashboard.json ← AMIS schema
│       ├── register.json
│       ├── initiate-chargeback.json
│       ├── collaboration.json
│       ├── mastercom-queue.json
│       ├── sp-prearb-arb.json
│       ├── compliance-to-risk.json
│       └── node-task-config.json
├── mock/
│   └── index.mjs          ← Vite middleware, 提供 /api/mock/* 假数据
├── src/
│   ├── main.tsx           ← 独立 AMIS 渲染入口
│   └── App.tsx            ← 读取 menu.json, 侧栏 + AMIS render
└── vite.config.ts
```

如果要将 `dms-prototype` 接入本 demo，需要将其 `menu.json` 转换为标准 `MenuResponse` 格式：

```json
{
  "home": "/demo/dashboard",
  "items": [
    {
      "id": "dashboard",
      "title": "DMS 争议管理系统",
      "path": "/demo/dashboard",
      "icon": "home",
      "pageType": "amis",
      "schemaPath": "./pages/dashboard.json"
    },
    {
      "id": "register",
      "title": "争议注册",
      "path": "/demo/register",
      "icon": "file-text",
      "pageType": "amis",
      "schemaPath": "./pages/register.json"
    }
  ]
}
```

`pages/` 目录下的 8 个 AMIS schema JSON 文件、`mock/index.mjs` 的 `/api/mock/*` 假数据都无需改动。转换后：

1. Prototype server 提供 `/api/prototype/menu.json` 和 `/api/prototype/pages/*.json`
2. `dms-prototype/mock/index.mjs` 自动挂载，AMIS schema 中引用的 `/api/mock/*` 继续正常响应
3. Extension 将菜单注入宿主导航，点击后由 `AmisRouteRenderer` 渲染
4. 修改 `pages/*.json` 后 HMR 触发重新渲染

不需要运行 `dms-prototype` 自身的 dev server（后者是 React 18 + 独立 `amis.render()`，不经过宿主路由）。

---

## 11. 相关文档

- [Extension 系统](./extension-system.md)
- [AMIS 与 Flux 双渲染引擎集成](./amis-flux-rendering-engine-integration.md)
- [插件开发规范](../examples/plugin-dev-guide.md)
- [Extension 生成器](../examples/extension-generator.md)
