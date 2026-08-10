# Flux vs AMIS — CRUD 页面样式对比分析

> 日期：2026-08-10
> 范围：CRUD 页面（列表 + 查询表单 + 工具栏 + 弹窗表单 + 分页）在 flux 渲染器与 AMIS（cxd 主题，宿主已应用 `amis-theme-bridge.css` + `amis-fix.css`）下的逐项视觉差异。
> 前置阅读：`docs/analysis/2026-08-08-flux-amis-style-consistency-analysis.md`（全局 token / 圆角 / 间距根因分析，本文件聚焦 **CRUD 子树**）。
> 验证方式：`prototypes/amis-demo/pages/system/products.json` 与 `prototypes/flux-demo/pages/system/products.json`（同字段、同数据、同交互），用 `tests/e2e/crud-style-parity.spec.ts` 程序化抓取 + 人工截图核对。
> 目标：**仅通过 host 侧 CSS（既有文件 + CSS variable 调整）让所有 flux 页面视觉尽量接近 amis**，不修改 flux 上游源码。
>
> 实现位置（**不新增文件**）：
> - **CSS variable 调整** → `apps/main/src/styles/flux-spacing.css` 的 **unlayered `:root`** 块（⚠️ 不要改 `packages/theme-tokens/src/styles.css` —— 那是上游同步源，`pnpm refresh:flux` 会把宿主修改覆盖回去，2026-08-10 实测被冲掉一次）
> - **属性直覆盖** → `apps/main/src/styles/flux-spacing.css`（既有 host flux 副本，专门干这事）

---

## 0. TL;DR

1. CRUD 子树的差异可分为 **5 个簇**：表格 thead/tbody 密度、表格 hover/选中底色、工具栏与按钮、弹窗表单（含字段、控件、按钮）、分页。
2. 颜色（品牌色、错误色、链接色、底色族）已经通过 `amis-theme-bridge.css` 打通 —— 这部分 **无需再做工作**。
3. **真正的视觉落差集中在「数值对齐」**：表头高度、字号、单元格 padding、表单项 gap、控件圆角、操作按钮高度、分页按钮尺寸。这些数值 flux 用 host 的 `--table-*` / `--space-*` / `--radius-*` / `--dialog-*` token 驱动，**全部可在 host CSS 层覆盖**（无需改 flux tgz）。
4. 修复策略：新增 `flux-amis-crud-parity.css`，在 `[data-slot='crud-table']` / `[data-slot='dialog-surface']` / `.nop-table` 等子树作用域内，把对应 token 改写到 AMIS 实测值，并用 `@layer base` 保证可被主题层覆盖。

---

## 1. 测量基准

### 1.1 AMIS 基准（cxd 6.13.1，宿主已 bridge）

来源：`node_modules/.pnpm/amis@.../sdk/cxd.css`，1rem = 16px（浏览器默认），结合 `amis-theme-bridge.css` 实测。

| 类别 | AMIS token | 实测值 |
| --- | --- | --- |
| 表头底色 | `--Table-thead-bg` → `--table-header-bg-color` → `--colors-neutral-fill-10` | `--colors-neutral-fill-10` = `hsl(var(--muted))` ≈ `#f5f7fa` |
| 表头字号 | `--Table-thead-fontSize` → `--table-header-fontSize` → `--fonts-size-7` | **14px** |
| 表头字重 | `--table-header-fontWeight` → `--fonts-weight-6` | **400** |
| 表头高度 | `cxd-Table-th` 实际渲染（toolbar row 单独） | **44px**（cell；toolbar row 不定） |
| 表头分隔线 | `--table-header-separate-line-color` → `--colors-neutral-fill-11`（接近透明） | 1px `hsl(var(--border)/0.6)` |
| 单元格字号 | `--Table-fontSize` → `--table-body-fontSize` → `--fonts-size-8` | **12px** |
| 单元格字重 | `--table-body-fontWeight` → `--fonts-weight-6` | **400** |
| 单元格 padding（上下） | `--TableCell-padding` → calc 自 `--TableCell-height` | **11px**（实测，常规模式） |
| 单元格 padding（左右） | 默认 | **10px** |
| 单元格左缘 padding | 第一列 | **16px** |
| 单元格右缘 padding | 最后一列 | **10–16px** |
| 行高 | 内容驱动，受按钮高度影响 | **≈47px**（link 按钮行）/ 55px+（普通按钮行） |
| 行底色 | `--Table-bg` → `--colors-neutral-fill-11` = `hsl(var(--card))` | card surface |
| Hover 行底色 | `--Table-onHover-bg` → `--table-body-hover-bg-color` → `--colors-brand-10` | **brand@30%**（约 `rgba(primary, 0.08)`） |
| 选中行底色 | `--Table-onChecked-bg` → `--colors-neutral-fill-11` | 与默认同；左侧加色块 |
| 斑马 | `--Table-strip-bg` | **transparent**（默认关） |
| 表格外边框 | `--Table-borderWidth` → `--borders-width-2` ≈ 1px；`--Table-borderColor` → `--colors-neutral-line-8` | 1px `hsl(var(--border))` |
| 表头列分隔线 | `--table-header-separate-line-color` | 几乎不可见 |
| 单元格水平分隔线 | `cxd-Table td` `border-bottom` | 1px `hsl(var(--border))` |
| 操作按钮高度 | link 按钮（`cxd-Button--link`） | **≈22px**（无 padding-y，跟随 line-height） |
| 操作按钮水平间距 | `cxd-ButtonGroup` gap | **0–4px**（紧凑） |

