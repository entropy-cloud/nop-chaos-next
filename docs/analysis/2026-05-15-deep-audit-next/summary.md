# 深度审核汇总报告

## 审核范围
- **执行的维度**: 12 个全维度（01-12）
- **覆盖的包**: shared, core, plugin-bridge, amis-core, amis-react, theme-tokens, tailwind-preset, extension-host, ui (flux-lib), apps/main, examples/plugin-demo, examples/extension-demo
- **审核日期**: 2026-05-15
- **执行方式**: 12 维度第 1 轮初审 + 12 维度独立复核，共 24+ 个子 agent

## 深挖统计
- 维度总数: 12
- 各维度深挖轮次: 全部 12 维度在第 1 轮初审达到价值收敛，无需追加轮次
- 深挖总轮次: 12
- 深挖总发现数: 103

## 复核统计
- 深挖发现总数: 103
- 已独立复核条目数: 103
- 保留: 98
- 降级: 4（02-009 降观察项, 04-07 降 P4, 06-09 降 P3, 11-04 降 P2）
- 驳回: 0

## P0 清单（按文件分组）

| 编号 | 文件 | 问题 | 复核状态 |
|------|------|------|----------|
| 06-01 | `apps/main/src/main.tsx:38-44` | bootstrap() 无错误处理，初始化失败导致白屏 | 保留 |
| 06-02 | `apps/main/src/router/RouteRenderer.tsx:11-25` | 无 Error Boundary，lazy 组件崩溃卸载整个 React 树 | 保留 |
| 12-01 | `apps/main/src/store/authStore.ts`, `packages/shared/src/auth/tokenManager.ts`, `apps/main/src/hooks/useAuth.ts` | 认证流程零测试，安全红线 | 保留 |

## P1 清单（按文件分组）

| 编号 | 文件 | 问题 | 复核状态 |
|------|------|------|----------|
| 12-02 | `apps/main/src/router/pageRegistry.tsx` 等 | 路由分发零测试 | 保留 |
| 12-03 | `packages/core/src/components/PluginSlot.tsx` | 插件加载零测试 | 保留 |
| 12-04 | `packages/extension-host/src/` | 扩展系统零测试 | 保留 |
| 12-05 | `packages/core/src/hooks/usePermissionGuard.ts` | 权限守卫零测试 | 保留 |
| 12-07 | `packages/shared/src/auth/tokenManager.ts:1-212` | 认证基础设施零测试 | 保留 |
| 08-01 | `packages/core/src/components/PluginSlot.tsx:70` | 插件渲染无 ErrorBoundary | 保留 |
| 08-02 | `apps/main/src/plugins/sharedModules.ts:61-80` | rejected promise 被永久缓存 | 保留 |
| 06-03 | `apps/main/src/hooks/useAuth.ts:38-48` | Auth fetch 静默吞错误 | 保留 |
| 06-04 | `packages/shared/src/http/client.ts:157-167` | Token 刷新静默吞错误 | 保留 |
| 06-05 | `packages/shared/src/http/client.ts:84` + `tokenManager.ts:100` | 双 token 刷新去重 | 保留 |
| 06-06 | `apps/main/src/pages/flow-editor/index.tsx:42-47` | Flow mutation 无 onError | 保留 |
| 07-01 | `apps/main/src/router/AppRoutes.tsx`, `RouteRenderer.tsx` | Extension systemPages 未接入路由 | 保留 |
| 09-01 | `apps/main/src/styles/flux-spacing.css:200,258` | --destructive 变量未定义 | 保留 |
| 09-02 | `examples/extension-demo/src/harbor.css` | harbor 主题缺 --chart-1~5 | 保留 |
| 04-01 | `apps/main/src/store/pluginStore.ts:18-28` | PluginStore 双重持久化 | 保留 |
| 04-02 | `apps/main/src/App.tsx:77-110` | PluginBridge 路由重建 | 保留 |
| 05-01 | `packages/plugin-bridge/src/index.ts:134-156` | 窄 hooks 过宽订阅 | 保留 |
| 05-02 | `apps/main/src/App.tsx:67-114` | bridgeSnapshot 级联重算 | 保留 |
| 02-002 | `packages/plugin-bridge/src/index.ts:1-166` | 入口文件包含实现细节 | 保留 |
| 01-02 | `packages/plugin-bridge/package.json:8-15` | phantom deps | 保留 |
| 03-01 | `packages/shared/src/index.ts:1-15` | export * 无 API 门控 | 保留 |
| 03-03 | `packages/plugin-bridge/package.json:8-14` | 僵尸依赖 | 保留 |
| 03-08 | 3 个包中的 `getBaseOrigin()` | 函数三处重复实现 | 保留 |

