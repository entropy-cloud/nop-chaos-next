# Flux 与 AMIS 样式一致性分析报告

> 日期：2026-08-08
> 范围：`nop-chaos-next` 主项目（host）内 flux 组件与 AMIS（cxd 主题）组件的样式差异
> 结论：**颜色 token 已打通（共用同一批 host CSS 变量），但"间距 / 圆角 / 尺寸"两大体系并未共用同一 token 集，这是"大量不一致"的根因。**

---

## 0. TL;DR

1. 用户直觉"CSS variable 对 amis 和 flux 都应该起作用"——**对一半**：颜色类变量确实共用（`--primary`、`--border`、`--muted-foreground` 等），AMIS 通过 `amis-theme-bridge.css` 映射消费；**但间距、圆角、尺寸这两套 token 体系没有打通**。
2. 具体差异（宿主当前值，实测）：

| 维度 | AMIS（cxd 默认） | Flux（宿主当前） | 差异 |
| --- | --- | --- | --- |
| 输入控件圆角 | `--Form-input-borderRadius: var(--borders-radius-3)` → **8px**（cxd 中 radius-3 用 148 处、radius-2 用 49 处 → 主流 **4–8px**） | `Input` 用 `rounded-lg` → `--radius-lg` = **16px** | flux 偏大 **2 倍** |
| 按钮圆角 | radius-2/3（4–8px） | `rounded-lg` = 16px | flux 偏大 |
| 表单 item 间距 | `--Form-item-gap: var(--sizes-base-12)` = **24px** | `--space-form-item-gap` = **16px** | flux 偏小 8px |
| 控件高度 | `--Form-input-height: var(--sizes-base-16)` = **32px** | select/combobox `h-8` = 32px、按钮 `h-9` = 36px | 大体一致，按钮偏高 |
| 字段 label 字号 | `--Form-item-fontSize` = 14px 级 | `[data-slot='field-label']` 硬编码 **13px** | 不一致 |
| 字段 label 必填/错误色 | `--colors-error-5`（bridge 已映射 `--danger`） | `var(--nop-field-error, #b53b2c)`（**硬编码 fallback**） | 不一致 |

3. 根因三条（详见 §4）：bridge 映射不完整、radius 映射语义与 flux 使用点错位、`--space-*` 与 `--sizes-*/--gap-*` 两套间距体系未对齐 + host 手抄了 flux 基线 CSS 已漂移。

---

## 1. 本项目具体定义了哪些 variable（回答"本项目中具体定义的 variable"）

### 1.1 宿主全局 token（`packages/theme-tokens/src/styles.css`）

以 `:root` + 4 个主题变体（`classic/glass × light/dark`）定义，全量可被 amis 与 flux 同时读取：

- **颜色（HSL 三元组）**：`--background` / `--foreground` / `--card` / `--popover` / `--muted` / `--muted-foreground` / `--accent` / `--border` / `--input` / `--ring` / `--primary` / `--primary-foreground` / `--secondary` / `--destructive` / `--success` / `--warning` / `--danger` / `--info` / `--primary-dark/light/bg` / `--gray-50..900` / `--chart-1..5`
- **圆角**：`--radius-sm: 8px`、`--radius-md: 12px`、`--radius-lg: 16px`、`--radius-xl: 20px`
- **间距（flux 专用，AMIS 不消费）**：`--space-page-body: 16px`、`--space-section-gap: 24px`、`--space-form-item-gap: 16px`、`--space-fieldset-body-gap: 16px`、`--space-form-actions-gap: 12px`、`--space-form-body-to-actions: 16px`、`--space-field-internal: 4px`、`--space-field-label-gap: 8px`、`--space-field-label-h-gap: 16px`、`--space-tabs-content-gap: 16px`
- **其他**：`--shadow-xs..xl`、`--icon-*`、`--transition-*`、`--surface-*`、`--card-surface`、`--border-surface`、`--glass-blur`、`--app-*` 等

### 1.2 host 侧扩展（`apps/main/src/styles/`）

| 文件 | 内容 |
| --- | --- |
| `flux-host-token-extension.css` | 26 个 `--host-*` 变量（4 主题 × 颜色），经 `fluxHostTailwindExtension.ts` 注册进 Tailwind `host.*` 色板 |
| `amis-theme-bridge.css` | `.amis` 作用域映射：`--colors-*`（brand/neutral/error/success/warning/link）、`--borders-radius-1..7`、`--shadows-*`、少量组件变量（`--Tooltip-*`、`--common-popover-border`） |
| `flux-spacing.css` | **手抄**的 flux 基线样式副本（`nop-form`/`nop-field`/`nop-fieldset` 等 slot 布局 + `--space-*` 消费） |
| `index.css` / `amis-reset.css` / `amis-fix.css` | 全局样式与 AMIS 修补 |

### 1.3 flux 侧实际消费

