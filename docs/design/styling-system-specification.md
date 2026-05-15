# Styling System Specification

> 本文档定义 nop-chaos-next 项目的样式架构规范，覆盖主题系统、组件样式、CSS 组织、Tailwind 配置以及第三方样式边界。
> 参考设计：`nop-chaos-flux/docs/architecture/styling-system.md`、`theme-compatibility.md`，结合当前项目实际情况编写。

---

## 1. 总体架构

### 1.1 技术选型

| 层级     | 技术                           | 包                                      | 说明                                       |
| -------- | ------------------------------ | --------------------------------------- | ------------------------------------------ |
| 样式基础 | Tailwind CSS v4                | `tailwindcss@^4.2.2`                    | 原子化 CSS，项目唯一样式语言               |
| 组件原语 | @base-ui/react                 | `@base-ui/react@^1.3.0`                 | 无头组件原语（非 @radix-ui）               |
| 变体系统 | class-variance-authority (CVA) | `class-variance-authority@^0.7.1`       | 组件变体/尺寸定义                          |
| 类名合并 | clsx + tailwind-merge          | `clsx@^2.1.1` + `tailwind-merge@^3.5.0` | 通过 `cn()` 工具函数统一                   |
| 主题系统 | CSS 自定义属性                 | `@nop-chaos/theme-tokens`               | 基于 `data-theme` + `data-mode` 属性选择器 |
| 图标     | lucide-react                   | `lucide-react@^1.7.0`                   | 项目标准图标库                             |

### 1.2 架构原则

1. **Tailwind-first**：所有样式最终归结为 Tailwind 类名。项目不引入并行的样式系统（如 CSS Modules、styled-components、CSS-in-JS）。
2. **CSS 变量驱动主题**：主题兼容是 CSS 契约，不是运行时 Provider 契约。不要求 `ThemeProvider`。
3. **组件无隐式布局**：组件只负责交互状态（hover、focus、disabled）和变体样式（variant、size），不注入调用者不可见的布局属性。
4. **data-slot 替代 BEM**：组件内部区域用 `data-slot="xxx"` 标记，不用 `__element` 风格类名。

### 1.3 样式加载顺序

```css
/* apps/main/src/main.tsx 中的导入顺序 */
import './styles/tailwind.css'                    /* ① Tailwind 基础 + 配置 */
import '../../../packages/theme-tokens/src/styles.css' /* ② 主题 Token 定义 */
import '@nop-chaos/ui/styles.css'                 /* ③ UI 组件基础样式 */
import './styles/index.css'                       /* ④ 应用级覆盖 */
```

---

## 2. 主题系统

### 2.1 主题 Token 结构

主题 Token 定义在 `packages/theme-tokens/src/styles.css`，通过 CSS 自定义属性 + `data-theme` / `data-mode` 属性选择器实现切换。

#### 2.1.1 通用 Token（所有主题共享）

