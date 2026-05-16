# 深度审核汇总报告

## 审核范围

- **执行的维度**: 全部 12 个维度
- **覆盖的包**: @nop-chaos/shared, core, ui, plugin-bridge, extension-host, amis-core, amis-react, theme-tokens, tailwind-preset, apps/main, examples/plugin-demo, examples/extension-demo
- **审核日期**: 2026-05-16
- **执行方式**: 每个维度第 1 轮初审 + 部分维度第 2 轮深挖，共 ~25 个子 agent
- **输出目录**: `docs/analysis/2026-05-16-deep-audit-full-run/`

## 深挖统计

| 维度 | 深挖轮次 | 发现数 |
|------|---------|--------|
| 01 依赖图与包边界 | 2 轮 | 14 (9 + 5 追加) |
| 02 模块职责与文件边界 | 1 轮 | 6 |
| 03 API 表面积与契约一致性 | 1 轮 | 11 |
| 04 状态所有权与单一事实来源 | 2 轮 | 10 (7 + 3 追加) |
| 05 响应式订阅精度 | 1 轮 | 5 |
| 06 异步模式与取消安全 | 1 轮 | 11 |
| 07 路由、权限与页面注册 | 1 轮 | 10 |
| 08 插件桥接与共享模块 | 1 轮 | 10 |
| 09 主题与样式系统 | 1 轮 | 13 |
| 10 组件使用与一致性 | 1 轮 | 6 (+ 4 合规确认) |
| 11 类型安全与契约质量 | 2 轮 | 10 (5 + 5 追加) |
| 12 测试覆盖与质量 | 1 轮 | 14 |
| **总计** | **16 轮** | **120** |

## 复核状态

> 注：本轮审核聚焦初审和深挖阶段。维度复核和子项复核尚未独立执行。下文汇总的发现均为"初审/深挖线索"，标注为"未复核"。

## P0 清单

无 P0 级发现。项目整体架构健康，无当前已构成错误行为或安全违约的问题。

## P1 清单（按文件分组）

| 编号 | 维度 | 严重程度 | 文件 | 摘要 |
|------|------|---------|------|------|
| 01-02 | 01 | P1 | `packages/amis-react/package.json` | amis-react 缺少 lucide-react 依赖声明 |
| 05-01 | 05 | P1 | `apps/main/src/App.tsx:77-115` | pluginBridge 在每次路由导航时重建 |
| 06-08 | 06 | P1 | `packages/amis-core/src/core/ajax.ts:285-307` | executeSharedRequest 每次调用创建新 HTTP 客户端 |
| 07-03 | 07 | P1 | `apps/main/src/router/AppRoutes.tsx:21-34` | dedupeRoutesByPath 静默丢弃重复路由 |
| 08-01 | 08 | P1 | `examples/plugin-demo/scripts/build-with-rollup.mjs:22-37` | Rollup 缺少 react/jsx-dev-runtime 外部化 |
| 08-02 | 08 | P1 | `packages/plugin-bridge/src/index.ts:71-79` | usePluginNotifications 未使用 useSyncExternalStore |
| 09-02 | 09 | P1 | 20+ 组件文件 | 52+ 处硬编码颜色绕过主题系统 |
| 12-11 | 12 | P1 | `packages/plugin-bridge/src/index.ts` | plugin-bridge hook 层零测试 |

## P2 清单（按文件分组）

