# Amis 主题桥接方案

## 概述

本项目通过 CSS 变量桥接机制，将 amis 组件的主题样式与宿主应用的主题系统对接，实现：

- 自动跟随宿主主题切换（classic / glass）
- 自动跟随亮暗模式切换（light / dark）
- 弹出层（dialog/drawer）主题一致性

## 实现原理

### 1. CSS 变量映射

amis 使用自己的 CSS 变量体系（如 `--colors-brand-*`），宿主使用另一套变量（如 `--primary`）。

通过在 `.amis` 页面容器和 `.amis-dialog-widget` 弹层根节点上重新定义 amis 变量，实现样式映射：

```css
.amis,
.amis-dialog-widget {
  /* 品牌色映射 */
  --colors-brand-5: hsl(var(--primary));
  --colors-brand-6: hsl(var(--primary-light));
  
  /* 文本色映射 */
  --colors-neutral-text-2: hsl(var(--foreground));
  
  /* 背景色映射 */
  --colors-neutral-fill-11: hsl(var(--card));
  
  /* ... 其他变量 */
}
```

**核心文件**：`apps/main/src/styles/amis-theme-bridge.css`

### 2. Schema 转换自动注入

为解决 dialog/drawer 等弹出层渲染到 body 根节点的问题，在 schema 转换阶段自动添加 `amis` 类名：

- 页面根容器 → `className='amis'`
- amis 原生弹层根节点 → 自带 `class='amis-dialog-widget ...'`
- `dialog` / `modal` → 自动添加 `bodyClassName: 'amis'`
- `drawer` → 自动添加 `className: 'amis'`

**实现位置**：`packages/amis-core/src/page/transform.ts`

```ts
function addDialogDrawerClass(value: AmisSchemaRecord): void {
  if (value.type === 'dialog' || value.type === 'modal') {
    addClassName(value, 'bodyClassName', 'amis')
  } else if (value.type === 'drawer') {
    addClassName(value, 'className', 'amis')
  }
}
```

### 2.1 当前已知限制：dialog 背景可能表现为透明

当前主题桥接依赖 `.amis` 与 `.amis-dialog-widget` 作用域中的 CSS 变量覆盖，例如：

```css
.amis,
.amis-dialog-widget {
  --background: hsl(var(--card));
}
```

这对普通页面内容是生效的，因为页面根节点本身带有 `.amis`。而 amis 原生 `dialog` / `modal` 的根节点本身会带 `amis-dialog-widget`，因此弹层根节点也可以直接承接主题变量。当前 `bodyClassName: 'amis'` 仍然只覆盖内容区，但透明背景问题主要通过 `.amis-dialog-widget` 作用域修复。

如果 amis 弹框外层样式使用了类似下面的写法：

```css
background: var(--background);
```

那么它在脱离 `.amis` 作用域后，拿到的可能是宿主根变量而不是桥接后的值。宿主里的 `--background` 往往是 HSL token（如 `0 0% 100%`），对 amis 这种直接 `var(--background)` 的用法来说可能不是合法颜色值，浏览器会忽略该声明，最终表现为弹框背景透明。

因此，`dialog` 背景透明通常不是 amis 自带样式丢失，而是“弹层挂载到 body 后，没有继承到正确的桥接变量作用域”导致。

建议修复方向：

1. 让主题桥接同时覆盖 `.amis` 与 `.amis-dialog-widget`
2. 在 `apps/main/src/styles/amis-fix.css` 中为 `.cxd-Dialog` / `.cxd-Modal` 增加明确的背景色兜底

### 3. 全局样式覆盖

部分组件（如 Tooltip）可能渲染在 `.amis` 容器之外，需要全局覆盖：

**文件**：`apps/main/src/styles/amis-fix.css`

```css
.cxd-Tooltip {
  background: hsl(var(--card)) !important;
  border: 1px solid hsl(var(--border)) !important;
}

:root[data-mode='dark'] .cxd-Tooltip {
  background: hsl(var(--gray-800)) !important;
}
```

## 变量映射表

| amis 变量 | 宿主变量 | 用途 |
|-----------|----------|------|
| `--colors-brand-*` | `--primary` | 品牌色 |
| `--colors-neutral-text-*` | `--foreground` | 文本色 |
| `--colors-neutral-fill-*` | `--card` / `--background` | 填充色 |
| `--colors-neutral-line-*` | `--border` | 线条色 |
| `--colors-error-*` | `--danger` | 错误色 |
| `--colors-success-*` | `--success` | 成功色 |
| `--colors-warning-*` | `--warning` | 警告色 |
| `--borders-radius-*` | `--radius-*` | 圆角 |
| `--shadows-shadow-*` | `--shadow-*` | 阴影 |

## 图标支持

amis 默认使用 FontAwesome 字体图标（如 `fa fa-sync`），需要安装依赖：

```bash
pnpm --filter @nop-chaos/main add @fortawesome/fontawesome-free
```

**导入位置**：`apps/main/src/main.tsx`

```ts
import '@fortawesome/fontawesome-free/css/all.min.css'
```

## 文件清单

| 文件 | 用途 |
|------|------|
| `apps/main/src/main.tsx` | 应用入口，加载 Font Awesome CSS |
| `apps/main/src/styles/amis-theme-bridge.css` | CSS 变量映射 |
| `apps/main/src/styles/amis-fix.css` | 组件级样式修复 |
| `packages/amis-core/src/page/transform.ts` | Schema 转换，注入类名 |
| `packages/amis-react/src/components/AmisSchemaPage.tsx` | 渲染容器，设置 `amis` |

## 注意事项

1. **helper.css 冲突**：不要全局引入 `amis/lib/helper.css`，会与 Tailwind 工具类冲突（详见 `docs/12-amis-helper-css-conflict.md`）

2. **弹出层样式**：确保 dialog/drawer 的 `bodyClassName` 或 `className` 包含 `amis`，并注意 `bodyClassName` 仅覆盖内容区，不能替代外层弹框容器的主题作用域

3. **新增组件适配**：如遇到样式不一致的组件，可在 `amis-fix.css` 中添加针对性覆盖