flux 渲染器（`@nop-chaos/flux` tgz → `dist/style.css` + `flux-lib/ui`）消费的变量全部在上述集合内（grep 实测）：`--space-*`×17、`--radius-sm`、`--foreground`、`--muted-foreground`、`--destructive`、`--border`、`--background`。
**但控件主体的"形状"（圆角/高度/内边距）来自 Tailwind utility 类**（`rounded-lg`、`h-8/h-9`、`gap-4`、`px-2.5` 等），这些类的值由宿主 Tailwind 构建时按 preset 生成——与 AMIS 的 `--borders-radius-*` / `--sizes-*` 完全不是一回事。

---

## 2. 为什么"variable 对两者都起作用"不完全成立

- **颜色**：成立。AMIS cxd 的 `--colors-*` 已被 bridge 映射到宿主 `--primary/--danger/--muted` 等，切主题时两者同步变色。✅
- **圆角**：名义上共用 `--radius-*`，但 AMIS 侧被 bridge **重新放大**后才映射（见下），且两边"该用几号圆角"的组件级约定不同。⚠️
- **间距 / 尺寸**：不成立。AMIS 消费自己的 `--Form-item-gap`、`--Form-input-height`、`--sizes-*`、`--gap-*`；**bridge 完全没有映射 `--sizes-*` / `--gap-*` / `--Form-*`**，而 flux 消费 `--space-*` 与 Tailwind 类。这两套体系互相看不见。❌

bridge 当前映射的 radius 值（`amis-theme-bridge.css:137-143`）与 cxd 原始值对比：

| token | cxd 原始 | bridge 后 | 放大 |
| --- | --- | --- | --- |
| `--borders-radius-1` | 0px | 0 | — |
| `--borders-radius-2` | 2px | **4px**（固定） | 2x |
| `--borders-radius-3` | 4px | `var(--radius-sm)` = **8px** | 2x |
| `--borders-radius-4` | 6px | `var(--radius-sm)` = 8px | 1.3x |
| `--borders-radius-5` | 8px | `var(--radius-md)` = 12px | 1.5x |
| `--borders-radius-6` | 10px | `var(--radius-lg)` = 16px | 1.6x |

而 flux 控件类直接用 `rounded-md`(12px) / `rounded-lg`(16px)。两边即使变量共用，**控件级取值仍然错位**。

---

## 3. 具体不一致清单（证据）

### 3.1 控件圆角

| 控件 | AMIS | Flux | 差 |
| --- | --- | --- | --- |
| 文本输入框 | `--Form-input-borderRadius` = radius-3 → 8px | `input.tsx`: `rounded-lg` → 16px | +8px |
| 下拉/选择 | radius-3 → 8px | `select.tsx`: trigger `rounded-lg` → 16px | +8px |
| 按钮 | radius-2/3 → 4–8px | `button.tsx`: `rounded-lg` → 16px | +8~12px |
| 弹出层(menu/popover) | radius-4/5 → 8–12px | `rounded-lg` → 16px | +4px |
| 多选 chips | radius-2/3 | combobox `rounded-lg` → 16px | +8px |

cxd.css 用量统计佐证 AMIS 主流是 radius-2/3（4–8px）：radius-3 ×148、radius-2 ×49、radius-1 ×30、radius-4 ×2、radius-5 ×1。
flux dist 类用量统计：`rounded-md` ×19、`rounded-full` ×11、`rounded-sm` ×8、`rounded-lg` ×6 → 主流 12–16px。

### 3.2 表单间距

- AMIS：`.cxd-Form-item { margin-bottom: var(--Form-item-gap) }` = `--sizes-base-12` = **24px**
- Flux：`.nop-form > [data-slot='form-body'] { gap: var(--space-form-item-gap) }` = **16px**
- 另外 host `flux-spacing.css` 中 `[data-slot='field-label']` 硬编码 `font-size: 13px`、`field-error/hint` 硬编码 `12px`，AMIS 侧走 `--Form-item-fontSize`（14px 级）——bridge 未映射，无法统一。

### 3.3 控件高度

- AMIS：`--Form-input-height: var(--sizes-base-16)` = 32px
- Flux：select `data-[size=default]:h-8`(32px) / `h-7`(28px)、combobox `min-h-8`、按钮 `h-8`/`h-9`(36px)、input 无显式高度（py-1 + text-sm ≈ 32px）
- 基本同源，但按钮 `h-9`、若干组件 28px 与 AMIS 32px 不齐。

### 3.4 必填/错误色

- AMIS：`--colors-error-5` → bridge 已映射 `--danger` ✅
- Flux：`[data-slot='field-required']/field-error` 用 `var(--nop-field-error, #b53b2c)` —— **`--nop-field-error` 在宿主未定义，永远走硬编码 #b53b2c**，与主题 danger 色脱钩。

### 3.5 host 手抄的 flux 基线已漂移（次要）

