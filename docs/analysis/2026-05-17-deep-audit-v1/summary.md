# 深度审核汇总报告

## 审核范围

- **执行的维度**: 01-12（全量 12 个维度）
- **覆盖的包**: apps/main, packages/*, flux-lib/ui, examples/*
- **审核日期**: 2026-05-17
- **执行方式**: 每个维度 1 轮初审 + P0/P1 逐条复核 + P2 批量复核，共 18 个子 agent

## 深挖统计

- 维度总数: 12
- 各维度深挖轮次: 均为 1 轮（初审），深挖轮次因时间限制跳过
- 深挖总轮次: 12
- 深挖总发现数: ~120（初审）

## 复核统计

- 深挖发现总数: ~120（初审全部发现）
- 已独立复核条目数: ~65（P0/P1 逐条 + P2 批量）
- 保留: ~35
- 降级: ~12
- 驳回: ~22
- 未进入复核（P3 低优先级）: ~55

---

## P0 清单（按文件分组）

无 P0 级发现。项目整体健康度良好。

---

## P1 清单（按文件分组）

| 编号 | 维度 | 文件 | 摘要 |
|------|------|------|------|
| 05-02 | 05 响应式 | `apps/main/src/App.tsx:108` | pluginBridge 依赖 location.pathname，每次路由切换重建 bridge，级联通知所有插件消费者 |
| 05-04 | 05 响应式 | `packages/plugin-bridge/src/index.ts:71` | usePluginNotifications 不使用 useSyncExternalStore，bridge 注入后不触发重渲染 |
| 06-01 | 06 异步 | `packages/shared/src/http/client.ts:205` | HTTP 401 重试后仍返回 401 无上限保护，二次 401 静默透传 |
| 06-02 | 06 异步 | `packages/amis-core/src/core/ajax.ts:394` | amis-core 401 处理不经过 refresh 直接 logout，与主 client 行为不一致 |
| 07-04 | 07 路由 | `apps/main/src/router/RouteRenderer.tsx:112` | iframe 渲染缺少 sandbox 属性，存在安全风险 |
| 10-01 | 10 组件 | `apps/main/src/pages/settings/theme/index.tsx:29` | 已导入 Button 但主题选择卡片用原生 button，同文件混用 |
| 10-02 | 10 组件 | `apps/main/src/pages/plugins/management/index.tsx:180` | 已导入 Button 但选项按钮用原生 button，同文件混用 |
| 12-1 | 12 测试 | `apps/main/src/store/tabStore.ts` | tabStore 的 closeTab 路径选择逻辑无单元测试 |
| 12-10 | 12 测试 | `packages/core/src/components/PluginSlot.tsx` | 插件加载核心组件无单元测试 |
| 12-17 | 12 测试 | `tests/e2e/` | E2E 缺少权限/角色过滤场景，12 个 spec 无一覆盖 |

---

## P2 清单（按文件分组）——仅列已通过复核的保留项

| 编号 | 维度 | 文件 | 摘要 |
|------|------|------|------|
| 01-01 | 01 依赖 | `packages/core/package.json` | 声明未使用的 clsx 和 react-router-dom 依赖 |
| 01-02 | 01 依赖 | `examples/plugin-demo/package.json` | peerDependencies 缺少 react/react-dom |
| 04-02 | 04 状态 | `apps/main/src/store/pluginStore.ts:12` | 模块加载时执行 localStorage I/O，hydrate 后结果被覆盖 |
| 04-05 | 04 状态 | `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts:78` | 16 个 useState + JSON.stringify dirty 检测 |
| 04-07 | 04 状态 | `packages/plugin-bridge/src/index.ts:12` | bridge 双重通知路径（subscribePluginBridge + bridge.subscribe） |
| 05-03 | 05 响应式 | `apps/main/src/App.tsx:65` | bridgeSnapshot 粗粒度包含 plugins 数组 |
| 05-06 | 05 响应式 | `apps/main/src/pages/flow-editor/[id]/useFlowEditorActions.ts:138` | Context value 含高频 hover 值，所有节点组件重渲染 |
| 05-07 | 05 响应式 | `apps/main/src/pages/flow-editor/[id]/useFlowEditorActions.ts:138` | editorActions useMemo 依赖整个 state 对象，memo 失效 |
| 05-09 | 05 响应式 | `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts:78` | JSON.stringify 每次渲染执行，拖拽场景有实际开销 |
| 05-15 | 05 响应式 | `packages/core/src/components/PluginSlot.tsx:51` | useEffect 依赖 beforeLoad，设计脆弱 |
| 06-03 | 06 异步 | `apps/main/src/hooks/useAuth.ts:7` | 模块级 didBootstrapAuth 标志 HMR 不重置 |
| 06-07 | 06 异步 | `apps/main/src/pages/auth/login/index.tsx:56` | 登录表单无并发提交防护 |
| 07-01 | 07 路由 | `apps/main/src/pages/errors/403.tsx:22` | 错误页硬编码 /dashboard 而非动态 homePath |
| 07-02 | 07 路由 | `apps/main/src/hooks/useTabManagement.ts:38` | closeAllTabs 硬编码 /dashboard |
| 08-01 | 08 插件 | `packages/plugin-bridge/src/index.ts:71` | usePluginNotifications 未使用 useSyncExternalStore（与 05-04 同源） |
| 08-02 | 08 插件 | `packages/plugin-bridge/src/index.ts:12` | subscribeBridgeSnapshot 在 bridge 未注入时遗漏 subscribe |
| 08-12 | 08 插件 | `packages/core/src/utils/systemjs.ts:60` | loadRemoteComponent 未验证 module.default 有效性 |
| 03-04 | 03 API | `packages/amis-core/src/core/url.ts:23` | 重复实现 isAbsoluteUrl，与 shared 语义差异 |
| 02-04 | 02 模块 | `apps/main/src/lib/` | lib/ 与 utils/ 职责重叠，仅 1 个文件 |
| 12-2 | 12 测试 | `apps/main/src/store/layoutStore.ts` | 无单元测试 |
| 12-3 | 12 测试 | `apps/main/src/store/themeStore.ts` | 无单元测试 |
| 12-6 | 12 测试 | `packages/shared/src/http/url.ts` | 无单元测试 |
| 12-7 | 12 测试 | `packages/shared/src/http/payload.ts` | 无单元测试 |
| 12-16 | 12 测试 | `packages/plugin-bridge/src/index.test.ts:146` | React mock 位置在两个 describe 之间，有误导性 |
| 12-28 | 12 测试 | `tests/e2e/extension-demo.spec.ts:4` | E2E extension-demo 默认 skip，CI 不可达 |
| 12-29 | 12 测试 | `packages/amis-core/src/core/graphql.test.ts` | graphql.ts 错误分支测试不足 |

---

## 高频问题文件（出现在多个维度中的文件）

| 文件 | 涉及维度 | 主要问题 |
|------|----------|----------|
| `apps/main/src/App.tsx` | 04, 05, 08 | bridge 构建依赖 pathname（05-02）、bridge snapshot 传播链（04-04, 04-07）、bridgeStores 空依赖（08-10） |
| `packages/plugin-bridge/src/index.ts` | 04, 05, 08 | usePluginNotifications 不用 useSyncExternalStore（05-04, 08-01）、双重通知路径（04-07）、subscribe 在 bridge 未注入时遗漏（08-02） |
| `packages/core/src/components/PluginSlot.tsx` | 05, 06, 08, 12 | beforeLoad 依赖脆弱（05-15）、无加载超时（08-06）、无单元测试（12-10） |
| `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts` | 04, 05 | 16 个 useState（04-05）、JSON.stringify dirty（05-09）、返回值未 memo（05-08） |
| `apps/main/src/pages/flow-editor/[id]/useFlowEditorActions.ts` | 05 | useMemo 依赖整个 state（05-07）、Context 含高频 hover 值（05-06） |
| `packages/shared/src/http/client.ts` | 06, 12 | 401 重试无上限（06-01）、有完整测试 |
| `packages/amis-core/src/core/ajax.ts` | 02, 06 | 401 直接 logout（06-02）、422 行多职责（02-07） |

---

## 跨维度模式（多个维度报告的同类问题）

### 1. PluginBridge 订阅/通知链（维度 04, 05, 08）

pluginBridge 的 bridge 构建和订阅机制在 3 个维度中都被提及。核心问题：
- `usePluginNotifications` 不使用 `useSyncExternalStore`（05-04, 08-01）
- 双重通知路径导致一次 store 变化触发两次 listener（04-07）
- bridge 依赖 `location.pathname` 导致路由切换时级联重渲染（05-02）
- subscribe 在 bridge 未注入时遗漏内部订阅（08-02）

**建议**: 统一 bridge 的订阅模型，移除路径 A（React re-render → setPluginBridge）或路径 B（bridge.subscribe），只保留一条。将 `usePluginNotifications` 改为 `useSyncExternalStore`。将 `getCurrentPath` 改为实时读取 `window.location.pathname`。

### 2. Flow Editor 性能链（维度 04, 05）

flow-editor 的 `useFlowEditorState` + `useFlowEditorActions` 组合存在连锁性能问题：
- 16 个 useState 导致 state 对象每次渲染都变（04-05）
- editorActions 的 useMemo 依赖整个 state，memo 完全失效（05-07）
- Context value 包含高频 hover 值，所有节点组件重渲染（05-06）
- JSON.stringify 在拖拽场景每次渲染执行（05-09）

**建议**: 将 state 从 useMemo 依赖中移除（只依赖 setter），将 hover state 从 Context 拆分，将 dirty 改为 useMemo。

### 3. 认证/401 处理不一致（维度 06）

两个 HTTP client 对 401 的处理策略完全不同：
- 主 client（shared/http/client.ts）: refresh token → 重试 → 失败则 clearTokens + onUnauthorized
- amis-core client: 直接 handleLogout，不尝试 refresh

**建议**: 让 amis-core 的 HTTP client 共享主 client 的 refresh 策略。

### 4. 硬编码 /dashboard homePath（维度 07）

错误页面、closeAllTabs、tabStore homeTab 三处硬编码 /dashboard。extension 可覆盖首页路径。

**建议**: 统一通过 menuQuery.data?.home 或全局配置读取动态 homePath。

### 5. Button 组件使用不一致（维度 10）

多处已导入 `Button` 但使用原生 `<button>`，特别是 toggle/chip 类按钮。

**建议**: 同文件内统一使用 `<Button>` 或 `<Toggle>` 组件。

---

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- `pnpm typecheck` 覆盖类型安全
- `pnpm lint` 覆盖 max-lines（700 行限制）、eslint 规则
- `@typescript-eslint/no-explicit-any` 设为 warn，覆盖 any 使用
- `@typescript-eslint/ban-ts-comment` 覆盖 ts-ignore/ts-expect-error
- Prettier 覆盖格式化
- Husky pre-commit hook 自动格式化

---

## 建议新增的自动化检查

1. **iframe sandbox 检测**: 添加 ESLint 规则检测无 sandbox 的 iframe
2. **原生 button 检测**: 添加 ESLint 规则检测已导入 Button 时仍使用原生 button
3. **homePath 硬编码检测**: 添加规则检测 navigate('/dashboard') 硬编码
4. **依赖使用检查**: 添加规则检测 package.json 中声明但代码中未使用的依赖

---

## 可暂缓项（有问题但 ROI 暂时不高）

- P3 级别的所有发现（约 55 项），主要涉及：
  - 代码组织优化（空目录、单文件目录、死代码类型文件）
  - 硬编码颜色值（装饰性元素）
  - 低频组件的测试覆盖
  - HMR 开发体验问题
  - 文档化缺失（JSDoc）
  - Token 一致性（text-white vs text-primary-foreground）

---

## 执行偏差说明

- **深挖轮次跳过**: 由于时间限制，所有维度仅执行 1 轮初审，未执行追加深挖轮次。部分维度（如 04 状态所有权、06 异步安全）可能还有未被覆盖的盲区。
- **复核覆盖**: P0/P1 条目逐条复核，P2 条目按主题分组批量复核，P3 条目未进入复核。
- **P3 条目**: 约 55 项 P3 发现未经过独立复核，按"待后续处理"归档在各维度文件中。
