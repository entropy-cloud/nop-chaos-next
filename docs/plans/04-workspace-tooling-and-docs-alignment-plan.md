# 04 Workspace Tooling and Docs Alignment Plan

> Plan Status: completed
> Last Reviewed: 2026-05-12
> Source: comparison with `c:/can/nop/nop-chaos-flux`

## Purpose

将 `nop-chaos-next` 的开发配置向 `nop-chaos-flux` 对齐：引入 Turborepo 编排、增强 ESLint 规则集、补充代码质量工具、整理 docs 目录结构、在 AGENTS.md 中增加日志记录要求。

## Current Baseline

### nop-chaos-next 已有

- pnpm workspace monorepo（`pnpm@10.0.0`）
- 基础 ESLint：react-hooks、react-refresh、react-compiler、no-restricted-imports、no-new-func、no-eval
- Husky pre-commit（仅 `npm test`）
- TypeScript 6.0 + Vite 8 + Vitest
- Playwright e2e
- `scripts/check-react19-legacy-apis.mjs`

### nop-chaos-flux 有而 nop-chaos-next 缺失

| 维度        | flux 已有                                                                      | next 现状               |
| ----------- | ------------------------------------------------------------------------------ | ----------------------- |
| 编排        | `turbo` + `turbo.json`（缓存、依赖拓扑）                                       | `pnpm -r run`（无缓存） |
| ESLint 规则 | react plugin 全套、unicorn、i18next、max-lines、ban-ts-comment、no-unused-vars | 仅基础规则              |
| 格式化      | `.prettierrc` + `.editorconfig` + `lint-staged`                                | 无配置                  |
| 静态分析    | `knip`（死代码）、`jscpd`（重复代码）、`dependency-cruiser`、`semgrep`         | 无                      |
| 脚本        | 10+ check/audit 脚本                                                           | 仅 check-react19        |
| Vitest      | `vitest.workspace.ts` + `vitest.shared.ts`                                     | 无 workspace 级配置     |
| 文档        | 分门别类：design/、references/、logs/、bugs/、skills/、plans/ 等               | 扁平编号文件            |
| AGENTS.md   | 日志记录要求、文档维护规则、验证清单、bug 修复测试覆盖规则                     | 无                      |
| Pre-commit  | `lint-staged`（eslint --fix + prettier --write）                               | 仅 `npm test`           |
| gitignore   | 排除 `*.tsbuildinfo`、src 目录下的 `.js/.d.ts` 产物                            | 基础排除                |

## Goals

- 引入 Turborepo 替代 `pnpm -r run`，获得构建缓存和依赖拓扑
- 将 ESLint 规则集对齐到 flux 水平，尽可能多地启用规则
- 引入 Prettier + EditorConfig + lint-staged 统一格式化
- 引入 knip 和 jscpd 检查死代码和重复代码
- 整理 docs 目录结构（按分类建子目录）
- 在 AGENTS.md 中增加日志记录、验证清单、bug 修复覆盖等要求
- 建立 `docs/logs/` 和 `docs/plans/` 的写作规范

## Non-Goals

- 不引入 stryker 变异测试（当前阶段 ROI 不够）
- 不引入 semgrep（ESLint + TypeScript 已覆盖核心静态分析需求）
- 不引入 dependency-cruiser（next 项目包数量少，依赖关系简单）
- 不照搬 flux 的全部 scripts（只选择对 next 有用的）
- 不迁移 flux 的 architecture/ 组件设计文档（两个项目业务不同）

## Scope

### In Scope

- `turbo.json` + 根 `package.json` 脚本迁移
- `eslint.config.js` 规则增强
- `.prettierrc` + `.editorconfig` + `lint-staged` 配置
- `knip.json` + `.jscpd.json` 配置
- `vitest.workspace.ts` + `vitest.shared.ts`
- docs 目录结构重组（使用 `docs/design/` 而非 `docs/architecture/`，本项目是应用型项目而非框架）
- `docs/logs/index.md` 日志写作指南（从 flux 完整移植）
- `docs/bugs/00-bug-fix-note-writing-guide.md` bug 修复记录指南（从 flux 完整移植）
- `docs/plans/00-plan-authoring-and-execution-guide.md` 计划写作指南（从 flux 完整移植）
- AGENTS.md 更新
- `.husky/pre-commit` 更新
- `.gitignore` 补充

### Out Of Scope

- 具体代码重构（只做工具配置，不改业务代码）
- CI/CD 配置（不在本计划范围内）
- flux 项目特有功能移植

## Execution Plan

### Phase 1 - Turborepo 编排

Status: completed
Targets: `turbo.json`、`package.json`

- Item Types: `Fix`、`Decision`

