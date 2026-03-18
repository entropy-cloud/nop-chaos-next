# Amis 主题桥接方案

## 概述

本项目通过 CSS 变量桥接机制，将 amis 组件的主题样式与宿主应用的主题系统对接，实现：

- 自动跟随宿主主题切换（classic / glass）
- 自动跟随亮暗模式切换（light / dark）
- 弹出层（dialog/drawer）主题一致性

## 实现原理

### 1. CSS 变量映射

amis 使用自己的 CSS 变量体系（如 `--colors-brand-*`），宿主使用另一套变量（如 `--primary`）。

通过在 `.nop-amis-page` 容器上重新定义 amis 变量，实现样式映射：

```css
.nop-amis-page {
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

为解决 dialog/drawer 等弹出层渲染到 body 根节点的问题，在 schema 转换阶段自动添加 `nop-amis-page` 类名：

- `dialog` / `modal` → 自动添加 `bodyClassName: 'nop-amis-page'`
- `drawer` → 自动添加 `className: 'nop-amis-page'`

**实现位置**：`packages/amis-core/src/page/transform.ts`

```ts
function addDialogDrawerClass(value: AmisSchemaRecord): void {
  if (value.type === 'dialog' || value.type === 'modal') {
    addClassName(value, 'bodyClassName', 'nop-amis-page')
  } else if (value.type === 'drawer') {
    addClassName(value, 'className', 'nop-amis-page')
  }
}
```

### 3. 全局样式覆盖

部分组件（如 Tooltip）可能渲染在 `.nop-amis-page` 容器之外，需要全局覆盖：

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

**导入位置**：`apps/main/src/amis/init.ts`

```ts
import '@fortawesome/fontawesome-free/css/all.min.css'
```

## 文件清单

| 文件 | 用途 |
|------|------|
| `apps/main/src/amis/init.ts` | amis 初始化，加载 CSS |
| `apps/main/src/styles/amis-theme-bridge.css` | CSS 变量映射 |
| `apps/main/src/styles/amis-fix.css` | 组件级样式修复 |
| `packages/amis-core/src/page/transform.ts` | Schema 转换，注入类名 |
| `packages/amis-react/src/components/AmisSchemaPage.tsx` | 渲染容器，设置 `nop-amis-page` |

## 注意事项

1. **helper.css 冲突**：不要全局引入 `amis/lib/helper.css`，会与 Tailwind 工具类冲突（详见 `docs/12-amis-helper-css-conflict.md`）

2. **弹出层样式**：确保 dialog/drawer 的 `bodyClassName` 或 `className` 包含 `nop-amis-page`

3. **新增组件适配**：如遇到样式不一致的组件，可在 `amis-fix.css` 中添加针对性覆盖
