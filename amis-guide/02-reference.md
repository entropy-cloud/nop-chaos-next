# 核心机制参考

> 组件字段定义看 `amis-types/*.d.ts`。这里只记录跨组件的核心机制：表达式、API、事件、数据流。

---

## 1. 模板与表达式

### 模板语法 (在 `SchemaTpl` 字段中使用)

```
${variable}                          → 变量替换
${variable | filter:args}           → 带过滤器
<%= data.xxx + data.yyy %>          → JS 表达式
```

### 条件表达式 (在 `SchemaExpression` 字段中使用)

```
${variable === 'value'}              → 等于
${variable > 10}                     → 比较
${a && b}                            → 与
${a || b}                            → 或
${!a}                                → 非
${a ? 'yes' : 'no'}                  → 三元
${arr | includes:'x'}                → 包含
${phone | match:/^1[3-9]/}           → 正则
```

### 常用过滤器

| 过滤器 | 作用 | 示例 |
|--------|------|------|
| `date` | 日期格式化 | `${t \| date:YYYY-MM-DD}` |
| `number` | 数字格式化 | `${n \| number:0,0}` |
| `trim` | 去空格 | `${s \| trim}` |
| `json` | JSON 序列化 | `${o \| json}` |
| `default` | 默认值 | `${x \| default:'无'}` |
| `substring` | 截取 | `${s \| substring:0,5}` |
| `upperCase` / `lowerCase` | 大小写 | `${s \| upperCase}` |

```
串联: ${value | trim | upperCase | substring:0,10}
```

### 适用字段

- `SchemaTpl` → `title`, `label`, `tpl`, `html`, `placeholder`, `tooltip`, `description`, `confirmText`
- `SchemaExpression` → `visibleOn`, `hiddenOn`, `disabledOn`, `staticOn`, `sendOn`, `initFetchOn`

---

## 2. API 配置

### 简洁版

```json
{"api": "/api/users"}
{"api": "post:/api/save"}        // 指定方法
{"api": "delete:/api/users/1"}   // DELETE 请求
```

### 完整版 (看 `BaseApiObject`)

```json
{
  "api": {
    "url": "/api/save",
    "method": "post",
    "data": {"name": "${name}"},          // 请求体/query
    "headers": {"Authorization": "Bearer ${token}"},
    "adaptor": "return { ...payload, data: payload.data.list }",  // 响应转换
    "requestAdaptor": "api.data.timestamp = Date.now(); return api;",  // 请求前
    "autoRefresh": false,
    "interval": 3000,                     // 轮询
    "silent": false,                       // 静默(不弹错)
    "messages": {"success":"成功","failed":"失败"}  // 提示消息
  }
}
```

### API 响应格式

```json
{"status": 0, "msg": "成功", "data": { ... }}
```

- `status: 0` → 成功；非 0 → 失败
- CRUD 的 data 必须是 `{"items": [...], "total": N}`
- Select 的 source 返回 `data: [...]` 或 `data: {items: [...]}`

---

## 3. 事件与动作

### 3a. 传统按钮动作 (`actionType`)

按钮组件上的 `actionType` 字段：

| actionType | 附加属性 | 行为 |
|-----------|---------|------|
| `ajax` | `api` | 发请求 |
| `dialog` | `dialog` | 开弹窗 |
| `drawer` | `drawer` | 开抽屉 |
| `link` | `link`, `blank` | 跳转 |
| `copy` | `copy` | 复制 |
| `reload` | `target` | 刷新组件 |
| `close` | — | 关闭弹窗/抽屉 |
| `toast` | `toastText` | 提示 |
| `submit` / `reset` | — | 提交/重置表单 |

### 3b. onEvent 系统 (推荐)

任意组件的 `onEvent` 字段：

```json
{
  "onEvent": {
    "click": {"actions": [
      {"actionType": "ajax", "api": "/api/do", "outputVar": "result"},
      {"actionType": "toast", "args": {"msg": "完成"}},
      {"actionType": "reload", "componentId": "table1"}
    ]}
  }
}
```

