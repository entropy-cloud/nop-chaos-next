# Flux 组件 DOM 结构与选择器参考

> 面向 E2E 测试开发的 Flux 组件 DOM 选择器速查手册。
>
> 基于 `nop-chaos-flux/packages/` 源码（`data-widget-markers-contract.test.tsx` 契约 + 组件 JSX）分析。
>
> 配套文档：[`03-amis-dom-selector-reference.md`](03-amis-dom-selector-reference.md)（AMIS 对应版本）

## 目录

1. [选择器策略](#1-选择器策略)
2. [CRUD 页面](#2-crud-页面)
3. [表格](#3-表格)
4. [工具栏与按钮](#4-工具栏与按钮)
5. [搜索表单](#5-搜索表单)
6. [表单字段](#6-表单字段)
7. [对话框 / Alert Dialog](#7-对话框--alert-dialog)
8. [Drawer](#8-drawer)
9. [Tabs](#9-tabs)
10. [Tree](#10-tree)
11. [分页](#11-分页)

---

## 1. 选择器策略

Flux 使用两套并行的 DOM 标记系统：

| 标记类型 | 格式 | 稳定性 | 用途 |
|----------|------|--------|------|
| **`data-slot`** | `[data-slot="table-row"]` | 最高，契约测试保障 | 组件内部结构定位 |
| **CSS class** | `.nop-crud`, `.nop-table` | 高，契约测试保障 | 顶层组件容器 |
| `data-testid` | `[data-testid="..."]` | 中，schema 驱动 | 仅当页面 schema 显式设置 |
| `role` / `aria-*` | `role="checkbox"`, `aria-checked` | 高 | 语义交互 |

### 选择器优先级

1. `.nop-*` CSS class（顶层容器）
2. `[data-slot="..."]`（组件内部结构）
3. `input[name="..."]` 或 `#fieldName-control`（表单字段）
4. `getByRole()` / `aria-*`（交互语义）

### 关键约定

- **`data-slot` 是内部结构的主标记系统**，覆盖所有组件，有契约测试（`data-widget-markers-contract.test.tsx`）保障
- **不使用 BEM**（`nop-table__header` 等被契约禁止）
- **`data-testid` 是 schema 驱动的**，仅 `surface-confirm-submit` / `surface-confirm-cancel` 是硬编码
- **表格单元格没有 `data-field` 属性**，按位置 `td:nth-child(N)` 或文本匹配定位

---

## 2. CRUD 页面

```
.nop-crud  [data-testid?, data-cid?]
│
├─ [data-slot="crud-query"]                     ← 搜索表单区域
│    └─ [data-slot="crud-query-collapse"]        ← 折叠/展开按钮
│
├─ [data-slot="crud-toolbar"]                    ← 工具栏
│    .nop-crud-toolbar
│    ├─ [data-slot="crud-toolbar-main"]          ← 主工具栏（新增按钮等）
│    └─ [data-slot="crud-list-actions"]          ← 批量操作
│
├─ [data-slot="crud-table"]                      ← 表格模式
│    .nop-crud-table
│    └─ .nop-table → 见 §3
│
│  或 [data-slot="crud-list-body"]               ← 列表/卡片模式
│
└─ [data-slot="crud-footer"]                     ← 页脚
```

| 区域 | 选择器 |
|------|--------|
| CRUD 根容器 | `.nop-crud` |
| 搜索区域 | `[data-slot="crud-query"]` |
| 工具栏 | `[data-slot="crud-toolbar"]` |
| 主工具栏（新增按钮所在） | `[data-slot="crud-toolbar-main"]` |
| 批量操作 | `[data-slot="crud-list-actions"]` |
| 表格区域 | `[data-slot="crud-table"]` |
| 页脚 | `[data-slot="crud-footer"]` |

---

## 3. 表格

```
.nop-table  [data-testid?, data-cid?]
└─ [data-slot="table-container"]
    └─ <table data-slot="table">
        ├─ <thead data-slot="table-header">
        │    └─ <tr data-slot="table-row">
        │         └─ <th data-slot="table-head">
        │              aria-sort="ascending|descending|none"
        │
        └─ <tbody data-slot="table-body">
             ├─ <tr data-slot="table-row"]>       ← 数据行
             │    ├─ <td data-slot="table-select-cell">  ← 选择列
             │    ├─ <td data-slot="table-expand-cell">  ← 展开列
             │    ├─ <td data-slot="table-cell"]>        ← 数据单元格
             │    └─ <td> → [data-slot="table-actions"]  ← 行操作按钮
             │
             └─ <tr data-slot="table-empty-row"]>        ← 空行
                  └─ <td data-slot="table-empty-cell"]
```

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 表格根 | `.nop-table` | |
| 表格容器 | `[data-slot="table-container"]` | 可滚动区域 |
| `<table>` | `[data-slot="table"]` | |
| 表头 | `[data-slot="table-header"]` | `<thead>` |
| 表体 | `[data-slot="table-body"]` | `<tbody>` |
| 数据行 | `tr[data-slot="table-row"]` | 在 tbody 内 |
| 列头 | `th[data-slot="table-head"]` | 支持 `aria-sort` |
| 普通单元格 | `td[data-slot="table-cell"]` | |
| 行操作区 | `[data-slot="table-actions"]` | 行内按钮容器 |
| 空行 | `[data-slot="table-empty-row"]` | |
| 选择列 | `[data-slot="table-select-cell"]` | 内含 checkbox |
| 展开列 | `[data-slot="table-expand-cell"]` | |
| 单元格复制 | `[data-slot="table-cell-copy-button"]` | |

**单元格列定位**：无 `data-field` 属性，使用 `td:nth-child(N)` 位置索引或文本匹配。

**排序**：点击列头内的 `button`，`aria-sort` 属性反映当前排序状态。

---

## 4. 工具栏与按钮

### 工具栏结构

工具栏按钮是 **schema 驱动的**，没有硬编码 `data-testid`。按区域定位：

| 区域 | 选择器 |
|------|--------|
| 主工具栏 | `[data-slot="crud-toolbar-main"]` |
| 批量操作 | `[data-slot="crud-list-actions"]` |
| 统计信息 | `[data-slot="header-toolbar-statistics"]` |
| 分页区 | `[data-slot="header-toolbar-pagination"]` |
| 每页条数 | `[data-slot="header-toolbar-page-size"]` |
| 轮询开关 | `[data-slot="header-toolbar-polling-toggle"]` |

### 按钮组件

```
button[data-slot="button"][data-testid?][data-cid?]
  ├─ <svg data-icon="inline-start">    ← 前置图标
  └─ <svg data-icon="inline-end">      ← 后置图标
```

| 属性 | 值 | 说明 |
|------|-----|------|
| `data-slot` | `button` | 所有按钮 |
| `data-testid` | schema 设置 | 仅当 schema 配置 `testid` |
| Button variant | `default`, `outline`, `secondary`, `ghost`, `destructive`, `link` | 通过 className |

**新增按钮**：在 `[data-slot="crud-toolbar-main"]` 内，按文本匹配 `getByRole('button', { name: /新增|Add/ })`。

**行操作按钮**：在 `[data-slot="table-actions"]` 内，按文本匹配。

---

## 5. 搜索表单

```
[data-slot="crud-query"]  .nop-crud-query
├─ [data-slot="crud-query-collapse"]        ← 折叠/展开
│    data-collapsed="true|false"
└─ queryForm 渲染输出                        ← schema 驱动的表单字段
```

搜索表单内的字段使用标准 Flux 表单组件（见 §6）。搜索/重置按钮由 schema 定义，没有硬编码 testid。

**搜索按钮**：在 `[data-slot="crud-query"]` 内按文本匹配 `button:has-text("搜索")` 或 `button[type="submit"]`。

**Filter 输入框**：`input[name="fieldName"]`，ID 为 `fieldName-control`。

---

## 6. 表单字段

### 字段定位策略

| 方式 | 选择器 | 说明 |
|------|--------|------|
| name 属性 | `input[name="fieldName"]` | 最可靠 |
| ID | `#fieldName-control` | flux 约定 `${name}-control` |
| aria-label | `[aria-label="字段标签"]` | 国际化标签 |
| Field 容器 | `[data-slot="field"]` | 字段包装器 |

### 文本输入（input-text）

```
input[data-slot="input"][name="fieldName"][id="fieldName-control"]
```

或带前后缀时包装在 InputGroup 内：

```
div[data-slot="input-group"][role="group"]
  └─ input[data-slot="input-group-control"]
```

### Textarea

```
textarea[data-slot="textarea"][name="fieldName"]
```

### Select（Combobox 下拉选择）

Flux 的 Select 使用 Base UI Combobox 实现：

```
div.nop-select-wrapper[data-slot="select-wrapper"]
  └─ button[data-slot="combobox-trigger"]      ← 触发器
       └─ span[data-slot="combobox-value"]      ← 当前选中值

（弹出层）
div[data-slot="combobox-content"]
  └─ div[data-slot="combobox-list"]
       └─ div[data-slot="combobox-item"]        ← 选项（按文本匹配，无 data-value）
```

**操作流程**：
1. 点击 `[data-slot="combobox-trigger"]` 展开
2. 在 `[data-slot="combobox-item"]` 中按文本过滤
3. 点击目标选项

**可搜索 Select**：触发器是 `input[data-slot="input-group-control"]`，输入文本过滤选项。

### Checkbox

```
label.nop-checkbox-wrapper[data-slot="checkbox-wrapper"]
  └─ button[data-slot="checkbox"][role="checkbox"][aria-checked][id="fieldName-control"]
       └─ span[data-slot="checkbox-label"]
```

**操作**：`aria-checked="true|false"` 反映状态。点击 `button[data-slot="checkbox"]` 切换。

### Switch（开关）

```
label.nop-switch-wrapper[data-slot="switch-wrapper"]
  └─ button[data-slot="switch"][role="switch"][aria-checked][id="fieldName-control"]
       └─ span[data-slot="switch-thumb"]
```

**操作**：`aria-checked="true|false"` 反映状态。点击 `button[data-slot="switch"]` 切换。

### Radio Group

```
div[data-slot="radio-group-wrapper"]
  └─ div[data-slot="radio-group-options"][role="radiogroup"]
       └─ label[data-slot="radio-group-item"]
            └─ span[data-slot="radio-group-item-label"]
```

### 日期选择

```
div.nop-input-date[data-slot="field-control"]
  └─ Input/InputGroup (aria-label, id=name-control)
```

### 只读字段

Flux 没有专门的只读字段 DOM 标记。只读模式下表单字段渲染为静态文本，位于 `[data-slot="field"]` 容器内。读取 `textContent` 获取值。

---

## 7. 对话框 / Alert Dialog

### Dialog（表单对话框）

```
[data-slot="dialog"]
  ├─ div[data-slot="dialog-overlay"]           ← 遮罩
  └─ div[data-slot="dialog-content"][data-size] ← 内容区
       ├─ div[data-slot="dialog-header"]
       │    └─ [data-slot="dialog-title"]
       ├─ div[data-slot="dialog-body"]
       ├─ div[data-slot="dialog-footer"]        ← 按钮区
       └─ button[data-slot="dialog-close"]      ← 关闭按钮
```

### 确认按钮（硬编码 testid）

Dialog 的确认/取消按钮有**硬编码** `data-testid`：

| 元素 | 选择器 | data-testid |
|------|--------|-------------|
| 确认按钮 | `[data-slot="surface-confirm-submit"]` | `surface-confirm-submit` |
| 取消按钮 | `[data-slot="surface-confirm-cancel"]` | `surface-confirm-cancel` |

确认栏容器：`[data-slot="dialog-confirm-bar"].nop-dialog-confirm-bar`

### Alert Dialog（删除确认）

```
[data-slot="alert-dialog"]
  ├─ div[data-slot="alert-dialog-overlay"]
  └─ div[data-slot="alert-dialog-content"]
       ├─ div[data-slot="alert-dialog-header"]
       │    ├─ [data-slot="alert-dialog-title"]
       │    └─ [data-slot="alert-dialog-description"]
       └─ div[data-slot="alert-dialog-footer"]
            ├─ button[data-slot="alert-dialog-cancel"]   ← 取消
            └─ button[data-slot="alert-dialog-action"]   ← 确认
```

| 元素 | 选择器 |
|------|--------|
| Alert 根 | `[data-slot="alert-dialog"]` |
| 内容 | `[data-slot="alert-dialog-content"]` |
| 确认按钮 | `[data-slot="alert-dialog-action"]` |
| 取消按钮 | `[data-slot="alert-dialog-cancel"]` |

---

## 8. Drawer

```
[data-slot="drawer"]
  └─ div[data-slot="drawer-popup"]
       └─ div[data-slot="drawer-content"][data-direction]
            ├─ div[data-slot="drawer-header"]
            │    └─ [data-slot="drawer-title"]
            ├─ div[data-slot="drawer-body"]
            ├─ div[data-slot="drawer-footer"]
            ├─ button[data-slot="drawer-close"]
            └─ div[data-slot="drawer-resize-handle"][role="separator"]
```

Drawer 确认栏：`[data-slot="drawer-confirm-bar"].nop-drawer-confirm-bar`

---

## 9. Tabs

```
section.nop-tabs[data-tabs-mode]
  └─ div[data-slot="tabs-root"][data-orientation]
       ├─ div[data-slot="tabs-list"]
       │    └─ button[data-slot="tabs-trigger"][value][data-active]
       └─ div[data-slot="tabs-content"][value]
```

| 元素 | 选择器 |
|------|--------|
| Tab 根 | `.nop-tabs` |
| Tab 列表 | `[data-slot="tabs-list"]` |
| Tab 项 | `button[data-slot="tabs-trigger"]` |
| 活跃 Tab | `[data-slot="tabs-trigger"][data-active]` |
| 按 value 选 | `[data-slot="tabs-trigger"][value="tabValue"]` |
| Tab 内容 | `[data-slot="tabs-content"][value="tabValue"]` |

---

## 10. Tree

```
div.nop-tree[role="tree"][aria-label]
  ├─ div[data-slot="tree-search"]
  │    └─ input[data-slot="tree-search-input"][type="search"]
  └─ div[data-slot="tree-node"][data-depth][data-node-key]
       └─ div[data-slot="tree-node-row"]
            └─ div[role="treeitem"][aria-expanded][aria-level][aria-selected]
```

| 元素 | 选择器 |
|------|--------|
| 树根 | `.nop-tree[role="tree"]` |
| 搜索框 | `[data-slot="tree-search-input"]` |
| 树节点 | `div[role="treeitem"]` |
| 节点 key | `[data-node-key="..."]` |
| 展开/折叠 | `aria-expanded="true|false"` |
| 选中状态 | `aria-selected="true|false"` |
| 子节点容器 | `[data-slot="tree-children"][role="group"]` |

---

## 11. 分页

### 表格分页栏

```
div[data-slot="table-pagination"]
  ├─ Label + select[data-slot="native-select"]   ← 每页条数
  └─ nav[aria-label="pagination"]
       └─ a[data-slot="pagination-link"][aria-current="page"]
```

### CRUD 工具栏分页

| 位置 | 选择器 |
|------|--------|
| Header 工具栏 | `[data-slot="header-toolbar-pagination"]` |
| Footer 工具栏 | `[data-slot="footer-toolbar-pagination"]` |
| 列表模式 | `[data-slot="crud-list-pagination"]` |
| 无限滚动 | `[data-slot="crud-infinite-sentinel"]` |

---

## References

- `nop-chaos-flux/packages/ui/src/components/` — UI 原子组件源码
- `nop-chaos-flux/packages/flux-renderers-data/src/` — CRUD/Table/List 渲染器
- `nop-chaos-flux/packages/flux-renderers-form/src/` — 表单字段渲染器
- `nop-chaos-flux/packages/flux-react/src/__tests__/data-widget-markers-contract.test.tsx` — DOM 标记契约测试
- `packages/e2e-shared/src/FluxAdapter.ts` — Flux 引擎适配器实现
