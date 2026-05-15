# 对抗性审查 - 第 1 轮：可访问性 (a11y)

## 发现来源视角
无障碍用户 - 如果我只用键盘或屏幕阅读器，什么操作无法完成？

## 高严重度发现

### H1. TabContextMenu 完全无法通过键盘访问
- **文件**: `packages/core/src/components/TabsBar.tsx:49-114`
- **问题**: 右键上下文菜单仅通过 `onContextMenu` 触发，没有键盘替代方案（无 Shift+F10 或 menu key 处理）。菜单项虽为 `<button>`，但没有箭头导航、Escape 关闭和焦点陷阱。overlay 背景同时阻挡键盘事件到达菜单。
- **影响**: 纯键盘或屏幕阅读器用户完全无法使用标签上的刷新、关闭当前、关闭其他、关闭全部等操作。
- **信心**: 确定

### H2. Sidebar 折叠组切换按钮缺少 `aria-expanded`
- **文件**: `packages/core/src/components/Sidebar.tsx:119-129,155-163`
- **问题**: 组展开/折叠使用两个独立按钮（item 按钮和 chevron 按钮），均未设置 `aria-expanded` 向屏幕阅读器传达展开状态。状态仅通过视觉体现（chevron 的 CSS 旋转）。
- **影响**: 屏幕阅读器用户无法判断菜单组是否展开。
- **信心**: 确定

### H3. Sidebar 使用 `<div>` 而非 `<nav>` 地标
- **文件**: `packages/core/src/components/Sidebar.tsx:191`
- **问题**: 侧边栏容器是普通 `<div>`。应使用 `<nav>` 或 `role="navigation"` 以便辅助技术将其识别为导航地标。
- **影响**: 屏幕阅读器用户无法快速跳过或导航到主导航区域。
- **信心**: 确定

### H4. SessionSidebar 使用 `<div role="button">` 而非原生 `<button>`
- **文件**: `apps/main/src/pages/ai-workbench/components/SessionSidebar.tsx:64`
- **问题**: 每个会话卡片用 `<div>` + `role="button"` + `tabIndex={0}`，内部还嵌套实际 `<button>` 用于重命名和删除。虽然 div 有 Enter/Space 键盘事件，但缺少 `aria-current` 等属性。
- **影响**: 屏幕阅读器对嵌套按钮的层级可能产生混淆。
- **信心**: 很可能（键事件已处理，部分缓解）

### H5. 所有页面都没有 document.title
- **文件**: 全部 20+ 页面组件
- **问题**: 没有任何页面组件设置 `document.title`，路由和页面组件从未根据当前路由更新 `<title>` 元素。屏幕阅读器在导航时会朗读页面标题，用户无法知道自己在哪个页面。
- **影响**: 屏幕阅读器用户在 dashboard、flow editor、AI workbench、settings 之间导航时得不到页面标题播报。
- **信心**: 确定

### H6. 移动端侧边栏 overlay 没有 Escape 键处理
- **文件**: `packages/core/src/components/MainLayout.tsx:28-37`
- **问题**: 移动端侧边栏打开时 overlay 没有 `onKeyDown` 处理 Escape 键。键盘用户无法关闭侧边栏 overlay。
- **影响**: 纯键盘的移动端用户可能被困在侧边栏 overlay 中。
- **信心**: 确定

### H7. FlowNodeCard 浮动工具栏键盘不可达
- **文件**: `apps/main/src/pages/flow-editor/[id]/components/FlowNodeCard.tsx:16-21,59-100`
- **问题**: 浮动工具栏（Pencil、Copy、Trash2 按钮）仅在 `onMouseEnter`/`onMouseLeave` 时显示。`useFloatingToolbarVisibility` hook 完全基于鼠标事件。键盘用户无法访问节点编辑操作。
- **影响**: 关键编辑操作对纯键盘用户完全不可用。
- **信心**: 很可能

## 中严重度发现

### M1. 纯图标按钮缺少无障碍标签

| 文件 | 行 | 按钮 |
|------|-----|------|
| `packages/core/src/components/TopBar.tsx` | 21 | 汉堡菜单切换 |
| `packages/core/src/components/TabsBar.tsx` | 275 | 刷新图标按钮 |
| `packages/core/src/components/TabsBar.tsx` | 298-312 | "更多"水平点按钮 |
| `apps/main/src/pages/flow-editor/[id]/components/FlowEditorToolbar.tsx` | 53-54 | 后退按钮（向左滚动） |
| `apps/main/src/pages/flow-editor/[id]/components/FlowNodeCard.tsx` | 66-98 | 编辑、复制、删除 |
| `apps/main/src/pages/flow-editor/[id]/components/FlowNodePalette.tsx` | 66-68 | 添加节点按钮 |

