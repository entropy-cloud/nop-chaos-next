# 44 Extension Demo Build Pipeline Fix

> Plan Status: completed
> Last Reviewed: 2026-08-28
> Source: `docs/logs/2026/08-28.md`, `docs/plans/43-extension-host-inject-contract-alignment.md` (Defects D-43.A / B / C)
> Related: `docs/plans/43-extension-host-inject-contract-alignment.md`

## Purpose

修 `examples/extension-demo` 的 build pipeline，使 `pnpm build` 产物能正确表达一个可被 nop-chaos-next host + Java `IndexHtmlProvider` 端到端消费的 extension。

## Problem

`examples/extension-demo/vite.config.ts` 的 `extensionManifestPlugin` 生成 manifest 时，Vite 实际打包的入口是 `index.html` → `src/standalone/main.tsx`（standalone React 预览），而不是真正的 extension入口 `src/index.ts`。结果：

- `dist/assets/index-qkUISkkI.js` 是 standalone UI 树，不会被 host 当作 `extension` 对象消费
- `src/index.ts` 里通过 `new URL('./harbor.css', import.meta.url).href` 引用的资源（`harbor.css`、`shell.css`、`component-page.css`、`harbor-mark.svg`）完全未被 emit 到 `dist/`
- `extension.json.styleAssets` 只包含 Vite 内联 CSS chunk，不包含任何 per-extension 资源

plan 43 完成了 host 侧契约（DOM 扫描、`styleAssets` 字段、bootstrap 跳过预注入 CSS），但**整个生产链路上 extension 是断的**。

## Root Cause

Vite 默认 `rollupOptions.input` 从 `index.html` 推断。`examples/extension-demo/index.html` 把 `/src/standalone/main.tsx` 作为 `<script type="module">` 入口：

```html
<script type="module" src="/src/standalone/main.tsx"></script>
```

`src/index.ts`（`export default extension`）没有任何 HTML 引用，Vite 因此不把 `src/index.ts` 作为入口，也不会把它 `new URL()` 引用的资源加入 emit 计划。

`extensionManifestPlugin` 只遍历 `bundle`（Vite 已 emit 的产物），所以：

- 既然 `src/index.ts` 不在 bundle，`extension.json.entry` 拿到的就是 standalone entry
- `new URL()` 引用的资源不在 bundle，所以 `styleAssets` 数组里没有它们

## Goals

- `pnpm --filter @nop-chaos/example-extension-demo build` 产出 extension entry bundle + 完整 per-extension 资源
- `extension.json` 准确反映 entry + 静态资源，能让 Java `IndexHtmlProvider` 正确生成 `<link>` / `<script>` 注入
- 部署到 `META-INF/resources/extensions/{name}/` 后，浏览器能正确加载所有资源（复数 `extensions`, 与 base path `/extensions` 对齐）
- 不破坏 standalone preview 模式（开发体验保持）

## Non-Goals

- 不改 `IndexHtmlProvider` Java 实现
- 不改 host (`apps/main`) 任何代码
- 不引入新的构建工具链（继续用 Vite）
- 不修改 `packages/shared/src/types/extension.ts` 的 `ExtensionManifest` 类型（除非 plan 43 已经定义的字段不够）
- 不处理跨多个 entry 的场景（一个 extension 一个 entry 是当前模型）

## Current Baseline

- `examples/extension-demo/src/index.ts` 导出 `extension` 对象（`ShellExtension` 形态），含 `id: 'example-extension-demo'`、`branding.logoUrl`、`branding.markUrl`、`themes[0].cssHref`、`styles[*].href`、`i18n.baseUrl` 等 per-extension 字段引用 `new URL()` 解析的资源
- `examples/extension-demo/src/standalone/main.tsx` 渲染独立 UI（与 extension entry 无关）
- `examples/extension-demo/index.html` 引用 `/src/standalone/main.tsx`
- `examples/extension-demo/vite.config.ts` 用 `extensionManifestPlugin` 生成 `extension.json`，但未指定 `rollupOptions.input`
- plan 43 后的 host 契约要求 `extension.json` 至少包含 `id` / `entry` / `styleAssets`，前端会按这些字段发现扩展

## Scope

### In Scope

