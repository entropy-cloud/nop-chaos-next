# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

### [维度02-001] packages/amis-core/src/core/graphql.ts (555行) — 超过500行评估线

- **文件**: `packages/amis-core/src/core/graphql.ts:1-555`
- **严重程度**: P2
- **现状**: 6项职责混合：A:类型/工具(1-63) B:参数构建器(64-177) C:查询构建(178-256) D:Filter(257-339) E:注册表+GQL构建(340-460) F:入口(462-555)。
- **风险**: 单文件混合多种抽象层次逻辑，维护理解成本逐步累积。
- **建议**: 将职责E（operationRegistry）和职责B（argBuilders）提取到独立文件。
- **误报排除**: 不是 orchestrator 模式，混合了大量细节实现。

### [维度02-002] packages/plugin-bridge/src/index.ts (166行) — 入口文件包含实现细节

- **文件**: `packages/plugin-bridge/src/index.ts:1-166`
- **严重程度**: P1
- **现状**: 入口文件同时包含接口定义、实现逻辑和 React hooks 三重职责。>100行是实现代码。
- **风险**: 外部消费者难以区分稳定公共 API 和内部实现。
- **建议**: 将实现逻辑提取到 `src/bridge.ts`，hooks 提取到 `src/hooks.ts`，index.ts 仅 re-export。
- **误报排除**: 小型包中入口含少量实现不算严重问题，但三重职责明确可拆分。

### [维度02-003] packages/amis-core/src/core/ajax.ts (409行) — 超过300行但结构合理

- **文件**: `packages/amis-core/src/core/ajax.ts:1-409`
- **严重程度**: P3（观察项）
- **现状**: 5项职责边界清晰，主入口 fetchAmisRequest 仅11行，属于合理 orchestrator。
- **建议**: 当前结构可接受，未来新增请求协议时应提取到独立文件。
- **误报排除**: 接近但未达500行评估阈值，orchestrator 模式合理。

### [维度02-004] flux-lib/ui/src/components/ui/ — 61个文件平铺，无子目录分组

- **文件**: `flux-lib/ui/src/components/ui/` (61个 .tsx)
- **严重程度**: P2
- **现状**: 61个文件无子目录分组，hooks（use-dialog-drag.ts）和工具函数（table-row-class-name.ts）混入。
- **风险**: 新开发者需逐文件浏览；组件进一步增加时维护困难。
- **建议**: 建立 layout/form/overlay/navigation/data-display/feedback 分组子目录；将 hook 移到 hooks/，工具函数移到 lib/。
- **误报排除**: 61个文件平铺功能清晰，但无分组和物品种类混入是真实问题。

### [维度02-005] flux-lib/ui/src/index.ts — 导出项超过 50 个

- **文件**: `flux-lib/ui/src/index.ts:1-67`
- **严重程度**: P3
- **现状**: 55 行 `export * from` + 5 个具名导出，总计 60+ 符号。
- **风险**: 难以追踪公共 API；树摇不够精确；增大 breaking change 影响面。
- **建议**: 考虑仅导出明确选定的公共 API。
- **误报排除**: 组件库大量导出是行业惯例，无实现代码仅为 re-export。

### [维度02-006] packages/amis-core/src/adapter/index.ts — 单文件子目录

- **文件**: `packages/amis-core/src/adapter/index.ts:1-15`
- **严重程度**: P3
- **现状**: adapter/ 目录仅1个文件（15行），过度拆分。
- **风险**: 不必要的目录层级，增加导入路径长度。
- **建议**: 折叠为 `packages/amis-core/src/adapter.ts`。
- **误报排除**: 可认为预留扩展空间，但自创建起无扩展迹象。

### [维度02-007] packages/core/src/hooks/ — 单文件子目录

- **文件**: `packages/core/src/hooks/usePermissionGuard.ts:1-12`
- **严重程度**: P3
- **现状**: hooks/ 目录仅1个文件（12行），过度拆分。
- **建议**: 移到 `utils/` 或等到有第二个 hook 再创建目录。
- **误报排除**: Hook 通常需要独立目录，但当前仅一个 12 行文件。

### [维度02-008] apps/main/src/router/AppShell.tsx (295行) — 接近300行

- **文件**: `apps/main/src/router/AppShell.tsx:1-295`
- **严重程度**: P3（观察项）
- **现状**: 布局编排 + 副作用管理混合。fullscreen 同步和键盘快捷键可提取。
- **建议**: 未来增加交互时提取 fullscreen 管理和键盘快捷键为独立 hook。
- **误报排除**: AppShell 本质是 orchestrator，295行在合理范围内。

### [维度02-009] apps/main/src/services/ — 11个文件建议分组

- **文件**: `apps/main/src/services/`
- **严重程度**: P3
- **现状**: 11个顶层文件包含 API 调用层、数据映射层、HTTP 配置层、mock 层，职责混合在同一目录。
- **建议**: 按职责分组为 api/、mapper/、http.ts。
- **误报排除**: 未超过20个文件的分组阈值，但职责确实可分组。

### [维度02-010] use-dialog-drag.ts — Hook 错误放置在 components/ui/ 下

- **文件**: `flux-lib/ui/src/components/ui/use-dialog-drag.ts:1-204`
- **严重程度**: P2
- **现状**: 204行的 React hook 放在 components/ui/ 目录下，与"UI 组件"命名约定不一致。
- **风险**: 违反目录命名约定，开发者预期 components/ 下是声明式组件。
- **建议**: 迁移到 `flux-lib/ui/src/hooks/useDialogDrag.ts`。
- **误报排除**: shadcn/ui 风格有时会将 hooks 与组件共存，但项目 AGENTS.md 明确要求 hooks 对应 hooks 目录。
