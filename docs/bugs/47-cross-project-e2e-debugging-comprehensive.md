# 47 nop-entropy-e2e 跨项目调试：多个根因综合修复

## Problem

nop-entropy-e2e（nop-auth-e2e、nop-code-e2e、nop-job-e2e）的浏览器测试在通过 nop-chaos-next 前端调试时全部失败（38 个测试仅 6 个通过），且在修复过程中多个根因交织出现：

- RPC 测试全部通过，浏览器测试全部失败（`ERR_CONNECTION_REFUSED`、`.cxd-Crud` 超时）
- 登录后页面重定向到 `/change-self-pass` 而非目标 CRUD 页面
- AMIS CRUD 页面内容空白（`formItems: 0`）
- 跨项目（nop-entropy-e2e）typecheck 失败
- 后端 Quarkus dev mode 频繁崩溃（live reload classpath 不一致）

## Diagnostic Method

- **诊断难度**：极高。多个独立问题在同一时间表现为"浏览器测试全部失败"，需要系统性隔离
- **排查路径**：
  1. 先用 `dumpEnv` + `probeRpc` 诊断工具确认 proxy 转发正常、RPC 登录成功
  2. 发现 Navigation.ts 的 `login()` 签名不兼容——sync 覆盖后 `login(page, { username, password })` 中 options 被当作 baseUrl 字符串传入
  3. 发现 Vite dev server 只绑定 `[::1]:4173`（IPv6），但 Navigation.ts 默认 `127.0.0.1:4173`（IPv4）
  4. 发现 `waitForAuthenticated` 的 `page.waitForFunction(fn, { timeout })` 第二个参数是 arg 不是 options——timeout 从未生效
  5. 发现登录后菜单未加载——`waitForAuthenticated` 只检查 auth store 不检查菜单
  6. 发现 AMIS Tabs 内容不渲染——最终定位到 `normalizeEsmJsxRuntime` 错误地将 `createElement(Comp, ...)` 转为 `jsx(Comp, ...)`
  7. 发现 AmisAdapter `formField` 只查 `input` 不查 `textarea`/`select`
  8. 发现 `waitForList` 默认超时 10s 在 Vite dev 模式下不够（AMIS 模块逐个加载）
- **关键证据**：
  - Vite 绑定确认：`lsof -nP -iTCP:4173` 显示只监听 `[::1]:4173`
  - React fiber 树分析：TabComponent `hasEntered=true`、`mountOnEnter=false`、`isActive=true` 但 `childrenCount=0`
  - tgz 版本比较：旧版 tgz（commit 28ec07a^）用 `createElement` → Tabs 正常；新版（28ec07a）用 `jsx` → Tabs 不渲染

## Root Cause

共 8 个独立根因，分三层：

### 第一层：e2e-shared 共享库（本项目影响 nop-entropy-e2e）

| # | 问题 | 影响 |
|---|------|------|
| 1 | Navigation.ts `login()` 签名：sync 后 OLD API（`login(page, options?)`）被覆盖为 NEW API（`login(page, baseUrl?)`） | `login(page, { baseUrl, username, password })` 中 options 被当字符串传入 → goto 失败 |
| 2 | Navigation.ts 默认 URL `http://127.0.0.1:4173`（IPv4），Vite 只绑定 `[::1]:4173`（IPv6） | macOS 上全部 `ERR_CONNECTION_REFUSED` |
| 3 | `waitForFunction` 参数错误：`page.waitForFunction(fn, { timeout })` 第二个参数是 arg 不是 options | timeout 从未传递 → 默认 10s actionTimeout 而非预期的 30s |
| 4 | 登录后不等待菜单加载：`waitForAuthenticated` 成功后直接导航 → 路由未注册 | `NopAuthUser-main` 等路由不存在 → 重定向到 `/change-self-pass` |
| 5 | `CrudListPage.waitForList()` 无 timeout 参数，依赖 actionTimeout（10s） | Vite dev 模式 AMIS 模块逐个加载比预构建慢 → 超时 |
| 6 | `AmisAdapter.formField()` 只查 `input[name]` 不查 `textarea[name]` / `select[name]` | `remark`（textarea）等字段找不到 → `locator.fill` 超时 |
| 7 | `MockAuthAdapter.login` 和 `Navigation.login` 同名冲突 | index.ts 导出了 MockAuthAdapter 的 `login`，覆盖了 Navigation 的 `login` |