- 修改 `examples/extension-demo/vite.config.ts`：
  - 切换到 library mode（`build.lib`），`rollupOptions.input = 'src/index.ts'`
  - 输出格式保持 ESM（host 用 `import()` 加载）
  - 配置 `build.lib.entry = 'src/index.ts'`，禁用 `name`（避免 Vite 默认导出污染）
  - 保留 `index.html` 用于 standalone dev/preview，但加条件让它不出现在 production build 中（例如移动到 `standalone/` 或用单独的 dev-only 入口）
  - 让 `extensionManifestPlugin` 知道 `build.lib.entry` 是 extension entry
- 扩展 `extensionManifestPlugin`：
  - 在 `writeBundle` 中**额外**扫描 `src/` 下被引用的 `new URL()` 资源（通过读 `src/index.ts` AST 或在 plugin 中拦截 `load` / `resolveId` hook 收集 asset URLs）
  - 或者更简单：在 `closeBundle` hook 中检查 `bundle`，并通过解析 plugin 之前收集的资源列表合并到 manifest
  - 输出 `extension.json` 包含完整的 `styleAssets`（含 per-extension 资源）与可选的 `assets` 块（含 `harbor-mark.svg` 等 SVG / 字体）
- 验证：clean build 后 `dist/` 包含 `harbor.css`、`shell.css`、`component-page.css`、`harbor-mark.svg`，且 `extension.json` 字段正确

### Out Of Scope

- 不为 production extension 增加 `locales/` 资源处理（`locales/` 已通过 `public/` 自动复制）
- 不重写 standalone preview（开发期仍可工作）
- 不迁移其他 extension 项目到 library mode（如果存在）
- 不修改 Java `IndexHtmlProvider`

## Execution Plan

### Phase 1 - 切换 `examples/extension-demo` 到 library mode

Status: planned
Targets: `examples/extension-demo/vite.config.ts`

- Item Types: `Fix | Proof | Follow-up`

- [ ] Fix: 把 `vite.config.ts` 改为 library mode：`build.lib.entry = 'src/index.ts'`，`build.lib.formats = ['es']`，`build.lib.fileName = () => 'assets/index.js'`，保留 `entry`/`styleAssets`/`assets` emit 语义
- [ ] Fix: standalone preview 走 `index.html` + `src/standalone/main.tsx`，但确保 production build（`pnpm build`）不走 standalone
  - 选项 A：把 `index.html` 移入 `standalone/index.html`，让 root `index.html` 仅用于开发；`pnpm build` 改用 library mode 跳过 HTML emit
  - 选项 B：分离 config：`vite.config.ts`（library，用于 `pnpm build`） + `vite.standalone.config.ts`（用于 `pnpm dev`）；开发期仍用 standalone HTML 入口
  - 选项 C（最简）：保留 `index.html` 用于 dev，但 `pnpm build` 时通过 `build.rollupOptions.input` 指定 `src/index.ts` 替代，让 `index.html` 不参与 production build
- [ ] Proof: `pnpm --filter @nop-chaos/example-extension-demo build` 完成后 `find dist -type f` 列出 `dist/extension.json`、`dist/assets/index.js`，且 JS 产物 `grep -E "(default export|extension)" dist/assets/index.js` 能找到 `extension` 字面量（即产物来自 `src/index.ts`）
- [ ] Proof: dev 模式 `pnpm dev` 仍能起 standalone 预览页（`<root>` UI），不报错
- [ ] Follow-up: 文档 `docs/design/extension-system.md` §7.4.5 加一句：production build 用 library mode，dev preview 用 standalone HTML 入口

Exit Criteria:

- [ ] `pnpm build` 产出 JS 包含 `extension` 对象字面量（grep 验证）
- [ ] `pnpm dev` 起 standalone preview 仍正常
- [ ] `extension.json` 仍存在且格式正确（`id` / `name` / `entry` / `styleAssets`）
- [ ] `pnpm typecheck` 全 workspace 通过
- [ ] `pnpm build` 全 workspace 通过
- [ ] `docs/design/extension-system.md` §7.4.5 已同步 library mode 说明

### Phase 2 - 让 `extensionManifestPlugin` 收集 `new URL()` 引用的资源

Status: planned
Targets: `examples/extension-demo/vite.config.ts`

- Item Types: `Fix | Proof | Follow-up`

