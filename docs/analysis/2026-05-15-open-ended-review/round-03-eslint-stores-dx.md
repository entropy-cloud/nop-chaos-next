# 对抗性审查 - 第 3 轮：ESLint 配置、Store 模式、DX

## 发现来源视角
新人开发者 + 生命周期追踪者

## 高严重度发现

### E1. `@typescript-eslint/no-explicit-any` 设为 `off` 而非 `warn`
- **文件**: `eslint.config.js:92`
- **问题**: `@typescript-eslint/no-explicit-any: 'off'` 完全关闭了 any 检查。之前的深度审计建议启用为 `warn`。虽然当前代码库零 any，但如果未来有人引入 any，ESLint 不会警告。
- **影响**: 降低了对 any 的防护。`@typescript-eslint/strict` 的推荐配置通常包含此规则。
- **信心**: 确定

### E2. 模块级 `didBootstrapAuth` flag 在 HMR 中不重置
- **文件**: `apps/main/src/hooks/useAuth.ts:5`
- **问题**: `let didBootstrapAuth = false;` 是模块级变量。在 Vite HMR 中，模块可能被部分重新执行但模块级变量可能保持旧值。如果 auth bootstrap 期间发生 HMR 更新，`didBootstrapAuth` 保持 `true`，bootstrap 永远不会再次执行。
- **同类**: `apps/main/src/App.tsx:16` 的 `didRegisterSharedModules` 也有相同问题。
- **影响**: 开发模式下 HMR 后可能进入不一致状态。
- **信心**: 很可能（生产无影响，仅影响 DX）

### E3. `lint-staged` 未对 `.ts/.tsx` 运行 Prettier
- **文件**: `package.json:113-116`
- **问题**: `lint-staged` 配置为 `*.{ts,tsx}` 运行 `eslint --fix`，但不对 TS 文件运行 `prettier`。Prettier 仅对 `*.{json,md,css}` 运行。ESLint 集成了 `eslint-config-prettier`（禁用与 Prettier 冲突的规则），但格式修复依赖 `eslint --fix` 本身不能处理所有 Prettier 格式问题。
- **影响**: 如果开发者不手动运行 `pnpm format`，TS 文件的格式问题可能通过 pre-commit 钩子进入代码库。
- **信心**: 很可能

## 中严重度发现

### E4. i18n 规则仅覆盖部分目录，flux-lib 被排除
- **文件**: `eslint.config.js:190-195`
- **问题**: `i18next/no-literal-string` 规则仅覆盖 `packages/{ui,core,shared}/**` 和 `apps/main/src/**`。`flux-lib/` 目录完全被排除。flux-lib 的组件中可能有硬编码英文字符串（如 pagination 默认 "Previous"/"Next"），但 ESLint 不会捕获。
- **信心**: 确定

### E5. `react-compiler` 作为 `error` 级别可能过于激进
- **文件**: `eslint.config.js:91`
- **问题**: `'react-compiler/react-compiler': 'error'` 设为 error 级别。flux-lib 中已有两处 `eslint-disable-next-line react-compiler/react-compiler`（`sidebar-context.tsx:61`, `use-dialog-drag.ts:163`），表明 React Compiler 对某些模式产生误报。设为 `error` 意味着任何新的误报都会阻止 lint 通过。
- **信心**: 很可能

### E6. `react-hooks/set-state-in-effect` 通过全文件 disable 绕过
- **文件**: 
  - `apps/main/src/pages/ai-workbench/index.tsx:1` — 全文件禁用
  - `apps/main/src/pages/data-management/master-detail/[id]/index.tsx:1` — 全文件禁用
- **问题**: 这两个文件用 `/* eslint-disable */` 全文件禁用了 `react-hooks/set-state-in-effect` 规则。注释解释了原因，但全文件禁用意味着文件中其他潜在的违规也不会被捕获。
- **信心**: 确定

### E7. `useAuthBootstrap` 错误时仅设置状态，不清除 token
- **文件**: `apps/main/src/hooks/useAuth.ts:46-48`
- **问题**: `catch` 块设置 `bootstrapStatus: 'error'` 但不调用 `logout()` 或 `clearTokens()`。用户停留在错误状态，但如果刷新页面（从 storage 恢复 token），会再次尝试 bootstrap 同一个无效 token，再次失败。
- **对比**: 之前的深度审计记录了“静默登出”，但现在代码改为“静默错误状态”——两者都不理想。正确做法应是 toast 错误 + 清除 token + 重定向。
- **信心**: 确定

### E8. Turborepo `lint` 不声明 `dependsOn: ["^build"]`
- **文件**: `turbo.json:22-24`
- **问题**: `build` 和 `typecheck` 都声明 `dependsOn: ["^build"]`（先构建依赖包），但 `lint` 没有此声明。如果 lint 依赖生成的类型声明（例如 `dist/index.d.ts`），在 clean build 后 `pnpm lint` 可能先于依赖包构建完成。
- **信心**: 很可能

### E9. `markdown.tsx` 有 6 处 `react/no-array-index-key` 禁用
- **文件**: `apps/main/src/pages/ai-workbench/markdown.tsx`
- **问题**: 渲染 markdown 列表项和代码块时全部使用 `index` 作为 key 并禁用规则。如果 markdown 内容动态变化（在 AI streaming 中很可能），React 可能错误复用 DOM 节点。
- **信心**: 很可能

## 低严重度发现

### E10. 无 CI 配置文件
- 代码库中没有 `.github/workflows/` 或其他 CI 配置。所有检查（typecheck、lint、test）都依赖开发者本地运行或 pre-commit 钩子。

### E11. `useTabManagement` 的 `useMemo` 依赖列表过长
- **文件**: `apps/main/src/hooks/useTabManagement.ts:41`
- **问题**: 依赖数组 `[activate, activePath, close, closeAll, closeOthers, navigate, open, tabs]` — 8 个依赖项。Zustand selectors 返回的函数引用（`activate`, `close` 等）应该是稳定的，但如果任何变化，整个 memo 失效。

### E12. authStore.test.ts 仅测试 store，不测试 persist 行为
- **文件**: `apps/main/src/store/authStore.test.ts`
- **问题**: 84 行的测试文件仅测试 store actions，不测试 `partialize` 和 `persist` 行为。`partialize` 逻辑（是否持久化 refreshToken）是安全关键路径但未测试。

## 总结
| 严重度 | 数量 | 关键领域 |
|--------|------|----------|
| 高 | 3 | ESLint any 检查关闭、HMR flag 不重置、lint-staged 遗漏 |
| 中 | 6 | i18n 规则覆盖不足、React Compiler 过严、auth 错误处理、Turborepo lint 依赖、全文件 eslint-disable |
| 低 | 3 | 无 CI、依赖列表过长、测试覆盖不完整 |
