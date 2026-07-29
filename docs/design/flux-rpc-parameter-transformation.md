# Flux RPC 参数变换设计

> Flux 模式下，后端 API 调用走 REST RPC 路径（`POST /r/OperationName`），
> 参数需要从 CRUD 控件的 `page`/`perPage`/`filter_XX` 格式变换为后端
> Nop RPC 协议要求的 `{ query: { offset, limit, filter }, data: {...} }` 格式。
>
> 本文档定义变换逻辑，不依赖 AMIS 的 `transformGraphQLRequest` 实现，
> 但遵循相同的参数构建模式。

---

## 1. 整体流程

```
flux CRUD dispatch
    │
    ├─ api.url = "/r/NopAuthUser__findPage?page=1&perPage=10&@selection=..."
    │  api.data = { query: { filter: {...} } }
    │
    ▼
nopRpcRequest()          ← flux fetcher 入口
    │
    ├─ 解析 api.url，提取：
    │   ├─ operationName = "NopAuthUser__findPage"
    │   ├─ 查询参数 { page: "1", perPage: "10" }
    │   └─ @selection（如有）
    │
    ├─ 合并 api.data 和查询参数：
    │   data = { query: { filter: {...} }, page: "1", perPage: "10" }
    │
    ├─ 标准操作名提取：
    │   stdOp = getStdOperationName("NopAuthUser__findPage")
    │         → "findPage"（lastIndexOf('_') 截取）
    │
    ├─ operationRegistry 查找：
    │   "findPage" → [{ name: "query", type: "QueryBeanInput", builder: argQuery }]
    │
    ├─ 对每个参数应用 builder：
    │   variables.query = argQuery(data, arg, options)
    │                  → { offset: 0, limit: 10, filter: {...} }
    │
    ├─ 构建 POST body：
    │   { query: { offset: 0, limit: 10, filter: {...} } }
    │
    ▼
POST /r/NopAuthUser__findPage   ← body 已符合后端格式
```

---

## 2. 核心变换规则

### 2.1 URL 解析

输入 URL 有两种格式：

| 格式 | 示例 | 来源 |
|------|------|------|
| `@query:OperationName?params` | `@query:NopAuthUser__findPage?page=1` | AMIS 组件 |
| `/r/OperationName?params` | `/r/NopAuthUser__findPage?page=1` | Flux CRUD |

两种格式都需要提取：
- **operationName**: 完整操作名（如 `NopAuthUser__findPage`）
- **查询参数**: URL 中 `?` 后的键值对
- **@selection**: 特殊参数，用于指定返回字段选择

URL 查询参数与 `api.data` 合并后作为统一的参数源。

### 2.2 标准操作名提取

```typescript
function getStdOperationName(fullName: string): string {
  // NopAuthUser__findPage → findPage
  // NopAuthUser__admin_findPage → findPage
  const idx = fullName.lastIndexOf('_');
  return idx > 0 ? fullName.slice(idx + 1) : fullName;
}
```

`lastIndexOf('_')` 而非 `endsWith('__findPage')`——这是为了兼容 `admin_findPage` 等双下划线前的多段命名。

### 2.3 操作注册表

每个标准操作名对应一组参数定义，每个参数有名称、类型和 builder 函数：

```typescript
type ArgBuilder = (data: Record<string, unknown>, arg: ArgDef) => unknown;

interface ArgDef {
  name: string;     // 参数名，如 "query"、"id"、"data"
  builder: ArgBuilder;
}

type OperationDef = {
  arguments: ArgDef[];
};
```

| 操作 | 参数列表 | 输出示例 |
|------|---------|---------|
| `findPage` | `query: QueryBeanInput` | `{ query: { offset, limit, filter, orderBy } }` |
| `findList` | `query: QueryBeanInput` | `{ query: { filter, orderBy } }` |
| `findFirst` | `query: QueryBeanInput` | `{ query: { filter, orderBy } }` |
| `get` | `id: String`, `ignoreUnknown: Boolean` | `{ id: "xxx", ignoreUnknown: true }` |
| `save` | `data: Map` | `{ data: { field1: "val1", ... } }` |
| `update` | `data: Map` | `{ data: { field1: "val1", ... } }` |
| `saveOrUpdate` | `data: Map` | 同上 |
| `delete` | `id: String` | `{ id: "xxx" }` |
| `batchGet` | `ids: [String]` | `{ ids: ["a", "b"] }` |
| `batchDelete` | `ids: [String]` | 同上 |
| `batchModify` | `data: [Map]`, `delIds: [String]` | `{ data: [...], delIds: [...] }` |

