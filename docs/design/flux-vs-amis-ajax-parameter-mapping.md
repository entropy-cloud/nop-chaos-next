# AJAX 参数映射：AMIS vs Flux

> 分析两个渲染引擎对 Nop 后端 RPC 调用的参数变换差异，聚焦 CRUD 分页/排序/过滤参数。

---

## 1. 问题背景

Flux 模式调试 nop-auth-e2e 时，NopAuthResource 页面 500：
```
操作[NopAuthResource__findList]没有定义参数[page],允许的参数为:[query]
```

说明 Flux CRUD 将 `page`/`perPage` 作为顶层参数发送，而后端只认识 `query` 参数。

---

## 2. AMIS 参数变换路径

### 入口
AMIS CRUD 的 `@query:` API 走 `graphql.ts` → `graphqlArgs.ts`

### 核心函数：`argQuery`（`packages/amis-core/src/core/graphqlArgs.ts:105-125`）

```typescript
function argQuery(data, _arg, options) {
  const sourceQuery = isPlainObject(data.query) ? data.query : {};
  const query = { ...sourceQuery };
  // 从 CRUD 原始的 page/perPage → query.offset/query.limit
  query.limit = query.limit ?? data.limit ?? data.pageSize ?? data.perPage ?? 0;
  const page = typeof data.page === 'number' ? data.page : Number(data.page || 0);
  query.offset = query.offset ?? data.offset ?? (limit > 0 && page > 0 ? limit * (page - 1) : 0);
  query.orderBy = query.orderBy ?? toOrderBy(data.orderBy ?? data.orderField, data.orderDir);
  query.filter = mergeFilter(query.filter, toFilter(data, options));
  return query;  // { offset, limit, filter, orderBy }
}
```

### 注册表（`graphqlArgs.ts:239-251`）

```typescript
const operationRegistry = {
  findPage: { arguments: [{ name: 'query', type: 'QueryBeanInput', builder: argQuery }] },
  findList: { arguments: [{ name: 'query', type: 'QueryBeanInput', builder: argQuery }] },
  findFirst:{ arguments: [{ name: 'query', type: 'QueryBeanInput', builder: argQuery }] },
};
```

**`findPage` 和 `findList` 共用同一个 `argQuery` 构建器。**

### 最终发送
```json
POST /r/NopAuthUser__findPage
{ "query": { "offset": 0, "limit": 10, "filter": {}, "orderBy": [] } }
```

---

## 3. Flux 参数变换路径

### Step 1：CRUD 构建 evaluationBindings（`crud-renderer-state.ts:282-302`）

```typescript
function createCrudEvaluationBindings({ pagination, query, sort, filters, ... }) {
  return {
    pagination: { currentPage, pageSize },
    query: { ...query },
    sort: { column, direction },
    filters: { ...filters },
    __autoPagination: {
      [pageField ?? 'page']: pagination.currentPage,        // { page: 1 }
      [pageSizeField ?? 'perPage']: pagination.pageSize,     // { perPage: 10 }
    },
  };
}
```

**默认字段名**：`pageField = 'page'`，`pageSizeField = 'perPage'`（`crud-schema.ts:250-251`）

### Step 2：ajax action 注入 `__autoPagination`（`runtime-action-helpers.ts:120-133`）

```typescript
const autoPagination = ctx.evaluationBindings?.__autoPagination;
if (autoPagination) {
  api = { ...api, params: { ...api.params, ...autoPagination } };  // 合并到 params
}
```

### Step 3：serialize params 为 URL query（`request-runtime.ts:249-269`）

```typescript
function buildUrlWithParams(url, params) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    appendParamValues(searchParams, key, value);
  }
  // → /r/NopAuthResource__findList?page=1&perPage=10
}
```

### Step 4：Host nopRpcResolver 解析（`apps/main/src/services/nopRpcResolver.ts:53-87`）

```typescript
// 从 URL 提取 query 参数
const qmarkIdx = rawUrl.indexOf('?');
if (qmarkIdx >= 0) {
  const params = new URLSearchParams(rawUrl.slice(qmarkIdx));
  for (const [k, v] of params) {
    if (k !== '@selection') paramObj[k] = v;
  }
  data = { ...data, ...paramObj };  // 合并到 POST body
}

// ⚠️ 分页转换——**只对 __findPage 生效！**
if (operationName.endsWith('__findPage')) {   // ← 此处 bug！
  const pageNum = Number(obj['page']);
  const perPageNum = Number(obj['perPage']);
  query.offset = (pageNum - 1) * perPageNum;
  query.limit = perPageNum;
  // ... 过滤掉 page/perPage，其余字段放入 query
  data = { query };
}
// 非 __findPage（如 __findList/__findFirst）：page/perPage 直接发到后端 → 500！
```

---

## 4. 对比总结