### 1.2 Flux 基准（host 当前实测）

来源：`flux-lib/ui/src/styles/table.css` + `packages/theme-tokens/src/styles.css` + `apps/main/src/styles/flux-spacing.css`。

| 类别 | Flux token | 当前值 |
| --- | --- | --- |
| 表头底色 | `--table-header-bg` | `hsl(var(--background))` = **纯白** |
| 表头字号 | `--table-header-font-size` | **14px** ✅ |
| 表头字重 | `--table-header-font-weight` | **400** ✅ |
| 表头高度 | `--table-row-height` | **40px** ⚠️ |
| 表头分隔线 | `--table-header-separator-color` `border-left` | 1px `hsl(var(--border))` ⚠️ 偏重 |
| 单元格字号 | `--table-body-font-size` | **12px** ✅ |
| 单元格 padding（上下） | `--table-cell-padding-y` | **11px** ✅ |
| 单元格 padding（左右） | `--table-cell-padding-x` | **10px** ✅ |
| 单元格左缘 padding | `--table-edge-padding-x` | **16px** ✅ |
| 单元格右缘 padding | `--table-edge-padding-x` | **16px** ⚠️（AMIS 最后一列偏小） |
| 行高 | 内容驱动 | **≈55px**（操作按钮 32px + 上下 padding 22px） |
| 行底色 | 默认 transparent → 透出 `--card` | card surface ✅ |
| Hover 行底色 | `--table-hover-bg` | `color-mix(primary 6%, transparent)` ⚠️ 偏淡 |
| Hover 渐变 | `--table-hover-bg-gradient` | 左→右淡入（flux 独有）⚠️ 风格差异 |
| 选中行底色 | `--table-selected-bg` / `--table-selected-bg-strong` | `primary 10%/12%` |
| 斑马 | `--table-striped-bg` | **transparent** ✅ |
| 表格外边框 | 默认无（除非 `data-bordered`） | **无外框** ⚠️（AMIS 默认有 1px 外框） |
| 表头列分隔线 | `--table-header-separator-color` | 1px `hsl(var(--border))` ⚠️ |
| 单元格水平分隔线 | `nop-table` 默认无；`border-b` 来自 Tailwind 类 | 1px（Tailwind `divide-y`） |
| 操作按钮高度 | `--table-row-action-height` | **32px** ⚠️（AMIS link 按钮仅 22px） |

### 1.3 主要差异速查

| 维度 | AMIS | Flux | 偏差 | 修复路径（host CSS） |
| --- | --- | --- | --- | --- |
| 表头底色 | `hsl(var(--muted))` 浅灰 | `hsl(var(--background))` 纯白 | 视觉差异明显 | 覆盖 `--table-header-bg` |
| 表头高度 | 44px | 40px | -4px | 覆盖 `--table-row-height` |
| Hover 底色 | brand@30% 偏暖 | primary@6% 偏淡 | 太淡，AMIS 更显眼 | 覆盖 `--table-hover-bg` |
| Hover 渐变 | 无 | 左→右淡入 | 风格不一致 | 清空 `--table-hover-bg-gradient` |
| 表格外框 | 1px `hsl(var(--border))` | 无 | flux 缺少整体边界感 | 给 `[data-slot='crud-table'] .nop-table` 加 border + radius |
| 操作按钮高度 | 22px (link) | 32px | 行高被动膨胀 | 覆盖 `--table-row-action-height` |

---

## 2. 表格簇（Table）

### 2.1 thead

```css
/* AMIS（cxd 实测） */
.cxd-Table-th {
  background: var(--Table-thead-bg);          /* hsl(var(--muted)) */
  color: var(--Table-thead-color);            /* hsl(var(--foreground)/0.88) */
  font-size: 14px;
  font-weight: 400;
  text-align: left;
  padding: 0 10px;
  height: 44px;                                /* 实际渲染高度 */
  border-bottom: 1px solid var(--table-border-color);
}
/* 列分隔线：几乎不可见 */
.cxd-Table-th + .cxd-Table-th { border-left: 1px solid var(--colors-neutral-fill-11); }
```