可用事件：`click`, `change`, `submit`, `success`, `error`, `inited`, `loaded`, `selected`

可用动作（22 种，`ListenerAction.actionType` 配合扩展接口如 `IAjaxAction`）：

| actionType | 类 | 说明 |
|-----------|-----|------|
| `ajax` / `download` | AjaxAction | 请求/下载 |
| `dialog` / `closeDialog` | DialogAction | 弹窗 |
| `drawer` / `closeDrawer` | DrawerAction | 抽屉 |
| `alert` / `confirmDialog` | AlertAction / ConfirmAction | 提示/确认 |
| `toast` | ToastAction | Toast 通知 |
| `copy` | CopyAction | 复制 |
| `link` / `url` / `jump` | LinkAction | 跳转 |
| `reload` / `setValue` / `show` / `hidden` / `disabled` / `enabled` | CmptAction / StatusAction | 组件操作 |
| `goBack` / `refresh` / `goPage` | PageGoAction | 页面控制 |
| `loop` / `break` / `continue` | LoopAction | 循环控制 |
| `parallel` | ParallelAction | 并行执行 |
| `switch` | SwitchAction | 条件分支 |
| `wait` | WaitAction | 延迟 |

动作选项：

```json
{"actionType": "ajax","expression": "${status === 1}","preventDefault": true,"debounce": {"wait": 300}}
```

### 事件数据流

```
ajax 输出 → ${responseResult} 或 ${outputVar}  (通过 action.outputVar 自定义)
dialog 输出 → ${dialogResponse} 或 ${outputVar}  (形态: {confirmed, value})
```

---

## 4. 数据流

### 数据域

```
Page {data: {x:1}}            ← initApi 或 data 字段
  └── Form {name: "${x}"}     ← 继承 Page 的数据
      └── InputText            ← 继承 Form 的数据
```

子组件自动继承父组件数据域。同名变量子覆盖父。

### 数据来源

| 方式 | 适用组件 | 说明 |
|------|---------|------|
| `data` | page, form, dialog, drawer | 静态初始数据 |
| `initApi` | page, form, dialog, service | 初始化请求 |
| `api` | form, crud, dialog | 提交/列表 API |
| `source` | 选项类控件, table, cards | 数据源 |
| `service` | service | 通用数据容器 |
| `initFetch` / `initFetchOn` | page, form, dialog, service | 控制初始化请求是否触发 |
| `reload` | form, crud | 提交后刷新目标组件（如 `reload:"table1"`） |

### 组件间通信

```json
// Form 提交后刷新 CRUD
{"type":"form","target":"table1","body":[...]}
{"type":"crud","name":"table1","api":"/api/list"}

// 按钮刷新指定组件
{"type":"button","actionType":"reload","target":"table1"}

// onEvent 中 reload
{"actionType":"reload","componentId":"table1"}
```

### 数据持久化

```json
{"type":"form","persistData":"formKey","persistDataKeys":["name","age"],"clearPersistDataAfterSubmit":true}
```

### 选项联动

**动态选项（source vs options）**
- `options` 只接受静态数组，**不支持** `${var}` 变量绑定
- `source` 支持 API 地址和上下文变量绑定，与 `options` 互斥

```json
// 静态选项: 用 options (不支持 ${var})
{"type":"select","name":"type","options":[{"label":"A","value":"a"},{"label":"B","value":"b"}]}

// 从上下文变量绑定: 用 source
{"type":"select","name":"city","source":"${cityList}"}

// 从 API 加载: 用 source
{"type":"select","name":"city","source":"/api/cities?province=${province}","initFetch":false}
```

### autoFill 选中自动填充

```json
{"type":"select","name":"product","source":"/api/products","autoFill":{"price":"${price}","unit":"${unit}"}}
```

---

## 5. 内置变量

| 变量 | 值 |
|------|-----|
| `${__now}` | 当前时间戳 |
| `${__date}` | 当前日期 |
| `${__random}` | 随机数 |
