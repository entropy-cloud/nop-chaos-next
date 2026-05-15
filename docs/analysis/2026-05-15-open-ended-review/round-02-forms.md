# 对抗性审查 - 第 2 轮：表单处理模式

## 发现来源视角
新人开发者 + 契约考古学家

## 中严重度发现

### F1. Input/Textarea 没有 `forwardRef`
- **文件**: `flux-lib/ui/src/components/ui/input.tsx:9`, `textarea.tsx:5`
- **问题**: `Input` 和 `Textarea` 是普通函数组件，没有 `React.forwardRef`。无法与表单库（react-hook-form 等）一起使用，无法程序化聚焦。
- **信心**: 确定

### F2. Field 组件存在但从未使用
- **文件**: `flux-lib/ui/src/components/ui/field.tsx:69-214`
- **问题**: `Field`、`FieldLabel`、`FieldContent`、`FieldError`、`FieldGroup` 已完全实现（含 `role="alert"`、`data-invalid` 属性），但应用中零处使用。所有表单使用手动构造的内联错误 `<div>`。
- **影响**: ARIA 基础设施浪费；表单错误缺乏屏幕阅读器播报。
- **信心**: 确定

### F3. Login 表单缺少 `autoComplete` 和 `name` 属性
- **文件**: `apps/main/src/pages/auth/login/index.tsx:110-161`
- **问题**: Input 没有 `name`、`autoComplete`、`required`、`aria-required` 或 `aria-describedby` 属性。密码管理器无法自动填充。
- **信心**: 确定

### F4. Number Input 清空时产生 0（设置布局侧边栏宽度）
- **文件**: `apps/main/src/pages/settings/layout/index.tsx:34-54`
- **问题**: `Number(event.target.value)` 在 input 为空时产生 0，将侧边栏宽度崩溃到 0。`min` 属性是 HTML5 约束，不保护 onChange。
- **信心**: 确定

### F5. ItemsSection Number Input 产生 NaN
- **文件**: `apps/main/src/pages/data-management/master-detail/[id]/components/ItemsSection.tsx:122-148`
- **问题**: 用户输入无效内容（如 "e", "1.2.3"）时 `Number()` 产生 `NaN`。`NaN !== NaN` 导致 React 每次比较都视为新值，可能引起无限重渲染。
- **信心**: 确定

### F6. LogisticsDrawer 运输状态使用文本 Input 而不是 Select
- **文件**: `apps/main/src/pages/data-management/master-detail/[id]/components/LogisticsDrawer.tsx:63-72`
- **问题**: `shippingStatus` 使用纯文本 `<Input>`，但类型暗示 `'pending' | 'shipped' | 'delivered'`。`as LogisticsRecord['shippingStatus']` 类型转换不安全——用户可以输入任意字符串。
- **信心**: 确定

### F7. SessionSidebar 使用 `defaultValue`（非受控 Input）不一致
- **文件**: `apps/main/src/pages/ai-workbench/components/SessionSidebar.tsx:78-90`
- **问题**: 重命名 Input 使用 `defaultValue`（非受控），而代码库其他所有 Input 使用受控模式。如果用户在重命名时切换会话，React 可能复用 DOM 节点保留旧值。
- **信心**: 确定

### F8. 主-明细 useEffect 在自动重获取时重置草稿
- **文件**: `apps/main/src/pages/data-management/master-detail/[id]/index.tsx:52-61`
- **问题**: `useEffect` 在 `detailQuery.data` 变化时重置整个草稿状态。如果 React Query 在用户编辑时自动重获取，会丢弃用户正在进行的更改。
- **信心**: 很可能

### F9. 多处缺少 `<form>` 标签
- **文件**: 设置布局、主-明细、插件管理页面
- **问题**: 使用独立 Input 但没有 `<form>` 包装。无法按 Enter 键提交，无表单级语义。
- **信心**: 确定

## 低严重度发现
- Login 表单未在输入上调用 `.trim()`
- AddressDialog 电话字段缺少 `type="tel"`
- AI Workbench 消息输入状态未修剪
- 所有表单输入缺少 `name` 属性
- 主-明细使用 `JSON.stringify` 进行脏比较（脆弱）
- 插件管理选项未通过 `t()` 翻译
- `aria-invalid` 从未在表单错误时设置

## 总结
特别值得关注的是 `Input` 无 `forwardRef`、`Field` 组件未使用、Number Input 处理 NaN/0 的边界情况。这些构成后续引入表单库或改进无障碍的主要障碍。
