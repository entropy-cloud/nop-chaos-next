# React 19 最佳实践与代码 Review 指南

> **来源**: 基于 Vercel Engineering 的 React Best Practices，并结合 nop-chaos-next 的 React 19 / Zustand / TypeScript 基线收敛
> **适用**: React 19, Zustand, React Query, TypeScript, Vite, Vitest, Playwright
> **定位**: 本项目唯一的 React 19 review / tech-debt 清理文档

---

## 目标

- 先跑自动化，再做人工 review。
- 能被当前 lint / check 稳定发现的问题，不再保留为人工常驻清单。
- 发现重复机械问题时，优先补 lint / 静态检查，而不是继续扩文档。

---

## 先跑什么

先运行：

```bash
pnpm lint          # ESLint + src-artifacts + oversized files
pnpm typecheck     # TypeScript 类型检查
```

说明：

- `pnpm lint` 是主入口，包括 ESLint 规则、`verify-no-src-artifacts.mjs`、`check-oversized-code-files.mjs`
- `pnpm typecheck` 确认类型安全
- 人工 review 只报告这两步都没有稳定拦住的问题

---

## 当前已启用的 lint 基线

### 1. React Hook 正确性

来源：`eslint-plugin-react-hooks` (`recommended-latest`) + `eslint-plugin-react-compiler`

| 规则 | 级别 | 作用 |
|---|---|---|
| `react-hooks/rules-of-hooks` | error | 禁止在条件/循环/回调里调用 hooks |
| `react-hooks/exhaustive-deps` | error | effect / memo deps 必须完整 |
| `react-compiler/react-compiler` | error | React Compiler 规则（自动 memo 化安全性） |

### 2. React JSX / DOM 基础安全

| 规则 | 级别 | 作用 |
|---|---|---|
| `react/jsx-key` | error | 列表渲染缺少 key |
| `react/no-array-index-key` | error | 禁止用数组 index 做 key |
| `react/button-has-type` | error | `<button>` 必须声明 type |
| `react/jsx-no-comment-textnodes` | error | JSX 中的注释文本 |
| `react/jsx-no-duplicate-props` | error | 重复 props |
| `react/jsx-no-constructed-context-values` | error | JSX 中构造 context value |
| `react/jsx-no-script-url` | error | `javascript:` URL |
| `react/jsx-no-target-blank` | error | `target="_blank"` 缺少 `rel="noreferrer"` |
| `react/jsx-no-undef` | error | 未定义变量 |
| `react/no-children-prop` | error | 用 props.children 代替 children prop |
| `react/no-danger-with-children` | error | danger + children |
| `react/no-deprecated` | error | 废弃 API |
| `react/no-direct-mutation-state` | error | 直接 mutation state |
| `react/no-find-dom-node` | error | findDOMNode |
| `react/no-is-mounted` | error | isMounted |
| `react/no-render-return-value` | error | render 返回值 |
| `react/no-string-refs` | error | 字符串 refs |
| `react/no-unknown-property` | error | 未知 DOM 属性 |

### 3. React 19 入口保护（restricted imports / properties）

| 规则 | 作用 |
|---|---|
| `no-restricted-imports` → `react-dom` (render/hydrate/findDOMNode/unmountComponentAtNode) | 必须用 `react-dom/client` 的 root API |
| `no-restricted-imports` → `react-dom/test-utils` | 用 `@testing-library/react` |
| `no-restricted-imports` → `react-test-renderer` | 禁止重新引入 |
| `no-restricted-properties` → `ReactDOM.render/hydrate/findDOMNode/unmountComponentAtNode` | 同上 |
| `no-restricted-properties` → `React.createFactory` | legacy API |
| `no-new-func` + `no-eval` | 禁止动态代码执行 |

### 4. TypeScript / ESLint 基础保护

| 规则 | 级别 | 作用 |
|---|---|---|
| `@typescript-eslint/no-unused-vars` | error | 未使用变量（`_` 前缀豁免） |
| `@typescript-eslint/ban-ts-comment` | error | `ts-ignore`/`ts-nocheck` 禁止；`ts-expect-error` 需要说明 |
| `reportUnusedDisableDirectives` | error | 废弃的 eslint-disable 注释 |

注意：`@typescript-eslint/no-explicit-any` 是 **off**，这是刻意的——plugin bridge 和动态加载边界需要合理的宽类型。

### 5. 工程卫生

| 规则 / 脚本 | 级别 | 作用 |
|---|---|---|
| `unicorn/filename-case` (kebab-case) | error | 文件命名统一 kebab-case |
| `max-lines` (700) | error | 单文件不超过 700 行（不含空行和注释） |
| `i18next/no-literal-string` (jsx-text-only) | error | JSX 文本必须走 i18n |
| `react-refresh/only-export-components` | warn | 组件文件不应导出非组件 |
| `verify-no-src-artifacts.mjs` | CI | src/ 下不能有 .js/.d.ts/.js.map |
| `check-oversized-code-files.mjs` | CI | >500 行 warn，>700 行 error |