```css
:root {
  /* 圆角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* 阴影 */
  --shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 16px 48px rgba(15, 23, 42, 0.12);
  --shadow-xl: 0 20px 60px rgba(15, 23, 42, 0.16);
  --shadow-primary-sm: 0 8px 24px color-mix(in hsl, hsl(var(--primary)) 24%, transparent);
  --shadow-primary-md: 0 12px 32px color-mix(in hsl, hsl(var(--primary)) 34%, transparent);

  /* 图标尺寸 */
  --icon-sm: 16px;
  --icon-md: 18px;
  --icon-lg: 20px;
  --icon-xl: 24px;

  /* 过渡 */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

#### 2.1.2 语义色 Token

每个主题/模式组合通过 `:root[data-theme='xxx'][data-mode='yyy']` 选择器定义以下语义色：

| Token                                                               | 用途                 |
| ------------------------------------------------------------------- | -------------------- |
| `--primary` / `--primary-dark` / `--primary-light` / `--primary-bg` | 主色调               |
| `--primary-foreground`                                              | 主色上的文字         |
| `--secondary` / `--secondary-surface` / `--secondary-surface-hover` | 次要色               |
| `--success` / `--success-bg`                                        | 成功状态             |
| `--danger` / `--danger-bg`                                          | 危险/错误状态        |
| `--warning` / `--warning-bg`                                        | 警告状态             |
| `--background` / `--foreground`                                     | 页面背景与前景       |
| `--card` / `--card-foreground`                                      | 卡片背景与前景       |
| `--muted` / `--muted-foreground`                                    | 弱化区域             |
| `--accent` / `--accent-foreground`                                  | 强调区域             |
| `--border` / `--input` / `--ring`                                   | 边框、输入框、焦点环 |
| `--gray-50` ~ `--gray-900`                                          | 灰度梯度             |

**颜色格式规范**：所有语义色使用 HSL 色彩空间，值为 `H S% L%` 格式（不带 `hsl()` 函数包裹），在使用处通过 `hsl(var(--xxx))` 引用。

#### 2.1.3 主题特有 Token

| Token              | classic       | glass             |
| ------------------ | ------------- | ----------------- |
| `--glass-blur`     | `none`        | `blur(12px)`      |
| `--app-topbar-bg`  | 半透明白/深色 | 更高透明度 + 模糊 |
| `--app-sidebar-bg` | 半透明白/深色 | 更高透明度 + 模糊 |
| `--app-tabs-bg`    | 半透明白/深色 | 更高透明度 + 模糊 |
| `--card-surface`   | `rgba(...)`   | 更高透明度 + 模糊 |
| `--border-surface` | `rgba(...)`   | 更低不透明度      |

### 2.2 主题切换机制

**状态管理**（Zustand）：

```typescript
// apps/main/src/store/themeStore.ts
interface ThemeConfig {
  themeId: string; // 'classic' | 'glass' | (扩展主题)
  displayMode: 'light' | 'dark' | 'system';
}
```

**CSS 应用**（`apps/main/src/utils/themeCss.ts`）：

```typescript
function applyThemeToDocument(config: ThemeConfig) {
  const root = document.documentElement;
  root.dataset.theme = config.themeId;
  root.dataset.mode = resolveMode(config.displayMode);
  root.classList.toggle('dark', resolvedMode === 'dark');
}
```

**切换路径**：`ThemeSwitcher UI` → `themeStore.setThemeId/setDisplayMode` → `App.tsx useEffect` → `applyThemeToDocument()` → CSS 变量自动切换。

### 2.3 扩展新主题

1. 在 `packages/theme-tokens/src/styles.css` 中添加 `:root[data-theme='new-theme'][data-mode='light/dark']` 块
2. 在 `apps/main/src/config/themeRegistry.ts` 中注册新主题
3. 可选：扩展包（如 extension-demo）可通过 `registerThemes()` API 注入主题，并加载独立的 CSS Token 文件

示例参考 `examples/extension-demo/src/harbor.css`。

---

## 3. Tailwind 配置

### 3.1 三层配置体系

```
packages/tailwind-preset/src/index.ts   ← 共享预设（所有消费者）
    ↑
tailwind.config.ts                      ← 仓库根配置
    ↑