未在注册表中的操作：用 `guessDefinition` 自动推断参数类型。

### 2.4 Builder 函数体系

每个类型有对应的 builder，从原始 data 中提取并转换对应参数的值：

| Builder | 类型 | 行为 |
|---------|------|------|
| `argString` | String | `String(data[name])`，null 保留 |
| `argInt` | Int | `parseInt(data[name], 10)` |
| `argFloat` | Float | `parseFloat(data[name])` |
| `argBoolean` | Boolean | 字符串 "false"/"n"/"0"/"N" 转 false，其余 `Boolean(value)` |
| `argMap` | Map | 直接透传 `data[name]` |
| `argStringList` | [String] | 字符串按逗号分割，数组直接透传 |
| `argMapList` | [Map] | 直接透传 `data[name]` |
| `argValue` | (fallback) | `data[name]` |
| **`argQuery`** | QueryBeanInput | → 见 §2.5 |
| **`argDataMap`** | (用于 data 参数) | → 见 §2.6 |

### 2.5 `argQuery` 构建器（用于 findPage/findList/findFirst）

输入：合并后的 data（含 `page`、`perPage`、`filter_XX` 等 CRUD 参数）
输出：`{ offset, limit, filter, orderBy }`

步骤：

```
1. 基础 query 对象
   query = data.query ?? {}   // 保留已有 query（如 filter 已在前端组装好）

2. limit
   query.limit = data.limit ?? data.pageSize ?? data.perPage ?? 0
   // 优先级：已有 limit > 直接传入 limit > pageSize > perPage

3. offset
   limit_val = Number(query.limit || 0)
   page_val = Number(data.page || 0)
   query.offset = data.offset ?? (limit_val > 0 && page_val > 0
                   ? limit_val * (page_val - 1) : 0)
   // 优先级：已有 offset > 从 page/limit 计算

4. orderBy
   query.orderBy = data.orderBy ?? toOrderBy(data.orderField, data.orderDir)
   // toOrderBy: 单个字段 → [{ name: fieldName, desc: boolean }]
   //            数组直接透传
   //            fieldName 去掉 _label 后缀

5. filter（关键）
   从 data 中提取 filter_ 前缀字段，转换为 TreeBean 格式
   query.filter = mergeFilter(query.filter, toFilter(data))

   toFilter 逻辑：
     for each key in data:
       if key starts with "filter_":
         name = key.slice(7)              // 去掉 "filter_" 前缀
         operation = "eq"                 // 默认等值
         if name contains "__":           // filter_name__contains
           operation = name.slice(lastIndexOf("__") + 2)
           name = name.slice(0, lastIndexOf("__"))
         value = data[key]
         if value === "__empty": value = ""
         if value === "__null": value = null
         if operation start with "between":
           解析为 { min, max }
         输出: { $type: operation, name, value, min?, max? }

   最终 filter = mergeFilter(existingQuery.filter, newFilter):
     两者都为空 → undefined
     一个为空 → 另一个
     两者都有 → { $type: "and", $body: [filterA, filterB] }

6. 其他
   query.cursor = data.cursor ?? data.cursor
   query.timeout = data.timeout ?? data.timeout
```

### 2.6 `argDataMap` 构建器（用于 save/update/delete/... 的 data 参数）

输入：合并后的 data
输出：过滤掉特殊字段后的纯数据对象

```
result = {}
for each (key, value) in data:
  if key starts with "__" or "@" or "v_": skip  // 特殊字段
  result[key] = value
return result
```

作用：去除 `__autoPagination`、`@selection`、`v_xxx` 等 flux 运行时添加的内部字段，只保留业务数据。

### 2.7 `@mutation` 的特殊包装

对于 `save`、`update` 等写操作，参数构建已经产出 `{ data: { ... } }`（`argDataMap` 的结果作为 `data` 参数的值）。

如果 URL 前缀是 `@mutation:`，说明调用者明确要求走 mutation 语义，此时已有 `data` 参数不额外包装。

注意：AMIS 的 `@mutation:` 路径会自动对所有非 `data` 参数做一层 `{ data: originalData }` 包装。在 REST RPC 路径下，`operationRegistry` 已经通过 `argDataMap` builder 正确构建了 `data` 参数，所以不需要额外包装。

---

## 3. 参数构建函数