### 第二层：AMIS 渲染（libs/ tgz 文件）

| # | 问题 | 影响 |
|---|------|------|
| 8 | `normalizeEsmJsxRuntime` 后处理插件将 `createElement(Comp, __assign(...))` 转为 `jsx(Comp, __assign(...))` | `key + spread` 模式在 JSX 中需要 `createElement` 降级，jsx-runtime 无法正确处理 → Tabs 表单内容不渲染 |

### 第三层：nop-entropy-e2e 自身

| # | 问题 | 影响 |
|---|------|------|
| 9 | `nop-auth-e2e` 的 spec 使用 `.cxd-Drawer, .ant-drawer` 等引擎特定选择器 | 违反 PageObject 模式，不兼容 Flux 引擎 |
| 10 | `nop-code-e2e` 的 PO 文件（type-hierarchy.po.ts、symbol-search.po.ts）使用旧版 BasePage API | `private engine` + `super(page)` + `override` → typecheck 报错 |
| 11 | nop-entropy tsconfig.base.json `lib: ["ESNext"]` 缺 `DOM.Iterable` | `for...of` 遍历 `NodeListOf` 报错 |
| 12 | nop-entropy tsconfig.base.json `target: "ESNext"` vs 本项目 `ES2022` | 不一致，但无硬性影响 |

## Fix

### 第一层：e2e-shared 共享库（本项目修改，sync 后影响 nop-entropy-e2e）

| # | 修复 | 文件 |
|---|------|------|
| 1 | `LoginOptions` 联合类型：`login(page, options?: LoginOptions | string)` | `packages/e2e-shared/src/Navigation.ts` |
| 2 | 默认 URL 改为 `http://localhost:4173`（DNS 双栈） | `packages/e2e-shared/src/Navigation.ts` |
| 3 | `waitForFunction(fn, undefined, { timeout })` | `packages/e2e-shared/src/Navigation.ts` |
| 4 | 新增 `waitForMenuLoaded()` 等待侧边栏菜单项出现 | `packages/e2e-shared/src/Navigation.ts` |
| 5 | `waitForList(timeoutMs = 30_000)` 可配置超时 | `packages/e2e-shared/src/CrudListPage.ts` |
| 6 | `formField` 改为 `input[name], textarea[name], select[name]` | `packages/e2e-shared/src/AmisAdapter.ts` |
| 7 | Navigation 的 `login` 为主导出，MockAuthAdapter 改名 `mockLogin` | `packages/e2e-shared/src/index.ts`（同步更新 22 个 spec 文件） |
| 8 | 新增 `drawer()` 到 EngineAdapter 接口 + AmisAdapter/FluxAdapter 实现 | `packages/e2e-shared/src/types.ts`、`AmisAdapter.ts`、`FluxAdapter.ts` |
| 9 | 新增 `forceLocale()` 工具函数 | `packages/e2e-shared/src/Navigation.ts` |

### 第二层：AMIS 渲染（amis-react19 项目）

| # | 修复 | 文件 |
|---|------|------|
| 8a | 从 amis-core、amis-ui、amis 的 rollup config 删除 `normalizeEsmJsxRuntime()` | `packages/*/rollup.config.js` |
| 8b | `@rollup/plugin-typescript` v8 → v12.3.0 | `packages/*/package.json` |
| 8c | 添加 `declaration: true` 到所有 rollup config | `packages/*/rollup.config.js` |
| 8d | build 脚本增加声明复制（`.rollup.cache/` → `esm/`、`lib/`） | `scripts/build-amis-for-nop-chaos.mjs` |

### 第三层：nop-entropy-e2e 自身