```css
/* Flux（flux-lib/ui/styles/table.css） */
.nop-table thead th {
  height: var(--table-row-height);            /* 40px */
  padding: 0 var(--table-cell-padding-x);     /* 0 10px */
  font-size: var(--table-header-font-size);   /* 14px */
  font-weight: var(--table-header-font-weight); /* 400 */
  background: var(--table-header-bg);         /* hsl(var(--background)) = 纯白 */
}
.nop-table thead th + th {
  border-left: 1px solid var(--table-header-separator-color); /* hsl(var(--border)) */
}
```

**差异**：
1. 表头底色 AMIS 用浅灰 `hsl(var(--muted))`，flux 用纯白 — 视觉边界感不同。
2. 表头高度 AMIS 44px vs flux 40px。
3. 表头列分隔线 AMIS 几乎不可见，flux 是完整的 `hsl(var(--border))`。

**CSS 修复（host）**：

```css
[data-slot='crud-table'] {
  --table-row-height: 44px;
  --table-header-bg: hsl(var(--muted));
  --table-header-separator-color: hsl(var(--border) / 0.4);
}
```

### 2.2 tbody 单元格

```css
/* AMIS */
.cxd-Table td {
  padding: 11px 10px;            /* 实测 */
  font-size: 12px;
  color: var(--colors-neutral-text-2);
  border-bottom: 1px solid var(--table-border-color);
}
.cxd-Table td:first-child { padding-left: 16px; }   /* 边缘留白更大 */
.cxd-Table td:last-child  { padding-right: 10px; }  /* 最后一列不再加额外留白 */
```

```css
/* Flux */
.nop-table tbody td {
  padding: var(--table-cell-padding-y) var(--table-cell-padding-x); /* 11px 10px */
}
.nop-table tbody td:first-child { padding-left: var(--table-edge-padding-x); }  /* 16px */
.nop-table tbody td:last-child  { padding-right: var(--table-edge-padding-x); } /* 16px */
```

**差异**：最后一列 padding-right AMIS 10px vs flux 16px；其余数值一致。
**修复**：

```css
[data-slot='crud-table'] .nop-table tbody td:last-child {
  padding-right: var(--table-cell-padding-x); /* 10px */
}
```

### 2.3 Hover / Selected

```css
/* AMIS hover */
.cxd-Table-row:hover td {
  background: var(--Table-onHover-bg);  /* --colors-brand-10 ≈ rgba(primary, 0.08) */
  color: var(--Table-onHover-color);
}
/* Flux hover */
.nop-table tbody tr[data-slot='table-row']:hover { /* 实际由 td background 生效 */
  background: var(--table-hover-bg);              /* primary@6% */
  background-image: var(--table-hover-bg-gradient);
}
```

**差异**：
1. AMIS hover 浓度约 8%，flux 6%（视觉上 AMIS 更显眼）。
2. Flux 多了一条左→右的渐变背景（设计语言差异，AMIS 是纯色）。

**修复**：

```css
[data-slot='crud-table'] {
  --table-hover-bg: hsl(var(--primary) / 0.08);
  --table-hover-bg-gradient: none;
}
```

### 2.4 表格外框 / 边界

AMIS CRUD 表格默认有 1px 外框 + 顶部 toolbar 区域有横向边界；flux 默认无外框，导致列表与卡片背景之间缺少视觉边界。

**修复**：

```css
[data-slot='crud-table'] .nop-table {
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-sm);
}
```

### 2.5 操作列按钮

```css
/* AMIS link 按钮（操作列主流） */
.cxd-Button--link {
  height: auto;
  padding: 0 8px;
  line-height: 22px;          /* 不撑高行 */
  background: transparent;
  color: var(--primary);
}
/* Flux 操作按钮（ui button variant=ghost/link） */
.nop-table [data-slot='table-actions'] button {
  height: var(--table-row-action-height); /* 32px */
}
```

**差异**：AMIS link 按钮行内、不撑高，flux 强制 32px → 把 tbody 行从 AMIS 的 47px 撑到 55px+。

**修复**（让 flux 操作按钮接近 AMIS link 风格）：

```css
[data-slot='crud-table'] {
  --table-row-action-height: 24px;
}
[data-slot='crud-table'] [data-slot='table-actions'] button {
  padding-inline: 8px;
  min-height: 24px;
}
```

---

## 3. 工具栏与按钮簇（Toolbar / Button）

### 3.1 headerToolbar / footerToolbar