### 6. Prettier

- 由 Husky pre-commit hook 自动运行
- 不需要手动 `pnpm format:check`

---

## 已由自动化覆盖，不必重复做人工 review 的问题

| 问题 | 已由什么覆盖 |
|---|---|
| Hook 调用位置不对 | `react-hooks/rules-of-hooks` |
| Effect / memo deps 不完整 | `react-hooks/exhaustive-deps` + React Compiler |
| 列表缺少 key 或用 index 做 key | `react/jsx-key` + `react/no-array-index-key` |
| `<button>` 缺少 type | `react/button-has-type` |
| 使用 legacy React API (findDOMNode, string refs, etc.) | 多条 `react/no-*` 规则 |
| 用了 `react-dom` 旧入口 | `no-restricted-imports` + `no-restricted-properties` |
| 用了 `ts-ignore` | `@typescript-eslint/ban-ts-comment` |
| JSX 文本没走 i18n | `i18next/no-literal-string` |
| 文件名不符合 kebab-case | `unicorn/filename-case` |
| 文件超过 700 行 | `max-lines` + `check-oversized-code-files.mjs` |
| src/ 下混入了 build artifacts | `verify-no-src-artifacts.mjs` |
| 动态代码执行（eval / new Function） | `no-eval` + `no-new-func` |
| 废弃的 eslint-disable 注释 | `reportUnusedDisableDirectives` |

---

## 自动化没有完全覆盖的点

lint 不能判断：

- **Waterfall**：多个独立 async 是否仍然顺序 `await`
- **Bundle 边界**：路由级 lazy loading 是否合理、大型依赖是否被正确 code-split
- **竞态 / 取消逻辑**：快速切换时旧请求是否覆盖新结果、`useEffect` 异步是否有 `AbortController`
- **组件职责**：组件是否真的单一职责、hooks 是否合理抽象
- **Plugin bridge 动态类型**：`any` 是否在正确的边界内被收敛（host 侧强类型 → bridge `any` → plugin 侧再收敛）
- **Store 订阅粒度**：Zustand selector 是否过宽导致不必要的重渲染
- **React Query 配置**：staleTime / gcTime / retry 是否合理
- **i18next/no-literal-string** 只检查 JSX 文本字面量，不检查 `title` 属性、placeholder 等所有场景

---

## 本项目的 React 19 使用约束

### 1. Store 订阅基线

- **Zustand** 是全局状态管理基线，store 在 `apps/main/src/store`
  - `auth-store.ts` — 用户认证
  - `layout-store.ts` — 布局状态
  - `plugin-store.ts` — 插件注册与启用
  - `tab-store.ts` — 标签页
  - `theme-store.ts` — 主题
- **React Query** 管理 async server-state
- 两者分工明确：同步 UI 状态 → Zustand；异步服务端数据 → React Query
- **不要**在 React effect 里定义状态语义——状态语义属于 store / query 层

### 2. `startTransition` / `useTransition`

- 只用于明显偏 UI 体验的非阻塞更新
- 典型场景：路由切换、搜索过滤、大列表刷新、tab 切换
- 不要把核心业务逻辑的同步性交换掉

### 3. `useDeferredValue`

- 只用于搜索词、过滤条件、列表视图这类「输入高优先，渲染可延迟」的场景
- 不适合需要即时反馈的交互

### 4. `Suspense` / `use`

- 适合路由级 lazy loading（当前 `RouteRenderer` 已用）
- 适合远程插件加载（`PluginSlot`）
- **不要**让核心业务状态依赖 React suspend 机制
- 每个 `Suspense` 都应该有有意义的 `fallback`，不要空 loading

### 5. `useSyncExternalStore`

- `@nop-chaos/plugin-bridge` 基于 `useSyncExternalStore` 实现
- 如果新增外部 store 订阅，必须提供 `getSnapshot` / `getServerSnapshot` / `subscribe` 三个函数
- 避免在 `getSnapshot` 里返回新对象引用（每次渲染都会触发重渲染）

---

## 人工 Review 重点

### P0: Waterfall、竞态、加载边界

重点看：

- 独立 async 是否仍然顺序 `await`（应该用 `Promise.all` 或 `Promise.allSettled`）
- 快速切换时旧请求是否覆盖新结果（竞态）
- `useEffect` 里的异步操作是否有 `AbortController` 或 flag 守卫
- 大型模块（路由页面、编辑器、图表）是否做了 `lazy()` loading
- React Query 的 `queryKey` 是否唯一、`queryFn` 是否幂等