| # | 修复 |
|---|------|
| 9 | 替换 spec 中的 `.cxd-Drawer` → `engine.drawer()`、`.ant-table` → `engine.table()` |
| 10 | 修复 `type-hierarchy.po.ts`、`symbol-search.po.ts`：`super(page, engine)` + 移除无效 `override` |
| 11 | tsconfig.base.json: `lib: ["ES2022", "DOM", "DOM.Iterable"]` |
| 12 | tsconfig: `target: "ES2022"`（与 nop-chaos-next 一致）|

## Tests

- `packages/e2e-shared/src/debug.test.ts` — 5 个 `formatReport` 测试
- `packages/amis-react19/__tests__/renderers/Form/TabsRendering.test.tsx` — Tabs 渲染验证（`tab.tab` 和 `tab.body` 两种格式）
- nop-auth-e2e: 25/38 通过（Tabs 渲染 ✅、登录 ✅、RPC 15/15 ✅、导航 ✅、角色创建 ✅）
- nop-chaos-next 本项目: typecheck 28/28, test 28/28（898 tests 全绿）
- nop-entropy-e2e 4 包: typecheck 全部通过

## Affected Files

### nop-chaos-next（e2e-shared 共享库）

- `packages/e2e-shared/src/Navigation.ts` — login 签名、IPv6、waitForAuthenticated、waitForMenuLoaded
- `packages/e2e-shared/src/index.ts` — login/mockLogin 导出
- `packages/e2e-shared/src/CrudListPage.ts` — waitForList 超时
- `packages/e2e-shared/src/AmisAdapter.ts` — formField 支持 textarea/select
- `packages/e2e-shared/src/FluxAdapter.ts` — drawer()
- `packages/e2e-shared/src/types.ts` — EngineAdapter.drawer()
- `packages/e2e-shared/src/debug.ts` — 诊断工具（80 行新增）
- `tests/e2e/*.spec.ts` — 22 个文件 `mockLogin as login`

### amis-react19

- `packages/amis-core/rollup.config.js` — 删除 normalizeEsmJsxRuntime + declaration: true
- `packages/amis-ui/rollup.config.js` — 同上
- `packages/amis/rollup.config.js` — 同上
- `packages/amis-formula/rollup.config.js` — declaration: true
- `scripts/build-amis-for-nop-chaos.mjs` — 声明复制步骤

### nop-entropy-e2e（外部项目）

- `tsconfig.base.json` — ES2022 + DOM.Iterable
- `packages/e2e-shared/tsconfig.json` — 同步 lib 配置
- `packages/nop-code-e2e/tests/page-objects/*.po.ts` — BasePage API 适配
- `packages/nop-auth-e2e/tests/auth-role.spec.ts` — 引擎抽象
- `packages/nop-auth-e2e/tests/auth-login.spec.ts` — 引擎抽象
- `packages/nop-auth-e2e/tests/auth-resource.spec.ts` — 引擎抽象

### 文档

- `docs/bugs/46-amis-tabs-content-not-rendering-under-react19-jsx-runtime.md` — Tabs 渲染 bug
- `docs/testing/02-cross-project-e2e-debugging.md` — 跨项目调试指南
- `docs/testing/01-e2e-developer-guide.md` — 调试工具引用
- `docs/references/build-guide.md` — tgz 版本更新
- `docs/logs/2026/07-21.md`、`docs/logs/2026/07-22.md`

## Notes For Future Refactors

- e2e-shared 的 sync 脚本不应覆盖 Navigation.ts 等含接口签名的文件——需在 sync 逻辑中保持下游的 options API 兼容
- Vite 8/rolldown 对 `jsx()` 的处理与 Jest/SWC 不同——必须通过生产构建验证 JSX 编译结果
- `key + spread` 模式在 React 19 的 jsx-runtime 中需要 `createElement` 降级——任何后处理转换都可能导致子渲染失效
- 升级 `@rollup/plugin-typescript` 到 v12+ 后需处理 `.d.ts` 跨包路径问题——当前通过 `.rollup.cache/` 复制方案解决
