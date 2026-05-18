# 维度 09：主题与样式系统

## 第 1 轮（初审）

以下为维度 09（主题与样式系统）第 1 轮初审结果。

### [维度09-01] Harbor 扩展主题缺少 preset 依赖的 `surface-*` token
- **文件**: `C:\can\nop\nop-chaos-next\examples\extension-demo\src\harbor.css:38-49,89-100`；`C:\can\nop\nop-chaos-next\packages\tailwind-preset\src\index.ts:55-61`
- **证据片段**:
```css
/* harbor.css */
38:   --glass-blur: none;
39:   --app-topbar-bg: rgba(245, 251, 255, 0.82);
40:   --app-sidebar-bg: rgba(240, 249, 255, 0.95);
41:   --app-tabs-bg: rgba(245, 251, 255, 0.74);
42:   --card-surface: rgba(255, 255, 255, 0.8);
43:   --border-surface: rgba(255, 255, 255, 0.56);
44:   --chart-1: 196 82% 42%;
49:   background: linear-gradient(180deg, #f4fbff 0%, #e9f6fb 48%, #e2eef8 100%);

/* tailwind-preset */
55:       backgroundColor: {
56:         surface: 'var(--surface-primary)',
57:         'surface-secondary': 'var(--surface-secondary)',
58:         'surface-ghost': 'var(--surface-ghost)',
59:         'surface-highlight': 'var(--surface-highlight)',
60:         'surface-hover': 'var(--surface-hover)',
61:         'surface-overlay': 'var(--surface-overlay)',
```
- **严重程度**: P1
- **违规类别**: 变量缺失
- **现状**: `harbor` 主题只定义了 `card-surface` / `border-surface` 等局部 token，未补齐 `--surface-primary`、`--surface-secondary`、`--surface-ghost`、`--surface-highlight`、`--surface-hover`、`--surface-overlay`。而共享 Tailwind preset 已将这些 token 暴露为 `bg-surface*` 工具类。
- **建议**: 参考 `classic/glass` 四组主题，补齐 `harbor` light/dark 下全部 `surface-*` token；若扩展主题要复用 host/preset 组件，这是必须契约。
- **误报排除**: 仓库内存在大量 `bg-surface*` 使用点，这不是“预留未用 token”；一旦 `harbor` 成为活动主题，这些样式会失去稳定值。
- **复核状态**: `未复核`

### [维度09-02] 非注册主题会导致 DOM 与 bridge/store 观察到不同主题
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\utils\themeCss.ts:12-29`；`C:\can\nop\nop-chaos-next\apps\main\src\App.tsx:47-52,73-80,96`；`C:\can\nop\nop-chaos-next\apps\main\src\store\themeStore.ts:42-57`
- **证据片段**:
```ts
// themeCss.ts
14:   const resolvedMode = resolveDisplayMode(themeConfig.displayMode);
15:   const normalizedThemeId = normalizeThemeId(themeConfig.themeId);
16:   const resolvedThemeId = hasRegisteredTheme(normalizedThemeId)
17:     ? normalizedThemeId
18:     : getDefaultThemeId();
26:   root.dataset.theme = resolvedThemeId;

