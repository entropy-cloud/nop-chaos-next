# 26 Flux Tarball Runtime Require Mismatch

## Problem

- 打开 `/#/flux-demo` 时，页面会在浏览器里报错：`Calling \`require\` for "react" in an environment that doesn't expose the \`require\` function.`
- 表面现象像是 Flux runtime 自身仍然依赖 CommonJS，且一度只能靠宿主在 `apps/main/src/flux/init.ts` 安装 `globalThis.require` shim 才能工作。
- 但同一时期 `C:\can\nop\nop-chaos-flux\packages\flux-bundle\dist\index.js` 看起来已经是干净的 ESM external 输出，导致“源码已修、页面仍坏”的现象非常迷惑。

## Diagnostic Method

- 先直接在 `nop-chaos-next` 的浏览器预览里复现 `/#/flux-demo` 崩溃，确认不是 Playwright 偶发超时，而是真实运行时错误。
- 再分别检查两个产物来源：
  - `C:\can\nop\nop-chaos-flux\packages\flux-bundle\dist\index.js`
  - `C:\can\nop\nop-chaos-next\node_modules\.pnpm\...\@nop-chaos\flux\dist\index.js`
  这是诊断转折点，因为它证明“当前上游 dist”与“主项目实际安装包”不是同一份构建结果。
- 对已安装包做针对性 grep，直接查 `gt("react")`、`react-i18next/dist`、`recharts/es6`、`Calling \`require\``，确认真正触发浏览器错误的是已安装 tarball，而不是当前上游源码。
- 再沿着命中的 section 反查来源：
  - `react-i18next` 被 bundled 时会带入 `use-sync-external-store` shim
  - `recharts` 被 bundled 时也会带入同类 selector shim
  - 它们在已安装 tarball 中都出现了 `gt("react")`
- 同时验证 `@tanstack/react-virtual`：虽然它也被 bundled，但对应 section 使用的是顶层 ESM React import，不是当前 `require('react')` 的直接来源。这个排除步骤很重要，因为它避免把“被打进包”误判成“直接导致崩溃”。
- 最后通过显式重装 `@nop-chaos/flux` tarball，而不是只跑一次 `pnpm install --force`，确认 PNPM 并不会总是因为同名同版本 tarball 自动刷新包内容。重装后再检查已安装 dist，`gt("react")` 与 bundled `react-i18next` / `recharts` 都消失，问题被直接证实。

## Root Cause

- 真正的问题不是 Flux 当前源码仍然错误，而是 `nop-chaos-next` 一直在消费旧的 `@nop-chaos/flux` tarball。
- 旧 tarball 中错误地 bundled 了 `react-i18next` 和 `recharts`；这两条依赖链都会带入 `use-sync-external-store` 的 CJS shim，最终在浏览器里走到 `require('react')`。
- `nop-chaos-flux` 当前 dist 已经把这些依赖 external 成顶层 ESM import，但如果主项目没有真正重装新 tarball，页面仍会继续运行旧包内容。
- 发布包的 `peerDependencies` 也落后于当前 dist：缺少 `i18next`、`react-i18next`、`recharts`，进一步放大了“dist 已修但发布面仍像旧包”的错觉。

## Fix

- 在 `C:\can\nop\nop-chaos-flux\packages\flux-bundle\package.json` 补齐 peer surface：
  - `i18next`
  - `react-i18next`
  - `recharts`
- 重新构建并重新打包 `@nop-chaos/flux`：
  - `pnpm --filter @nop-chaos/flux build`
  - `pnpm --filter @nop-chaos/flux pack:release`
- 在 `nop-chaos-next` 显式重新安装 tarball，而不是依赖一次普通 install：
  - `pnpm --filter @nop-chaos/main add "file:../../../nop-chaos-flux/dist-packages/nop-chaos-flux-0.1.0.tgz"`
- 重新检查已安装包的 `dist/index.js`，确认不再包含：
  - bundled `react-i18next`
  - bundled `recharts/es6`
  - `gt("react")`
  - `Calling \`require\` for "react"`
- 在消费端删除临时宿主补丁：`apps/main/src/flux/init.ts` 不再安装 `globalThis.require` shim，只负责加载 `@nop-chaos/flux/style.css`。

## Tests

- `tests/e2e/lazy-loading.spec.ts` - 验证 `Flux Demo` 路由可以加载 Flux renderer chunk 并渲染 `mock://flux-demo` schema，而不再依赖宿主 `require` shim。
- `apps/main/src/flux/init.ts` 的浏览器最小复现检查 - 验证删除 shim 后，访问 `/#/flux-demo` 仍能显示 `Current Flux schemaPath: mock://flux-demo` 与表格内容。
- `pnpm lint` - 验证宿主移除 `react-dom`/`require` 临时补丁后仍满足 lint 约束。
- `pnpm build` - 验证主应用能在新 tarball 下完成构建，并把 Flux 依赖正确拆分到宿主 vendor chunk。

## Affected Files

- `C:\can\nop\nop-chaos-flux\packages\flux-bundle\package.json`
- `C:\can\nop\nop-chaos-flux\packages\flux-bundle\dist\index.js`
- `C:\can\nop\nop-chaos-flux\dist-packages\nop-chaos-flux-0.1.0.tgz`
- `apps/main/src/flux/init.ts`
- `apps/main/package.json`
- `docs/logs/2026/05-14.md`
- `tests/e2e/lazy-loading.spec.ts`

## Notes For Future Refactors

- 只看 `nop-chaos-flux` 当前源码或当前 dist 不足以证明问题已修；必须同时检查 `nop-chaos-next` 实际安装包的 `node_modules/.pnpm/.../@nop-chaos/flux/dist/index.js`。
- 对同路径、同版本的 `file:` tarball 依赖，`pnpm install` 不一定会刷新已安装内容。涉及发布包调试时，应显式重装目标依赖或验证新的 PNPM store path 已生成。
- 当发布包 dist external 了宿主运行时依赖时，`package.json` 的 `peerDependencies` 必须同步更新；否则很容易再次出现“构建结果和发布面不一致”的诊断陷阱。
