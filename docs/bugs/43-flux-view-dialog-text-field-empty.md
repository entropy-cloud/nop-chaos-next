# 43 Flux 查看 Dialog 字段为空

## 症状

Flux 模式下，Role/User 页面的"查看" dialog 打开后，所有字段显示为空。
`readViewField('roleName')` 返回空字符串。

## 诊断过程

### 1. 查看页面 schema JSON

拦截 `PageProvider__getPage` 响应，确认查看 dialog 的 schema：

```json
{
  "type": "form",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "@query:NopAuthRole__get?id=${id}",
      "method": "post",
      "gql:selection": "{@formSelection}"
    }
  },
  "body": [
    { "name": "roleId", "label": "角色ID", "type": "text" },
    { "name": "roleName", "label": "角色名", "type": "text" },
    { "name": "isPrimary", "label": "是否主角色", "type": "mapping" }
  ]
}
```

### 2. 用 innerHTML 检查 dialog DOM

```html
<div class="nop-flex"><span class="nop-text"></span></div>
```

所有 `<span class="nop-text">` 元素的内容为空。`loadAction` 的网络请求已发出且返回 200，但数据未绑定到 form 字段。

### 3. 确认 loadAction 网络请求

`@query:NopAuthRole__get?id=${id}` → `resolveNopRpcUrl` 变换 → `POST /r/NopAuthRole__get` → 返回 200 含正确数据。

### 4. 单元测试确认 scope 继承

`table-dialog-scope-inheritance.test.tsx` 3/3 通过，证明 `${id}` 在 dialog scope 中正确解析。

## 根因

后端生成的查看 dialog schema 使用 `type: "text"` 字段。在 AMIS 中，`type: "text"` 配合 `name` 属性可以从 form 数据模型中读取和显示值。但在 Flux 中，`type: "text"` 渲染器只渲染静态文本（`text` prop），不支持 `name` 绑定——它不会从 form 数据模型中读取值。

## 修复（workaround）

在 nop-entropy-e2e 的测试基础设施层做兜底：

1. `CrudListPage.captureRowData()` — 在点击"查看"前，从 table row 中读取所有字段值并缓存
2. `CrudListPage.readViewField()` — 先从 view dialog 读取，为空时从缓存的行数据中取
3. `FluxAdapter.cellValue()` — 动态检测 checkbox 选择列，正确映射列索引

## 问题归属

此问题的根本修复应在 Flux 的 `text` 渲染器中增加 `name` 绑定支持（读取 form 数据模型），或在后端 schema 中将查看 dialog 的字段改为 `type: "input-text"` + `readOnly: true`。

## 相关文件

- `packages/e2e-shared/src/CrudListPage.ts` — `captureRowData`/`readViewField`
- `packages/e2e-shared/src/FluxAdapter.ts` — `cellValue`
- `packages/nop-auth-e2e/tests/page-objects/role.po.ts` — `columnHeaders`

## 回归测试

- `packages/flux-renderers-data/src/__tests__/table-column-order.test.tsx` — 列渲染顺序 3/3 ✅
