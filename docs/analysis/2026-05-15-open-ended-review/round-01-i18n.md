# 对抗性审查 - 第 1 轮：国际化 (i18n) 覆盖

## 发现来源视角
跨边界信使 - 数据跨越包、层或进程边界时，形状和语义是否保持？

## 严重度：关键 — 缺失翻译键

以下翻译键被源代码引用但不存在于任何语言文件中：

| 键 | 文件 | 行 | 说明 |
|-----|------|-----|------|
| `core.plugin.loading` | `packages/core/src/components/PluginSlot.tsx` | 19 | 所有语言文件均缺失 |
| `core.plugin.preparing` | `packages/core/src/components/PluginSlot.tsx` | 21 | 所有语言文件均缺失 |
| `route.pluginNotEnabled` | `apps/main/src/router/RouteRenderer.tsx` | 74 | 所有语言文件均缺失 |
| `route.pluginStatusDisabled` | `apps/main/src/router/RouteRenderer.tsx` | 76 | 所有语言文件均缺失 |

**影响**: 这些组件渲染时，i18next 的 fallback 行为会显示原始键字符串（如 "core.plugin.loading"）而不是用户友好消息。

**信心**: 确定

## 严重度：高 — 硬编码英文字符串

### 2a. PluginSlot 错误回退
- **文件**: `packages/core/src/components/PluginSlot.tsx:43`
- **代码**: `'Failed to load plugin'`
- **信心**: 确定

### 2b. FluxRouteRenderer 错误回退
- **文件**: `apps/main/src/flux/FluxRouteRenderer.tsx:58`
- **代码**: `'Failed to load flux schema'`
- **信心**: 确定

### 2c. FlowEditorToolbar "JSON" 标签
- **文件**: `apps/main/src/pages/flow-editor/[id]/components/FlowEditorToolbar.tsx:85`
- **信心**: 确定

### 2d. ExtensionDemo 登录页面 — 全部硬编码英文
- **文件**: `examples/extension-demo/src/pages/ExtensionLoginPage.tsx`
- **范围**: 全部用户面向文本，236 行文件零个 `t()` 调用
- **悖论**: `fr-FR/translation.json` 文件存在但从未使用
- **信心**: 确定

## 严重度：高 — Flux-lib i18n 旁路

### 3. Flux-lib 实现独立平行 i18n 系统
- **文件**: `flux-lib/ui/src/lib/i18n.ts`
- **问题**: flux-lib 实现自己的 i18n 系统，硬编码英文回退字符串。`setI18nGetter` 导出但从不被主应用调用。所有 flux-lib 组件（dialog, sheet, breadcrumb, carousel, pagination, sidebar）无论当前语言是什么都显示英文。
- **影响文件**: `dialog.tsx:155`, `sheet.tsx:67`, `breadcrumb.tsx:91`, `carousel.tsx:127,193,223`, `pagination.tsx:106`, `sidebar-layout.tsx:61-62,135,148,151`
- **信心**: 确定

## 严重度：中 — 命名空间组织问题

### 5a. `core.*` 命名空间缺失
- `packages/core` 中的组件期待翻译键但主应用 locale 文件不包含 `core` 命名空间。

### 5b. `route.*` 命名空间缺失
- `RouteRenderer.tsx` 使用的键在 locale 文件中无对应条目。

### 5c. Extension demo locale 命名空间冲突风险
- `examples/extension-demo/public/locales/*/translation.json` 定义 `settings.languageOptions`，与主应用的相同键冲突。

### 5d. 无包级 locale 文件
- `packages/core`、`packages/ui`、`packages/plugin-bridge` 不存在包级 locale 文件，它们依赖主应用 locale 文件但无明确契约。

## 严重度：中 — 插值与动态键

### 6a. 动态状态键无保护
- `apps/main/src/pages/flow-editor/index.tsx:200`: `` t(`common.flowStatuses.${flow.status}`) ``
- `apps/main/src/pages/data-management/master-detail/index.tsx:374`: `` t(`common.orderStatuses.${row.status}`) ``
- 如果新状态值没有对应翻译键，原始键路径将显示给用户。

### 6b/c. i18n 键当数据存储，运行时翻译
- `apps/main/src/pages/flow-editor/[id]/index.tsx:303-304,431-442`
- `label: 'flowEditor.editor.defaultEdgePath'` 作为数据存储，渲染时 `t(selectedNode.data.label)`。如果键不存在，原始键泄露到 UI。

## 严重度：低 — 初始化问题

### 7c. 加载 locale 文件失败无错误处理
- `initializeI18n()` 没有 `.catch()` 处理 locale 文件加载失败（404 或网络错误）。

### 7a. 语言设置读取早于初始化完成
- 多个文件在初始化完成前读取 `i18n.language`。虽然当前工作，但初始化失败时没有回退。

## Flux-lib 默认文本硬编码
- `pagination.tsx:60,78`: `text = 'Previous'` 和 `text = 'Next'` 默认为英文。

## 推荐修复（按优先级）
1. 向 `en-US/translation.json` 和 `zh-CN/translation.json` 添加缺失键
2. 将 `setI18nGetter` 连接到主应用的 `t()` 函数
3. 本地化 `ExtensionLoginPage.tsx`
4. 为 `initializeI18n()` 添加错误处理
5. 防护动态状态键查找
6. 建立包级 locale 契约

## 已观察到的良好实践
- `en-US` 和 `zh-CN` locale 文件键结构相同（566 行各），无缺失键
- 插值变量全部使用正确的双花括号语法 `{{var}}`
- `useTranslation()` hook 模式在所有组件中一致使用