apps/main/tailwind.config.ts            ← 应用级配置
```

#### 3.1.1 共享预设（`packages/tailwind-preset`）

```typescript
// 关键配置项
{
  darkMode: ['class', '.dark'],
  theme: {
    extend: {
      colors: {
        // 所有颜色通过 CSS 变量映射
        border: 'hsl(var(--border))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        // ... 完整的语义色映射
        destructive: { DEFAULT: 'hsl(var(--danger))', foreground: 'hsl(var(--primary-foreground))' },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
      },
      borderRadius: { xl: 'var(--radius-xl)', lg: 'var(--radius-lg)', md: 'var(--radius-md)', sm: 'var(--radius-sm)' },
      boxShadow: { xs: 'var(--shadow-xs)', sm: 'var(--shadow-sm)', /* ... */ },
      fontFamily: { sans: ['Inter', 'Noto Sans SC', 'sans-serif'] },
      animation: { 'caret-blink': 'caretBlink 1s steps(2, start) infinite' },
    }
  },
  plugins: [animate] // tailwindcss-animate
}
```

#### 3.1.2 应用级配置（`apps/main/tailwind.config.ts`）

```typescript
const config: Config = {
  ...rootConfig,
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}', // ← 注意：已迁移到 flux-lib/ui
    '../../packages/core/src/**/*.{ts,tsx}',
  ],
};
```

> **已知问题**：应用级 content 路径仍指向 `packages/ui`，实际组件已迁移到 `flux-lib/ui`。但由于 `tailwind.css` 中通过 `@source '../../../../flux-lib/ui'` 补充了扫描路径，不影响实际构建。建议在下次重构时统一修正。

### 3.4 首屏资源加载合同

- `apps/main/index.html` 对 Google Fonts 使用 `preconnect` + `preload as=style` + `media="print" onload` 的非阻塞加载模式
- Font Awesome 也使用同样的非阻塞样式加载，不再同步阻塞首屏解析
- 这些资源策略属于当前主应用的 live baseline，后续替换字体或图标方案时应保持“非阻塞优先”的同级合同

### 3.2 Tailwind v4 CSS 入口

```css
/* apps/main/src/styles/tailwind.css */
@import 'tailwindcss';
@config '../../../../tailwind.config.ts';
@source '../../../../flux-lib/ui'; /* 补充扫描 flux-lib/ui */
```

### 3.3 自定义工具类

定义在 `apps/main/src/styles/index.css` 的 `@layer utilities` 中：

| 类名                                     | 用途                                      |
| ---------------------------------------- | ----------------------------------------- |
| `.theme-card`                            | 玻璃态卡片（backdrop-filter、hover 上浮） |
| `.text-balance`                          | 文本平衡换行                              |
| `.theme-blob` / `.blob-a/b/c`            | 动态背景渐变装饰                          |
| `.menu-scroll` / `.menu-scroll-expanded` | 菜单滚动条控制                            |
| `.tab-strip` / `.tab-item`               | 标签页导航工具                            |
| `.meta_text` / `.eyebrow-text`           | 元信息文本样式                            |

---

## 4. UI 组件库（`@nop-chaos/ui`）

### 4.1 包结构

```
flux-lib/ui/
├── src/
│   ├── index.ts                 ← 导出全部 56+ 组件
│   ├── lib/utils.ts             ← cn() 工具函数
│   ├── components/ui/           ← 组件文件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── badge.tsx
│   │   ├── sidebar.tsx
│   │   ├── tabs.tsx
│   │   ├── table.tsx
│   │   ├── table-row-class-name.ts
│   │   └── ...
│   ├── hooks/
│   └── styles/
│       ├── base.css             ← 基础层（border-color、font、body）
│       └── index.css
└── package.json
```

### 4.2 组件编写规范

#### 4.2.1 必须遵循

1. **使用 @base-ui/react 原语**：组件底层使用 `@base-ui/react/*` 导入，不使用 `@radix-ui/*`。
2. **CVA 定义变体**：有变体需求的组件使用 `class-variance-authority` 定义变体类名。
3. **cn() 合并类名**：所有 className 合并通过 `cn()` 完成，不用字符串拼接或数组 join。
4. **data-slot 标记**：组件根元素必须设置 `data-slot="组件名"`。
5. **data-variant / data-size**：有变体的组件在根元素设置 `data-variant` 和 `data-size` 属性，方便外部 CSS 选择器使用。

#### 4.2.2 组件模板

```tsx
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // 基础类：结构 + 过渡 + focus-visible + disabled
  'inline-flex shrink-0 items-center justify-center rounded-md text-sm font-medium ' +
    'transition-[color,background-color,border-color,box-shadow,transform] duration-200 ' +
    'outline-none focus-visible:border-ring focus-visible:ring-[3px] ' +
    'focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        // ...
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        // ...
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({ className, variant = 'default', size = 'default', ...props }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

#### 4.2.3 禁止事项

- ❌ 在组件中硬编码颜色值（如 `bg-blue-500`、`text-[#333]`）
- ❌ 使用 `@ts-ignore` 或 `as any` 绕过类型检查
- ❌ 引入 `@radix-ui/*` 包（已统一使用 `@base-ui/react`）
- ❌ 在组件中注入隐式布局（gap、padding、margin），除非调用者通过 props 显式声明
- ❌ 使用 BEM 风格类名（如 `button__icon`、`button--primary`）

### 4.3 cn() 工具函数

```typescript
// flux-lib/ui/src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

**使用规则**：

- 所有需要合并 Tailwind 类名的地方使用 `cn()`
- `cn()` 负责处理 Tailwind 类冲突（后面的覆盖前面的）
- 调用者优先使用语义色类名（`bg-primary`、`text-foreground`），不用裸色值

### 4.4 表格行变体

表格行样式通过 `getTableRowClassName()` 统一管理：

```typescript
import { getTableRowClassName } from '@nop-chaos/ui'

// 普通展示表格
<TableRow className={getTableRowClassName('default')} />

// 整行可点击
<TableRow className={getTableRowClassName('interactive')} />

// 弱反馈区域
<TableRow className={getTableRowClassName('subtle')} />
```

---

## 5. 暗色模式

### 5.1 实现方式

通过在 `<html>` 根元素上切换 `.dark` 类和 `data-mode='dark'` 属性实现。

- Tailwind 使用 `darkMode: ['class', '.dark']`
- 组件中使用 `dark:` 前缀定义暗色样式
- CSS 变量通过 `:root[data-mode='dark']` 选择器自动切换值

### 5.2 组件暗色模式规范

1. **CVA 变体中直接写 dark 前缀**：

   ```tsx
   variant: {
     outline: 'border bg-background shadow-xs hover:bg-accent dark:border-input dark:bg-input/30',
   }
   ```

2. **语义色自动适配**：使用 `bg-background`、`text-foreground` 等语义色类名时，暗色模式自动切换底层的 CSS 变量。

3. **禁止硬编码暗色值**：不要在组件中写 `dark:bg-gray-800`，应使用语义色 `dark:bg-card`。

---

## 6. 间距约定

### 6.1 上下文间距指南

| 场景                     | 推荐间距 | Tailwind          |
| ------------------------ | -------- | ----------------- |
| 卡片内部分区             | 16px     | `gap-4`           |
| 图标 + 文字（水平）      | 12px     | `gap-3`           |
| 标题 + 副标题            | 4px      | `mt-1` 或 `gap-1` |
| 表单字段之间             | 16px     | `gap-4`           |
| Label + 输入框（字段内） | 8px      | `gap-2`           |
| Badge/Tag 间距           | 8px      | `gap-2`           |
| 底栏项目间距             | 8px      | `gap-2`           |

### 6.2 间距原则

- **显式声明**：每个使用位置通过 Tailwind 类名明确声明间距，不依赖隐式默认值。
- **不设全局默认 gap**：不同上下文对间距的需求差异巨大，全局默认值反而造成混乱。
- **遵循 Tailwind 刻度**：使用 Tailwind 标准间距刻度（1 = 4px），不使用任意值 `gap-[13px]`。

---

## 7. 第三方样式边界

### 7.1 Amis 集成

Amis 组件拥有独立的 CSS 变量体系，通过两层桥接与宿主主题对接：

| 文件                                         | 职责                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/main/src/styles/amis-theme-bridge.css` | 将 Amis CSS 变量（`--colors-brand-*` 等）映射到宿主 Token（`--primary` 等） |
| `apps/main/src/styles/amis-fix.css`          | 组件级样式修复（Tooltip、Dialog、Table 等）                                 |

**规则**：

- Amis 样式覆盖限定在 `.amis` 和 `.amis-dialog-widget` 选择器内
- 不全局引入 `amis/lib/helper.css`（会导致类名冲突，详见 `docs/12-amis-helper-css-conflict.md`）
- 新增 Amis 组件适配写在 `amis-fix.css` 中
- `amis-fix.css` 中不再允许无差别 `transition: all`；如必须保留 `!important`，应仅用于第三方层叠覆盖边界并在 owner 文档中保持说明

### 7.2 通用第三方库规则

1. 优先使用宿主应用的 Token 和 utility
2. 避免引入会污染全局类名空间的第三方 helper 样式
3. 如必须引入，优先考虑隔离作用域（限定在选择器内），而非全局注入
4. 第三方库的全局工具类和宿主样式体系不能混用

---

## 8. 交互反馈规范

### 8.1 可点击元素

可点击元素需要同时具备以下反馈中的至少两种：

- hover 背景或前景色变化
- `cursor: pointer`
- active / selected 状态
- focus-visible 可见焦点环

**适用对象**：侧栏菜单项、可点击表格行、卡片式列表项、自定义按钮容器。

**不适用**：纯展示信息块、不可用状态、仅做布局的容器。

### 8.2 Hover 强度分级

| 级别          | 场景                             | 典型实现                                       |
| ------------- | -------------------------------- | ---------------------------------------------- |
| `subtle`      | 编辑型列表、表格子项、弱提示区域 | `hover:bg-white/45 dark:hover:bg-slate-900/45` |
| `default`     | 普通可感知 hover                 | `hover:bg-accent`                              |
| `interactive` | 导航项、可点击行、重要列表项     | `hover:bg-primary/6%` + cursor-pointer         |

### 8.3 Focus 规范

所有可交互组件统一使用 `focus-visible`（不是 `focus`）：

```css
focus-visible:border-ring
focus-visible:ring-[3px]
focus-visible:ring-ring/60
focus-visible:ring-offset-2
focus-visible:ring-offset-background
```

---

## 9. 文件组织

### 9.1 CSS 文件职责

```
packages/theme-tokens/src/styles.css      ← 主题 Token 定义（所有主题、所有模式）
packages/tailwind-preset/src/index.ts     ← Tailwind 共享预设
flux-lib/ui/src/styles/base.css           ← UI 组件基础层（border-color、字体、body）
flux-lib/ui/src/lib/utils.ts              ← cn() 工具函数
apps/main/src/styles/tailwind.css         ← Tailwind 入口（@import + @config + @source）
apps/main/src/styles/index.css            ← 应用级工具类和覆盖
apps/main/src/styles/amis-theme-bridge.css ← Amis 主题映射
apps/main/src/styles/amis-fix.css          ← Amis 组件修复
```

### 9.2 添加新 CSS 的决策树

```
需要添加样式？
├── 是主题 Token（颜色、圆角、阴影、间距）？
│   └── packages/theme-tokens/src/styles.css
├── 是 Tailwind 配置扩展？
│   └── packages/tailwind-preset/src/index.ts
├── 是 UI 组件变体/交互样式？
│   └── flux-lib/ui/src/components/ui/xxx.tsx (CVA + cn)
├── 是全局基础样式（字体、border-color）？
│   └── flux-lib/ui/src/styles/base.css
├── 是应用级工具类/覆盖？
│   └── apps/main/src/styles/index.css
├── 是 Amis 兼容样式？
│   ├── amis-theme-bridge.css (变量映射)
│   └── amis-fix.css (组件修复)
└── 是扩展包主题？
    └── 扩展包内独立 CSS 文件 + registerThemes()
```

---

## 10. shadcn/ui 使用评估

### 10.1 当前状态

| 方面              | 状态      | 说明                               |
| ----------------- | --------- | ---------------------------------- |
| Tailwind CSS 配置 | ✅ 正确   | v4 + 共享预设 + 语义色映射         |
| cn() 工具函数     | ✅ 正确   | clsx + tailwind-merge，标准实现    |
| CVA 变体系统      | ✅ 正确   | 12+ 组件使用 CVA 定义变体          |
| data-slot 标记    | ✅ 正确   | 49+ 组件使用 data-slot             |
| 暗色模式          | ✅ 正确   | darkMode class 策略 + CSS 变量双轨 |
| 组件原语          | ⚠️ 不同   | 使用 @base-ui/react 替代 @radix-ui |
| components.json   | ❌ 不存在 | 不使用 shadcn CLI，组件手动维护    |
| 文档一致性        | ⚠️ 需更新 | 部分文档仍提及 @radix-ui           |

### 10.2 关于 @base-ui/react 替代 @radix-ui

项目选择使用 MUI 团队开发的 @base-ui/react 替代 shadcn/ui 默认的 @radix-ui 作为组件原语层。这是**有意为之的架构选择**：

- @base-ui/react 提供同等的无头组件能力（Dialog、Select、Menu 等）
- API 风格不同（如使用 `@base-ui/react/dialog` 而非 `@radix-ui/react-dialog`）
- 不影响 shadcn/ui 的核心模式（CVA、cn、data-slot、Tailwind-first）
- 不需要迁移回 @radix-ui，两者在设计目标上等效

**建议**：项目文档中提及"shadcn/ui"时应理解为"遵循 shadcn/ui 架构模式的组件库，底层使用 @base-ui/react"。

---

## 11. 检查清单

新增页面或组件时，按此清单自检：

- [ ] 颜色是否使用语义色类名（`bg-primary`、`text-foreground`）而非裸色值？
- [ ] 间距是否通过 Tailwind 类名显式声明？
- [ ] 是否复用了 `@nop-chaos/ui` 中已有的组件？
- [ ] 可交互元素的 hover / active / focus 是否完整？
- [ ] 暗色模式是否正常？
- [ ] 是否错误依赖了第三方全局样式？
- [ ] 新组件是否设置了 `data-slot` 属性？
- [ ] 有变体的组件是否使用 CVA 定义？
- [ ] className 合并是否通过 `cn()` 完成？
- [ ] 新增的 CSS Token 是否放在正确的文件中？
- [ ] 是否避免了新的 `transition: all`、高风险布局动画或无说明的 `!important`？
- [ ] 首屏新增字体/图标资源是否继续遵守非阻塞加载合同？

---

## 相关文档

- `docs/09-style-interaction-guidelines.md` — 交互反馈与布局规则
- `docs/12-amis-helper-css-conflict.md` — Amis helper.css 冲突案例
- `docs/18-amis-theme-bridge.md` — Amis 主题桥接方案
- `nop-chaos-flux/docs/architecture/styling-system.md` — 参考设计（语义 props、classAliases）
- `nop-chaos-flux/docs/architecture/theme-compatibility.md` — 参考设计（主题兼容性）