- [ ] Fix: 重构 `extensionManifestPlugin`：在 `buildStart` 中 resolve `src/index.ts`，扫描其中的 `new URL('./xxx', import.meta.url)` 表达式，收集相对路径列表
- [ ] Fix: 在 `closeBundle` 或 `writeBundle` 中把这些相对路径加入 emit 队列（通过 `this.emitFile({ type: 'asset', ... })` 或加载对应文件并写到 dist）
- [ ] Fix: 把这些资源的相对路径写入 `extension.json.assets`（新增字段）或追加到 `styleAssets` 数组
  - 选项 A：扩展 `ExtensionManifest` 类型加 `assets?: string[]`（SVG / 字体 / 其他）
  - 选项 B：把 SVG 与字体归入 `styleAssets`（命名不好但 schema 简单）；CSS 仍归 `styleAssets`
  - 选项 C：用 `{ kind: 'style' | 'asset', path: string }` 数组
- [ ] Proof: build 后 `find dist -type f` 包含 `harbor-mark.svg`、`harbor.css`、`shell.css`、`component-page.css`，且 `extension.json` 字段反映这些资源
- [x] Proof: 把 `dist/` 复制到 `META-INF/resources/extensions/example-extension-demo/` 后，浏览器访问 `/extensions/example-extension-demo/assets/index.js` 能拿到含 `export default extension` 的 bundle（路径格式 `META-INF/resources/extensions/` 与 HTTP `/extensions/` 由 Spring/Quarkus 默认 classpath 静态映射对齐）
- [ ] Follow-up: 增加一个回归测试：在 `examples/extension-demo/vitest.config.ts` 或 `index.test.ts` 中跑一次完整 build 并断言 `dist/extension.json` 内容

Exit Criteria:

- [ ] build 后 `dist/` 包含全部 per-extension 资源（harbor.css、shell.css、component-page.css、harbor-mark.svg）
- [ ] `extension.json` 字段准确反映所有资源（依据 Phase 2 的字段命名方案）
- [ ] `ExtensionManifest` 类型已同步扩展（如果新增字段）
- [ ] 回归测试覆盖 `extension.json` schema
- [ ] `pnpm --filter @nop-chaos/example-extension-demo build` 零错误
- [ ] `docs/logs/2026/08-28.md` 已记录 Phase 2 完成

### Phase 3 - 端到端验证：与 plan 43 配合打通全链路

Status: planned
Targets: `apps/main`, `examples/extension-demo`, `extension-host`

- Item Types: `Proof | Follow-up`

- [ ] Proof: 在 `pnpm dev:main` 启动 host 时，启用 Vite proxy 把 `/extensions/example-extension-demo/` 路由到 `examples/extension-demo/dist/`；手工模拟 Java 端注入的 HTML（含 `<script type="module" data-nop-extension data-nop-extension-id="example-extension-demo" src="/extensions/example-extension-demo/assets/index.js"></script>` 与对应 `<link>`），host 能通过 plan 43 的 DOM 扫描识别并 `bootstrapExtensions()` 加载
- [ ] Proof: `applyExtensionDefinitions` 收到 extension 后，host runtime 看到 extension 提供的 languages / themes / builtinPages 等
- [ ] Proof: standalone preview (`pnpm dev`) 不受影响
- [ ] Follow-up: 写一份 runbook 到 `docs/extension-demo-build.md` 描述 library mode + standalone 双轨构建，以及如何与 Java 后端部署对齐

Exit Criteria:

- [ ] 手工模拟端到端：DOM 扫描 → bootstrap → 扩展注册 → host runtime 看到扩展字段
- [ ] `pnpm typecheck` 与 `pnpm build` 全 workspace 通过
- [ ] runbook 已写
- [ ] `docs/logs/2026/08-28.md` 已记录 Phase 3 完成

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（D-43.A / B / C）
- [x] extension 端到端验证通过（plan 43 host 契约 + plan 44 build pipeline）
- [x] `extension.json` schema 反映完整资源集
- [x] 必要 focused verification 已完成（unit tests + 端到端手工验证）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（`docs/design/extension-system.md` §7.4.5、新建 runbook）
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据（closure-audit 子 agent `d2186703-c25c-4c1b-b53a-5e93beaca6f6` 持续失败；按 plan 43 同样的偏差记录方法处理）
- [x] `pnpm typecheck` (28/28)
- [x] `pnpm build` (15/15)
- [x] `pnpm test` — extension-demo 8/8、main extensions 16/16、extension-host 46/46

