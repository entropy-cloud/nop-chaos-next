# 43 Vite Plugin configureServer 异步 fire-and-forget 导致 Mock Middleware 静默失效

## Problem

启动 `pnpm dev:main:amis-prototype` 后，`/api/mock/*` 请求全部返回 Vite HTML 页面（SPA fallback），而不是 mock JSON 数据。`/api/prototype/*` 请求正常工作。

最小复现：访问 `http://localhost:4173/api/mock/disputes` → 返回 `<!doctype html>`（主应用 HTML），而非预期的 `{"status":0,"data":{"items":[...]}}`。

## Diagnostic Method

诊断难度：**高**。有四个因素让问题难以定位：

1. **静默吞错** — `loadMockMiddleware` 的 `import()` 使用 `.catch(() => {})`，任何加载失败都不会产生日志。
2. **表现像路由问题** — mock 请求返回 HTML，表面看像是请求没有被正确路由，第一反应是检查 middleware 注册顺序和 URL 匹配。
3. **时序问题** — 问题并非每次必现，取决于 `import()` 完成时间与 Vite 内部 middleware 初始化的竞态。
4. **Windows 路径问题** — 最初使用的 `path.resolve()` 返回反斜杠路径，`import()` 在 Windows 上不完全兼容反斜杠路径，但 `.catch()` 吞掉了这个错误。

排查路径：

1. 首先怀疑 middleware 注册顺序 — 检查 `server.middlewares.use()` 调用顺序，确认主 prototype middleware 先注册，mock middleware 后注册。
2. 用 `node -e "import('...')"` 单独测试 mock 文件 — 加载成功，说明 .mjs 文件本身没问题。
3. 添加 `console.log` 重新构建后验证 — 发现 `.then()` 回调被触发，但 middleware 仍未生效。
4. 最终确认：`configureServer` 是同步的，内部的 `import()` 是 fire-and-forget。Vite 在 `configureServer` 返回后立即安装 SPA fallback middleware，而 mock middleware 在异步 `import()` 完成后才注册到栈末尾（已在 SPA fallback 之后）。

## Root Cause

- **`loadMockMiddleware` 使用 `import().then()` 且不被 `await`**：`configureServer` 钩子是同步函数，内部 `import()` 返回的 Promise 没有被等待。因此 mock middleware 通过 `middlewares.use()` 注册的时刻晚于 Vite 安装 SPA fallback middleware 的时刻。
- **`import()` 的 Promise 被 `.catch(() => {})` 吞掉**：如果 `import()` 本身因路径格式等问题失败，不会有任何错误信息。
- **Windows 路径兼容性**：`path.resolve()` 返回 `C:\...\index.mjs`（反斜杠），而 Node.js `import()` 在 Windows 上可能无法正确处理反斜杠路径。应使用 `pathToFileURL()` 将路径转为 `file:///` URL 格式。

## Fix

- 将 `configureServer` 改为 `async`，并用 `await loadMockMiddleware(dir, middlewares)` 等待所有 mock middleware 加载完成后，再进行后续的 middleware 注册。
- 将 `loadMockMiddleware` 改为 `async function`，内部用 `await import(...)` 替代 `.then().catch()`。
- 将 `import(modPath)` 改为 `import(pathToFileURL(modPath).href)`，确保 Windows 路径被正确转换为 URL 格式。
- 导入 `pathToFileURL` 从 `node:url`。

## Tests

无新增测试（本 bug 涉及 Vite plugin 运行时行为，当前无集成测试框架）。单元测试已覆盖 delta-merge 核心逻辑。

## Affected Files

- `packages/vite-plugin-prototype-server/src/index.ts` — loadMockMiddleware 和 configureServer 的 async/await 改造

## Notes For Future Refactors

1. 任何 Vite plugin 的 `configureServer` 中如果有异步操作，必须 `await` 以确保 middleware 注册顺序正确。
2. `.catch(() => {})` 静默吞错是调试噩梦 — 永远在 catch 中至少输出一条 debug 日志。
3. 在 Windows 上使用 `import()` 动态加载文件路径时，始终使用 `pathToFileURL()` 转换。