// App.tsx
47:   const pluginThemeConfig = useMemo(
48:     () => ({
49:       ...themeConfig,
50:       themeId: themeConfig.themeId || getDefaultThemeId(),
51:     }),
76:       themeConfig: pluginThemeConfig,
96:       getThemeConfig: () => pluginThemeConfig,
```
- **严重程度**: P1
- **违规类别**: 主题切换
- **现状**: `applyThemeToDocument()` 会把未注册主题回退到默认主题写入 DOM；但 `App.tsx` 传给 plugin bridge 的 `themeId` 只做“空值回退”，不做“已注册校验”。结果是 DOM 可能显示 `classic`，而 store/bridge 仍暴露原始无效主题值。
- **建议**: 将“主题规范化 + 已注册校验 + 默认回退”收口为单一 canonical resolver，并让 DOM、store、settings UI、plugin bridge 共同消费该结果。
- **误报排除**: 这不是纯理论问题；当前 `themeStore` 持久化恢复时也只做 `normalizeThemeId()`，未校验注册状态。
- **复核状态**: `未复核`

### [维度09-03] Extension 声明了主题，但 host 运行时没有接入注册链路
- **文件**: `C:\can\nop\nop-chaos-next\packages\shared\src\types\extension.ts:28-33`；`C:\can\nop\nop-chaos-next\examples\extension-demo\src\index.ts:59-65`；`C:\can\nop\nop-chaos-next\packages\extension-host\src\runtime.ts:140-193`；`C:\can\nop\nop-chaos-next\apps\main\src\config\themeRegistry.ts:9-35`
- **证据片段**:
```ts
// shared contract
28: export interface ExtensionTheme {
29:   id: string;
30:   labelKey: string;
31:   descriptionKey?: string;
32:   cssHref?: string;
33: }

// extension-demo manifest
59:   themes: [
60:     {
61:       id: 'harbor',
62:       labelKey: 'settings.themeOptions.harbor.label',
63:       descriptionKey: 'settings.themeOptions.harbor.description',
64:       cssHref: harborThemeHref,

// host registry
9: const defaultThemes: ThemeDefinition[] = [
11:     id: 'classic',
16:     id: 'glass',
24: export function registerThemes(themes: ThemeDefinition[]): void {
```
- **严重程度**: P1
- **违规类别**: 主题切换
- **现状**: 扩展契约支持 `themes[].cssHref`，`extension-demo` 也实际提供了 `harbor` 主题；但 host 侧运行时合并逻辑未消费 `extension.themes`，主题注册表仍是静态 `classic/glass`，生产代码中也没有看到 `registerThemes()` 的调用链。
- **建议**: 在 extension 加载成功后统一执行：1）注入/确保主题 CSS 资源；2）把 `extension.themes` 注册到 `themeRegistry`；3）让 settings/theme 页面展示这些主题；4）与 09-02 的 canonical resolver 打通。
- **误报排除**: `registerThemes()` 当前仅出现在测试/配置定义中，未发现生产路径调用。
- **复核状态**: `未复核`

### [维度09-04] 暗色切换只改 `data-mode/.dark`，未同步 `color-scheme`
- **文件**: `C:\can\nop\nop-chaos-next\packages\theme-tokens\src\styles.css:1-2`；`C:\can\nop\nop-chaos-next\apps\main\src\utils\themeCss.ts:12-29`
- **证据片段**:
```css
/* theme tokens */
1: :root {
2:   color-scheme: light;
```

```ts
/* themeCss */
26:   root.dataset.theme = resolvedThemeId;
27:   root.dataset.mode = resolvedMode;
28:   root.classList.toggle('dark', resolvedMode === 'dark');
```
- **严重程度**: P2
- **违规类别**: 主题切换
- **现状**: 根节点基础样式把 `color-scheme` 固定为 `light`，而主题切换逻辑只更新 `data-theme`、`data-mode`、`.dark`。暗色模式下浏览器原生控件/滚动条/UA 默认配色可能继续按 light 渲染。
- **建议**: 增加 `:root[data-mode='dark'] { color-scheme: dark; }` / `light` 对应规则，或在 `applyThemeToDocument()` 中同步设置 `root.style.colorScheme`。
- **误报排除**: AMIS bridge 使用 `color-scheme: inherit`，说明根节点 `color-scheme` 会继续向下游传递，不是局部无影响。
- **复核状态**: `未复核`

### [维度09-05] app Tailwind 扫描路径与 live UI 源路径漂移
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\tailwind.config.ts:6-10`；`C:\can\nop\nop-chaos-next\apps\main\src\styles\tailwind.css:1-3`
- **证据片段**:
```ts
// apps/main/tailwind.config.ts
6:   content: [
7:     './index.html',
8:     './src/**/*.{ts,tsx}',
9:     '../../packages/ui/src/**/*.{ts,tsx}',
10:     '../../packages/core/src/**/*.{ts,tsx}',
```

```css
/* tailwind.css */
1: @import 'tailwindcss';
2: @config '../../../../tailwind.config.ts';
3: @source '../../../../flux-lib/ui';
```
- **严重程度**: P3
- **违规类别**: token映射错误
- **现状**: app 级 config 仍扫描 `packages/ui/src`，而实际 live UI 路径已通过 `@source '../../../../flux-lib/ui'` 补偿。当前构建能工作，但配置来源分裂，后续容易造成 token utility 漏扫或误判。
- **建议**: 统一为单一事实来源：要么把 `content` 改到 live 路径，要么明确只依赖 CSS 入口 `@source`，并删除陈旧扫描项。
- **误报排除**: 这不是当前构建失败；问题在于配置漂移与维护风险。
- **复核状态**: `未复核`

### [维度09-06] 表单错误语义仍回退到硬编码红色
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\styles\flux-spacing.css:119-126`
- **证据片段**:
```css
119:   [data-slot='field-required'] {
120:     color: var(--nop-field-error, #b53b2c);
121:     margin-left: 2px;
122:   }

124:   [data-slot='field-error'] {
125:     font-size: 12px;
126:     color: var(--nop-field-error, #b53b2c);
```
- **严重程度**: P2
- **违规类别**: 硬编码颜色
- **现状**: 字段必填标记和错误文本仍使用 `#b53b2c` 作为 fallback，未直接绑定 `danger/destructive` 语义 token，扩展主题和深浅色下都无法自动跟随。
- **建议**: 改为 `hsl(var(--danger))` 或统一在根部定义 `--nop-field-error: hsl(var(--danger))`。
- **误报排除**: 应用级已存在 `--destructive: var(--danger)` 语义桥接，说明这里已有 token 替代路径。
- **复核状态**: `未复核`

### [维度09-07] 全局主题背景 blob 使用固定 rgba，无法随主题演化
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\styles\index.css:84-106`
- **证据片段**:
```css
84: .blob-a {
89:   background: rgba(167, 243, 208, 0.5);
90: }

92: .blob-b {
97:   background: rgba(196, 181, 253, 0.4);
98:   animation-delay: 2s;
99: }

101: .blob-c {
106:   background: rgba(153, 246, 228, 0.36);
107:   animation-delay: 4s;
```
- **严重程度**: P3
- **违规类别**: 硬编码颜色
- **现状**: host 全局氛围背景直接写死多组 rgba 颜色，classic/glass/extension 主题切换时这些视觉层不会跟随 token 改变。
- **建议**: 改为基于 `--primary` / `--secondary` / `--chart-*` 的 `color-mix()`，或将其提炼为显式主题 token。
- **误报排除**: 这不是单页插画资源，而是 app 级全局视觉层，确实参与主题观感。
- **复核状态**: `未复核`

### [维度09-08] Extension 主要页面大量硬编码 teal/slate/white，绕过主题 token
- **文件**: `C:\can\nop\nop-chaos-next\examples\extension-demo\src\pages\ExtensionLoginPage.tsx:93-109,142-178`；`C:\can\nop\nop-chaos-next\examples\extension-demo\src\pages\ExtensionNotFoundPage.tsx:41-62`
- **证据片段**:
```tsx
93: <div className="... bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.18),transparent_28%)] ...">
95:   <div className="... border-white/40 bg-white/70 ...">
98:     <div className="... bg-[linear-gradient(135deg,#0f766e,#155e75)] shadow-[0_22px_60px_rgba(15,118,110,0.28)]">
102:       <div className="eyebrow-text ... text-slate-600">
105:       <div className="text-2xl font-semibold text-slate-950">

142: <Card className="... border-white/50 bg-white/88 shadow-2xl backdrop-blur-xl">
145:   <div className="... bg-[linear-gradient(135deg,#0f766e,#155e75)] shadow-[0_18px_45px_rgba(15,118,110,0.25)]">
157: <CardDescription className="text-base leading-7 text-slate-600">
177: <div className="... border-teal-200 bg-teal-50/70 ... text-slate-600">
```
- **严重程度**: P2
- **违规类别**: 硬编码颜色
- **现状**: 扩展虽然提供了 `harbor.css` 主题 token，但核心登录/404 页面仍大面积使用固定 teal/slate/white 任意值与渐变，导致 `data-theme/data-mode` 切换只能部分生效。
- **建议**: 将品牌渐变、浅色面板、文本色提升为 harbor 自有 CSS 变量，组件中改用 token-backed utility 或 `var(--...)`。
- **误报排除**: 这些不是局部 icon/image 色值，而是页面主容器、品牌块、说明卡片等主体区域。
- **复核状态**: `未复核`

## 零发现 / 已检查范围
本轮已检查以下范围：
- `C:\can\nop\nop-chaos-next\docs\index.md`
- `C:\can\nop\nop-chaos-next\AGENTS.md`
- `C:\can\nop\nop-chaos-next\docs\design\styling-system-specification.md`
- `C:\can\nop\nop-chaos-next\packages\theme-tokens\src\styles.css`
- `C:\can\nop\nop-chaos-next\packages\tailwind-preset\src\index.ts`
- `C:\can\nop\nop-chaos-next\apps\main\src\styles\**`
- `C:\can\nop\nop-chaos-next\apps\main\src\utils\themeCss.ts`
- `C:\can\nop\nop-chaos-next\apps\main\tailwind.config.ts`
- `C:\can\nop\nop-chaos-next\examples\extension-demo\**`

本轮未单独立项的问题：
- `classic/glass + light/dark` 四组内建主题，对 `tailwind-preset` 的核心语义色映射（`primary/secondary/muted/accent/card/border/input/ring/danger/success/warning`）覆盖基本完整。
- `applyThemeToDocument()` 对 `data-theme` / `data-mode` / `.dark` 的基础切换动作本身是存在且一致的；问题主要集中在“无效主题回退一致性”与“未同步 color-scheme”。

## 深挖第 2 轮追加

### [维度09-09] AMIS 主题桥在作用域内重定义宿主语义 token，导致 `background/card` 语义塌缩
- **文件**: `apps/main/src/styles/amis-theme-bridge.css:155-160`; `apps/main/src/styles/amis-fix.css:215-230`
- **证据片段**:
```css
155:   --background: hsl(var(--card));
156:   --Tooltip-bg: hsl(var(--card));
157:   --Tooltip-boxShadow: var(--shadow-md);
158:   --Tooltip--attr-bg: hsl(var(--foreground) / 0.9);
159:   --Tooltip--attr-color: hsl(var(--background));
160:   --common-popover-border: 1px solid hsl(var(--border));
```
```css
215: .amis .cxd-Input {
216:   background: hsl(var(--background));
217:   border-color: hsl(var(--input));
218:   border-radius: var(--radius-sm);
219:   color: hsl(var(--foreground));
220: }
```
- **严重程度**: P1
- **违规类别**: 变量缺失
- **现状**: `amis-theme-bridge.css` 在 `.amis/.amis-dialog-widget` 作用域内直接重写了宿主自己的 `--background`，把它强制等同于 `--card`。后续在 AMIS 子树继续消费 `var(--background)` 的输入框、选择器、tooltip 会拿到被污染后的值。
- **建议**: 不要在 bridge 中重定义宿主语义 token；改为只写 AMIS 自己的变量。若确需 card 背景，应在消费处直接使用 `hsl(var(--card))`。
- **误报排除**: 这不是“同值别名无害”；`amis-fix.css` 已明确在 `.amis` 子树继续使用 `hsl(var(--background))`，说明该污染会真实改变组件表现。
- **复核状态**: `未复核`

### [维度09-10] 表格行样式 contract 已在 app 与 `@nop-chaos/ui` 之间分叉，`subtle` 变体不再统一
- **文件**: `flux-lib/ui/src/components/ui/table-row-class-name.ts:1-7`; `apps/main/src/lib/tableRowClassName.ts:1-7`; `docs/design/styling-system-specification.md:337-352`
- **证据片段**:
```ts
/* flux-lib/ui */
6:   subtle: 'hover:bg-white/45 dark:hover:bg-slate-900/45',

/* apps/main */
6:   subtle: 'hover:bg-surface-hover',
```
- **严重程度**: P1
- **违规类别**: 组件使用与一致性
- **现状**: 文档声明 `getTableRowClassName()` 是统一入口，但仓库里实际存在两份实现，且 `subtle` 已发生语义分叉：app 版本使用 token 化的 `surface-hover`，UI 包版本仍是硬编码 `white/slate`。
- **建议**: 收敛到单一事实来源；app 侧删除复制实现，统一复用 `@nop-chaos/ui` 导出，并把 UI 包里的 `subtle` 改为 token 驱动。
- **误报排除**: 这不是历史遗留未使用代码；`apps/main` 真实在多个页面直接 import 本地版本，而 `flux-lib/ui` 的 `TableRow` 又内置使用包内版本。
- **复核状态**: `未复核`

### [维度09-11] `@nop-chaos/ui` 共享原语仍内置多处裸色，主题系统无法完整接管
- **文件**: `flux-lib/ui/src/components/ui/badge.tsx:18-20`; `flux-lib/ui/src/components/ui/slider.tsx:43-47`; `flux-lib/ui/src/components/ui/dialog.tsx:77-83`
- **证据片段**:
```tsx
18:         success: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
19:         warning: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
```
```tsx
46:             className="... border border-ring bg-white ring-ring/50 ..."
```
```tsx
80:         'isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs ...',
```
- **严重程度**: P1
- **违规类别**: 硬编码颜色
- **现状**: 问题不只存在于 app/extension 页面，连共享 UI 原语本身也还在写死 `emerald/amber/white/black`。新增主题无法完整覆盖成功态、警告态、滑块拇指、模态遮罩等基础视觉层。
- **建议**: 将这些颜色全部改为语义 token：`success/warning/background/surface-overlay` 等；必要时为 overlay、thumb、state badge 新增明确 token。
- **误报排除**: 这些不是 demo 页面或一次性业务样式，而是 `@nop-chaos/ui` 基础组件，属于全仓库样式基线。
- **复核状态**: `未复核`

### [维度09-12] 仓库缺少 `prefers-reduced-motion` 基线，样式系统没有统一的动效降级合同
- **文件**: `apps/main/src/styles/index.css:76-82,153-155`; `flux-lib/ui/src/components/ui/spinner.tsx:7-10`; `flux-lib/ui/src/components/ui/dialog.tsx:80-81,131-137`
- **证据片段**:
```css
76: .theme-blob {
81:   animation: float 22s ease-in-out infinite;
82: }
153: .list-item-animate {
154:   animation: fadeInUp 0.45s ease forwards;
155: }
```
```tsx
10:       className={cn('size-4 animate-spin', className)}
```
- **严重程度**: P2
- **违规类别**: 主题切换
- **现状**: app 全局装饰、列表入场、loading、dialog/sheet/dropdown 等共享原语都默认启用动画；仓库内未发现 `prefers-reduced-motion`、`motion-reduce:` 或统一降级规则。
- **建议**: 在样式系统层补齐统一基线：全局 `@media (prefers-reduced-motion: reduce)`、Tailwind `motion-reduce:` 使用约定，并优先覆盖无限动画、位移动画、缩放入场动画。
- **误报排除**: 这不是单组件疏漏；问题同时存在于 app 全局 CSS 与共享 UI primitives，且仓库检索未发现任何 reduced-motion 处理。
- **复核状态**: `未复核`

## 深挖第 3 轮追加

### [维度09-13] canonical theme 解析仍未覆盖运行时 store/UI/bound store，失效主题可再次造成高亮与观察值分叉
- **文件**: `apps/main/src/store/themeStore.ts:25-31`; `apps/main/src/hooks/useTheme.ts:5-15`; `apps/main/src/pages/settings/theme/index.tsx:25-34`; `apps/main/src/components/layout/ThemeSwitcher.tsx:15-26`; `apps/main/src/App.tsx:58-61,80-113`; `apps/main/src/config/themeResolution.ts:5-10`
- **证据片段**:
```ts
setThemeId: (themeId) =>
  set((state) => ({
    themeConfig: {
      ...state.themeConfig,
      themeId,
    },
  })),
```
- **严重程度**: P1
- **违规类别**: 主题切换
- **现状**: 持久化恢复、DOM 应用、`getThemeConfig()` 已走 canonical resolver，但 `setThemeId()` 仍可把任意字符串直接写进 store；`useTheme()`、设置页 active 判断、`ThemeSwitcher`、以及 bridge 暴露的 `stores.themeStore` 读取到的仍是原始值。
- **建议**: 在 `setThemeId()` 或 store selector 层统一做 `resolveThemeConfig()`；bridge 暴露的 `themeStore` 也应输出 canonical `themeConfig`，不要只在 snapshot/getter 上修正。
- **误报排除**: 这不是已记录问题的重复；hydrate/bridge snapshot 路径虽已部分修正，但 live setter/UI/bound store 仍未收口到同一 canonical 源。
- **复核状态**: `未复核`

### [维度09-14] 多处主色承载组件仍写死 `text-white`/`white`，绕过 `--primary-foreground`
- **文件**: `packages/tailwind-preset/src/index.ts:14-17`; `apps/main/src/pages/dashboard/components/TrendAreaChart.tsx:44-47`; `apps/main/src/pages/dashboard/components/ChannelStackedChart.tsx:37-40`; `apps/main/src/components/layout/AppBrand.tsx:18`; `apps/main/src/pages/plugins/management/index.tsx:52,186`; `apps/main/src/pages/ai-workbench/components/ConversationPanel.tsx:105-111`
- **证据片段**:
```ts
primary: {
  DEFAULT: 'hsl(var(--primary))',
  foreground: 'hsl(var(--primary-foreground))',
},
```
- **严重程度**: P1
- **违规类别**: 硬编码颜色
- **现状**: 预设已提供 `primary.foreground` 语义色，但 host 多个主色背景上的文字/图标仍直接写 `text-white`，部分渐变还把 `white` 混入 stop。
- **建议**: 主色承载区域统一改用 `text-primary-foreground`；需要亮面渐变时新增 token，而不要在业务组件里直接混 `white`。
- **误报排除**: 命中范围覆盖 dashboard、branding、plugin 管理、AI 对话等核心页面，且仓库已明确定义 `--primary-foreground` 契约。
- **复核状态**: `未复核`

### [维度09-15] `plugin-demo` 远程插件示例仍大面积硬编码 `white/slate` surface，主题兼容示范失真
- **文件**: `examples/plugin-demo/src/index.tsx:89,108,145,160`
- **证据片段**:
```tsx
<Card className="border-white/45 bg-white/40 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/35">
```
- **严重程度**: P2
- **违规类别**: 硬编码颜色
- **现状**: 该远程插件已接入 `usePluginThemeConfig()`，但核心卡片/图表容器仍使用 `bg-white/40` + `dark:bg-slate-900/35`。host 切换到新主题时，remote demo 仍只是在白/深 slate 两套表面色间切换。
- **建议**: 改为 `bg-surface*`、`bg-[var(--card-surface)]`、`text-foreground` 等 token-backed 样式，把 `plugin-demo` 作为 host/plugin 主题契约的基准示例维护。
- **误报排除**: 这不是测试页边角代码；`examples/plugin-demo` 正是仓库公开的远程插件演示入口。
- **复核状态**: `未复核`

## 维度复核结论

- [维度09-01]: 降级 (P3)。`harbor.css` 缺 `--surface-*` token 属实，但 `harbor` 主题当前未接入 host 注册链路，实际影响被 09-03 前置阻断。
- [维度09-02]: 驳回。原指向 `App.tsx` / plugin bridge 的证据已过时，剩余问题已归并到 09-13。
- [维度09-03]: 保留 (P1)。扩展契约中的 `themes[].cssHref` 仍未被 host 运行时消费。
- [维度09-04]: 保留 (P2)。`color-scheme: light` 仍固定在根 token 样式中，暗色切换未同步 UA `color-scheme`。
- [维度09-05]: 保留 (P3)。app tailwind 扫描路径与 live UI 源路径仍分裂。
- [维度09-06]: 保留 (P2)。`flux-spacing.css` 仍回退到硬编码错误红色，且未定义 `--nop-field-error`。
- [维度09-07]: 降级 (P3)。blob 背景固定 `rgba` 属实，但更偏装饰层实现。
- [维度09-08]: 降级 (P3)。`extension-demo` 页面硬编码颜色属实，但当前更接近品牌化 demo 页面。
- [维度09-09]: 保留 (P1)。AMIS 主题桥仍在局部作用域内重定义宿主 `--background`。
- [维度09-10]: 保留 (P1)。`tableRowClassName` 双实现并存，且 `subtle` 变体已分叉。
- [维度09-11]: 保留 (P1)。`@nop-chaos/ui` 共享原语仍含多处裸色实现。
- [维度09-12]: 保留 (P2)。仓库仍缺 `prefers-reduced-motion` / `motion-reduce` 动效降级基线。
- [维度09-13]: 保留 (P1)。canonical theme 解析仍未覆盖 runtime store/UI/bound store，raw `themeId` 仍可流出。
- [维度09-14]: 降级 (P3)。多个主色承载区域仍写 `text-white` / `white`，但当前已定义主题的 `--primary-foreground` 仍均为白色。
- [维度09-15]: 降级 (P3)。`plugin-demo` 的硬编码 surface 主要影响示例插件主题兼容示范。

## 子项复核结论

- [维度09-03]: 子项复核通过。extension `themes[].cssHref` 仍未接入 host 运行时主题注册链路。
- [维度09-09]: 子项复核通过。AMIS 主题桥仍在局部作用域内污染宿主 `--background` 语义。
- [维度09-10]: 子项复核通过。`tableRowClassName` 双实现与 `subtle` 分叉仍成立。
- [维度09-11]: 子项复核通过。共享 UI 原语仍保留多处裸色实现。
- [维度09-13]: 子项复核通过。canonical theme 解析仍未统一覆盖 store/UI/bound store 的 live 读写路径。
