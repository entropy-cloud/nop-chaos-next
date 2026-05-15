# 对抗性审查 - 第 2 轮：Plugin/Extension Demo 质量

## 发现来源视角
新人开发者 + 契约考古学家 — 如果我第一天加入这个项目，什么会让我困惑或犯错？

## 高严重度发现

### D1. 两个 demo 均完全缺少测试
- **文件**: 整个 `examples/plugin-demo/` 和 `examples/extension-demo/`
- **问题**: 零个 `.test.ts` 文件。没有为 plugin/extension 开发者演示测试模式。违反 AGENTS.md 中的错误修复测试覆盖规则。
- **影响**: 开发者复制这些 demo 时不会继承任何测试基础设施。
- **信心**: 确定

### D2. extension-demo 缺少 `lucide-react` 依赖声明
- **文件**: `examples/extension-demo/package.json:14-33`
- **问题**: 所有三个页面从 `lucide-react` 导入，但既不在 dependencies 也不在 peerDependencies 中。通过工作区提升解析，当扩展移出 monorepo 时导致破坏。
- **信心**: 确定

### D3. plugin-demo 无 locale 文件但使用 `t()` 翻译
- **文件**: `examples/plugin-demo/src/index.tsx:10`
- **问题**: ~25 处 `t('plugins.defaultReportTitle')` 等调用，但不存在 `public/locales/` 或 `src/locales/` 目录。翻译回退为键名字符串。
- **信心**: 确定

### D4. ExtensionLoginPage 硬编码演示密码 123456
- **文件**: `examples/extension-demo/src/pages/ExtensionLoginPage.tsx:105-106`
- **问题**: `if (password !== '123456')`。即使是演示，硬编码密码也是最不安全的反模式，可能被复制到真实代码。
- **信心**: 确定

### D5. ExtensionLoginPage 硬编码演示 token
- **文件**: `examples/extension-demo/src/pages/ExtensionLoginPage.tsx:69`
- **问题**: `token: 'extension-demo-token'` — 硬编码字符串 token。
- **信心**: 确定

### D6. extension-demo 页面全部硬编码英文
- **文件**: 
  - `ExtensionBuiltinPage.tsx` — 零处 `t()` 调用
  - `ExtensionNotFoundPage.tsx` — 零处 `t()` 调用
- **问题**: 尽管 `public/locales/en-US/translation.json` 定义了键，但未使用。ESLint i18n 规则排除示例目录。
- **信心**: 确定

### D7. plugin-dev-guide.md 文档严重过时
- **文件**: `docs/examples/plugin-dev-guide.md:72-82,90-107`
- **问题**: 目录结构列出不存在的文件/目录（`src/components/`、`src/hooks/` 等均不存在）；版本号过时（`i18next: "^25"` vs 实际 `"26.0.5"`；`"react": "^18"` vs 实际 React 19）。
- **信心**: 确定

### D8. ExtensionLoginPage 不安全的类型转换
- **文件**: `examples/extension-demo/src/pages/ExtensionLoginPage.tsx:55`
- **问题**: `bridge.stores.authStore.getState() as unknown as Partial<AuthStoreWithActions>` — 完全绕过 TypeScript 类型检查。
- **信心**: 确定

## 中严重度发现

### D9. plugin-demo 零处 `import type` 语句
- **文件**: `examples/plugin-demo/src/index.tsx`
- **问题**: 全部导入无 `import type`，违反 AGENTS.md 中要求对类型使用 `import type` 的模式。
- **信心**: 确定

### D10. sync-to-host.mjs 硬编码路径
- **文件**: `examples/plugin-demo/scripts/sync-to-host.mjs:7`
- **问题**: `../../../apps/main/public/plugins/plugin-demo.system.js` 路径在 monorepo 外运行时立即失败。
- **信心**: 确定

### D11. 工作区发现不到 vitest.config.ts
- **文件**: `vitest.workspace.ts:6`
- **问题**: 配置了 `'examples/*/vitest.config.ts'`，但两个 demo 都没有 vitest.config.ts。`--passWithNoTests` 掩盖了零测试的问题。
- **信心**: 确定

### D12. extension-demo 中运行时依赖仅出现在 devDependencies
- **文件**: `examples/extension-demo/package.json:14-33`
- **问题**: `react-router-dom` 和 `react`/`react-dom` 只出现在 devDependencies 中，不在 peerDependencies 中。
- **信心**: 确定

### D13. ESLint i18n 规则排除了示例目录
- **文件**: `eslint.config.js:190-195`
- **问题**: `i18next/no-literal-string` 规则仅对 `packages/`、`apps/`、`flux-lib/` 启用。示例不受约束，硬编码字符串永远不会被标记。
- **信心**: 确定

### D14. Build-with-rollup 的 SystemJS 外部模块与 sharedModules 不完全匹配
- **文件**: `examples/plugin-demo/scripts/build-with-rollup.mjs:17-32`
- **问题**: `recharts` 被标记为外部，但在 `sharedModules.ts` 中是异步加载。如果 plugin 在 recharts 注册前加载，存在竞态条件。
- **信心**: 很可能

## 低严重度发现
- extension-demo 中多种 SVG 加载策略不一致（`new URL()` vs 直接 ESM import）
- ExtensionBuiltinPage 重复 UI 模式
- vite.config.ts 中硬编码 CORS origin
- extension-demo 缺少 `react-dom` 作为 peer dependency
- `SupportedLanguages` vs `languages` 无弃用标记

## 总结
plugin-demo 和 extension-demo 作为主要参考实现，但存在显著质量问题：零测试、严重缺失依赖、i18n 不存在、安全性反模式。最值得注意的是 hardcoded 密码（123456）和 token 字符串，以及文档严重过时。新人开发者复制 demo 会继承这些模式。