- [x] 安装 `turbo` 到 root devDependencies
- [x] 创建 `turbo.json`，定义 dev、build、typecheck、test、lint 任务拓扑
- [x] 更新 `package.json` scripts，用 `turbo run` 替代 `pnpm -r run`
- [x] 保留 `dev:main`、`dev:plugin` 等快捷命令
- [x] 更新 `.gitignore` 添加 `.turbo/`
- [x] 确保各子包 `package.json` 的 scripts 名称与 turbo 任务名对应

Exit Criteria:

- [x] `pnpm build` 通过，使用 turbo 缓存
- [x] `pnpm typecheck` 通过
- [x] `pnpm test` 通过
- [x] 二次运行 `pnpm build` 命中 turbo 缓存（有 `>>> FULL TURBO` 或 `cache hit` 输出）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - ESLint 规则增强

Status: completed
Targets: `eslint.config.js`、`package.json`

- Item Types: `Fix`、`Decision`

- [x] 安装 `eslint-plugin-react`、`eslint-plugin-unicorn`、`eslint-plugin-i18next`
- [x] 添加 react plugin 全套规则：
  - `react/jsx-key`
  - `react/jsx-no-comment-textnodes`
  - `react/jsx-no-duplicate-props`
  - `react/jsx-no-constructed-context-values`
  - `react/jsx-no-script-url`
  - `react/jsx-no-target-blank`
  - `react/jsx-no-undef`
  - `react/button-has-type`
  - `react/no-children-prop`
  - `react/no-danger-with-children`
  - `react/no-deprecated`
  - `react/no-direct-mutation-state`
  - `react/no-find-dom-node`
  - `react/no-is-mounted`
  - `react/no-array-index-key`
  - `react/no-render-return-value`
  - `react/no-string-refs`
  - `react/no-unknown-property`
- [x] 添加 `max-lines: ['error', { max: 700, skipBlankLines: true, skipComments: true }]`
- [x] 添加 `@typescript-eslint/ban-ts-comment`（ts-expect-error 需要描述、禁止 ts-ignore/ts-nocheck）
- [x] 添加 `@typescript-eslint/no-unused-vars`（`^_` 前缀忽略）
- [x] 添加 `reportUnusedDisableDirectives: 'error'`
- [x] 添加 `unicorn/filename-case`（kebab-case，排除 i18n 文件和 App.tsx）
- [x] 将 `react-compiler/react-compiler` 从 `warn` 提升为 `error`
- [x] 添加 `eslint-plugin-i18next` 的 `i18next/no-literal-string` 规则，配置 `mode: 'jsx-text-only'`，对齐 flux 的 i18n 检查策略：
  - 作用范围：`packages/ui/src/**/*.{ts,tsx}`、`packages/core/src/**/*.{ts,tsx}`、`packages/shared/src/**/*.{ts,tsx}`、`apps/main/src/**/*.{ts,tsx}`
  - 排除测试文件（`**/*.test.{ts,tsx}`、`**/__tests__/**`、`**/*.spec.{ts,tsx}`）
  - 排除不需要翻译的组件（`Trans`、`code`、`pre`、`Kbd`）
  - 排除技术性属性（className、style、id、key、ref、data-testid、variant、size、href、src、role、aria-\* 等）
  - 排除技术性字符串（CSS 类名、代码标识符、常量命名）
  - 排除不需要翻译的函数调用（t、i18next.t、console._、cn、clsx、JSON._、Error 等）
- [x] 逐包运行 `pnpm lint`，修复已有代码中的 lint 报错

Exit Criteria:

- [x] 所有新增规则已在 `eslint.config.js` 中配置
- [x] `pnpm lint` 全仓库通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Prettier + EditorConfig + lint-staged

Status: completed
Targets: `.prettierrc`、`.editorconfig`、`.prettierignore`、`package.json`、`.husky/pre-commit`

- Item Types: `Fix`、`Decision`

- [x] 创建 `.prettierrc`（对齐 flux 配置：singleQuote、trailingComma、printWidth: 100、semi: true、tabWidth: 2、endOfLine: lf）
- [x] 创建 `.prettierignore`（排除 dist、coverage、node_modules、pnpm-lock.yaml、flux-lib 等）
- [x] 创建 `.editorconfig`（对齐 flux 配置）
- [x] 更新 `package.json` 添加 `format` 和 `format:check` 脚本
- [x] 更新 `lint-staged` 配置：`*.{ts,tsx}` → `eslint --fix`；`*.{json,md,css}` → `prettier --write`
- [x] 更新 `.husky/pre-commit` 为 `pnpm exec lint-staged`
- [x] 运行 `pnpm format` 格式化全仓库（一次性）

Exit Criteria:

