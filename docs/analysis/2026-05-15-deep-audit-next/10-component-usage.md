# 维度 10：组件使用与一致性

## 第 1 轮（初审）

### [维度10-01] TabsBar 3 处原生 `<button>`，已导入 Button 却混用

- **文件**: `packages/core/src/components/TabsBar.tsx:99,239,248`
- **严重程度**: P2
- **原生元素**: `<button>`
- **应替换为**: `<Button variant="ghost">` / `<Button variant="ghost" size="icon-xs">`
- **替换可行性**: 高

### [维度10-02] Sidebar 3 处原生 `<button>`，未导入 Button

- **文件**: `packages/core/src/components/Sidebar.tsx:61,120,156`
- **严重程度**: P2
- **原生元素**: `<button>`
- **应替换为**: `<Button variant="ghost">` / `<Button variant="ghost" size="icon-sm">`
- **替换可行性**: 中（样式定制度高）

### [维度10-03] apps/main 11 处模板字符串 className 未使用 cn()

- **文件**: apps/main/src/pages/ 下 7 个文件
- **严重程度**: P2
- **现状**: AGENTS.md 明确要求使用 cn() 进行类组合，但 apps/main/src/ 中有 11 处模板字符串。
- **应替换为**: `cn('base', condition ? 'a' : 'b')`
- **替换可行性**: 高

### [维度10-04] ConversationPanel 复制按钮用原生 `<button>`，已导入 Button

- **文件**: `apps/main/src/pages/ai-workbench/components/ConversationPanel.tsx:115-122`
- **严重程度**: P2
- **应替换为**: `<Button variant="ghost" size="sm">`
- **替换可行性**: 高

### [维度10-05] SessionSidebar 重命名/删除按钮用原生 `<button>` (2 处)

- **文件**: `apps/main/src/pages/ai-workbench/components/SessionSidebar.tsx:104,115`
- **严重程度**: P2
- **应替换为**: `<Button variant="ghost" size="sm">`
- **替换可行性**: 高

### [维度10-06] 主题设置页主题选择用原生 `<button>`，已导入 Button

- **文件**: `apps/main/src/pages/settings/theme/index.tsx:29-39`
- **严重程度**: P2
- **应替换为**: `<Button variant={active ? "default" : "outline"} className="rounded-lg p-4 text-left h-auto w-full">`
- **替换可行性**: 中

### [维度10-07] 仪表盘 toggle pill 用原生 `<button>` + 模板字符串

- **文件**: `apps/main/src/pages/dashboard/index.tsx:217,427`
- **严重程度**: P3
- **应替换为**: `<Button variant={active ? "default" : "outline"} className="rounded-full">`
- **替换可行性**: 高

### [维度10-08] 插件管理设置选择器原生 `<button>` + 模板字符串

- **文件**: `apps/main/src/pages/plugins/management/index.tsx:177`
- **严重程度**: P3
- **应替换为**: `<Button variant={active ? "default" : "outline"} className="rounded-full">`
- **替换可行性**: 高

### [维度10-09] PluginMountPanel 打开链接原生 `<button>`，已导入 Button

- **文件**: `apps/main/src/components/plugin/PluginMountPanel.tsx:63`
- **严重程度**: P3
- **应替换为**: `<Button variant="link" className="font-medium p-0 h-auto">`
- **替换可行性**: 高

### [维度10-10] FlowEdgeRenderer 边标签按钮原生 + 模板字符串，已导入 Button

- **文件**: `apps/main/src/pages/flow-editor/[id]/components/FlowEdgeRenderer.tsx:76`
- **严重程度**: P3
- **现状**: 高度定制背景色，Button 标准色板不易匹配。
- **建议**: 优先修复模板字符串 → cn()。Button 替换可延后。
- **替换可行性**: 中

### [维度10-11] FlowNodePalette 拖拽按钮原生 `<button>`，同文件另一处用了 Button

- **文件**: `apps/main/src/pages/flow-editor/[id]/components/FlowNodePalette.tsx:50`
- **严重程度**: P3
- **应替换为**: `<Button variant="ghost" className="group flex min-w-0 flex-1 items-center gap-3 text-left" draggable>`
- **替换可行性**: 中

### [维度10-12] master-detail 表头排序按钮原生 `<button>`，已导入 Button

- **文件**: `apps/main/src/pages/data-management/master-detail/index.tsx:329`
- **严重程度**: P2
- **应替换为**: `<Button variant="ghost" size="xs" className="inline-flex items-center gap-1 font-medium">`
- **替换可行性**: 高

### [维度10-13] SidebarUserMenu 原生 `<button>`（合理例外）

- **文件**: `apps/main/src/components/layout/SidebarUserMenu.tsx:51`
- **严重程度**: 观察项
- **现状**: DropdownMenuTrigger 自定义触发器需要高度特定的视觉样式，Button 无法直接匹配。
- **建议**: 保留原生，在 AGENTS.md 中注释为合理例外。

### [维度10-14] apps/main 直接依赖 @base-ui/react（重复声明）

- **文件**: `apps/main/package.json:21`
- **严重程度**: P3
- **现状**: apps/main 和 flux-lib/ui 都声明了 @base-ui/react 依赖。
- **建议**: 在依赖策略文档中记录原因，添加 CI 检查确保版本一致。
