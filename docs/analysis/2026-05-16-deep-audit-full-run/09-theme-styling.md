# 维度 09：主题与样式系统

## 第 1 轮（初审）

### [维度09-01] --radius 被应用层硬编码覆盖，与 theme-tokens 定义冲突

- **文件**: `packages/theme-tokens/src/styles.css:7` + `apps/main/src/styles/index.css:39`
- **严重程度**: P2
- **现状**: theme-tokens 定义 `--radius: var(--radius-md)`，但 app 层用 `--radius: 0.75rem` 硬编码覆盖，打破语义链。
- **建议**: 删除 index.css 第 39 行，依赖 theme-tokens 定义。
- **误报排除**: 当前数值一致，但未来修改 --radius-md 不会跟随。
- **复核状态**: 未复核

### [维度09-02] 52+ 处 bg-white/XX + dark:bg-slate-900/XX 硬编码颜色绕过主题系统

- **文件**: 20+ 个组件文件
- **严重程度**: P1
- **现状**: 广泛使用 Tailwind 内置 white/slate 调色板创建半透明效果，绕过 --card-surface 等 token。glass/harbor 主题切换时约 52 处表面颜色不跟随。
- **建议**: 在 tailwind-preset 扩展 backgroundColor 新增 surface token，分批替换。
- **误报排除**: 直接影响主题切换的视觉一致性。
- **复核状态**: 未复核

### [维度09-03] displayMode: 'system' 不监听 OS 偏好实时变化

- **文件**: `apps/main/src/utils/themeCss.ts:4-10`
- **严重程度**: P2
- **现状**: resolveDisplayMode 仅在 applyThemeToDocument 调用时执行一次，无 matchMedia change 监听器。
- **建议**: 注册 matchMedia change 事件监听器。
- **误报排除**: 用户在 OS 切换明暗后应用不会自动更新。
- **复核状态**: 未复核

### [维度09-04] --destructive 仅在应用层定义

- **文件**: `apps/main/src/styles/index.css:48,60`
- **严重程度**: P3
- **现状**: --destructive 未在 theme-tokens 中声明，与 Tailwind preset 的引用路径不一致。
- **建议**: 在 theme-tokens 中统一定义。
- **误报排除**: 两套命名指向同一底层变量但不经过同一别名。
- **复核状态**: 未复核

### [维度09-05] sidebar 变量在 theme-tokens 和 app styles 之间重复定义

- **文件**: 8 个 sidebar 变量在两处定义
- **严重程度**: P3
- **现状**: 违反 theme-tokens 作为单一 token 来源原则。
- **建议**: 删除 index.css 中的重复定义。
- **误报排除**: 两处值相同，但有漂移风险。
- **复核状态**: 未复核

### [维度09-06] .theme-blob 装饰元素使用硬编码 rgba 颜色

- **文件**: `apps/main/src/styles/index.css:85-109`
- **严重程度**: P3
- **现状**: 三个装饰 blob 的颜色在所有主题下固定，非 glass 主题下可能不协调。
- **建议**: 提取为主题变量或使用 color-mix()。
- **误报排除**: 纯装饰性元素。
- **复核状态**: 未复核

### [维度09-07] amis-theme-bridge 中存在硬编码 #ffffff

- **文件**: `apps/main/src/styles/amis-theme-bridge.css:39`
- **严重程度**: P3
- **现状**: 应使用 hsl(var(--primary-foreground)) 替代。
- **误报排除**: 功能正常，但不符合主题系统原则。
- **复核状态**: 未复核

### [维度09-08] flux-spacing.css 错误标记使用硬编码 #b53b2c

- **文件**: `apps/main/src/styles/flux-spacing.css:120,126`
- **严重程度**: P3
- **现状**: --nop-field-error 从未被定义，fallback 值总是生效。
- **建议**: 替换为 hsl(var(--danger))。
- **误报排除**: 表单错误颜色不受 --danger token 控制。
- **复核状态**: 未复核

### [维度09-09] flow-editor 节点颜色使用 Tailwind 内置调色板

- **文件**: `apps/main/src/pages/flow-editor/[id]/constants.ts:9-40`
- **严重程度**: P3
- **现状**: 6 种节点类型颜色不经过 CSS 变量，暗色模式下 chip 背景过亮。
- **建议**: 添加 dark: 变体或定义为主题 token。
- **误报排除**: 视觉适配问题。
- **复核状态**: 未复核

### [维度09-10] markdown 代码块硬编码 bg-slate-950/90

- **文件**: `apps/main/src/pages/ai-workbench/markdown.tsx:98`
- **严重程度**: P3
- **建议**: 使用主题变量控制代码块背景。
- **误报排除**: 无 dark: 变体。
- **复核状态**: 未复核

### [维度09-11] FlowCanvas 硬编码 rgba 渐变

- **文件**: `apps/main/src/pages/flow-editor/[id]/components/FlowCanvas.tsx:84`
- **严重程度**: P3
- **建议**: 使用 --primary/--secondary 变量。
- **误报排除**: 纯装饰。
- **复核状态**: 未复核

### [维度09-12] core 包 Sidebar/ErrorBoundary 包含硬编码颜色

- **文件**: `packages/core/src/components/Sidebar.tsx:67,95-96` + `ErrorBoundary.tsx:37`
- **严重程度**: P3
- **现状**: core 作为共享组件库应完全依赖 token。
- **建议**: 替换为主题变量。
- **误报排除**: theme-tokens 设计初衷就是统一 token。
- **复核状态**: 未复核

### [维度09-13] 主题系统缺乏单元测试覆盖

- **文件**: themeCss.ts、themeRegistry.ts、theme-tokens、tailwind-preset 均无测试
- **严重程度**: P3
- **建议**: 至少为 themeCss.ts 和 themeRegistry.ts 添加单元测试。
- **误报排除**: 主题重构时无法自动检测回归。
- **复核状态**: 未复核