| 编号 | 维度 | 文件 | 摘要 |
|------|------|------|------|
| 01-01 | 01 | `packages/amis-react/package.json` | amis-react 依赖 ui 但规则 f 不允许 |
| 01-03 | 01 | `packages/core/package.json` | react 在 dependencies 而非 peerDependencies |
| 01-06 | 01 | 多个 package.json | exports 策略不一致（src vs dist） |
| 01-10 | 01 | `packages/plugin-bridge/package.json` | 4 个未使用的 peerDependencies |
| 02-01 | 02 | `flow-editor/[id]/index.tsx` | 573 行巨型组件 7 职责 |
| 02-02 | 02 | `packages/amis-core/src/core/graphql.ts` | 555 行混合 4 种职责 |
| 02-03 | 02 | `dashboard/index.tsx` | 532 行 6 个图表全部内联 |
| 03-02 | 03 | `packages/core/src/index.ts` | 公开导出内部映射表 iconRegistry |
| 03-03 | 03 | `amis-core/types.ts` vs `shared/http/types.ts` | AmisFetcherResult.headers 可选性不一致 |
| 03-04 | 03 | `packages/plugin-bridge/src/types.ts` | BoundStore selector 签名但实现不支持 |
| 03-05 | 03 | `packages/extension-host/src/runtime.ts` | ShellRuntimeConfig 独立定义未关联 shared |
| 03-06 | 03 | `packages/core/src/utils/iconMap.tsx` | AppIconProps 未从 index.ts 导出 |
| 03-08 | 03 | `packages/theme-tokens/src/index.ts` | 空导出与 exports map 不一致 |
| 03-09 | 03 | `packages/shared/src/types/menu.ts` | pageType 6 种值但 core 仅处理 2 种 |
| 04-01 | 04 | `pluginStore.ts + plugins.ts` | 双 localStorage key 持久化 |
| 04-03 | 04 | `plugins/management/index.tsx` | React Query + Zustand 双源冗余 |
| 04-08 | 04 | `http.ts + tokenManager.ts` | Login 未同步 tokenManager 存储 |
| 05-02 | 05 | `packages/plugin-bridge/src/index.ts:71-79` | usePluginNotifications 绕过 useSyncExternalStore |
| 05-03 | 05 | `apps/main/src/App.tsx:93-107` | Bridge subscribe 非选择性通知 |
| 06-01 | 06 | `packages/shared/src/auth/tokenManager.ts` | 刷新失败错误被静默吞掉 |
| 06-02 | 06 | `client.ts + tokenManager.ts` | 两层独立刷新 Promise 去重 |
| 06-06 | 06 | `ai-workbench/index.tsx:263-266` | clipboard API 拒绝时未捕获异常 |
| 06-09 | 06 | `packages/amis-core/src/core/ajax.ts` | 401 后直接登出无重试 |
| 07-01 | 07 | `apps/main/src/router/AppRoutes.tsx` | 权限守卫仅作用渲染层不阻止路由 |
| 07-02 | 07 | `packages/shared/src/utils/menu.ts` | 无权限父级菜单可见但不可达 |
| 07-05 | 07 | `apps/main/src/router/AppRoutes.tsx` | 动态路由参数被去重误删风险 |
| 07-06 | 07 | `tabStore.ts + useTabManagement.ts` | tabStore.activePath 与 URL 不同步 |
| 08-03 | 08 | `apps/main/src/App.tsx:113-115` | bridge 注入时机在渲染后 |
| 08-04 | 08 | `packages/plugin-bridge/src/index.ts` | subscribeBridgeSnapshot 重复订阅 |
| 08-05 | 08 | `packages/core/src/components/PluginSlot.tsx` | 缺少加载超时机制 |
| 08-06 | 08 | `packages/core/src/components/ErrorBoundary.tsx` | 不支持崩溃恢复 |
| 09-01 | 09 | `theme-tokens + index.css` | --radius 被应用层硬编码覆盖 |
| 09-03 | 09 | `apps/main/src/utils/themeCss.ts` | system displayMode 不监听 OS 变化 |
| 10-01 | 10 | `apps/main/package.json` | 多余依赖 @base-ui/react |
| 10-03 | 10 | `iconMap.tsx vs icon-utils.ts` | 图标映射重复且冲突 |
| 10-05 | 10 | 33+ 文件 | 直接 lucide-react 导入绕过统一图标层 |
| 10-06 | 10 | `packages/core/src/utils/iconMap.tsx` | 全量导入 lucide-react 影响 bundle |
| 11-01 | 11 | `systemjs.d.ts` (core + main) | 重复声明且不一致 |
| 11-02 | 11 | `FluxRouteRenderer.tsx:49-53` | unknown 断言为 FluxSchema 无校验 |
| 11-03 | 11 | `packages/shared/src/types/extension.ts` | 核心接口缺乏 JSDoc |
| 11-06 | 11 | `AmisSchemaPage.tsx:122-124` | as unknown as never 绕过类型检查 |
| 11-07 | 11 | `packages/shared/src/http/payload.ts` | unwrapApiPayload as T 无校验 |
| 12-01 | 12 | `packages/amis-react/` | 零测试覆盖 |
| 12-02 | 12 | `apps/main/src/store/` | 3 个 store 无测试 |
| 12-03 | 12 | `apps/main/src/hooks/` | 6 个 hook 无测试 |
| 12-04 | 12 | `packages/core/src/components/` | 5 个组件无测试 |
| 12-06 | 12 | examples vitest.config.ts | 配置不一致 + globals |
| 12-09 | 12 | `PluginSlot + Sidebar` | 零测试（深入） |
| 12-13 | 12 | `action.test.ts` | adapter mock 重复 7 次 |

