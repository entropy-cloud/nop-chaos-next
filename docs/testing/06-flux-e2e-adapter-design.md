# Flux 模式 E2E 适配设计（e2e-shared）

> 固化 flux 模式 e2e 测试的适配概念，避免反复试错与误删已验证代码。
> 适用：nop-chaos-next（e2e-shared 源）、nop-entropy-e2e / nop-app-erp（同步消费方）。

## 1. 分层职责

| 层 | 职责 | 位置 |
|----|------|------|
| EngineAdapter | **唯一**接触 DOM 的抽象。所有 selector、控件交互、读取逻辑在此实现 | `e2e-shared/src/FluxAdapter.ts` |
| PageObject | 业务语义（fillForm/clickEdit/readViewField），只调用 adapter 方法，**不出现具体 selector** | 各测试项目 `page-objects/` |
| spec | 测试场景与断言，只使用 PageObject + adapter 公开方法 | `tests/*.spec.ts` |

**规则**：具体 selector（`[data-slot=...]`、`input[name=...]`、`.nop-*`）只允许出现在 EngineAdapter 内。
PageObject 与 spec 中出现 selector 即为分层违规。

## 2. 表单字段填写策略（FluxAdapter.setFieldValue）

> **真相来源（Source of Truth）**：`nop-chaos-flux/packages/flux-renderers-form/src/__tests__/field-controls-dom-contract.test.tsx`。
> 该契约测试渲染每个控件并冻结其 DOM 结构（data-slot / role / id 命名约定）。**adapter 选择器必须与契约一致；任何 DOM 变更必须先更新契约测试，再同步本文档与 adapter。** 这是从根本上杜绝"反复改 combobox 选择器"的纪律。

### 2.1 通用约定

- **`id=${name}-control` 仅存在于 input 类控件**（input-text、textarea、select 触发器、input-number、input-time）。
- **checkbox / switch 的 interactive 元素没有 `${name}-control` id**（Base UI 的 CheckboxPrimitive/SwitchPrimitive 自带 `base-ui-_r_*` 自增 id）。`${name}-control-label` 在 wrapper `<label>` 上。**定位 checkbox/switch 必须用 `[data-slot=...-wrapper]` + 内部 `[role=...]`，不能依赖 `#${name}-control`。**
- 弹出层（combobox-content 等）由 Base UI Portal 渲染到 `document.body`，不在字段容器内，需从 `page` 级别查询。

### 2.2 控件逐项契约（已由 flux 单测验证）

| 控件 | 定位 selector | interactive 元素 | 读取值 | 填写方式 |
|------|--------------|------------------|--------|----------|
| input-text（plain） | `#X-control` → `input[data-slot="input"]` | `<input>` | `.value` | 原生事件 setter（见 §2.3） |
| input-text（prefix/suffix） | `#X-control` → `input[data-slot="input-group-control"]` in `[data-slot="input-group"]` | `<input>` | `.value` | 原生事件 setter |
| textarea | `#X-control` → `textarea[data-slot="textarea"]` | `<textarea>` | `.value` | `fill()` |
| **select 非搜索** | `#X-control` → `button[data-slot="combobox-trigger"][role="combobox"]` | `<button>` | trigger 内 `<span>` 文本（**无 `combobox-value` slot**） | click trigger → click `[role="option"]` |
| **select 搜索** | `#X-control` → `input[data-slot="input-group-control"][role="combobox"]` in `[data-slot="input-group"]` | `<input>` | input 值 | click input → click `[role="option"]` |
| **checkbox** | `[data-slot="checkbox-wrapper"]` → `span[data-slot="checkbox"][role="checkbox"]` | **`<span>`** | `data-checked` / `aria-checked` | click span 切换 |
| **switch** | `[data-slot="switch-wrapper"]` → `span[data-slot="switch"][role="switch"]` | **`<span>`** | `data-checked` / `aria-checked` | click span 切换 |
| radio-group | `[data-slot="radio-group-wrapper"]` → `[data-slot="radio-group-item-label"]` | radio item | aria | click label 文本 |
| checkbox-group | `[data-slot="checkbox-group-wrapper"][role="group"]` → `[data-slot="checkbox-group-item-label"]` | checkbox item | aria | click label |
| input-number | `#X-control` → `input[type="number"]` in `.nop-input-number` | `<input>` | `.value` | 原生事件 setter |

### 2.3 普通 input/textarea 填写——原生事件 setter（**不用 `fill()`**）

`fill()` 直接设 DOM value 不触发 React 受控组件 onChange，表单 store 不更新（e2e 编辑失败的历史根因）。统一用 prototype setter + dispatch input/change 事件：

```ts
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
setter.call(inputEl, value);
inputEl.dispatchEvent(new Event('input', { bubbles: true }));
inputEl.dispatchEvent(new Event('change', { bubbles: true }));
```

### 2.4 combobox 选项匹配——按 label，**不按 value**

**关键真相（契约冻结）**：combobox 选项 `[data-slot="combobox-item"]`：
- 可见文本 = `option.label`（**不是 value**）；
- **无 `data-value` 属性**（不能用 `[data-value="1"]` 定位）；
- 选项本身是 `<div>`，ARIA 语义层提供 `role="option"`，用 `getByRole('option', {name})` 或 `[data-slot="combobox-item"]` 文本匹配定位。