```typescript
function buildRpcParams(
  data: Record<string, unknown>,
  operationName: string,
): Record<string, unknown> {
  const stdOp = getStdOperationName(operationName);
  const def = operationRegistry[stdOp] ?? guessDefinition(data);

  const params: Record<string, unknown> = {};
  for (const arg of def.arguments) {
    const builder = arg.builder ?? defaultArgBuilders[arg.type] ?? argValue;
    params[arg.name] = builder(data, arg);
  }
  return params;
}
```

`operationRegistry`、`guessDefinition`、builder 函数都是本地实现，不依赖 AMIS-core 包。

对于 `@query: findPage`：
- `data` = `{ query: { filter: { ... } }, page: "1", perPage: "10" }`
- `stdOp` = `"findPage"`
- 参数：`[{ name: "query", type: "QueryBeanInput", builder: argQuery }]`
- `params.query` = `argQuery(data)` = `{ offset: 0, limit: 10, filter: { ... } }`
- 输出：`{ query: { offset: 0, limit: 10, filter: { ... } } }`

对于 `@mutation: save`：
- `data` = `{ userName: "test", nickName: "Test", status: 1, __autoPagination: {...} }`
- `stdOp` = `"save"`
- 参数：`[{ name: "data", type: "Map", builder: argDataMap }]`
- `params.data` = `argDataMap(data)` = `{ userName: "test", nickName: "Test", status: 1 }`
- 输出：`{ data: { userName: "test", nickName: "Test", status: 1 } }`

---

## 4. URL 格式处理

`resolveNopRpcUrl` 统一处理三种 URL 格式：

```typescript
function resolveNopRpcUrl(rawUrl, rawData, selection) → NopRpcResolution | null

1. @query:OperationName?params
   → 提取 operationName、params
   → buildRpcParams(mergedData, operationName)
   → 返回 { url: "/r/OperationName", method: "POST", data: params }

2. @mutation:OperationName?params
   → 同上，但 prefix = @mutation（用于区分语义）

3. /r/OperationName?params
   → 同上，提取操作名和查询参数
   → buildRpcParams(mergedData, operationName)
   → 返回 { url: "/r/OperationName", method: "POST", data: params }
```

## 5. 与 AMIS 路径的关系

| 维度 | AMIS 路径 | Flux/REST RPC 路径 |
|------|-----------|-------------------|
| 入口 | `ajaxFetch` → `buildRequestOptions` | `nopRpcRequest` → `resolveNopRpcUrl` |
| URL 格式 | `@query:Op?params` | `@query:Op?params` 或 `/r/Op?params` |
| 参数变换 | `operationRegistry` + `buildGraphQLVariables` | 本地 `operationRegistry` + `buildRpcParams` |
| Builder | `argQuery` / `argDataMap` / 等 | 相同的逻辑，本地实现 |
| 输出 | GraphQL query + variables → `/graphql` | `{ query: {...} }` → `/r/Op` |
| filter_XX 处理 | `toFilter()` | 相同逻辑 |

两个路径使用**相同的参数变换模式**（操作注册表 + builder 函数链），但输出目标不同。

---

## 6. 边界情况

### 6.1 未注册的操作

不在 `operationRegistry` 中的操作（如自定义 `myCustomOp`），用 `guessDefinition` 自动推断：

```typescript
// 所有参数直接透传，按其值类型推断类型
{
  arguments: Object.entries(data)
    .filter(([key]) => !key.startsWith('__') && !key.startsWith('@') && !key.startsWith('v_'))
    .map(([key, value]) => ({ name: key, type: guessType(value) }))
}
```

### 6.2 空数据

如果 `data` 为 `null` 或 `undefined`，`buildRpcParams` 返回空对象 `{}`。

### 6.3 @selection 处理

`@selection` 是特殊的 URL 查询参数，用于指定后端返回哪些字段。
它不参与参数变换，直接附加到最终 URL：

```
/r/OperationName?@selection=id,displayName
```

### 6.4 v_xxx 扩展参数

`v_` 前缀的参数用于传递自定义扩展属性（如 `v_version`），
在 `argDataMap` 中被过滤掉，但在 `guessExtArgDefinitions` 中被识别为独立参数。
在 REST RPC 路径下，`v_` 参数可以直接保留在顶层，后端会识别。

### 6.5 数值类型精度

- `page`、`perPage`、`offset`、`limit` 均为整数（`parseInt`）
- `orderBy` 数组中的 `desc` 为布尔值
- `filter` 中的 `value` 保持原始类型