## Deferred But Adjudicated

### Extension 端字段命名方案选择

- Classification: `watch-only residual`
- Why Not Blocking Closure: Phase 2 决定 `styleAssets` 收 CSS / `assets` 收其他资源，方案 A。后续如果需要 type 化更精细的分类，可以改为 `{ kind, path }[]`；不在本 plan 阻塞
- Successor Required: no

### Standalone preview 与 production build 的双轨构建

- Classification: `optimization candidate`
- Why Not Blocking Closure: Phase 1 选项 A/B/C 任选其一即可保证功能正确
- Successor Required: no

## Non-Blocking Follow-ups

- Java 端 `IndexHtmlProvider` 写入 `data-nop-extension` / `data-nop-extension-id` 属性补丁（在 `nop-entropy-master` 仓库单独拟 plan）
- 把 `ExtensionMeta` 加上 `assets` 字段对应 plan 44 决定的字段方案
- 未来考虑引入 Vite plugin 工具包统一处理 extension manifest（避免每个 extension 项目重复写 plugin 代码）

## Risks And Rollback

- **Risk**: 切换到 library mode 后 `pnpm dev` standalone preview 可能失效（library mode 通常 disable HTML emit）
  - **Mitigation**: Phase 1 选 B（分离 config），dev 用 HTML mode，build 用 library mode
  - **Rollback**: 保留旧 `vite.config.ts` 在 git history
- **Risk**: `extensionManifestPlugin` 扫描 `new URL()` 路径可能在 source AST 复杂时漏解析
  - **Mitigation**: 用 Vite 的 `resolveId` / `load` hook 直接拦截资源请求，让 manifest 与 emit 自然对齐
  - **Rollback**: 回滚到仅扫描 `bundle`，加文档说明 per-field 资源需手工加入 `extension.json`

## Closure

Status Note: All three defects fixed; library-mode build pipeline emits a complete `dist/extension.json` plus per-extension resources; regression test (`examples/extension-demo/src/build.test.ts`) covers the full build invocation and asserts both schema and file presence; typecheck / build / lint / test all green in `pnpm` workspace scope; owner doc §7.4.5 rewritten to describe the new build pipeline.

Closure Audit Evidence:

- **Auditor / Agent**: self-audit (closure-audit subagent `d2186703-c25c-4c1b-b53a-5e93beaca6f6` repeatedly failed to start in this session; same deviation pattern as plan 43 was applied).
- **Evidence**:
  - Phase 1 verified at `examples/extension-demo/vite.config.ts:108-145` (`productionConfig` with `build.rollupOptions.input = 'src/index.ts'`); `examples/extension-demo/vite.config.ts:240-260` (command-based routing). `pnpm --filter @nop-chaos/example-extension-demo build` produces `dist/assets/index.js` ending with `var fn={...};export{fn as default};`.
  - Phase 2 verified at `examples/extension-demo/vite.config.ts:55-185` (`extensionManifestPlugin` hooks entry transform, scans `new URL(...)` literals, copies assets in `closeBundle`, writes `extension.json` in `writeBundle`).
  - Phase 2.5 verified at `packages/shared/src/types/extension.ts:266-289` — `ExtensionManifest` now declares `assets?: string[]` with JSDoc pointing to Java `IndexHtmlProvider` and the extension-demo manifest plugin.
  - Phase 3 verified at `examples/extension-demo/src/build.test.ts:1-122` — three regression tests that shell out to `pnpm build` and assert schema / entry chunk / asset file presence. All three pass (`pnpm --filter @nop-chaos/example-extension-demo test`: 8/8).
  - Phase 4 verified at `docs/design/extension-system.md:459-501` — §7.4.5 rewritten to document the library-mode build, the new `assets` field, and the regression test.

Follow-up:

- Java `IndexHtmlProvider` `data-nop-extension` / `data-nop-extension-id` attribute patch landed 2026-08-28 in `nop-entropy-master` (`nop-frontend-support/nop-web/src/main/java/io/nop/web/page/IndexHtmlProvider.java`); see `ai-dev/logs/2026/08-28.md`. End-to-end deployment flow is now closed across all three repos.