### P1: 交互与渲染成本

- 非紧急更新是否应使用 `startTransition`
- 大型派生结果是否适合 `useDeferredValue`
- 长列表是否应虚拟化
- Zustand selector 是否过宽（应使用 `(state) => state.xxx` 而非整个 store slice）
- 当前不报 lint 但明显低价值的 `useMemo` / `useCallback`（React Compiler 已自动处理大部分场景）

### P1: 插件桥接边界

重点看：

- **Host 与 plugin 的状态隔离是否到位**：plugin 只通过 `PluginBridge` 接口访问 host 状态，不应直接 import host 内部模块
- **`PluginBridge` hooks 是否只暴露必要的最小 API**：每新增一个暴露方法都需要评估必要性和安全性
- **Plugin 加载失败是否会破坏 host 渲染**：`PluginSlot` 应有 Error Boundary 兜底
- **SystemJS import map 是否正确隔离了共享依赖**：React、Zustand 等运行时不应被重复打包进 plugin bundle
- **`setPluginBridge` / `getPluginBridge` 的生命周期**：bridge 只应初始化一次，不应在每次渲染时重新设置
- **Bridge 上的 `any` 类型是否在 plugin 侧被正确 narrow**：`PluginBridgeStores` 的 BoundStore 泛型应在 plugin 端被具体化

### P1: 可诊断性与稳定性

重点看：

- 页面级 / 路由级是否缺少合适的 **Error Boundary** / **Suspense fallback**
- 是否缺少结构化日志（console.log / console.error 是否有足够上下文）
- 是否有未清理的全局事件监听器、定时器、订阅（`useEffect` cleanup）
- `useEffect` 是否有无限循环风险（deps 引用不稳定）

### P1: 路由与权限

重点看：

- `RouteRenderer` 中权限检查是否覆盖所有 pageType 分支
- 菜单过滤（隐藏无权限菜单项）和路由渲染（显示 Forbidden）两层是否一致
- `pageType: 'plugin'` 的 pluginUrl 是否有 XSS 风险
- iframe 嵌入（`pageType: 'iframe'`）是否需要 sandbox 属性

### P2: 包边界与依赖方向

- `packages/shared` 不应依赖 React
- `packages/ui` 可以依赖 `shared` 但不应依赖 `core` 或 `plugin-bridge`
- `packages/core` 可以依赖 `shared` 和 `ui`
- `packages/plugin-bridge` 不应依赖 host app 代码
- `apps/main` 可以依赖所有 packages

---

## 不要默认开启的规则

| 规则 | 原因 |
|---|---|
| `@typescript-eslint/no-explicit-any` | plugin bridge 和动态加载边界需要合理的宽类型 |
| `@typescript-eslint/no-unsafe-*` | 同上，bridge 层的 `any` 是有意设计 |
| `react-hooks/static-components` | `RouteRenderer` 等动态组件需要豁免 |

如果某个边界可以收紧（比如从 `any` 收窄到 union type），应该做。但不为了追求静态类型"纯度"而破坏插件桥接动态边界。

---

## Review 输出格式

按 P0 / P1 / P2 输出，每个问题包含：

1. **位置**：文件路径 + 行号范围或组件名
2. **问题**：现象与风险
3. **原因**：根本原因分析
4. **方案**：修复方案
5. **验证**：如何验证修复
6. **自动化建议**：是否值得新增 lint 规则

示例：

```
P0 | apps/main/src/pages/dashboard/index.tsx:45-60
问题: useEffect 中的 fetch 没有竞态保护
原因: 用户快速切换 tab 时，旧请求的 setState 可能覆盖新请求结果
方案: 增加 AbortController 或请求序号守卫
验证: 快速切换 tab 观察 console 是否有状态闪回
自动化: 暂无可靠的 lint 规则，需人工 review
```

---

## 验收标准

- `pnpm lint` 没有 error
- `pnpm typecheck` 通过
- `pnpm build` 通过
- 对重复出现的机械问题优先给出自动化收敛方案
- 不为了追求静态类型"纯度"而破坏插件桥接动态边界
- 每个 P0 问题必须有对应的回归测试或验证步骤

---

## 参考

- `eslint.config.js` — 完整 lint 规则定义
- `AGENTS.md` — 项目约定总览
- `docs/design/plugin-system.md` — 插件系统设计
- `packages/plugin-bridge/src/index.ts` — PluginBridge 接口与实现
- `apps/main/src/router/route-renderer.tsx` — 路由渲染与权限检查
- `apps/main/src/store/` — Zustand store 定义
- `scripts/verify-no-src-artifacts.mjs` — src artifacts 检查脚本
- `scripts/check-oversized-code-files.mjs` — 文件大小检查脚本