## 高频问题文件（出现在多个维度中的文件）

| 文件 | 涉及维度 | 问题数 |
|------|---------|--------|
| `packages/plugin-bridge/src/index.ts` | D01, D02, D03, D05 | 5 |
| `apps/main/src/App.tsx:67-114` | D04, D05, D08 | 3 |
| `packages/core/src/components/PluginSlot.tsx` | D08, D12 | 2 |
| `apps/main/src/router/RouteRenderer.tsx` | D06, D07, D12 | 3 |
| `apps/main/src/plugins/sharedModules.ts` | D06, D08 | 2 |
| `apps/main/src/services/http.ts` | D06 | 1+ |
| `packages/shared/src/auth/tokenManager.ts` | D06, D11, D12 | 3 |
| `packages/shared/src/http/client.ts` | D06 | 1+ |
| `packages/shared/src/index.ts` | D03, D11 | 2 |

## 跨维度模式

1. **Plugin-bridge 包综合问题**（D01/D02/D03/D05）：plugin-bridge 是跨维度问题最多的包（5 个问题），同时存在依赖声明不当、入口文件职责混合、僵尸依赖、API 表面积过宽、订阅精度五个独立问题。

2. **认证链路全无测试**（D12 + D06）：authStore + tokenManager + useAuth + http client 构成的认证链路，同时存在零测试覆盖（P0）和多个异常吞掉/竞态问题（P1）。

3. **插件系统故障隔离缺失**（D06 + D08）：Error Boundary 完全缺失（P0）+ PluginSlot 无超时（P2）+ rejected promise 被缓存（P1），组合成插件系统的完整故障路径盲区。

## 已自动化的检查项

- ESLint `max-lines: 700` — 覆盖文件大小红线，当前无违规
- TypeScript `strict: true` — 覆盖 noImplicitAny，当前零 any
- `@typescript-eslint/ban-ts-comment: 'error'` — 覆盖 @ts-expect-error 必须有说明
- `filterMenusByRoles` 有单元测试覆盖
- `validateMenuResponse` 有单元测试覆盖

## 建议新增的自动化检查

1. **ESLint `no-explicit-any: 'warn'`**：代码库已零 any，低风险启用
2. **依赖声明检查脚本**：检测 source-only 包的 phantom dependencies
3. **CI 测试必达 P0 缺口**：至少为认证流程（authStore + tokenManager）添加最小测试
4. **ESM proxy 文件完整性检查**：在 CI 中验证 sharedModules 注册的模块都有对应 proxy 文件
5. **CSS 变量引用检查**：自动化检测 CSS 中引用了未定义的 CSS 变量

## 可暂缓项

- 组件使用一致性（维度10）全部为 P2/P3，可渐进修复
- 目录结构优化（维度02 P3 条目）：折叠过度拆分子目录、分组平铺目录
- 导出格式统一（维度01-03, 03-06）：source-only vs dist-producing exports 并存是设计选择

## 建议行动顺序

1. **立即（P0）**：bootstrap() 加 .catch() + 添加 Error Boundary
2. **立即（P0）**：为 authStore + tokenManager 添加单元测试
3. **本周（P1）**：修复 plugin-bridge phantom deps（移入 peerDependencies）
4. **本周（P1）**：为 pageRegistry + usePermissionGuard + PluginSlot 添加测试
5. **本周（P1）**：修复 --destructive CSS 变量
6. **本周（P1）**：bootstrap() 加 .catch()、Error Boundary
7. **两周内（P1-P2）**：修复 token 刷新双去重、异常吞掉问题
8. **排期（P2）**：PluginBridge 订阅优化、大面积 dark:bg-slate 重构
