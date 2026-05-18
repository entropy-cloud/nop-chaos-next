# 深度审核汇总报告

## 审核范围
- 执行的维度：01-12 全部 12 个维度
- 覆盖的包：`apps/main`、`examples/plugin-demo`、`examples/extension-demo`、`packages/shared`、`packages/core`、`packages/plugin-bridge`、`packages/amis-core`、`packages/amis-react`、`packages/extension-host`、`packages/theme-tokens`、`packages/tailwind-preset`、`flux-lib/ui`
- 审核日期：2026-05-18
- 执行方式：多轮深挖 + 维度复核 + P1 子项复核

## 深挖统计
- 维度总数：12
- 各维度深挖轮次：维度01=3轮, 维度02=4轮, 维度03=4轮, 维度04=3轮, 维度05=3轮, 维度06=3轮, 维度07=3轮, 维度08=4轮, 维度09=3轮, 维度10=2轮, 维度11=3轮, 维度12=3轮
- 深挖总轮次：38
- 深挖总发现数：122

## 复核统计
- 深挖发现总数：122
- 已独立复核条目数：95
- 保留：60
- 降级：28
- 驳回：7

## P1 清单（按文件分组）

| 编号 | 文件 | 结论 | 一句话摘要 |
| --- | --- | --- | --- |
| 02-01 | `apps/main/src/pages/data-management/master-detail/index.tsx` | 子项复核通过 | 列表页把筛选、排序、批量操作、导出、分页、导航全部堆在入口页 |
| 02-04 | `packages/amis-core/src/core/ajax.ts` | 子项复核通过 | AMIS ajax 核心同时承担特殊协议、传输、下载和 schema 绑定 |
| 04-02 | `apps/main/src/store/authStore.ts`, `apps/main/src/services/http.ts`, `apps/main/src/amis/adapter.ts`, `packages/shared/src/auth/tokenManager.ts` | 子项复核通过 | Auth token 同时保存在 Zustand 与 shared tokenManager，关键写入路径不一致 |
| 04-06 | `apps/main/src/main.tsx`, `apps/main/src/config/i18n/index.ts`, `apps/main/src/extensions/bootstrap.ts` | 子项复核通过 | extension 语言注册晚于 i18n 首次初始化，runtime 配置与 registry 分裂 |
| 04-07 | `apps/main/src/store/authStore.ts`, `apps/main/src/extensions/bootstrap.ts` | 子项复核通过 | extension auth 配置在 authStore hydrate 后才生效，持久化介质可能分叉 |
| 05-04 | `apps/main/src/pages/flow-editor/[id]/useFlowEditorActions.ts` | 子项复核通过 | Flow 编辑器 actions context 依赖整份 state，持续放大重渲染 |
| 06-01 | `apps/main/src/services/authApi.ts` | 子项复核通过 | 当前用户恢复请求绕过统一 401 刷新链路 |
| 06-03 | `apps/main/src/hooks/useAuth.ts` | 子项复核通过 | 启动期用户恢复缺少会话归属校验，旧请求可回写当前登录态 |
| 06-05 | `packages/extension-host/src/loadExtensions.ts` | 子项复核通过 | extension load/setup 无超时与取消保护，挂死源可阻塞宿主启动 |
| 06-08 | `apps/main/src/pages/data-management/master-detail/[id]/index.tsx` | 子项复核通过 | 详情保存结果缺少请求归属校验，切换记录后旧结果可回写 |
| 06-09 | `apps/main/src/pages/flow-editor/[id]/useFlowPersistence.ts` | 子项复核通过 | 流程保存结果缺少流程归属校验，切换流程后旧结果可污染当前态 |
| 06-10 | `apps/main/src/pages/data-management/master-detail/[id]/index.tsx` | 子项复核通过 | 切换详情 `id` 时旧草稿仍在新 URL 下继续展示并可编辑 |
| 06-11 | `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts` | 子项复核通过 | 切换流程 `id` 时旧画布仍在新流程加载前继续可操作 |
| 06-12 | `apps/main/src/pages/ai-workbench/index.tsx` | 子项复核通过 | AI 工作台允许并发流式回复，共享取消引用会互相踩踏 |
| 07-01 | `apps/main/src/router/AppRoutes.tsx` | 子项复核通过 | `/auth/login` 未接入 `systemPages.login` |
| 07-04 | `apps/main/src/router/AppRoutes.tsx` | 子项复核通过 | wildcard `*` 仍未接入 `systemPages.notFound` |
| 07-07 | `apps/main/src/config/systemMenus.ts` | 子项复核通过 | 首页路径按完整菜单树求值，可能把用户送到不可访问入口 |
| 08-01 | `packages/plugin-bridge/src/types.ts`, `apps/main/src/plugins/boundStore.ts` | 子项复核通过 | `PluginBridge.stores` 类型伪装成 Zustand hook，但实现只读快照 |
| 08-04 | `packages/plugin-bridge/src/index.ts`, `apps/main/src/plugins/sharedModules.ts` | 子项复核通过 | remote plugin 仍可导入 `setPluginBridge()` 覆盖全局 bridge |
| 08-08 | `packages/core/src/utils/systemjs.ts` | 子项复核通过 | 原生 ESM plugin 路径并未真正接通 shared modules |
| 08-09 | `packages/plugin-bridge/src/index.ts`, `apps/main/src/App.tsx` | 子项复核通过 | `usePluginI18n()` 语言切换后可能因快照引用稳定而不重渲染 |
| 09-03 | `packages/shared/src/types/extension.ts`, `packages/extension-host/src/runtime.ts`, `apps/main/src/config/themeRegistry.ts` | 子项复核通过 | extension 主题注册合同仍未接入 host 运行时链路 |
| 09-09 | `apps/main/src/styles/amis-theme-bridge.css`, `apps/main/src/styles/amis-fix.css` | 子项复核通过 | AMIS 主题桥在局部作用域污染宿主 `--background` 语义 |
| 09-10 | `flux-lib/ui/src/components/ui/table-row-class-name.ts`, `apps/main/src/lib/tableRowClassName.ts` | 子项复核通过 | `tableRowClassName` 双实现并存且 `subtle` 语义分叉 |
| 09-11 | `flux-lib/ui/src/components/ui/*` | 子项复核通过 | 共享 UI 原语仍保留多处裸色实现 |
| 09-13 | `apps/main/src/store/themeStore.ts`, `apps/main/src/hooks/useTheme.ts`, `apps/main/src/App.tsx` | 子项复核通过 | canonical theme 解析仍未统一覆盖 store/UI/bound store |
| 11-05 | `packages/extension-host/src/loadExtensions.ts` | 子项复核通过 | `ShellExtension` 类型守卫仍只校验非空 `id` 就收窄成完整扩展 |
| 12-02 | `apps/main/src/router/RouteRenderer.tsx`, `apps/main/src/router/RouteRenderer.test.tsx`, `tests/e2e/plugin-demo.spec.ts` | 子项复核通过 | `RouteRenderer` 的多个关键分支与失败态仍缺直接回归测试 |
| 12-03 | `apps/main/src/hooks/useAuth.ts`, `apps/main/src/hooks/useAuth.test.ts`, `tests/e2e/login.spec.ts` | 子项复核通过 | `useAuthBootstrap` 与失败登录/会话恢复场景仍缺真实覆盖 |
| 12-11 | `apps/main/src/router/AppShell.tsx`, `apps/main/src/hooks/useTabManagement.ts` | 子项复核通过 | `homePath`/tab 注册/activePath/closeAll 联动仍无真实壳层测试 |
| 12-12 | `apps/main/src/plugins/sharedModules.ts`, `apps/main/src/plugins/sharedModules.test.ts` | 子项复核通过 | `ensurePluginSharedModules()` 并发去重与失败重试仍无测试 |
| 12-13 | `apps/main/src/pages/flow-editor/[id]/useFlowPersistence.ts` | 子项复核通过 | `useFlowPersistence` 的保存/恢复/失败链路仍无直接测试 |
| 12-15 | `apps/main/src/hooks/useMenuConfig.ts` | 子项复核通过 | `useMenuConfigQuery` 的 queryKey 分片与 enabled 行为仍无直接测试 |
| 12-16 | `apps/main/src/pages/flow-editor/[id]/useFlowHistory.ts`, `useFlowKeyboardShortcuts.ts`, `useFlowEditorState.ts` | 子项复核通过 | Flow 编辑器核心交互仍缺撤销/重做/复制粘贴/Delete/离页保护测试 |