```css
/* AMIS */
.cxd-Crud-toolbar {
  padding: 10px 0;             /* gap-base */
  gap: 0.25rem;                /* toolbar-marginX */
  background: transparent;
}
.cxd-Crud-toolbar + .cxd-Table-content { /* toolbar 与表格之间无额外 gap */ }

/* Flux */
[data-slot='crud-toolbar'] {
  display: flex;
  gap: var(--crud-toolbar-gap); /* 10px */
  padding-block: 8px;
}
```

**差异**：基本一致（padding/gap 微调即可），主要差异在按钮样式。

### 3.2 primary 按钮（"新增" 按钮）

| 维度 | AMIS `.cxd-Button--primary` | Flux `button variant=default/default` |
| --- | --- | --- |
| height | 32px（`--Form-input-height`） | 32px（`h-8`） ✅ |
| border-radius | `--Form-input-borderRadius` = bridge 8px | `rounded-md` = 12px ⚠️ |
| padding-x | `--sizes-base-8` = 16px | `px-4` = 16px ✅ |
| background | `--primary` | `--primary` ✅ |
| 字号 | 14px | 14px ✅ |

**差异**：圆角 AMIS 8px vs flux 12px。
**修复**：

```css
[data-slot='crud-toolbar'] button,
[data-slot='dialog-footer'] button {
  border-radius: var(--radius-sm); /* 8px */
}
```

### 3.3 link/ghost 按钮（行内、次要）

AMIS link 按钮无背景、无 border；flux 的 `variant=ghost` 仍有半透明背景与 border。这是**操作列视觉密度差异的根因**之一。

**修复**：

```css
[data-slot='crud-table'] [data-slot='table-actions'] button[data-variant='ghost'],
[data-slot='crud-table'] [data-slot='table-actions'] button[data-variant='link'] {
  background: transparent;
  border-color: transparent;
}
```

---

## 4. 弹窗表单簇（Dialog + Form）

### 4.1 Dialog 容器

| 维度 | AMIS `.cxd-Modal-content` | Flux `[data-slot='dialog-surface']` |
| --- | --- | --- |
| 默认宽度（base） | 500px | `--dialog-size-base` = 500px ✅ |
| 顶部偏移 | 60px（宿主 fix） | `--dialog-top-offset` = 60px ✅ |
| overlay | `--surface-overlay` = `rgba(15,23,42,0.4)` (宿主 fix) | `--dialog-overlay-bg` = `rgba(0,0,0,0.7)` ⚠️ |
| 圆角 | bridge `--borders-radius-4` = 8px | `--dialog-content-border-radius` = **6px** ⚠️ |
| title 字号 | 16px | `--dialog-title-font-size` = 14px ⚠️ |
| body padding-x | 24px | `--dialog-body-padding-x` = 24px ✅ |
| footer 按钮 min-width | 72px | `--dialog-footer-button-min-width` = 72px ✅ |

**差异**：
1. **Overlay**：宿主 AMIS fix 后是 0.4（偏淡），flux 0.7（偏深）。视觉风格不统一，但这是宿主主动差异化的结果（`amis-fix.css .cxd-Modal-overlay { background: var(--surface-overlay) }`）。**建议保留 flux 0.7**（更接近 amis 原版 default.css）。
2. **圆角**：6px vs 8px。
3. **title 字号**：14px vs 16px。

**修复**：

```css
[data-slot='dialog-surface'] {
  --dialog-content-border-radius: 8px;
  --dialog-title-font-size: 16px;
}
```

### 4.2 Form item（弹窗内字段）

| 维度 | AMIS `.cxd-Form-item` | Flux `[data-slot='form-body'] > *` |
| --- | --- | --- |
| item 之间 gap | `--Form-item-gap` = 24px | `--space-form-item-gap` = 16px ⚠️ |
| label 字号 | `--Form-item-fontSize` = 14px | `--field-label` 硬编码 13px ⚠️ |
| label 字重 | 400 (`--fonts-weight-6`) | 500 ⚠️ |
| label 颜色 | `--colors-neutral-text-4` = muted-foreground | `hsl(var(--foreground))` ⚠️（更深） |
| label 宽度（左对齐） | 默认 96px（field-label-width） | `--field-label-width: 96px` ✅（host 已设） |
| label 必填星号色 | `--colors-error-5` → `--danger` ✅ | `var(--nop-field-error, #b53b2c)` ⚠️ 硬编码 |
| 错误提示字号 | 12px | 12px ✅ |
| 错误提示色 | `--colors-error-5` → `--danger` ✅ | `var(--nop-field-error, #b53b2c)` ⚠️ |

**修复**：

```css
[data-slot='dialog-surface'] {
  --space-form-item-gap: 24px;
}
[data-slot='dialog-surface'] [data-slot='field-label'] {
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--muted-foreground));
}
[data-slot='dialog-surface'] {
  --nop-field-error: hsl(var(--danger));   /* 让硬编码 fallback 不再生效 */
}
```