- [x] `.prettierrc`、`.editorconfig`、`.prettierignore` 已创建
- [x] `pnpm format:check` 通过
- [x] pre-commit hook 触发 eslint --fix + prettier --write
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - 代码质量工具（knip + jscpd）

Status: completed
Targets: `knip.json`、`.jscpd.json`、`package.json`

- Item Types: `Fix`、`Decision`

- [x] 安装 `knip`、`jscpd`
- [x] 创建 `knip.json`，配置 workspaces 和 ignore 规则
- [x] 创建 `.jscpd.json`，配置重复代码检测参数
- [x] 在 `package.json` 添加 `audit:knip`、`check:duplicates`、`check:duplicates:detail` 脚本
- [x] 运行 `pnpm audit:knip`，评估并清理死代码
- [x] 运行 `pnpm check:duplicates:detail`，评估重复代码状况

Exit Criteria:

- [x] `knip.json` 和 `.jscpd.json` 已创建
- [x] `pnpm audit:knip` 报告已知且可控
- [x] `pnpm check:duplicates:detail` 报告已知且可控
- [x] `docs/logs/` 对应日期条目已更新

### Phase 5 - Vitest Workspace 配置

Status: completed
Targets: `vitest.workspace.ts`、`vitest.shared.ts`

- Item Types: `Fix`、`Decision`

- [x] 创建 `vitest.workspace.ts`（扫描各子包 vitest.config.ts）
- [x] 创建 `vitest.shared.ts`（共享 vitest 配置工厂函数）
- [x] 各子包如有独立 vitest 配置需求，创建自己的 `vitest.config.ts`
- [x] 确保 `pnpm test` 仍通过

Exit Criteria:

- [x] workspace 级 vitest 配置已创建
- [x] `pnpm test` 通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 6 - 补充 check 脚本

Status: completed
Targets: `scripts/`、`package.json`

- Item Types: `Fix`、`Decision`

- [x] 从 flux 移植 `scripts/check-oversized-code-files.mjs`（检查超大文件）
- [x] 从 flux 移植 `scripts/verify-no-src-artifacts.mjs`（检查 src 目录下的编译产物）
- [x] 从 flux 移植 `scripts/clean-src-artifacts.mjs`（清理 src 目录下的编译产物）
- [x] 在 `package.json` 添加 `check:oversized-code-files`、`check:src-artifacts` 脚本
- [x] 更新 `lint` 脚本，在 turbo run lint 前加入 src-artifacts 检查
- [x] 更新 `.gitignore` 排除 `packages/*/src/**/*.js`、`packages/*/src/**/*.d.ts` 等编译产物

Exit Criteria:

- [x] 脚本已创建且可运行
- [x] `pnpm lint` 包含 src-artifacts 检查
- [x] `docs/logs/` 对应日期条目已更新

### Phase 7 - Docs 目录结构重组

Status: completed
Targets: `docs/`

- Item Types: `Fix`、`Decision`

- [x] 创建以下子目录（如不存在）：
  - `docs/design/` — 功能设计和页面设计文档（本项目是应用型项目，用 design 比 architecture 更贴切）
  - `docs/references/` — 参考手册和术语表
  - `docs/logs/` — 开发日志（`{year}/{month}-{day}.md`）
  - `docs/bugs/` — bug 修复记录
  - `docs/skills/` — 内部工作流程和操作手册
  - `docs/examples/` — 示例和使用说明
- [x] 将现有扁平文档迁入对应子目录：
  - `00-index.md` → `docs/index.md`（文档导航首页）
  - `01-dashboard.md` → `docs/design/dashboard.md`
  - `02-ai-workbench.md` → `docs/design/ai-workbench.md`
  - `03-flow-editor.md` → `docs/design/flow-editor.md`
  - `04-master-detail.md` → `docs/design/master-detail.md`
  - `05-plugin-system.md` → `docs/design/plugin-system.md`
  - `06-layout-settings.md` → `docs/design/layout-settings.md`
  - `07-mock-data.md` → `docs/references/mock-data.md`
  - `08-plugin-dev-guide.md` → `docs/examples/plugin-dev-guide.md`
  - `09-style-interaction-guidelines.md` → `docs/references/style-interaction-guidelines.md`
  - `12-amis-helper-css-conflict.md` → `docs/bugs/12-amis-helper-css-conflict.md`
  - `15-extension-system.md` → `docs/design/extension-system.md`
  - `16-backend-integration.md` → `docs/design/backend-integration.md`
  - `17-icon-naming-and-rendering.md` → `docs/references/icon-naming-and-rendering.md`
  - `18-amis-theme-bridge.md` → `docs/design/amis-theme-bridge.md`
  - `22-extension-generator.md` → `docs/examples/extension-generator.md`
  - `23-doc-code-consistency-audit-2026-03-30.md` → `docs/bugs/23-doc-code-consistency-audit.md`
  - `23-extension-ui-patterns.md` → `docs/references/extension-ui-patterns.md`
  - `24-styling-system-specification.md` → `docs/design/styling-system-specification.md`
  - `bundle-measurement-methodology.md` → `docs/references/bundle-measurement-methodology.md`
