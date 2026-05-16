# 维度 10：组件使用与一致性

## 第 1 轮（初审）

### [维度10-01] apps/main 多余依赖 @base-ui/react

- **文件**: `apps/main/package.json:21`
- **严重程度**: P2
- **现状**: 声明了 @base-ui/react 但无直接使用，所有使用通过 @nop-chaos/ui 间接。
- **建议**: 从 dependencies 移除。
- **误报排除**: @nop-chaos/ui 已正确声明依赖。
- **复核状态**: 未复核

### [维度10-02] Sidebar.tsx 全文件缺少分号

- **文件**: `packages/core/src/components/Sidebar.tsx:1-6`
- **严重程度**: P3
- **现状**: 所有 import 语句未使用分号，违反 .prettierrc "semi": true。
- **建议**: 执行 pnpm format。
- **误报排除**: 其他 core 文件全部以分号结尾。
- **复核状态**: 未复核

### [维度10-03] iconMap 与 @nop-chaos/ui 图标映射重复且冲突

- **文件**: `packages/core/src/utils/iconMap.tsx:64` vs `flux-lib/ui/src/lib/icon-utils.ts:14`
- **严重程度**: P2
- **现状**: 两套独立的图标名称映射，别名方向完全相反。house 在 iconMap 保持 house，在 icon-utils 映射为 home。
- **建议**: Lucide 路径的解析逻辑统一到 @nop-chaos/ui。
- **误报排除**: iconMap 承担 FontAwesome 额外映射，完全删除不合理，但 Lucide 部分应统一。
- **复核状态**: 未复核

### [维度10-04] packages/core 多余依赖 clsx

- **文件**: `packages/core/package.json:11`
- **严重程度**: P3
- **现状**: 声明了 clsx 但无直接使用，所有使用通过 cn() from @nop-chaos/ui。
- **建议**: 从 dependencies 移除。
- **误报排除**: 已确认零 import。
- **复核状态**: 未复核

### [维度10-05] 33+ 处直接 lucide-react 导入绕过统一图标层

- **文件**: apps/main/src/ 和 packages/core/src/ 中 33+ 个文件
- **严重程度**: P2
- **现状**: 存在两种图标使用模式并存：(A) 直接 lucide-react import (B) 通过 renderIcon/resolveIcon。
- **建议**: 渐进式：保持双模式但补充文档约定。静态图标允许直接 import，动态图标必须通过 renderIcon。
- **误报排除**: 不会导致功能错误，但影响图标主题化和库切换。
- **复核状态**: 未复核

### [维度10-06] iconMap.tsx 全量导入 lucide-react

- **文件**: `packages/core/src/utils/iconMap.tsx:3`
- **证据片段**: `import * as LucideIcons from 'lucide-react'`
- **严重程度**: P2
- **现状**: 将 1000+ 图标组件导入运行时 bundle，显著增加 bundle 大小。
- **建议**: 改为 `import { icons } from 'lucide-react'`，与 @nop-chaos/ui/icon-utils.ts 保持一致。
- **误报排除**: lucide-react ^1.7.0 支持 icons 导出。
- **复核状态**: 未复核

## 正面发现

- 原生 HTML 表单/表格元素全部通过设计系统组件替代（合规）
- @nop-chaos/ui 导入路径全部一致（合规）
- cn() 使用完全一致（合规）
- core 无 radix-ui/base-ui 穿透依赖（合规）