### 4.3 Form 控件（input / select / textarea）

| 维度 | AMIS `.cxd-Input` / `.cxd-Select` | Flux `input.tsx` / `select.tsx` |
| --- | --- | --- |
| height | `--Form-input-height` = 32px | `h-8` = 32px ✅ |
| border-radius | `--Form-input-borderRadius` = bridge `--radius-sm` = 8px | `rounded-md` = 12px ⚠️ |
| padding-x | `--Form-input-paddingX` = 10px | `px-2.5` = 10px ✅ |
| padding-y | `--Form-input-paddingY` = 4px | `py-1` ≈ 4px ✅ |
| border-color | `--borderColor` → `hsl(var(--input))` | `hsl(var(--input))` ✅ |
| 背景 | `--colors-neutral-fill-11` = `hsl(var(--card))` | `hsl(var(--background))` ⚠️ |
| focus border | `--colors-brand-5` | `hsl(var(--ring))` ✅ |
| focus shadow | `box-shadow: 0 0 0 2px hsl(var(--ring)/0.2)` | ring-2 ✅ |
| placeholder 色 | `--text--muted-color` ≈ `hsl(var(--muted-foreground))` | `text-muted-foreground` ✅ |

**差异**：
1. **圆角**：AMIS 8px vs flux 12px。
2. **背景**：AMIS card（轻微区分），flux background（无区分）。

**修复**：

```css
[data-slot='dialog-surface'] input,
[data-slot='dialog-surface'] [data-slot='select-trigger'],
[data-slot='dialog-surface'] textarea {
  border-radius: var(--radius-sm); /* 8px */
}
[data-slot='dialog-surface'] input,
[data-slot='dialog-surface'] textarea {
  background: hsl(var(--card));
}
```

### 4.4 Form actions（弹窗底部按钮）

```css
/* AMIS Modal-footer */
.cxd-Modal-footer {
  padding: 10px 24px;
  text-align: right;
  border-top: 1px solid var(--table-border-color);
  background: var(--Dialog-footer-bg, transparent);
}
.cxd-Modal-footer .cxd-Button + .cxd-Button { margin-left: var(--gap-sm); }

/* Flux */
[data-slot='dialog-footer'] {
  display: flex;
  justify-content: flex-end;
  gap: var(--dialog-footer-gap); /* 8px */
  padding: 12px 24px;
  border-top: 1px solid hsl(var(--border));
}
[data-slot='dialog-footer'] button { min-width: var(--dialog-footer-button-min-width); }
```

**差异**：基本一致；按钮圆角差异（见 §3.2）。

---

## 5. 查询表单簇（queryForm）

AMIS 的 `columnsToggler` + 搜索表单是嵌入在 toolbar 上方的一个浅灰底卡片；flux 的 `queryForm` 直接铺在 page-body 上、无背景区分。

```css
/* AMIS Table-searchableForm */
.cxd-Table-searchableForm {
  background: var(--Table-searchableForm-backgroundColor); /* --colors-neutral-fill-10 = hsl(var(--muted)) */
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 10px;
}
/* Flux queryForm */
[data-slot='crud-query-form'] {
  /* 继承 page-body，无独立背景 */
  padding: 0;
}
```

**差异**：AMIS 查询表单有浅灰卡片背景与圆角边界，flux 无。
**修复**：

```css
[data-slot='crud-query-form'] {
  background: hsl(var(--muted));
  border-radius: var(--radius-sm);
  padding: 12px;
}
```

---

## 6. 分页簇（Pagination）

```css
/* AMIS cxd-Pagination */
.cxd-Pagination > li > a {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--borderColor);
  border-radius: var(--borders-radius-3);  /* bridge 8px */
  background: hsl(var(--card));
  color: hsl(var(--foreground));
}
.cxd-Pagination > li.is-active > a {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
}

/* Flux pagination（ui pagination.tsx） */
[data-slot='pagination-item'] {
  min-width: 36px;       /* h-9 */
  height: 36px;
  border-radius: var(--radius-sm); /* 8px */
}
[data-slot='pagination-item'][data-selected] {
  background: var(--primary);
  color: var(--primary-foreground);
}
```

**差异**：
1. AMIS 32px vs flux 36px。
2. AMIS 有 1px 边框；flux 默认无边框（仅 hover 出现）。

**修复**：

```css
[data-slot='pagination'] [data-slot='pagination-item'] {
  min-width: 32px;
  height: 32px;
  border: 1px solid hsl(var(--border));
}
```

---

## 6a. 分页器三条路径（本次排查的关键结论）

flux CRUD 的分页有**三套并存机制**，其中一套是坏的、一套是缺省正确的、一套是显式自定义的：

