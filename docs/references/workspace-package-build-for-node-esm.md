# Workspace Package Build for Node.js ESM Consumption

## When This Applies

当一个 workspace 包被 Node.js 运行时直接加载（而非通过 Vite bundler 在浏览器端加载），必须满足 Node.js ESM 的严格规范。典型场景：

- **Vite 配置文件**通过 `import('@scope/pkg')` 加载插件
- **Node.js 脚本**或 CLI 工具直接 import workspace 包
- **SSR / 测试运行器**直接加载包的 ESM 输出

反例：仅被浏览器端代码 import 的包（如 `@nop-chaos/shared`、`@nop-chaos/plugin-bridge`），不需要以下配置，因为 Vite bundler 不要求 `.js` 扩展名。

## Required Setup

### 1. `tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "paths": {},
    "noEmit": false,
    "sourceMap": false,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist"
  },
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/__tests__"]
}
```

关键点：

- `paths: {}` — 禁用在 `tsconfig.base.json` 中定义的工作区路径别名。否则 TypeScript 编译时会跟随别名到其他包的 `.ts` 源文件，并报 `rootDir` 冲突。
- `rootDir: "src"` — 确保输出目录结构与源码一致。
- 排除测试文件 — 避免测试代码被包含在发行版中。

### 2. 所有相对 import 必须带 `.js` 扩展名

TypeScript 的 `moduleResolution: "Bundler"` 不会在编译时为相对路径添加扩展名，但 Node.js ESM 要求显式扩展名。

```typescript
// ❌ 不能这样写（TypeScript 可以编译，但 Node.js 无法加载）
import { mergeNode } from './mergeNode';

// ✅ 必须写扩展名
import { mergeNode } from './mergeNode.js';
```

TypeScript 的 `"Bundler"` 模式能正确解析 `./mergeNode.js` 并映射到 `./mergeNode.ts` 源文件。

### 3. `package.json` 的 `exports` 字段

```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

- `types` 指向 `.ts` 源文件 — TypeScript 在类型检查时直接读取源码，获取完整的类型信息。
- `default` 指向编译后的 `dist/index.js` — Node.js 运行时加载编译后的 JS 文件。
- `build` 脚本用 `tsconfig.build.json` — 确保编译配置独立于类型检查配置。

### 4. `tsconfig.json` 必须禁用 `paths`

用于类型检查的 `tsconfig.json` 中，必须用 `paths: {}` 覆盖 `tsconfig.base.json` 中的工作区别名。否则 TypeScript 会跟随别名到其他包的 `.ts` 源文件，并报错：

```
File '.../delta-merge/src/index.ts' is not under 'rootDir'.
```

即使设置了 `"noEmit": true`（类型检查模式），TypeScript 仍会检查 rootDir 约束。

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "paths": {}
  },
  "include": ["src"]
}
```

### 5. 运行时文件路径加载

如果包需要动态加载文件（如 mock middleware），在 Windows 上必须使用 `pathToFileURL`：

```typescript
import { pathToFileURL } from 'node:url';

// ❌ 在 Windows 上可能失败（path.resolve 返回反斜杠）
import(resolve(mockDir, 'index.mjs'));

// ✅ 在所有平台上正常工作
import(pathToFileURL(resolve(mockDir, 'index.mjs')).href);
```

## Dependency Chain

如果包 A（被 Node.js 加载）依赖包 B（工作区包），包 B 也必须遵循以上规则：

```
Vite config → import() → 包 A (dist/index.js) → import → 包 B (dist/index.js)
                              ↓                        ↓
                    必须编译 + .js 扩展名        必须编译 + .js 扩展名
                    必须 exports → dist/         必须 exports → dist/
```

除非包 B 被 bundler 打包内联到包 A 中（但工作区依赖通常是外部依赖，不会被内联）。

## Verification Checklist

构建一个供 Node.js ESM 使用的工作区包后，验证以下事项：

- [ ] `pnpm --filter @scope/pkg build` 成功，`dist/` 输出存在
- [ ] `dist/*.js` 中所有相对 import 都以 `.js` 结尾
- [ ] Node.js 可以直接 `import('@scope/pkg')` 而不报错
- [ ] `pnpm --filter @scope/pkg typecheck` 通过
- [ ] `pnpm --filter @scope/pkg test` 通过（如果有）

## 常见问题

| 症状                                               | 原因                                   | 修复                                         |
| -------------------------------------------------- | -------------------------------------- | -------------------------------------------- |
| `ERR_MODULE_NOT_FOUND: Cannot find module './foo'` | 缺少 `.js` 扩展名                      | 在源文件中为所有相对 import 添加 `.js`       |
| `File not under rootDir` (类型检查)                | `paths` 别名指向包外文件               | 在 tsconfig 中设置 `paths: {}`               |
| `ERR_UNKNOWN_FILE_EXTENSION: .ts`                  | `exports` 的 `default` 指向 `.ts` 文件 | 改为指向 `dist/index.js`                     |
| 动态 import 在 Windows 上失败                      | 使用反斜杠路径                         | 使用 `pathToFileURL()` 转换为 `file:///` URL |