### M2. NotificationButton 徽章未播报
- **文件**: `apps/main/src/components/layout/NotificationButton.tsx:9-19`
- **问题**: `<Badge>3</Badge>` 通知计数纯视觉显示，Bell 图标按钮没有 `aria-label` 描述通知数量。
- **信心**: 确定

### M3. ThemeSwitcher 模式按钮缺少 `aria-pressed`
- **文件**: `apps/main/src/components/layout/ThemeSwitcher.tsx:33-47`
- **问题**: 浅色/深色/系统模式切换按钮使用视觉样式指示激活状态，但缺少 `aria-pressed` 或 `aria-current`。
- **信心**: 确定

### M4. 表格列排序按钮缺少 `aria-sort`
- **文件**: `apps/main/src/pages/data-management/master-detail/index.tsx:329-336`
- **问题**: 列头排序按钮没有 `aria-sort` 指示当前排序方向。
- **信心**: 确定

### M5. AI Workbench 调整大小手柄键盘不可访问
- **文件**: `apps/main/src/pages/ai-workbench/index.tsx:344-356`
- **问题**: `role="separator"` 的调整大小手柄仅支持鼠标交互（`onMouseDown`），无法通过键盘操作。
- **信心**: 确定

### M6. Dashboard 图表系列切换按钮缺少 `aria-pressed`
- **文件**: `apps/main/src/pages/dashboard/index.tsx:217-230,427-440`
- **问题**: 系列/渠道可见性切换按钮使用视觉类指示激活状态，但缺少 `aria-pressed`。
- **信心**: 确定

### M8. MainLayout 标地不完整
- **文件**: `packages/core/src/components/MainLayout.tsx:25-48`
- **问题**: 侧边栏放在 `<aside>` 中但内容未包裹 `<nav>`，桌面端侧边栏缺少地标语义。
- **信心**: 很可能

### M9. TopBar 面包屑缺少 `aria-current`
- **文件**: `packages/core/src/components/TopBar.tsx:25-39`
- **问题**: 最后一个面包屑项（当前页面）视觉上通过 CSS 区分，但没有 `aria-current="page"`。
- **信心**: 很可能

### M10. FlowEditor 网格切换 Switch 缺少无障碍标签
- **文件**: `apps/main/src/pages/flow-editor/[id]/components/FlowEditorToolbar.tsx:67-70`
- **问题**: `<Switch>` 组件旁边只有视觉 `<span>` 标签 "Grid"，没有 `aria-label` 或 `<label>` 关联。
- **信心**: 确定

## 低严重度发现

### L1. 无跳过导航链接
- 应用没有在任何位置提供跳到内容链接。键盘用户每次页面加载都必须 Tab 穿过整个侧边栏和标签栏才能到达主内容。

### L2. 侧边栏折叠状态隐藏滚动条
- `apps/main/src/styles/index.css:109-116` — `.menu-scroll` 类隐藏滚动条（`scrollbar-width: none`）。

### L4. 插件错误状态无 `aria-live` 区域
- `packages/core/src/components/PluginSlot.tsx:61` — 内联错误显示 `<CardContent>{error}</CardContent>` 没有 `aria-live` 或 `role="alert"`，屏幕阅读器可能不播报。

### L5. Flow editor 编辑页面没有 `<h1>` 标题
- `apps/main/src/pages/flow-editor/[id]/index.tsx` — 没有页面级 `<h1>`。

### L6. PluginSlot 加载状态缺少 `aria-busy`
- `packages/core/src/components/PluginSlot.tsx:14-24` — LoadingView 显示 "Preparing plugin..." 但没有 `aria-busy="true"` 或 `role="status"`。

## 已观察到的良好实践
- Fullscreen 切换按钮正确使用 `aria-label`
- `sr-only` 工具类在多个 UI 原语中正确使用
- `role="alert"` 用于 alert 和 field error 组件
- 所有 `<img>` 标签有正确的 `alt` 文本
- 所有原生 `<button>` 使用 `type="button"`
- Breadcrumb 组件正确使用 `<nav aria-label="breadcrumb">`
- Spinner 使用 `role="status"` 和 `aria-label="Loading"`

## 总结
| 严重度 | 数量 | 关键领域 |
|--------|------|----------|
| 高 | 7 | 键盘导航（上下文菜单、浮动工具栏、移动端 overlay）、页面标题、地标语义 |
| 中 | 10 | 图标按钮标签、aria-* 状态属性 |
| 低 | 6 | 跳过链接、滚动条、aria-live、语义结构 |

代码库在 UI 原语层显示一定的无障碍意识，但应用层和核心组件存在显著空白——特别是键盘导航和动态状态披露方面。