## 高频问题文件

| 文件 | 出现维度 | 问题数 |
|------|---------|--------|
| `packages/plugin-bridge/src/index.ts` | 02, 03, 05, 08, 12 | 5 |
| `apps/main/src/App.tsx` | 04, 05, 08 | 4 |
| `packages/core/src/index.ts` / `package.json` | 01, 03, 10 | 4 |
| `packages/core/src/components/PluginSlot.tsx` | 08, 12 | 2 |
| `packages/amis-core/src/core/ajax.ts` | 06, 02 | 2 |
| `packages/theme-tokens/src/index.ts` | 02, 03 | 2 |

## 跨维度模式

### 1. Token/样式硬编码（维度 09 + 10）
52+ 处 bg-white/slate 硬编码绕过主题系统，core 包组件也使用硬编码颜色。影响主题切换的视觉一致性。

### 2. PluginBridge 架构问题（维度 05 + 08）
pluginBridge 在每次路由导航时重建、subscribe 过度通知、注入时机晚于渲染、hook 层未测试——多个维度都指向 bridge 架构需优化。

### 3. Token 存储双源问题（维度 04 + 06）
authStore vs tokenManager 双存储、pluginStore 双 localStorage key、React Query + Zustand 双源——多处状态管理存在"两份数据表达同一概念"的模式。

### 4. 内部实现泄露公共 API（维度 01 + 03 + 10）
iconRegistry 导出、iconMap 重复实现、未使用的 peerDependencies——多个维度发现内部实现不应暴露为公共 API。

### 5. 测试覆盖结构性缺口（维度 12）
amis-react 零测试、plugin-bridge hook 层零测试、core 关键组件零测试、3 个 store 零测试——测试覆盖集中在已有测试的模块，新增/复杂模块缺少保护。

## 建议优先修复项

### 高优先级（P1，应尽快处理）

1. **09-02**: 52+ 处硬编码颜色 → 在 tailwind-preset 添加 surface token，分批替换
2. **08-01**: Rollup 缺少 jsx-dev-runtime 外部化 → 添加到 external 数组
3. **08-02**: usePluginNotifications 未订阅 → 使用 useSyncExternalStore
4. **05-01**: pluginBridge 路由导航时重建 → 用 ref 存储 pathname
5. **06-08**: amis-core 每次请求新建 HTTP 客户端 → 缓存 client 实例
6. **12-11**: plugin-bridge hook 零测试 → 添加 renderHook 测试
7. **07-03**: dedupeRoutesByPath 静默丢弃 → 添加 console.warn 或改为后者覆盖
8. **01-02**: amis-react 缺 lucide-react 依赖 → 添加到 peerDependencies

### 中优先级（P2，排期处理）

9. **02-01/02/03**: 三个超 500 行文件拆分
10. **04-01/03/08**: 状态双源问题统一
11. **03-04**: BoundStore 类型签名修正
12. **10-06**: iconMap 全量导入优化

## 可暂缓项

- 所有 P3 级问题（约 55 项）
- 文档补齐（JSDoc）可渐进式处理
- E2E 测试场景扩展可按迭代规划
- 代码风格问题（如 Sidebar.tsk 分号）可由 Prettier 统一处理

## 已自动化的检查项

- `pnpm typecheck`: TypeScript 编译检查（零 any 使用）
- `pnpm lint`: ESLint 含 max-lines 700 行规则
- `pnpm format:check`: Prettier 格式检查
- `pnpm audit:knip`: 死代码检测
- `pnpm check:duplicates`: 重复代码检测

## 建议新增的自动化检查

1. **依赖使用率检查**: 对比每个包的 import 声明与 dependencies/peerDependencies，检测死依赖
2. **CSS 变量完整性检查**: 解析 theme-tokens CSS，验证每个 data-theme+data-mode 组合包含所有必需变量
3. **exports map 对齐检查**: 对比 package.json exports 与 index.ts 实际导出
4. **测试内联实现检测**: 检测 .test.ts 文件中定义的函数是否也存在于对应的实现文件中
5. **React hook 规则**: 在 ESLint 中禁止 .test.ts 以外的文件使用 globals 模式的 Vitest API