`apps/main/src/styles/flux-spacing.css` 是 `nop-chaos-flux/packages/flux-react/src/default-spacing.css` 的裁剪副本，diff 出 9 处差异，例如：

- fieldset 上下 padding：上游 `var(--space-field-label-gap) …`，host 改成 `0 …`（legend 上方无留白）
- 上游支持 `data-label-align='right'`（label 右对齐），host 副本**删掉了**
- `tabs-content` 选择器：上游限定 `.nop-*` 祖先内，host 放宽为全局 `[data-slot='tabs-content']`
- legend 选择器/内边距不同

这份副本与上游漂移后，宿主看到的 flux 间距 = 上游约定 + 本地补丁，无法保证与 AMIS 对齐。

---

## 4. 根因分析

1. **bridge 映射不完整**（主要）：`amis-theme-bridge.css` 只映射了 colors / borders-radius / shadows，没有映射 AMIS 的 `--sizes-*`、`--gap-*`、`--Form-item-gap`、`--Form-input-height`、`--Form-item-fontSize`。AMIS 的"间距/尺寸"仍在自己的数值体系里，与 flux 的 `--space-*` 完全脱钩。
2. **radius 语义错位**：bridge 已把 AMIS 圆角 token 放大到 `--radius-*`（8/8/12/16），但 flux 控件源码直接取 `rounded-md/lg`（12/16px）——两边没有在"控件该用几号"上对齐，且 cxd 内部控件主体用 2/3 号（4–8px），即使变量相同也会差一倍。
3. **flux 基线被 host 覆写且漂移**：`flux-spacing.css` 手抄副本与上游不同步（diff 9 处），局部又引入硬编码（13px label、`--nop-field-error` 未定义）。
4. **变量覆盖不到类**：flux 控件的形状由 Tailwind utility 类决定（值在构建期由 preset 固化），"改一个变量"并不会传导到 `rounded-lg` 的语义，除非改 preset 中 `--radius-*` 的值——而那会同时改动 AMIS bridge 的映射，牵一发动全身。

---

## 5. 修复方向建议（供后续计划参考，未实施）

| 方向 | 做法 | 影响面 |
| --- | --- | --- |
| A. 补全 bridge 映射 | 在 `amis-theme-bridge.css` 增加 `--sizes-*`、`--gap-*`、`--Form-item-gap: var(--space-form-item-gap)`、`--Form-input-height: 32px`、`--Form-item-fontSize` 等映射 | 低，仅影响 AMIS 视觉；需回归 amis-prototype |
| B. 对齐 radius 语义 | 确定一个"宿主控件圆角基准"（建议 8px 级，即 AMIS radius-2/3 与 flux `rounded-sm` 对齐）：将 flux 输入类控件从 `rounded-lg` 收敛到 `rounded-sm`/`rounded-md`（改 flux 上游 `ui` 包 + 重新打 tgz），或调整 `--radius-*` 值并在 bridge 同步 | 中，涉及 flux tgz 重新打包 |
| C. 删除 host 副本 | 移除 `flux-spacing.css` 中与上游重复的部分，间距统一改由上游 `default-spacing.css`（已打进 dist/style.css）控制，host 只保留 host 特有覆盖 | 低~中，消除漂移 |
| D. 修正硬编码 | 定义 `--nop-field-error`（host 侧映射到 `--danger`）或直接让 flux 上游用 `hsl(var(--destructive))`；label 字号改走变量 | 低 |
| E. 建立视觉回归 | 用 Playwright 对同一 schema 分别渲染 amis 与 flux，截图对比控件圆角/间距（可参考 `docs/testing/` 现有做法） | 中 |

> 通用规则（与 `docs/analysis/2026-05-26-flux-upstream-delta-analysis.md` 一致）：凡是 `ui`/`theme-tokens` 通用改动，应优先改 `nop-chaos-flux` 上游再同步，不要长期留在 host 副本里。

---

## 6. 相关文件索引

- 宿主 token：`packages/theme-tokens/src/styles.css`
- AMIS 映射：`apps/main/src/styles/amis-theme-bridge.css`（未映射 sizes/gap/Form-*）
- flux 基线副本（已漂移）：`apps/main/src/styles/flux-spacing.css`
- host 扩展：`apps/main/src/styles/flux-host-token-extension.css`、`apps/main/src/styles/fluxHostTailwindExtension.ts`
- Tailwind 扫描：`apps/main/src/styles/tailwind.css`（`@source` flux dist 与 flux-lib/ui，类生成正常，构建产物已含 `rounded-lg/gap-*/h-8`）
- flux 上游控件类：`nop-chaos-flux/packages/ui/src/components/ui/{input,button,select,combobox}.tsx`、`flux-renderers-form/src/form-renderers.css`
- AMIS cxd 基准：`node_modules/.pnpm/amis@…/node_modules/amis/sdk/cxd.css`（`--Form-item-gap`=24px、`--Form-input-height`=32px、`--input-size-default-height`、radius 用量统计）
