# 维度 10：组件使用与一致性

## 第 1 轮（初审）

第 1 轮初审结论：发现 1 个低优先级旁路问题；其余检查项本轮为零发现。

### [维度10-1] 宿主共享模块直接暴露 `sonner`，形成 UI 包旁路
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\plugins\sharedModules.ts:12-16`
- **证据片段**:
```tsx
import * as LucideReactLib from 'lucide-react';
import * as SonnerLib from 'sonner';
import * as SharedLib from '@nop-chaos/shared';
import * as PluginBridgeLib from '@nop-chaos/plugin-bridge';
import { registerSharedModules } from '@nop-chaos/core';
import * as UiLib from '@nop-chaos/ui';
```
- **严重程度**: P3
- **原生元素**: 不涉及
- **应替换为**: 优先仅共享 `@nop-chaos/ui`；若插件确需 toast 能力，建议由 `@nop-chaos/ui` 统一桥接/转出后再共享
- **替换可行性**: 中
- **现状**: 宿主源码已同时引入 `@nop-chaos/ui` 与第三方 `sonner`，说明插件共享层存在绕过 UI 包的入口
- **建议**: 先确认插件侧是否真的需要直接消费 `sonner` 全量 API；若不需要，移除该直引并统一收口到 `@nop-chaos/ui`
- **误报排除**: 这不是普通页面组件，而是插件共享模块基础设施；因此不判高优先级。但它确实属于宿主源码中的第三方 UI 能力直引
- **复核状态**: `未复核`

## 零发现范围与例外

- **原生元素搜索范围**:
  - `C:\can\nop\nop-chaos-next\apps\*\src\**\*.tsx`
  - `C:\can\nop\nop-chaos-next\packages\core\src\**\*.tsx`
- **搜索目标**: `<button> <input> <textarea> <select> <dialog> <table>`
- **结论**: 未发现宿主生产代码里用原生元素不必要替代 `@nop-chaos/ui` 的真实问题
- **合理例外**:
  - `C:\can\nop\nop-chaos-next\apps\main\src\App.test.tsx:105-107` 使用原生 `<button>`，属于测试内导航桩，不计为问题

- **`@nop-chaos/ui` 导入一致性**
  - 未发现 `apps/*/src`、`packages/core/src` 中从 `@nop-chaos/ui/*` 子路径导入
  - `cn()` 使用点均统一来自 `@nop-chaos/ui`
  - 未发现 `clsx` / `tailwind-merge` / 本地 utils 与 `cn()` 混用绕过入口的情况

- **UI 入口覆盖核对**
  - `C:\can\nop\nop-chaos-next\flux-lib\ui\src\index.ts` 已统一导出 `button` / `input` / `textarea` / `select` / `dialog` / `table` / `cn`
  - 本轮宿主代码对这些能力的使用总体遵循入口导入

- **底层 UI 依赖直连检查**
  - `C:\can\nop\nop-chaos-next\packages\*\package.json` 中，未发现 `@base-ui/react` 或 `@radix-ui/*` 的违规直依赖
  - `C:\can\nop\nop-chaos-next\flux-lib\ui\package.json` 持有 `@base-ui/react` 等底层依赖，属于 UI 包自身，属合理例外

## 维度复核结论

- [维度10-1]: 驳回。`sonner` 的双入口事实存在，但已被插件共享模块设计与文档明确承认，不足以认定为 UI 包旁路缺陷。