| 路径 | 触发方式 | 翻页联动 | 页码列表 | 统计文案 | 结论 |
| --- | --- | --- | --- | --- | --- |
| **A. footerToolbar 放独立 `pagination` renderer** | `footerToolbar: [{ "type": "pagination" }]` | ❌ **不联动**（自包含状态，点击只更新自身 DOM，不触发 loadAction 重载） | 完整页码 | — | **坏路径**。crud.md 文档示例即此写法，loadAction 模式下不工作 |
| **B. 缺省内建 `TablePaginationBar`**（推荐） | **不写任何分页配置**（无 footerToolbar pagination / 无 toolbarLayout） | ✅ 联动（走 `handlePageChange` → scope 分页状态 → loadAction 重载） | 完整页码 + 省略号 | `1-10 of 15`（**硬编码英文，无 i18n**，上游待改进点） | **缺省正确**，`flex justify-between` 左中右布局 |
| **C. `toolbarLayout.footer` 拆分 blocks**（显式自定义） | `toolbarLayout: { footer: [{ type: "statistics", align: "left" }, { type: "pagination", align: "right" }] }` | ✅ 联动（走 `handleToolbarPageChange` → 同上） | ❌ 仅 `‹ 第 X / Y 页 ›`（简化版） | `共 X 条`（i18n 中文） | 显式接管；配置后内建栏被抑制；样式可替换（PaginationPrevious/Next 来自 `@nop-chaos/ui`） |

**关键代码证据**（flux dist）：
- `handleToolbarPageChange`（CRUD 内部）：`scope?.update(paginationStatePath, newPagination)` + 仅非 loadAction 时手动 refresh —— loadAction 模式靠 scope 分页状态变化触发 reaction/effect 重载
- `CrudToolbarBlocks`：`flex justify-between` 左右分组渲染 blocks，`pagination` block 走 `onPageChange`（= handleToolbarPageChange）
- `TablePaginationBar`：`data-slot="table-pagination"`，条件 `paginationEnabled && !pagination?.hideBar` —— 无 toolbarLayout 时缺省出现

**上游测试保证**（nop-chaos-flux `crud-loadaction-reaction-regression.test.tsx`）：
- 翻页触发 loadAction 重派发（`calls.length >= 2`）
- 分页状态写入 `paginationStatePath` → 恰好一次重载（ignore-list 抑制双发）
- 序号列跨页（`table-index-column.test.tsx`）：第 2 页 offset = `(currentPage-1)*pageSize`，从 11 开始

**结论（对齐 AMIS 视觉）**：用路径 B（缺省内建栏，完整页码 + 左中右布局），统计文案的英文硬编码记录为上游改进点；路径 C 保留为"需自定义布局/中文统计"时的替代。

---

## 6b. 序号列与 checkbox 列

- **序号列**：schema 加 `{ "type": "index", "name": "index", "label": "序号", "width": 50 }`（flux-guide `table.md` 文档列类型）。flux 原生渲染跨页累计行号 `viewIndex + indexColumnOffset + 1`，自带 `text-center` 居中 + `data-slot="table-index-cell"`。**无需改源码**。
- **checkbox 列**：schema 加 `selection: {}`。渲染为 header `[data-slot='table-select-column']` + body `[data-slot='table-select-cell']`。**居中需 CSS**（flux 默认 `text-align: left` 且 checkbox 是 flex 元素）：

```css
[data-slot='crud-table'] .nop-table [data-slot='table-select-column'],
[data-slot='crud-table'] .nop-table [data-slot='table-select-cell'] {
  text-align: center;
  vertical-align: middle;
}
[data-slot='crud-table'] .nop-table [data-slot='table-select-column'] [data-slot='checkbox'],
[data-slot='crud-table'] .nop-table [data-slot='table-select-cell'] [data-slot='checkbox'] {
  margin-inline: auto;
}
```

（实测 checkbox 中心与 th 中心 offset = 0px）

---

## 7. 列宽与对齐（Column Width & Alignment）

AMIS：
- 默认列宽 auto，超长 ellipsis；第一列常给 `width: 60`（ID 列）。
- 表头与单元格 `text-align: left`，数字列可声明 `align: right`。
- 列分隔感主要靠 cell 横向 padding，**不画垂直线**。

Flux：
- 同样默认 auto，ellipsis。
- 表头与单元格 `text-align: left`、`align-middle`。
- **会画表头垂直分隔线**（`th + th { border-left }`），AMIS 不画。

**差异**：表头垂直分隔线是 flux 与 AMIS 视觉密度差异的关键之一。
**修复**：见 §2.1（清空 separator 颜色）。

---

## 8. 修复路径汇总

> 实测对照（Desktop Chrome 1280×720，两侧均 15 条数据，分页器都渲染）：
> AMIS 实测 → flux 修复后实测 → 是否对齐 ✅