## 高频问题文件

| 文件 | 维度 | 说明 |
| --- | --- | --- |
| `apps/main/src/App.tsx` | 04, 08, 09 | bridge snapshot、bridge 注入、theme canonical 化都在这里暴露出契约问题 |
| `apps/main/src/extensions/bootstrap.ts` | 04, 07, 09 | extension 语言/auth/theme/builtin page 注册时序与接线缺口集中 |
| `apps/main/src/pages/data-management/master-detail/[id]/index.tsx` | 02, 06, 12 | 详情页职责过重、竞态保存、缺测试三者叠加 |
| `apps/main/src/pages/flow-editor/[id]/*` | 05, 06, 12 | Context 引用不稳定、切换/保存竞态、核心交互缺测试集中 |
| `packages/plugin-bridge/src/index.ts` | 05, 08 | bridge hooks 粒度、host/plugin 合同、i18n 响应链路问题集中 |
| `packages/extension-host/src/loadExtensions.ts` | 06, 11 | 异步边界与类型守卫都过宽 |

## 跨维度模式
- host/plugin/extension 相关的公共契约普遍“文档/类型比实际更宽”，尤其是 bridge、extension、theme、auth 运行时入口。
- `apps/main` 中多个大页面同时出现：入口文件职责堆积、异步结果回写缺少归属校验、对应测试缺位。
- 主题系统的 canonical 化只修到了部分读路径，store setter、UI 展示层与 bridge/bound store 仍未完全收口。
- 测试层对高风险 hook 和运行时状态链路存在系统性偏弱：大量用 mock/纯函数替代真实 hook 或壳层联动。

