# 42 Flux RPC 参数变换缺失

## 症状

Flux 模式下，NopAuthResource 页面加载时 `NopAuthResource__findList` 返回 500：
```json
{"code":"nop.err.graphql.unknown-operation-arg","msg":"操作[NopAuthResource__findList]没有定义参数[page],允许的参数为:[query]"}
```

同时 Role/User 页面的 CRUD 操作（创建/编辑/删除）在 flux 模式下也工作异常。

## 诊断过程

### 1. 确认 500 响应体

拦截网络响应，读取 body 中的 `code` 和 `msg`：

```
[500] NopAuthResource__findList: {"code":"nop.err.graphql.unknown-operation-arg","msg":"操作[NopAuthResource__findList]没有定义参数[page]"}
```

### 2. 对比请求 body 与后端要求

后端 Nop RPC 要求参数格式为 `{ query: { offset, limit, filter } }`，但 flux 运行时的 `__autoPagination` 机制将 `page`/`perPage` 作为 URL query 参数发送。对于 `findPage` 操作，`nopRpcResolver.ts` 有专门的处理代码；但对于 `findList`/`findFirst` 等操作则缺失。

### 3. 确认 URL 格式差异

- **AMIS 路径**：CRUD 组件生成 `@query:NopAuthUser__findPage?page=1` → 走 `transformGraphQLRequest` → `operationRegistry` + `argQuery` 变换 → 输出 `{ query: { offset, limit } }`
- **Flux 路径**：CRUD 组件生成 `/r/NopAuthUser__findPage?page=1`（裸 URL，无 `@query:` 前缀）→ `resolveNopRpcUrl` 仅处理 `@query:`/`@mutation:` URL → 返回 null → "透传"路径直发 → 后端收到未变换的参数

### 4. 确认作用域继承正常

在 `nop-chaos-flux` 中写单元测试验证：dialog scope 正确继承 table row scope，`${id}` 可以正确解析（`table-dialog-scope-inheritance.test.tsx`）。

### 5. 确认 `__autoPagination` 机制

在 `nop-chaos-flux` 中写单元测试验证：CRUD 总是生成 `__autoPagination` 到 evaluationBindings，与 `loadAllData` 或操作类型无关（`crud-auto-pagination.test.tsx`）。

### 6. 确认列渲染顺序

在 `nop-chaos-flux` 中写单元测试验证 flux table 的列渲染顺序，确定 checkbox 选择列用独立的 `data-slot="table-select-column"`，不影响数据列索引（`table-column-order.test.tsx`）。

## 根因

`apps/main/src/services/nopRpcResolver.ts` 的 `resolveNopRpcUrl` 函数只处理了 `@query:`/`@mutation:` 前缀的 URL，对 flux 运行时生成的 `/r/OperationName?param=value` 格式 URL 不做参数变换。flux CRUD 通过 `executeRuntimeAjaxAction` 将 `__autoPagination` 注入到 URL 中，`page`/`perPage` 作为裸参数发送到后端，而后端对 `findList` 等操作只接受 `query` 参数。

## 修复

### resolveNopRpcUrl 重写

完整重写 `nopRpcResolver.ts`，遵循原版 `graphqlArgs.ts` 的 `operationRegistry` + `argBuilder` 设计模式：

1. **`@query:`/`@mutation:`**：走 `buildRpcParams` → `operationRegistry` 查找 → 对应 builder（`argQuery`/`argDataMap`/`argString` 等）变换参数
2. **`/r/OperationName`**：走 `removeSpecialKeys` → 递归过滤 `__`/`@`/`v_` 前缀的运行时参数

### 统一特殊字段过滤

- `removeSpecialKeys` 在入口统一调用，不在每个 builder 中重复
- `removeSpecialKeys` 递归处理嵌套对象

### 参数合并

- `adapter.ts` 传递 `api.params` 到 `nopRpcRequest`
- `nopRpcRequest` 合并 `params` 到 `data` 后再调用 `resolveNopRpcUrl`

## 保护性测试

- `nopRpcResolver.test.ts`：28 个单元测试覆盖所有操作类型的参数变换
- `table-dialog-scope-inheritance.test.tsx`（nop-chaos-flux）：3 个测试验证 dialog scope 继承
- `crud-auto-pagination.test.tsx`（nop-chaos-flux）：3 个测试验证 `__autoPagination` 机制
- `table-column-order.test.tsx`（nop-chaos-flux）：3 个测试验证列渲染顺序

## 相关文件

- `apps/main/src/services/nopRpcResolver.ts` — 主修复文件
- `apps/main/src/services/http.ts` — params 合并逻辑
- `apps/main/src/flux/adapter.ts` — 传递 api.params
- `apps/main/src/services/nopRpcResolver.test.ts` — 28 个单元测试
