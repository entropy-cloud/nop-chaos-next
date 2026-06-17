# AMIS 开发指南 - 给 AI 看的精简版

> **一句话**：AMIS 是百度开源的 JSON-to-React 低代码框架。你写 JSON Schema，引擎把它渲染成 UI。

---

## 核心架构

```
JSON Schema (含 type 字段)
  → resolveRenderer(type) 在注册表中查找匹配的 React 组件
  → 递归渲染子节点 render(region, node, props)
  → 每个渲染器可关联 MobX-ST store (FormStore, CRUDStore 等)
```

- **渲染器注册**：`@Renderer({type:'xxx'})` 或 `registerRenderer({type:'xxx', component:...})`
- **类型系统**：所有组件继承 `BaseSchema`（common.d.ts），通过 `type` 字段区分
- **数据域**：组件树形成数据作用域，子可访问父，父不可访问子
- **Scoped 系统**：组件通过 `name` 或 `id` 注册到 Scoped 上下文，供 `target` / `componentId` / `reload` 等跨组件操作定位

## 类型定义位置

**所有组件的 TypeScript 接口定义在 `amis-types/*.d.ts`，这是绝对准确的知识源。** 需要查组件字段时直接看对应文件，AI 看到 TypeScript 接口就能自然地映射到 JSON：

| 文件                                  | 内容                                                                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `common.d.ts`                         | `BaseSchema`, `FormBaseControl`, `FormOptionsSchema`, `SchemaApi`, `SchemaExpression`, `SchemaTpl`, `Option`, `OnEvent`, `ListenerAction` |
| `page.d.ts`                           | `PageSchema`                                                                                                                              |
| `form.d.ts`                           | `FormSchema`                                                                                                                              |
| `form-controls.d.ts`                  | 核心表单项 (`input-text`, `select`, `checkbox`, `date` 等)                                                                                |
| `form-advanced.d.ts`                  | 高级表单项 (`combo`, `transfer`, `input-tree`, `input-file` 等)                                                                           |
| `form-controls-extra.d.ts`            | 额外表单项 (`picker`, `nested-select`, `color`, `rating` 等)                                                                              |
| `table.d.ts`                          | `TableSchema`, `CRUDSchema`                                                                                                               |
| `data.d.ts`                           | `ListSchema`, `ServiceSchema`, `NavSchema`, `CardsSchema`                                                                                 |
| `display.d.ts` / `display-extra.d.ts` | `ChartSchema`, `ImageSchema`, `CarouselSchema` 等                                                                                         |
| `feedback.d.ts`                       | `DialogSchema`, `DrawerSchema`, `AlertSchema` 等                                                                                          |
| `tabs.d.ts`                           | `TabsSchema`, `CollapseSchema`, `StepsSchema`, `WizardSchema` 等                                                                          |
| `button.d.ts`                         | `ButtonSchema`, `ButtonGroupSchema` 等                                                                                                    |
| `layout.d.ts`                         | `TplSchema`, `PanelSchema`, `FlexSchema`, `ContainerSchema` 等                                                                            |
| `index.ts`                            | `AmisSchema`（所有组件的联合类型）+ `AmisSchemaByType`（type→接口映射）                                                                   |

> 看 TypeScript 接口即知 JSON 怎么写：接口的属性名就是 JSON key，类型就是值的类型。

## 跨组件共性

所有组件共用 `BaseSchema` 的属性：`className`, `disabled`, `disabledOn`, `visible`, `visibleOn`, `onEvent`, `static`, `style`。

所有表单项继承 `FormBaseControl`：`name`, `label`, `value`, `placeholder`, `required`, `validations`, `submitOnChange`, `clearValueOnHidden`, `mode`, `size` 等。

选项类控件还继承 `FormOptionsSchema`：`options`, `source`, `multiple`, `clearable`, `creatable`, `editable`, `addApi`, `deleteApi` 等。

## 如何用

```typescript
import { render, extendDefaultEnv } from 'amis';
import ReactDOM from 'react-dom';

// 配置请求和 UI 环境（fetcher 必须，其余可选）
extendDefaultEnv({
  fetcher: (config) => fetch(config.url, config).then((r) => r.json()),
  notify: (type, msg) => alert(msg), // toast 通知
  confirm: (msg) => window.confirm(msg), // 确认弹窗
  alert: (msg) => window.alert(msg), // 普通弹窗
  jump: (to) => (window.location.href = to), // 页面跳转
});

// render 返回 JSX.Element，用 ReactDOM 挂载
const schema = { type: 'page', title: '首页', body: 'Hello' };
ReactDOM.render(render(schema, { data: {} }), document.getElementById('root'));
```

## 文件索引

| 文件               | 解决什么问题                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-quickstart.md` | 10 个最常用代码段速查（页面/CRUD/表单/弹窗/Combo/条件/onEvent/Service/Wizard）                                                                          |
| `02-reference.md`  | 表达式语法、API 配置、事件系统、数据流（比类型定义更跨组件的知识）                                                                                      |
| `amis-types/`      | 所有组件的 TypeScript 接口（字段知识源）。入口见 `amis-types/index.ts`（`AmisSchema` 联合类型 + `AmisSchemaByType` 映射）和 `amis-types/index-extra.ts` |
| `design-patterns/` | 常见业务场景的完整解法 cookbook                                                                                                                         |

### `design-patterns/` 清单

| 文件                             | 场景                                   |
| -------------------------------- | -------------------------------------- |
| `design-patterns/crud.md`        | 标准 CRUD + 搜索 + 新增/编辑/删除      |
| `design-patterns/combo.md`       | 动态增删表单项（订单明细）             |
| `design-patterns/chaining.md`    | API 链式调用 / 并行请求 / 循环批量     |
| `design-patterns/conditional.md` | 显隐 + 选项联动 + autoFill             |
| `design-patterns/custom.md`      | 自定义组件 / 自定义表单项 / 自定义动作 |