| 序号 | 簇 | 修复手段 | 落点 | AMIS 实测 | Flux 修复后 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | 表头 | `--table-row-height: 44px`, `--table-header-bg: hsl(var(--muted))`, `--table-header-separator-color: hsl(var(--border)/0.4)` | `flux-spacing.css :root` | bg `rgb(247,248,250)` / 44px | bg `rgb(241,245,249)` / 44px | ✅ |
| F3 | hover | `--table-hover-bg: hsl(var(--primary)/0.08)`, `--table-hover-bg-gradient: none` | 同上 | `rgb(230,240,255)` | 同浓度品牌色 | ✅ |
| F4 | 外框 | **移除**（AMIS `.cxd-Table-table` 实测 border 0，仅行分隔线；此前加的 1px 外框造成"表格+分页器被包裹"观感）| `flux-spacing.css` | 无外框 | 无外框 | ✅ |
| F5 | 操作按钮 | `--table-row-action-height: 24px` | `flux-spacing.css :root` | 18px (link) | 24px | ⚠️ 接近 |
| F6 | 工具栏按钮 | toolbar/dialog/footer 按钮 4px radius（cxd `--Button-borderRadius`） | `flux-spacing.css` | **4px** | **4px** | ✅ |
| F7 | dialog | `--dialog-content-border-radius: 6px`（cxd 默认）, `--dialog-title-font-size: 14px`（cxd 默认） | 上游默认 6px/14px（无需覆盖）| radius 6px / title 14px | radius 6px / title 14px | ✅ |
| F8 | form item | `--space-form-item-gap: 24px`（全局） | 同上 | margin-bottom 24px | gap 24px | ✅ |
| F9 | 控件 | input/select/textarea 圆角 8px（amis `--Form-input-borderRadius` = bridge `--radius-sm`） | `flux-spacing.css` | wrapper 8px | 8px | ✅ |
| F10 | 错误色 | 新增 `--nop-field-error: hsl(var(--danger))` | `flux-spacing.css :root` | `rgb(242,61,61)` | `rgb(239,67,67)` | ✅ |
| F11 | queryForm | 覆盖 `.nop-crud-query` 为透明无边框（flux 上游类自带 `bg-muted/30 border`，amis 是透明/白）| `flux-spacing.css` | 透明/白、padding 0 | 透明、无边框 | ✅ |
| F12 | 分页 | 32px + **仅当前页** primary 边框（普通页无边框，AMIS 实测）；分页栏加水平 padding 16px 防贴边 | `flux-spacing.css` | 当前页 primary 边框、普通页无边框、右对齐 | 同左 | ✅ |
| F12-extra | 分页器间距 | `[data-slot='crud-footer'] { margin-top: -6px; padding-top: 0 }` | `flux-spacing.css` | 12px | 11px | ✅ |
| F13 | 字段 label | `.nop-field [data-slot='field-label']` 14px/400/muted（覆盖上游 13px/500/dark） | `flux-spacing.css` | 14px/400/`rgb(92,95,102)` | 14px/400/`rgb(72,86,106)` | ✅ |

**范围**：用户选择 "所有 flux 页面"。变量改动只影响 flux（amis 经 `amis-theme-bridge.css` 单独映射，**不读** `--table-*` / `--dialog-*` / `--space-*` / `--nop-field-error`，所以不受影响）；属性改动限定 `.nop-*` 与 `[data-slot='...']` 选择器，amis 用 `.cxd-*` 类完全不相交。

> 因此 host 既有 `amis-fix.css` / `amis-theme-bridge.css` 不需要改动，**不新增任何 CSS 文件**，仅在 `flux-spacing.css` 追加 token 覆盖（unlayered `:root`）与属性覆盖。回归面最小。

---

## 8a. CSS 选择器优先级踩坑

实现过程中遇到的几个 CSS 优先级陷阱（记录给后续维护者）：