| 特性 | AMIS | Flux |
|------|------|------|
| 分页参数来源 | CRUD 内置 `page`/`perPage` | CRUD `__autoPagination` |
| 参数传递方式 | `data.page`/`data.perPage` → `argQuery` 处理 | URL query param `?page=1&perPage=10` |
| 参数变换位置 | `graphqlArgs.ts:argQuery`（amis-core 内） | `nopRpcResolver.ts`（host app，后处理） |
| 变换逻辑 | 始终包装成 `{ query: { offset, limit, filter } }` | 仅 `__findPage` 做 pagination → query 转换 |
| findList 支持 | ✅ 走 `argQuery`，包装成 `{ query }` | ❌ 未被覆盖，page/perPage 透传导致 500 |
| @TreeChildren | ✅ 在 `@selection` 中编码为 URL param | ✅ @selection 保留，但 page/perPage 冲突 |

### 差异根因

AMIS 的 ajax 参数变换在**前端 amis-core 库内部**完成（`graphqlArgs.ts`），对所有操作（findPage/findList/findFirst）统一处理。Flux 的 ajax 参数变换则在 **host app 的后处理层**（`nopRpcResolver.ts`）完成，且只覆盖了 `__findPage` 一个操作。

这意味着：**任何 Nop 后端使用 `findList` 或 `findFirst` 的 CRUD 页面，在 Flux 模式下都会因 `page`/`perPage` 参数而 500。**

---

## 5. 修复方案

### 方案 A：扩展 nopRpcResolver 覆盖 findList/findFirst

```typescript
// nopRpcResolver.ts:72 — 当前只检查 __findPage
// 改为：同时处理 __findList（忽略分页参数）
if (data && typeof data === 'object' && !Array.isArray(data)) {
  const query = {};
  let hasPagination = false;
  if (operationName.endsWith('__findPage')) {
    const pageNum = Number(obj['page']);
    const perPageNum = Number(obj['perPage']);
    if (!isNaN(pageNum) && !isNaN(perPageNum)) {
      query.offset = (pageNum - 1) * perPageNum;
      query.limit = perPageNum;
      hasPagination = true;
    }
  }
  // 将所有非 page/perPage 字段放入 query
  for (const [key, val] of Object.entries(obj)) {
    if (key !== 'page' && key !== 'perPage') {
      query[key] = val;
    }
  }
  // __findList/__findFirst: 即使没有分页，也要包装为 { query }
  if (hasPagination || operationName.endsWith('__findList') || operationName.endsWith('__findFirst')) {
    data = { query };
  }
}
```

### 方案 B：前端跳过 page/perPage 发送

在 Flux CRUD 中，如果 loadAction 是 `findList`，就不注入 `__autoPagination`。但 CRUD 不一定知道操作名。

### 推荐：方案 A

改动最小，不影响其他链路。而且 `nopRpcResolver.ts` 已经是所有 Nop RPC 请求的必经之路，在此统一处理最可靠。

---

## 6. 对其他失败的影响

| 失败测试 | 根因类别 | 说明 |
|---------|---------|------|
| Resource 500（findList） | ✅ 明确，nopRpcResolver 缺失 findList 处理 | 修复后 resource 浏览器测试应全部通过 |
| Role 创建后不可见 | 可能是 onSubmitSuccess callback 未触发 | 需检查 surface-lifecycle-hooks 的触发条件 |
| Role/User 查看详情空字段 | 可能与 `fetchByKey` 或 URL 参数解析有关 | 也需要 nopRpcResolver 正确包装参数 |
| Role 编辑不生效 | 表单 submitAction 参数发送 | 与 nopRpcResolver 无关 |
| 授权页 | 操作按钮 onClick 定义 | 需检查 schema JSON |
| User delete 断言失败 | 软删除后 CRUD 仍显示 | 与参数变换无关 |

---

## 7. 相关代码位置

| 文件 | 行号 | 内容 |
|------|------|------|
| `amis-core/src/core/graphqlArgs.ts` | 105-125, 239-251 | AMIS `argQuery` + operationRegistry |
| `flux-renderers-data/src/crud-renderer-state.ts` | 282-302 | `createCrudEvaluationBindings` |
| `flux-runtime/src/runtime-action-helpers.ts` | 120-133 | `executeRuntimeAjaxAction` autoPagination |
| `flux-runtime/src/async-data/request-runtime.ts` | 249-269 | `buildUrlWithParams` |
| `apps/main/src/services/nopRpcResolver.ts` | 53-87 | **BUG：pagination 转换仅 __findPage** |
| `apps/main/src/services/http.ts` | 193-274 | `nopRpcRequest` 总入口 |
| `flux-renderers-data/src/crud-schema.ts` | 250-251 | 默认 `pageField`/`pageSizeField` |
