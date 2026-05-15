# 对抗性审查 - 第 2 轮：CSS 动画与样式系统

## 发现来源视角
10x 规模运维者 + 异常路径侦探

## 高严重度发现

### C1. `animate-caret-blink` 从未定义（动画静默失败）
- **文件**: `flux-lib/ui/src/components/ui/input-otp.tsx:64`
- **问题**: `<div className="h-4 w-px animate-caret-blink ...">` 使用了 `animate-caret-blink` 类，但无论是 `tailwindcss-animate` 插件还是项目 CSS 都没有定义 `@keyframes caret-blink`。光标完全不可见。
- **影响**: OTP 输入字段的光标是一个功能完整性 bug。
- **信心**: 确定

### C2. 19 个 `!important` 声明在 AMIS override 层
- **文件**: `apps/main/src/styles/amis-fix.css:8-276`
- **问题**: AMIS override 大量使用 `!important`。如果 AMIS 更新 CSS 提高特异性，或新组件需要覆盖这些，将需要更多 `!important`，形成特异性战争升级。
- **影响**: 脆弱的级联链，未来维护成本高。
- **信心**: 确定

### C3. 无字体预加载策略 — FOUT 风险
- **文件**: `apps/main/index.html:*`
- **问题**: Inter 和 Noto Sans SC 字体未通过任何机制加载。没有预连接提示，没有 font stylesheet link，没有 `@font-face` 块。浏览器用 fallback 渲染然后交换，造成明显的布局偏移（FOUT）。
- **信心**: 确定

### C4. Font Awesome 同步加载阻塞渲染
- **文件**: `apps/main/index.html:6`
- **问题**: `<link rel="stylesheet" href="/vendor/fontawesome/all.min.css" />` 同步加载，阻塞首次渲染。增加了 ~30-50KB 阻塞 CSS。
- **信心**: 确定

## 中严重度发现

### C5. `transition: all` 在 AMIS 按钮上触发布局
- **文件**: `apps/main/src/styles/amis-fix.css:168`
- **问题**: `transition: all` 包含每个可动画属性，抵消了仅 compositor 线程的动画优化。
- **信心**: 确定

### C6. Sidebar 动画布局属性 [width,height,padding,left,right]
- **文件**: 
  - `flux-lib/ui/src/components/ui/sidebar-menu.tsx:34`
  - `flux-lib/ui/src/components/ui/sidebar-layout.tsx:82,94`
- **问题**: 动画 `width`、`height`、`padding`、`left`、`right` 全部触发布局重新计算，特别是低端设备上导致强制 reflow。
- **信心**: 确定

### C7. 8 个 flux-lib 文件中有超长 className 字符串（400-950 字符）
- **文件**: `sheet.tsx:55`, `navigation-menu.tsx:83`, `calendar.tsx:176`, `sidebar-menu.tsx:34,226`, `switch.tsx:19`, `command.tsx:139`
- **影响**: 巨大 CSS 输出，极难 PR review，任何单类添加需重测整个组件。
- **信心**: 确定

### C8. 219+ 处冗余 `[hsl(...)]` 任意值重复主题
- **文件**: 30+ 组件/页面 TSX 文件
- **问题**: `border-[hsl(var(--border))]` 等于 `border-border`（已在 preset 中映射），`text-[hsl(var(--danger))]` 等于 `text-destructive`。使用任意值绕过了 Tailwind 设计系统。
- **信心**: 确定

### C9. 基础设施 CSS 变量缺少 fallback 值
- **文件**: `amis-fix.css`, `flux-spacing.css`
- **问题**: `--space-*`、`--radius-*`、`--transition-*` 变量引用均无 fallback。如果 `theme-tokens/src/styles.css` 加载失败，组件渲染不正确。
- **信心**: 确定

### C10. 不一致的 glass/backdrop 透明度值
- **文件**: 应用中 52 个位置
- **问题**: 透明度值从 25% 到 90% 不等，无统一视觉语言。
- **信心**: 确定

### C11. 无集中化 z-index 体系
- **文件**: 多处
- **问题**: z-1 到 z-50 到 z-1400（AMIS），无约定指导 future overlay 层级。
- **信心**: 确定

### C12. Tailwind `!` 修饰符跨越组件边界
- **文件**: `flux-lib/ui/src/components/ui/command.tsx`, `sidebar-menu.tsx`
- **问题**: 组件内使用 `rounded-xl!`、`h-8!` 等用 `!important` 强制样式，暗示组件 API 边界不清晰。
- **信心**: 确定

## 低严重度发现
- `apps/main/src/styles/index.css:38-59` 与 `theme-tokens/src/styles.css` 重复的 sidebar 变量定义
- `flux-spacing.css:150-260` 可能有死 CSS 选择器
- `amis-fix.css:113` `--fontFamilyMonospace` 缺少 fallback
- `isolate` 堆叠上下文在某些 z-50 容器上不一致

## 总结
CSS/动画问题影响广泛但多为性能优化层。最严重的是 `animate-caret-blink` 缺失（功能 bug）和字体预加载缺失（FOUT）。219+ 冗余任意值是重构的显著技术债务。