1. **`@layer base` 敌不过 Tailwind `@layer utilities`** —— flux ui 控件直接用 Tailwind `rounded-lg`/`rounded-md`/`hover:bg-[var(--*)]`，这些 utility 在更高 cascade layer。直接属性覆盖必须放在 **unlayered 顶层** 才能胜出。所有 F6/F9/F11/F12 的属性覆盖都在 `flux-spacing.css` 的 unlayered 部分。
2. **flux dist 用更高 specificity 选择器** —— 上游 `[data-slot='field-label']` 是 `[data-slot='field-label']`（specificity 0,1,0），但 flux dist 实际写的是 **`.nop-field [data-slot='field-label']`**（0,2,0）。host 副本必须用相同或更高 specificity 才能覆盖（F13 的实现就重复了两条选择器）。
3. **flux 不用 `crud-query-form` slot** —— flux 把 queryForm 渲染成一个普通 form region，外层包装是 `[data-slot='crud-query']`（class `nop-crud-query`），不是直觉的 `crud-query-form`。要找到正确的 wrapper 元素才能加灰底卡片（F11）。
4. **token 覆盖在 `:root` 对所有元素生效** —— 不需要作用域隔离。改 `--table-*` / `--dialog-*` 等只影响 flux，因为 amis 不消费这些 token。
5. **`theme-tokens` 是上游同步源，宿主别直接改** —— `pnpm refresh:flux` 的 `sync-flux-lib.sh` 会把上游 `theme-tokens/src/styles.css` 覆盖到 `packages/theme-tokens/`，宿主改动被冲掉（2026-08-10 实测）。宿主 token 覆盖统一放 `flux-spacing.css` 的 unlayered `:root`（后加载 + unlayered，压过 theme-tokens 的默认值）。

---

## 9. 验证方式

### 9.1 原型对照

新增菜单：**系统管理 → 产品管理**（amis + flux 各一份同 schema、同数据、同交互）。

- AMIS：`prototypes/amis-demo/pages/system/products.json`
- Flux：`prototypes/flux-demo/pages/system/products.json`
- Mock：`prototypes/{amis,flux}-demo/mock/index.mjs` 各加 `products` CRUD 路由

启动：

```bash
# AMIS 模式（4176）
pnpm dev:main:amis-prototype

# Flux 模式（4177）
pnpm dev:main:flux-prototype
```

人工对比：打开两侧 "系统管理 → 产品管理"，逐项核对表头底色 / hover / 操作按钮 / 弹窗等。

### 9.2 程序化核对

`tests/e2e/crud-style-parity.spec.ts` 通过两种模式（`PLAYWRIGHT_APP_MODE=amis-prototype` / `flux-prototype`）分别运行：

```bash
PLAYWRIGHT_APP_MODE=amis-prototype pnpm test:e2e --config=playwright.amis-prototype.config.ts tests/e2e/crud-style-parity.spec.ts
PLAYWRIGHT_APP_MODE=flux-prototype pnpm test:e2e --config=playwright.flux-prototype.config.ts tests/e2e/crud-style-parity.spec.ts
```

每项检查都会 `console.log` 实测值，方便人工对照；同时 `expect` 断言关键数值（hover 前后、padding、字号、操作按钮高度等）。

### 9.3 验证清单（人工）

打开两侧原型页面，按此清单核对：

- [ ] 表头底色：AMIS 浅灰，flux 是否变浅灰
- [ ] 表头高度：两边是否都 44px
- [ ] 表头列分隔线：AMIS 几乎不可见，flux 是否隐藏
- [ ] Hover 行底色：浓度是否接近
- [ ] 表格外框：两边是否都有 1px border
- [ ] 操作按钮高度：两边是否都接近 24px（不撑高行）
- [ ] 操作按钮风格：link 是否真的"无背景"
- [ ] 工具栏 "新增" 按钮圆角：两边是否都 8px
- [ ] 弹窗 title 字号：两边是否都 16px
- [ ] 弹窗内表单字段间距：两边是否都 24px
- [ ] 弹窗内表单 label 字号 / 字重 / 颜色：是否一致
- [ ] 弹窗内 input 圆角：两边是否都 8px
- [ ] 必填星号颜色：两边是否同色（主题 danger）
- [ ] 查询表单：两边是否都有浅灰卡片背景
- [ ] 分页按钮：两边是否都 32px + 1px border

---

## 10. 相关文件索引

- 全局 token 调整（**修改**）：`packages/theme-tokens/src/styles.css` —— `--table-*` / `--dialog-*` / `--space-form-item-gap` / 新增 `--nop-field-error`
- host flux 副本（**追加少量属性覆盖**）：`apps/main/src/styles/flux-spacing.css` —— `.nop-table` 外框、表单/弹窗/工具栏内 input 与 button 圆角、分页按钮
- Flux 上游表样式：`flux-lib/ui/src/styles/table.css`（**不修改**）
- Flux 上游 ui 控件：`flux-lib/ui/src/components/ui/{table,input,button,select,combobox,dialog}.tsx`（**不修改**）
- 既有 amis 桥接：`apps/main/src/styles/amis-theme-bridge.css` / `amis-fix.css`（**不修改**）
- AMIS 基线 token：`node_modules/.pnpm/amis@.../sdk/cxd.css`（参考用）
- 原型：`prototypes/{amis,flux}-demo/{menu.json,mock/index.mjs,pages/system/products.json}`
- E2E：`tests/e2e/crud-style-parity.spec.ts`
- 上层分析：`docs/analysis/2026-08-08-flux-amis-style-consistency-analysis.md`
