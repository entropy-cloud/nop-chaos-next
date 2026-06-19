# 44 TypeScript ESM 编译输出缺少 .js 扩展名导致 Node.js 模块加载失败

## Problem

Vite 配置文件在启动时动态 `import('@nop-chaos/vite-plugin-prototype-server')`，该包编译后的 `dist/index.js` 引用了 `@nop-chaos/delta-merge`，而 delta-merge 的 `dist/index.js` 使用 `export { mergeNode } from './mergeNode'`（无 `.js` 扩展名）。Node.js ESM 解析相对路径时需要显式扩展名，抛出：

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../delta-merge/dist/mergeNode'
```

构建和类型检查均通过，仅在运行时失败。

## Diagnostic Method

诊断难度：**中**。误导性在于：

1. **错误信息具有欺骗性** — `ERR_MODULE_NOT_FOUND: Cannot find module './mergeNode'` 看起来像是一个不存在的文件路径，实际上文件存在但缺少扩展名。
2. **构建成功** — `tsc -p tsconfig.build.json` 正常输出文件到 `dist/`，无任何错误。
3. **类型检查成功** — `tsc -p tsconfig.json --noEmit` 通过，TypeScript 自己的模块解析不要求 `.js` 扩展名。

确认方式：查看 `dist/index.js` 内容，发现 `export { mergeNode } from './mergeNode'` 没有 `.js` 扩展名，而 Node.js ESM 要求 `'./mergeNode.js'`。

## Root Cause

- TypeScript 的 `moduleResolution: "Bundler"`（或 `"Node16"` 以外的模式）在编译 ESM 输出时不会自动为相对路径添加 `.js` 扩展名。它假设最终消费者是一个 bundler（如 Vite/Webpack），这些工具不要求显式扩展名。
- 但 Node.js 原生 ESM loader 严格遵循 ESM 规范，要求相对 import 路径包含文件扩展名。
- 工作区包的 `package.json` `exports` 字段配置了 `"default": "./dist/index.js"`，但 dist 内部的所有相对 import 都缺少 `.js` 扩展名。

## Fix

将所有 `packages/delta-merge/src/` 中的相对 import 加上 `.js` 扩展名：

- `from './mergeNode'` → `from './mergeNode.js'`
- `from './mergeProperty'` → `from './mergeProperty.js'`
- `from './mergeArray'` → `from './mergeArray.js'`
- `from './prototype'` → `from './prototype.js'`
- `from './cleanup'` → `from './cleanup.js'`

TypeScript 的 `moduleResolution: "Bundler"` 可以正确解析带 `.js` 扩展名的 import，将其映射回对应的 `.ts` 源文件。

## Tests

修改后执行 `pnpm --filter @nop-chaos/delta-merge test`（17/17 pass）确认功能不受影响。

## Affected Files

- `packages/delta-merge/src/index.ts`
- `packages/delta-merge/src/mergeNode.ts`
- `packages/delta-merge/src/mergeProperty.ts`
- `packages/delta-merge/src/mergeArray.ts`
- `packages/delta-merge/src/prototype.ts`

## Notes For Future Refactors

1. 任何编译为 ESM 并被 Node.js 直接加载（而非通过 bundler）的 workspace 包，所有相对 import 必须带 `.js` 扩展名。
2. 如果包只被 Vite bundler 消费（如在浏览器端使用），则不需要 `.js` 扩展名。
3. 判断标准：该包是否可能被 Vite config 或其他 Node.js 运行时直接 `import()`。如果是，必须加扩展名。
4. 另一个可行方案：使用 `moduleResolution: "Node16"` 或 `"NodeNext"`，TypeScript 会在编译时强制要求扩展名存在。
