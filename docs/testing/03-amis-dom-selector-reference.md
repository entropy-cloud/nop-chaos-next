# AMIS 组件 DOM 结构与选择器参考

> 面向 E2E 测试开发的 AMIS 组件 DOM 选择器速查手册。
>
> 基于 `control.xlib`（Nop 数据类型 → AMIS 组件映射）、`amis-react19/packages/amis-ui/src/components/`（DOM 渲染源码）和 nop-entropy-e2e 全量适配实战经验编写。
>
> 配套文档：[`01-e2e-developer-guide.md`](01-e2e-developer-guide.md)（E2E 总指南）、[`02-cross-project-e2e-debugging.md`](02-cross-project-e2e-debugging.md)（跨项目调试）

## 目录

1. [选择器优先级策略](#1-选择器优先级策略)
2. [容器类组件](#2-容器类组件)
3. [文本输入类](#3-文本输入类)
4. [数字输入类](#4-数字输入类)
5. [日期选择类](#5-日期选择类)
6. [选择类（Select / Radios / Switch）](#6-选择类)
7. [多行 / 富文本](#7-多行--富文本)
8. [标签数组](#8-标签数组)
9. [关系选择（Picker）](#9-关系选择picker)
10. [只读显示类](#10-只读显示类)
11. [按钮 / 操作](#11-按钮--操作)
12. [三种下拉组件（关键区别）](#12-三种下拉组件关键区别)
13. [弹窗 / 对话框](#13-弹窗--对话框)
14. [表格](#14-表格)
15. [CRUD 搜索表单](#15-crud-搜索表单)
16. [删除确认对话框（nop-chaos-next 自定义组件）](#16-删除确认对话框)
17. [DOM 诊断方法](#17-dom-诊断方法)

---

## 1. 选择器优先级策略

AMIS 组件提供多种定位方式，按稳定性从高到低：

| 优先级 | 方式 | 示例 | 稳定性说明 |
|--------|------|------|-----------|
| 1 | `getByRole()` | `dialog.getByRole('button', { name: /确定/ })` | 最稳定，不受主题/CSS 影响 |
| 2 | `[data-amis-name]` | `[data-amis-name="userName"]` | 不受主题切换影响，直接对应业务字段名 |
| 3 | `input[name]` | `input[name="userName"]` | 原生属性，稳定 |
| 4 | `.cxd-*` class | `.cxd-Select`, `.cxd-InputBox` | 依赖 `cxd` 主题前缀，切换主题后失效 |
| 5 | 结构遍历 | `.cxd-Form-label` → sibling | 最脆弱，DOM 结构变动即失效 |

### `data-amis-name` 属性

Nop 的 AMIS 适配器（`host-amis-adapter.js`）在渲染时自动将表单控件的 `name` 属性映射为 `data-amis-name` HTML 属性。所有输入控件（Select、InputBox、Checkbox）的包装器上都有此属性。

| 组件 | `data-amis-name` 位置 | 值 |
|------|----------------------|-----|
| Select | `.cxd-Select` 根元素 | 字段的 `name` 属性 |
| InputBox | `.cxd-InputBox` 根元素 | 字段的 `name` 属性 |
| Checkbox | `.cxd-Checkbox` 根元素 | 字段的 `name` 属性 |
| FormField 包装器 | `data-role="form-item"` | 无 `data-amis-name`（在内部控件上） |

### 主题前缀

当前项目使用 `cxd` 主题，所有 class 前缀为 `.cxd-`。如果切换主题（`ang`、`dark`），所有 `.cxd-*` 选择器失效。`data-*` 属性、`role`、`aria-*` 不受影响。

---

## 2. 容器类组件

| Nop 控件标签 | AMIS `type` | CSS Selector | 说明 |
|---|---|---|---|
| (page) | `page` | 无固定选择器 | 外部容器 |
| (form) | `form` | `form.cxd-Form` | 根元素是 `<form>` 元素 |
| (group) | `group` | 无特定 class | 字段分组容器 |
| (crud) | `crud` | `.cxd-Crud` / `.cxd-Crud2` | `[data-role="container"]` |
| (tabs) | `tabs` | `.cxd-Tabs` | 标签页容器 |
| (wizard) | `wizard` | `.cxd-Wizard` | 向导容器 |
| (fieldSet) | `fieldSet` | `.cxd-FieldSet` | 可折叠字段集 |
| (collapse-group) | `collapse-group` | `.cxd-CollapseGroup` | 折叠面板组 |
| (divider) | `divider` | `.cxd-Divider` | 分割线 |

---

## 3. 文本输入类

所有文本输入控件都由 AMIS `input-text` 渲染为 `InputBox` 组件。

| Nop 控件标签 | AMIS `type` | CSS Selector | `data-amis-name` |
|---|---|---|---|
| `edit-string` | `input-text` | `.cxd-InputBox` | ✅ |
| `edit-int` | `input-text` | `.cxd-InputBox` | ✅ |
| `edit-short` | `input-text` | `.cxd-InputBox` | ✅ |
| `edit-byte` | `input-text` | `.cxd-InputBox` | ✅ |
| `edit-long` | `input-text` | `.cxd-InputBox` | ✅ |
| `edit-email` | `input-text` | `.cxd-InputBox` | ✅ |
| `edit-url` | `input-text` | `.cxd-InputBox` | ✅ |
| `edit-phone` | `input-text` | `.cxd-InputBox` | ✅ |
| `edit-path` | `input-text` | `.cxd-InputBox` | ✅ |
| `query-string` | `input-text` | `.cxd-InputBox` | ✅ |

**DOM 结构**：

```
.cxd-InputBox[data-amis-name="fieldName"]
  ├── input[type="text"][name="fieldName"]  ← 实际输入
  └── .cxd-InputBox-clear                    ← 清除按钮
```

**选择器**：优先 `input[name="fieldName"]`，后备用 `[data-amis-name="fieldName"] input`。

---

## 4. 数字输入类

| Nop 控件标签 | AMIS `type` | CSS Selector | 说明 |
|---|---|---|---|
| `edit-double` | `native-number` | `input[type="number"]` | 原生数字输入 |
| `edit-decimal` | `input-number` | `.cxd-NumberInput` | 高精度数字（内部含 `<input type="text">`） |

---

## 5. 日期选择类

| Nop 控件标签 | AMIS `type` | CSS Selector | 说明 |
|---|---|---|---|
| `edit-date` | `input-date` | `.cxd-DatePicker` | 日期选择 |
| `edit-datetime` | `input-datetime` | `.cxd-DatePicker` | 日期时间 |
| `query-date` | `input-date-range` | `.cxd-DateRangePicker` | 日期范围查询 |
| `query-datetime` | `input-datetime-range` | `.cxd-DateRangePicker` | 日期时间范围查询 |

`.cxd-DatePicker` 内部有 `input` 和日历面板。

---

## 6. 选择类

### Select 下拉选择

| Nop 控件标签 | AMIS `type` | CSS Selector | `data-amis-name` |
|---|---|---|---|
| `edit-enum` | `select` | `.cxd-Select` | ✅ |
| `edit-select` | `select` | `.cxd-Select` | ✅ |

**DOM 结构**：

```
.cxd-Select[data-amis-name="fieldName"]
  └── .cxd-Select-valueWrap  ← 当前选中值
  
（弹出层，在 portal 中）
.cxd-Select-popover
  └── .cxd-Select-menu
       └── .cxd-Select-option  ← 选项
```

**操作流程**：
1. 点击 `.cxd-Select`（或 `[data-amis-name="fieldName"] .cxd-Select`）展开
2. 在 `.cxd-Select-option` 中按文本过滤选项
3. 点击目标选项

### 其他选择类

| Nop 控件标签 | AMIS `type` | CSS Selector | 说明 |
|---|---|---|---|
| `edit-list-select` | `list-select` | `.cxd-ListControl` | 列表选择 |
| `edit-radios` | `radios` | `.cxd-Radios` | 单选组 |
| `edit-boolFlag` | `switch` | `[data-role="switch"]` / `.cxd-Switch` | 开关 |
| `edit-tree-parent` | `tree-select` | `.cxd-TreeSelection` | 树选择 |
| `edit-deptId` | `tree-select` | `.cxd-TreeSelection` | 部门树选择 |

**Switch 开关**：`[data-role="switch"]` 比 `.cxd-Switch` 更稳定（不依赖主题前缀）。内部有 `<input type="checkbox" name="fieldName">`。

**Checkbox 复选框**：AMIS checkbox 定位：`[name="fieldName"] input[type="checkbox"]`。

---

## 7. 多行 / 富文本

| Nop 控件标签 | AMIS `type` | CSS Selector | 说明 |
|---|---|---|---|
| `edit-textarea` | `textarea` | `.cxd-TextareaControl` | 多行文本 |
| `edit-html` | `input-rich-text` | 无固定 class | 富文本编辑器 |
| `edit-xml` | `editor` | `.cxd-Editor` | 代码编辑器 |

---

## 8. 标签数组

| Nop 控件标签 | AMIS `type` | CSS Selector | 说明 |
|---|---|---|---|
| `edit-tag-list` | `input-tag` | `.cxd-TagControl` | 标签列表 |
| `edit-string-array` | `input-array` | `.cxd-ArrayControl` | 字符串数组 |

---

## 9. 关系选择（Picker）

| Nop 控件标签 | AMIS `type` | CSS Selector | 说明 |
|---|---|---|---|
| `edit-relation` | `picker` | `.cxd-Picker` | 关联记录选择器 |
| `edit-roleId` | `picker` | `.cxd-Picker` | 角色选择器 |
| `edit-userId` | `picker` | `.cxd-Picker` | 用户选择器 |
| `edit-ref-id` | `picker` | `.cxd-Picker` | 引用 ID |
| `edit-ref-ids` | `picker` | `.cxd-Picker` | 多引用 ID |

> 注意：Nop 的 `picker` 是 CRUD 弹窗选择器，渲染为按钮 + 弹窗（内含 CRUD 组件），**不是** `amis-ui` 中 iOS 风格的 `PickerColumns`。

---

## 10. 只读显示类

| Nop 控件标签 | AMIS `type` | CSS Selector | 说明 |
|---|---|---|---|
| `view-labelProp` | `static` | `.cxd-Form-static` / `.cxd-Static` | 纯文本显示 |
| `view-enum` | `static` | 同上 | 枚举值显示 |
| `view-relation` | `static` | 同上 | 关联显示 |
| `view-boolFlag` | `static-mapping` | `.cxd-MappingField` | 布尔值映射标签 |
| `view-image` | `static-image` | `.cxd-ImageControl` | 图片显示 |
| `view-images` | `static-images` | `.cxd-ImagesControl` | 多图片 |
| `view-html` | `tpl` | `.cxd-Tpl` | HTML 模板 |
| `view-xml` | `code` | `.cxd-Code` | XML 代码块 |
| `view-pre` | `pre-static` | `.cxd-Static` | 预格式化文本 |

**读取只读字段值**：优先 `[data-amis-name="fieldName"] .cxd-Form-static`，后备用 `.cxd-PlainField`、`.cxd-Form-value`、`.cxd-MappingField`。

---

## 11. 按钮 / 操作

| AMIS `type` | CSS Selector | 说明 |
|---|---|---|
| `button` | `.cxd-Button` | 通用按钮 |
| `submit` | `.cxd-Button[type="submit"]` | 提交按钮 |
| `action` | `.cxd-Button--link` 或 `<a>` | 链接样式操作 |
| `dropdown-button` | `.cxd-DropDownButton` | 下拉按钮组 |

**选择器策略**：优先 `getByRole('button', { name: /编辑/ })`，次选 `.cxd-Button--primary`。

---

## 12. 三种下拉组件（关键区别）

AMIS 有三种外观相似但 DOM 完全不同的下拉组件，**不可混用选择器**：

| 组件 | 用途 | 容器 | 选项 | 触发器 |
|------|------|------|------|--------|
| **Select** | 表单字段下拉选择 | `.cxd-Select-menu` | `.cxd-Select-option` | `.cxd-Select` |
| **DropDownButton** | 行操作折叠菜单 | `.cxd-DropDown-menu` | `li.cxd-DropDown-button` | `button:has-text("更多")` |
| ~~`.cxd-DropDown-menuItem`~~ | **不存在于 AMIS 源码** | — | — | — |

### Select（表单字段选择）

用于 `edit-enum`、`edit-select` 等表单字段。通过 `[data-amis-name="字段名"]` 定位。

### DropDownButton（行操作"更多"）

CRUD 表格行操作过多时折叠为"更多"按钮。`AmisAdapter.rowAction()` 处理逻辑：
1. 先在行内查找直接匹配的按钮（如"查看"、"编辑"）
2. 找不到则点击"更多"展开，在 `.cxd-DropDown-menu > *` 中查找
3. 最后 fallback 到 `a, button` 过滤

---

## 13. 弹窗 / 对话框

| AMIS `type` | CSS Selector | Role | 说明 |
|---|---|---|---|
| `dialog` | `.cxd-Modal` | `role="dialog"` | 模态对话框 |
| `drawer` | `.cxd-Drawer` | `role="dialog"` | 抽屉 |

**子结构**：

```
.cxd-Modal
  ├── .cxd-Modal-header
  │    └── .cxd-Modal-title
  ├── .cxd-Modal-body
  ├── .cxd-Modal-footer
  │    ├── .cxd-Button（取消）
  │    └── .cxd-Button--primary（确认）
  └── .cxd-Modal-close
  
.cxd-Modal-overlay  ← 遮罩层
```

**确认按钮**：`.cxd-Modal-footer` 内的 `.cxd-Button--primary`。
**关闭按钮**：`.cxd-Modal-close`。
**遮罩**：`.cxd-Modal-overlay`。

---

## 14. 表格

| AMIS `type` | CSS Selector | 行选择器 | 单元格 |
|---|---|---|---|
| `crud` > table | `.cxd-Table` (当前版本) / `.cxd-Table2` (新版) | `.cxd-Table-row` 或 `tr` | `td:nth-child(N)` |

**行**：有 class `.cxd-Table-row` 和 `row-index` 属性。
**单元格**：当前版本用 `td:nth-child(N)` 定位列（N 通过 `columnHeaders` 配置映射）。新版 AMIS 可能支持 `td[data-col]`。

---

## 15. CRUD 搜索表单

AMIS CRUD 组件内置搜索表单（`columnsToggled` + `searchable` 字段触发渲染）：

```
.cxd-Table-searchableForm
  ├── input[name="filter_userName__contains"]   ← filter 输入框
  ├── button[type="submit"]                      ← 搜索按钮
  └── button[type="reset"]                       ← 重置按钮
```

**filter 命名规则**：`filter_<字段名>__<操作符>`（如 `filter_userName__contains`、`filter_status__eq`）。

**操作**：
- **搜索**：填 filter input → 点 `button[type="submit"]`（用 `force: true` 绕过关闭动画残留）
- **不要**点 `.fa-sync` 刷新按钮——它会**重置** filter 条件

**引擎抽象**：`engine.searchField(page, fieldName)` 和 `engine.searchButton(page)` 封装了这些 AMIS 特定选择器。

---

## 16. 删除确认对话框

nop-chaos-next 的删除确认使用**自定义 alert-dialog 组件**（非 AMIS `.cxd-Modal`），基于 Base UI：

| `data-slot` 属性 | 角色 | 说明 |
|------------------|------|------|
| `alert-dialog-content` | 对话框容器 | `position: fixed`，`z-index: 2007` |
| `alert-dialog-overlay` | 遮罩层 | `position: fixed`，全屏覆盖 |
| `alert-dialog-action` | 确认按钮 | 文本 "Confirm" |
| `alert-dialog-cancel` | 取消按钮 | 文本 "取消" |
| `alert-dialog-title` | 标题 | 文本 "Confirm" |
| `alert-dialog-description` | 描述 | 文本 "确认删除吗？" |

**关键问题**：由于 `position: fixed`，Playwright 的 locator-based click 可能**静默失败**（不报错但不触发事件处理器）。`offsetParent` 为 `null`（fixed 元素特性）。

**解决方案**：使用 `page.evaluate()` 执行原生 DOM `element.click()`：

```typescript
await page.evaluate(() => {
  const dlg = document.querySelector('[role="alertdialog"]');
  if (!dlg) return;
  for (const btn of dlg.querySelectorAll('button')) {
    if (/^(confirm|确定|确认|ok)$/i.test(btn.textContent?.trim() || '')) {
      (btn as HTMLElement).click();
      return;
    }
  }
});
```

---

## 17. DOM 诊断方法

调试 Playwright locator 问题时，优先用 `page.evaluate()` 检查实际 DOM 属性和计算样式，**不要靠截图猜测**。截图只能看到视觉效果，无法判断 `pointer-events`、`z-index`、`display` 等影响点击的 CSS 属性。

### 检查元素结构

```typescript
const info = await page.evaluate(() => {
  const el = document.querySelector('.cxd-Select');
  if (!el) return { found: false };
  return {
    found: true,
    outerHTML: el.outerHTML.substring(0, 500),
    className: el.className,
    dataAmisName: el.getAttribute('data-amis-name'),
  };
});
console.log(JSON.stringify(info, null, 2));
```

### 检查计算样式和可点击性

```typescript
const clickability = await page.evaluate(() => {
  const btn = document.querySelector('[data-slot="alert-dialog-action"]');
  if (!btn) return { found: false };
  const cs = getComputedStyle(btn);
  const r = btn.getBoundingClientRect();
  return {
    found: true,
    display: cs.display,
    visibility: cs.visibility,
    pointerEvents: cs.pointerEvents,
    opacity: cs.opacity,
    offsetParent: !!btn.offsetParent,  // fixed 元素为 false
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    disabled: (btn as HTMLButtonElement).disabled,
  };
});
console.log(JSON.stringify(clickability, null, 2));
```

### 列出所有按钮

```typescript
const buttons = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button'))
    .filter((b) => {
      const cs = getComputedStyle(b);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && b.offsetParent;
    })
    .map((b) => ({
      text: b.textContent?.trim(),
      dataSlot: b.getAttribute('data-slot'),
      className: b.className.substring(0, 80),
    }));
});
console.log(JSON.stringify(buttons, null, 2));
```

---

## References

- `control.xlib` — Nop 数据类型 → AMIS 组件映射
- `web.xlib` — AMIS 页面结构生成模板
- `amis-react19/packages/amis-ui/src/components/` — AMIS 组件 React 源码
- `amis-react19/packages/amis-core/src/theme.tsx` — 主题前缀机制（`makeClassnames('cxd-')`）
- `packages/e2e-shared/src/AmisAdapter.ts` — AMIS 引擎适配器实现
- `packages/e2e-shared/src/FormDialog.ts` — 表单对话框 PageObject
- `packages/e2e-shared/src/CrudListPage.ts` — CRUD 列表 PageObject
