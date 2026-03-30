# AMIS 主题桥接

> 本文档描述 AMIS 组件与宿主主题系统的对接方案。

---

## 1. 实现原理

### CSS 变量映射

AMIS 使用自己的 CSS 变量体系（如 `--colors-brand-*`），宿主使用另一套变量（如 `--primary`）。

通过在 `.amis` 和 `.amis-dialog-widget` 上重新定义 AMIS 变量实现映射：

**核心文件**：`apps/main/src/styles/amis-theme-bridge.css`

### Schema 转换自动注入

为解决 dialog/drawer 弹出层渲染到 body 根节点的问题，在 schema 转换阶段自动添加类名：

- 页面根容器 → `className='amis'`
- dialog/modal → `bodyClassName: 'amis'`
- drawer → `className: 'amis'`

**实现位置**：`packages/amis-core/src/page/transform.ts`

---

## 2. 变量映射表

| AMIS 变量 | 宿主变量 | 用途 |
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

---

## 3. 图标支持

AMIS 默认使用 FontAwesome 字体图标。当前项目使用仓库内静态资源：

- `apps/main/public/vendor/fontawesome/all.min.css`
- `apps/main/public/vendor/fontawesome/webfonts/*`

加载位置：`apps/main/index.html`

```html
<link rel="stylesheet" href="/vendor/fontawesome/all.min.css" />
```

---

## 4. 文件清单

| 文件 | 用途 |
|------|------|
| `apps/main/index.html` | 通过 `<link rel="stylesheet">` 加载 Font Awesome CSS |
| `apps/main/src/styles/amis-theme-bridge.css` | CSS 变量映射 |
| `apps/main/src/styles/amis-fix.css` | 组件级样式修复（由 `apps/main/src/styles/index.css` 引入） |
| `apps/main/src/amis/init.ts` | AMIS 运行时初始化与主题桥接样式入口 |
| `packages/amis-core/src/page/transform.ts` | Schema 转换，注入类名 |
| `packages/amis-react/src/components/AmisSchemaPage.tsx` | 渲染容器 |

---

## 5. 注意事项

1. **helper.css 冲突**：不要全局引入 `amis/lib/helper.css`（详见 `docs/12-amis-helper-css-conflict.md`）

2. **弹出层样式**：确保 dialog/drawer 的 `bodyClassName` 或 `className` 包含 `amis`

3. **新增组件适配**：遇到样式不一致的组件可在 `amis-fix.css` 中添加覆盖
