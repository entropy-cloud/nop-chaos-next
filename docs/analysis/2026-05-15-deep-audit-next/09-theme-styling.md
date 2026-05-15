# 维度 09：主题与样式系统

## 第 1 轮（初审）

### [维度09-01] `--destructive` CSS 变量在 CSS 文件中引用但从未定义

- **文件**: `apps/main/src/styles/flux-spacing.css:200,258`
- **严重程度**: P1
- **违规类别**: 变量缺失
- **现状**: flux-spacing.css 使用了 `hsl(var(--destructive))` 但任何 CSS 文件中均未定义 `--destructive`。Tailwind preset 的 destructive 色映射为 `hsl(var(--danger))`。
- **建议**: 将 `hsl(var(--destructive))` 替换为 `hsl(var(--danger))` 与 tailwind-preset 保持一致。

### [维度09-02] Extension 自定义主题 harbor 缺少 `--chart-1` 至 `--chart-5` 变量

- **文件**: `examples/extension-demo/src/harbor.css`
- **严重程度**: P1
- **违规类别**: 变量缺失
- **现状**: 四个内置主题每个 theme/mode 组合都定义了 `--chart-1` 至 `--chart-5`。Extension harbor 主题（harbor.css）的 light 和 dark 模式都没有定义这些变量。
- **建议**: 在 harbar.css 的 light 和 dark 模式块中添加与 harbor 色相匹配的 chart 颜色变量。

### [维度09-03] 大规模使用 `dark:bg-slate-*` 硬编码暗色值，违反样式规范

- **文件**: 分布于 `apps/main/src/pages/` 和 `apps/main/src/components/` 中约 50 处
- **严重程度**: P2
- **违规类别**: 硬编码颜色
- **现状**: 样式规范明确禁止硬编码暗色值，但实际代码中大规模使用 `dark:bg-slate-900/*`、`dark:bg-slate-950/*` 等。
- **建议**: 分步骤重构：将玻璃态透明背景提取为 CSS 工具类 `bg-glass`，使用 `--card-surface` 等语义变量。

### [维度09-04] `--radius` 变量在 theme-tokens 和 index.css 中重复定义且格式不一致

- **文件**: `packages/theme-tokens/src/styles.css:7`, `apps/main/src/styles/index.css:39`
- **严重程度**: P2
- **违规类别**: 变量缺失（重复定义）
- **现状**: theme-tokens 中 `--radius: var(--radius-md)` = 12px；index.css 中 `--radius: 0.75rem` = 12px。值相同但格式不同。
- **建议**: 删除 index.css 中的 `--radius: 0.75rem` 定义，统一由 theme-tokens 管理。

### [维度09-05] tailwind.config.ts content 扫描路径未包含 flux-lib/ui

- **文件**: `apps/main/tailwind.config.ts:6-11`, `tailwind.config.ts:6-11`
- **严重程度**: P2
- **违规类别**: token 映射错误
- **现状**: content 数组包含了无效路径 `../../packages/ui/src/`，未包含实际 UI 组件目录 `../../flux-lib/ui/src/`。当前通过 `@source` 指令（Tailwind v4）自动扫描。
- **建议**: 将 `../../packages/ui/src/` 替换为 `../../flux-lib/ui/src/`。

### [维度09-06] `--sidebar*` 变量在 index.css 和 theme-tokens 中重复定义

- **文件**: `apps/main/src/styles/index.css:38-59`
- **严重程度**: P3
- **违规类别**: 变量缺失
- **现状**: theme-tokens 已定义 8 个 sidebar 变量，index.css 的 `:root` 和 `.dark` 块重新定义相同变量。值相同无即时功能差异。
- **建议**: 从 index.css 删除 sidebar 变量定义（保留 `--radius` 相关处理）。

### [维度09-07] 31+ 组件同时使用 backdrop-blur 构成图层合成性能风险

- **文件**: 分布于 `apps/main/src/pages/` 和 `apps/main/src/components/` 中 31 处
- **严重程度**: P3
- **违规类别**: 主题切换（性能）
- **现状**: 大量嵌套元素同时使用 `backdrop-blur-xl`，glass 主题还通过 `--glass-blur` 引入额外 backdrop-filter。
- **建议**: 评估必要 blur；对动画/滚动容器内元素优化合成；添加 `prefers-reduced-motion` 降级。