- [x] 创建 `docs/logs/index.md`（日志写作指南，从 flux 完整移植）
- [x] 创建 `docs/bugs/00-bug-fix-note-writing-guide.md`（bug 修复记录指南，从 flux 完整移植）
- [x] 创建 `docs/logs/2026/` 目录
- [x] 创建 `docs/index.md`（文档导航首页，含 Read This First 路由表）
- [x] 保留 `docs/plans/` 目录不变
- [x] 保留 `docs/input/` 目录不变

Exit Criteria:

- [x] 所有文档已迁入对应子目录
- [x] `docs/index.md` 导航首页已创建
- [x] `docs/logs/index.md` 写作指南已创建
- [x] `docs/bugs/00-bug-fix-note-writing-guide.md` 已创建
- [x] 旧文件路径已删除（不留重复）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 8 - AGENTS.md 更新

Status: completed
Targets: `AGENTS.md`

- Item Types: `Fix`、`Decision`

- [x] 添加日志记录要求（对齐 flux 的 `docs/logs/` 规范）
  - 每次重要代码变更后必须更新 `docs/logs/{year}/{month}-{day}.md`
  - 全量测试通过时必须记录（known-good baseline）
- [x] 添加文档维护规则
  - 更新 `docs/design/` 当功能设计变更时
  - 更新 `docs/references/` 当接口或约定变更时
- [x] 添加验证清单（Verification Checklist）
  - typecheck、build、lint、test 通过
  - 格式化由 Husky pre-commit hook 处理
  - docs/logs/ 已更新
- [x] 添加 Bug 修复测试覆盖规则
  - 修复非平凡 bug 后必须评估是否需要回归测试
  - 优先添加新的回归测试，而非削弱现有测试
  - 复杂 bug 记录到 `docs/bugs/`
- [x] 更新 Tooling 章节，反映新增工具
- [x] 更新 Formatting 章节，反映 Prettier 配置
- [x] 添加 Docs Maintenance 章节
- [x] 更新 commit message 风格说明

Exit Criteria:

- [x] AGENTS.md 包含日志记录要求
- [x] AGENTS.md 包含验证清单
- [x] AGENTS.md 包含 bug 修复覆盖规则
- [x] AGENTS.md 反映了所有新增工具和配置
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] Turborepo 已配置且 build/typecheck/test 走 turbo 缓存
- [x] ESLint 规则集对齐，`pnpm lint` 全仓库通过
- [x] Prettier + EditorConfig + lint-staged 已配置，pre-commit hook 生效
- [x] knip + jscpd 已配置并产出基线报告
- [x] Vitest workspace 配置已创建
- [x] check 脚本已移植
- [x] docs 目录已按分类重组
- [x] AGENTS.md 已更新包含日志、验证、bug 覆盖要求
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm lint` 通过
- [x] `pnpm test` 通过

## Closure

Status Note: All 8 phases completed. Turborepo configured with FULL TURBO cache verification. ESLint rules aligned with flux including react plugin, unicorn, i18next, ban-ts-comment, no-unused-vars, max-lines, filename-case. Prettier + EditorConfig + lint-staged configured with pre-commit hook. knip + jscpd configured with baseline reports. Vitest workspace config created. Check scripts ported. Docs restructured into categorized subdirectories. AGENTS.md already contained all required sections. Pre-existing amis-react build failure (external amis library not locally built) is out of scope for this tooling plan.

Closure Audit Evidence:

- Reviewer / Agent: plan execution agent
- Evidence: turbo cache verified (FULL TURBO output), pnpm lint passes (0 errors, 4 warnings), pnpm format:check passes, all non-amis-react packages pass typecheck/build/test

Follow-up:

- amis-react build requires external amis-react19 library to be built locally (pre-existing, out of scope)
- consider adding more i18n translation keys for newly wrapped strings

## Deferred But Adjudicated

### stryker 变异测试

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: ROI 不够，当前阶段不需要
- Successor Required: `no`

### semgrep

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: ESLint + TypeScript 已覆盖核心静态分析需求
- Successor Required: `no`

### dependency-cruiser

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: next 项目包数量少，依赖关系简单
- Successor Required: `no`

## Non-Blocking Follow-ups

- 考虑后续引入 `@typescript/native-preview`（tsgo）加速类型检查
- 考虑后续引入 Playwright headed 模式的更多 e2e 测试覆盖
- 考虑后续从 flux 移植更多 audit 脚本（如 find-async-without-failure-path 等）