## 已自动化覆盖但不足以替代人工复核的点
- `eslint` / `tsc` 已覆盖一部分静态类型与 import 基线，但无法识别 public API 暴露的 live 可写全局引用。
- React Query / Zustand 的基本用法可通过类型检查，但无法自动发现“旧异步结果覆盖当前页面”的竞态。
- 部分 E2E 已覆盖 happy path，但对失败态、并发态、契约边界几乎没有保护。

## 建议新增的自动化检查
- lint/check：禁止 `apps/*` 与 `packages/*` 通过相对路径直接导入其他 workspace 包的 `src/*`
- lint/check：禁止 plugin-facing shared module 暴露 host-only setter（如 `setPluginBridge`、`setAuthConfig`、`setI18nGetter`、`setRefreshTokenFetcher`）
- test：补 `useMenuConfigQuery`、`useFlowPersistence`、`useAuthBootstrap`、`AppShell/useTabManagement`、`ensurePluginSharedModules` 的直接回归测试
- test：补 `usePluginI18n()` 语言切换重渲染测试与 ESM plugin unsupported/contract test
- style check：检出共享 UI primitives 中的裸色值与 `prefers-reduced-motion` 缺失

## 可暂缓项
- 根构建配置与 workspace 源码消费模式不一致（维度01的多项 P3）
- 部分脚手架/构建脚本的文件过大问题（维度02的多项降级项）
- demo/装饰层硬编码颜色（维度09 的多项降级项）

## 结论
- 当前仓库最值得优先处理的不是风格问题，而是 4 类真实风险：
  1. host/plugin/extension 公共合同过宽，且把 host-only 写入口暴露给 plugin
  2. 多个核心页面存在异步结果回写当前页面的竞态
  3. theme/auth/i18n 的 canonical state 仍未完全统一
  4. 关键运行时 hook 与失败态测试明显不足
- 审核结果已完成深挖、维度复核和 P1 子项复核，可以作为后续修复计划的直接输入。