因此 adapter 收到 value（如 `"1"`）时，选项文本是 dict label（nop-entropy 字典格式为 `"1-男"`，即 `value-label`）。匹配策略（按优先级）：

1. 文本**完全等于** value；
2. 文本以 `${value}-` 开头（nop-entropy `value-label` 字典格式）；
3. 兜底：文本包含 value。

且**必须过滤可见选项**（`.first()` 会误中 Base UI 隐藏的 selected-value tracker，其 `aria-selected="true"` 但不可见）。

### 2.5 判定优先级（setFieldValue）

```
boolean → checkbox/switch（按 [data-slot=*-wrapper] 定位）
→ native input/textarea（#X-control，跳过 combobox）→ 原生事件填写
→ combobox（#X-control role=combobox，或 [data-slot=select-wrapper]）→ 按 label 选 option
→ select 元素 → selectOption({label})
→ getByLabel 兜底
```

**关键约束**：
- 编辑表单必须在 **loadAction 完成（字段填充）后**才能填写，否则 loadAction 的 setValues 覆盖填写值（见 §4）。
- `#X-control` 可能是 input 也可能是 combobox 触发器，先检测 `role=combobox`。
- checkbox/switch **不要**用 `#${name}-control`，该 id 不存在于 interactive 元素上。

## 3. 保存/提交语义（page_simple.xpl 生成）

flux 表单提交由 `submitAction`（ajax）驱动，data 语义：

| api 配置 | data | includeScope | 行为 |
|----------|------|--------------|------|
| `withFormData="true"` | `genScope.formData`（显式字段映射 `${field}` 模板） | null | 表单字段显式提交 |
| 无 data / 无 withFormData | `api.data`（通常 null） | `'*'` | 运行时从 scope 收集数据 |

**`$` 前缀运行时状态**（`$form`、`$_crud` 等）由 host 侧 `nopRpcResolver.removeSpecialKeys` 在**顶层**过滤（`$` 前缀键删除，嵌套 TreeBean `$body`/`$type` 保留）。后端模板**不**负责过滤。

**selection**：flux 运行时与 host fetcher 使用 `api.selection` 字段；后端模板生成时用 `selection` 键名（不能用 `gql:selection`）。

## 4. 编辑/查看 dialog 时序

```
clickEdit:
  rowAction(编辑) → dialog visible
  → 等待 loadAction 完成（第一个 input 有值）   ← 必须，否则填写被 setValues 覆盖
  → fillForm（修改字段）→ clickSave（submitForm → ajax → closeSurface）

clickView:
  captureRowData（缓存表格行数据）               ← view 表单无 label 时的读取兜底
  → rowAction(查看) → dialog visible → readViewField
  → getField(dialog) ?? 缓存数据
```

**view 表单**字段渲染为无 label 的 `span.nop-text`，无法按字段名定位；
读取兜底顺序：dialog 字段 → 缓存表格行数据 → 模糊匹配缓存 key。

## 5. 行操作（rowAction）

flux CRUD 行操作可能直接显示（`[data-slot=table-actions]` 内）或在"更多"下拉菜单中：

```
直接按钮 → 点击
"更多/More" 下拉 → 展开 → [data-slot=dropdown-menu-item] 匹配 → 点击
兜底：行内直接匹配
```

## 6. FluxDebug 调试机制

见 `docs/testing/05-flux-debug-diagnostics.md`。要点：
- e2e-shared `test` fixture 默认开启（`window.__FLUX_DEBUG__`）。
- 所有 flux ajax 请求/响应、monitor 错误、notify 消息记录到 `window.__fluxDebug`。
- `dumpFluxDebug / dumpFluxDebugFor / formatFluxDebug` 读取。
- **诊断用，不改变任何行为**。

## 7. Origin 一致性（localhost vs 127.0.0.1）

`Navigation.resolveBaseUrl` 优先级：显式参数 → `E2E_BASE_URL` → `BASE_URL` → `PLAYWRIGHT_BASE_URL` → 默认。
必须与 playwright.config 的 baseURL 同 origin——sessionStorage 按 origin 隔离，
`localhost` 与 `127.0.0.1` 不同源，登录认证状态不共享。

## 8. 变更纪律

- **selector 真相源头是 flux 契约测试**：`nop-chaos-flux/.../field-controls-dom-contract.test.tsx`（§2）。修改任何控件 selector 前，先确认契约测试状态；若 flux DOM 变了，先改契约测试，再同步本文档 §2.2，再改 adapter。
- **有序工作流**：flux 控件单测 → 本文档 adapter 设计 → adapter 实现 → 下游 e2e 确认。禁止跳过契约直接改 adapter 选择器（历史教训：combobox 选择器反复修改/删除）。
- **e2e-shared 是单向同步源**（nop-chaos-next → 下游）。下游本地修改会被覆盖，所有修复必须落在 nop-chaos-next。
- 删除"workaround"前，先确认其依赖的前置修复是否仍在（历史教训：3085760a2 删除 workarounds 依赖 page_simple.xpl formData 修复，而该修复随后被回退，导致回归）。
- 行为变化必须同步更新本文档对应章节。
