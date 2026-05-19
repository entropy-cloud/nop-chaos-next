# 40 Secondary Theme Token Values Too Dark for Button Use

## Problem

- `apps/main` 中 `variant="secondary"` 按钮显示为"深色背景 + 深色文字"，对比度差，看起来像坏的。
- 最明显的入口是 `/#/ai-workbench` 页面顶部的"重新生成"按钮。
- 诊断 e2e 确认实际计算值为 `background: rgb(166, 137, 250)` (高饱和紫色) + `color: rgb(10, 71, 169)` (深蓝色)。

## Diagnostic Method

1. 先用 Playwright 诊断 e2e 直接打印 `<html>` 上的 CSS 变量值和按钮的 computed style。
2. 确认 Tailwind 类 `bg-secondary text-secondary-foreground` 已正确生成并应用到按钮上。
3. 确认 `--secondary: 255 92% 76%` 和 `--secondary-foreground: 217 89% 35%` 已正确传递到 `<html>`。
4. 确认 AMIS `cxd.css` 未污染这些变量（`--host-*` 保护机制已生效）。
5. 得出结论：不是变量没生效，而是 **token 值本身就是错的** — `hsl(255, 92%, 76%)` (高饱和紫色) 作为按钮背景色太深太抢眼，配 `hsl(217, 89%, 35%)` (深蓝色) 文字完全不像 shadcn 风格的 secondary 按钮。

## Root Cause

- `--secondary` token 在所有 4 个主题变体中使用了高饱和紫色/粉紫值（`255 92% 76%`、`255 92% 86%`、`256 92% 79%`）。
- shadcn/ui 的 `secondary` 按钮约定是 **浅灰低饱和背景 + 深色文字**（接近 `--muted` 的视觉效果）。
- 这个 token 值选择看起来是早期设计时的装饰色，不适合作为 UI 按钮的 secondary 语义色。

## Fix

- 将所有 4 个主题变体的 `--secondary` 改为浅灰色（light 模式：`210 40% 96%`，dark 模式：`217 33% 17%`），与 `--muted` 同色调。
- 将 `--secondary-foreground` 改为与 `--foreground` 一致（light：`222 84% 5%`，dark：`210 40% 98%`），确保文字对比度。
- 同步更新 `--host-secondary` 和 `--host-secondary-foreground` 镜像变量。

## Tests

- `tests/e2e/ai-workbench-styles.spec.ts` - 验证 secondary 按钮的计算样式。
- `tests/e2e/ai-workbench-styles.spec.ts` "after AMIS preview" 用例 - 验证跨路由后 secondary 色仍正确。
- `apps/main/src/utils/themeCss.test.ts` - 验证 `--host-*` 绑定。

## Affected Files

- `packages/theme-tokens/src/styles.css`

## Notes For Future Refactors

- 语义色 token 的值选择必须从 UI 组件使用场景反推，不能只从视觉设计单方面确定。
- `secondary` 按 shadcn 约定应是柔和低饱和的"次级操作"色，不能是高饱和装饰色。
- 诊断这类问题时，e2e 打印 computed style + CSS 变量实际值比猜测根因更高效。
