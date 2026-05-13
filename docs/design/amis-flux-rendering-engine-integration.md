# AMIS 与 Flux 双渲染引擎集成

> 本文档描述 `nop-chaos-next` 同时兼容 AMIS 与 Flux 两种渲染引擎的推荐集成方案。

---

## 1. 背景

当前主项目已经具备多渲染引擎分发骨架：

| 能力 | 位置 | 现状 |
| --- | --- | --- |
| 页面类型模型 | `packages/shared/src/types/menu.ts` | 菜单模型已包含 `amis` 与 `flux` 两类渲染页 |
| 路由分发 | `apps/main/src/router/RouteRenderer.tsx` | 已按 `pageType` 分发到 AMIS 或 Flux |
| AMIS 运行时 | `packages/amis-core`、`packages/amis-react`、`apps/main/src/amis/` | 已完整集成 |
| Flux 运行时 | `apps/main/src/flux/` | 当前是占位实现 |
| Flux UI 摘取包 | `flux-lib/ui/` | 当前作为 `@nop-chaos/ui` 被主项目使用 |

目标不是把 `nop-chaos-flux` 变成当前项目的子工作区，而是在保持两个项目独立编译的前提下，让 `nop-chaos-next` 能消费 Flux 渲染引擎的稳定产物。

文档边界：`nop-chaos-flux` 的实现、构建、验证、设计文档和开发日志应记录在 `nop-chaos-flux` 项目内。本文档只记录 `nop-chaos-next` 如何消费 Flux 发行产物，以及主项目侧的路由、适配、样式和依赖边界。

---

## 2. 约束

1. `nop-chaos-flux` 是独立项目，独立安装依赖、独立构建、独立验证。
2. 不应把 `../nop-chaos-flux/packages/*` 加入当前项目的 `pnpm-workspace.yaml`。
3. 不应在 `nop-chaos-next` 中直接依赖 Flux 源码路径。
4. 主项目只消费 Flux 的构建产物、tarball、私有 registry 包或同步后的发行目录。
5. React、React DOM、宿主 UI、主题、认证、HTTP、i18n 等宿主能力应由 `nop-chaos-next` 统一提供，避免 Flux 产物带入第二份运行时。
6. AMIS 和 Flux 应通过 `pageType` 并存，不互相污染运行时初始化与 CSS 作用域。

---

## 3. 现有 Flux 交付方式

`nop-chaos-flux` 目前每个包通过 `tsc -p tsconfig.build.json` 输出 `dist/`，保留多包结构。

现有脚本：`../nop-chaos-flux/scripts/sync-flux-lib.sh`

该脚本会：

- 在 `nop-chaos-flux` 中执行构建
- 将若干包复制到消费项目的 `flux-lib/`
- 删除复制包中的 `src/` 和 `node_modules/`
- 保留每个包自己的 `package.json` 与 `dist/`

这种方式本质是“多包发行目录同步”，不是整体打包。

---

## 4. 可选方案

### 4.1 多包同步

继续使用 `sync-flux-lib.sh`，把 `flux-core`、`flux-runtime`、`flux-react`、`flux-renderers-*` 等包同步到当前项目的 `flux-lib/`。

优点：

- 已有脚本支持
- 保留 Flux 内部包边界
- 每个包仍可独立 import 和调试

缺点：

- `nop-chaos-next` 需要感知 Flux 的内部包结构
- `apps/main/package.json` 会出现多个 Flux 依赖
- `workspace:*` 依赖需要在同步后被当前工作区解析
- Flux 内部重构会影响消费侧依赖声明

适用场景：短期联调、需要深入调试 Flux 内部包。

### 4.2 单一核心包

在 `nop-chaos-flux` 中新增一个面向宿主消费的发行包，例如 `@nop-chaos/flux`，把核心渲染链路打包为一个浏览器库：

```text
flux-core -> flux-formula -> flux-compiler -> flux-action-core -> flux-runtime -> flux-react -> flux-renderers-basic/form/data
```

优点：

- `nop-chaos-next` 只依赖一个 Flux 核心包
- Flux 内部包结构对宿主隐藏
- Flux 内部重构不直接影响宿主依赖清单
- 与 AMIS 的外部依赖模型更接近

缺点：

- 需要在 `nop-chaos-flux` 中新增 library build 配置
- 需要明确 external、CSS、类型声明和 sourcemap 策略
- 设计器等重型能力不宜无条件打进核心包

适用场景：长期集成和稳定发布。

### 4.3 核心包加可选重型包

将 Flux 分为少量稳定入口：

| 包 | 内容 | 消费方式 |
| --- | --- | --- |
| `@nop-chaos/flux` | 核心 schema/runtime/react/renderers | `FluxRouteRenderer` 直接依赖 |
| `@nop-chaos/flux-designers` | flow、spreadsheet、report、word、debugger 等重型能力 | 路由或功能入口按需动态 import |
| `@nop-chaos/ui` | 宿主 UI 组件库 | 继续由当前项目提供 |

优点：

- 宿主依赖面小
- 重型模块可按需加载
- 避免首屏引入设计器体积
- Flux 内部包结构仍可隐藏

缺点：

- 需要维护两个 Flux 发行入口
- 需要约定核心包与重型包的共享依赖 external 策略

适用场景：推荐的长期方案。

---

## 5. 推荐方案

推荐采用“核心包 + 可选重型包”的发行模型。

第一阶段只交付 `@nop-chaos/flux` 核心包，满足 `pageType: 'flux'` 页面渲染。设计器、调试器、电子表格、报表、Word 编辑器等能力暂不进入核心包，后续按需以 `@nop-chaos/flux-designers` 或独立远程模块交付。

主项目集成方式应优先使用私有 registry 包或 `pnpm pack` 生成的 tarball。tarball 更接近真实发布形态，适合验证 `files`、`exports`、CSS、类型声明和 `workspace:*` 依赖是否已被正确处理。

```json
{
  "dependencies": {
    "@nop-chaos/flux": "file:../../../nop-chaos-flux/dist-packages/nop-chaos-flux-0.1.0.tgz"
  }
}
```

本地 package 目录引用只用于临时联调，不作为交付验证方式：

```json
{
  "dependencies": {
    "@nop-chaos/flux": "file:../../../nop-chaos-flux/packages/flux-bundle"
  }
}
```

不推荐直接依赖 `file:.../dist`，除非 `dist/` 本身包含完整 `package.json`、`exports`、`types`、CSS 和资产文件。默认 Vite `dist/` 目录不是一个完整 npm 包。

如果 source package 的 manifest 中仍含有 `workspace:*`，则不能作为交付依赖直接被 `nop-chaos-next` 消费。发布形态的 manifest 必须没有对 Flux 内部包的 `workspace:*` 依赖。

---

## 6. Vite 8 打包要点

Vite 8 使用 Rolldown 作为底层构建引擎。官方文档中 `build.rollupOptions` 已标记为 `build.rolldownOptions` 的 deprecated alias，因此新增配置应使用 `build.rolldownOptions`。

示例配置应放在 `nop-chaos-flux` 的 facade 包中，不放在当前项目：

```ts
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    sourcemap: true,
    rolldownOptions: {
      external: [
        /^react(\/.*)?$/,
        /^react-dom(\/.*)?$/,
        /^zustand(\/.*)?$/,
        /^lucide-react(\/.*)?$/,
        /^@nop-chaos\/ui(\/.*)?$/,
      ],
    },
  },
});
```

建议 external，并在 `package.json` 中用 `peerDependencies` 或 `dependencies` 与 external 策略保持一致：

| 依赖 | 原因 |
| --- | --- |
| `react`、`react-dom`、`react/jsx-runtime` | 避免双 React |
| `@nop-chaos/ui` | UI 由宿主统一提供，避免复制当前项目已有 UI 包 |
| `lucide-react` | 当前主项目已依赖，避免重复图标库 |
| `zustand` | 当前主项目已依赖，external 是为了版本去重和锁定，不表示 Flux state 与 host state 直接共享 |

可以内联：

| 包 | 原因 |
| --- | --- |
| `@nop-chaos/flux-core` | Flux 内部实现细节 |
| `@nop-chaos/flux-formula` | Flux 内部实现细节 |
| `@nop-chaos/flux-compiler` | Flux 内部实现细节 |
| `@nop-chaos/flux-action-core` | Flux 内部实现细节 |
| `@nop-chaos/flux-runtime` | Flux 内部实现细节，但 external `zustand` |
| `@nop-chaos/flux-react` | 核心渲染 API |
| `@nop-chaos/flux-renderers-basic/form/data` | Flux 页面渲染默认能力 |

facade 包的 manifest 至少应包含：

```json
{
  "name": "@nop-chaos/flux",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./style.css": "./dist/style.css"
  },
  "sideEffects": ["*.css", "./dist/style.css"],
  "peerDependencies": {
    "@nop-chaos/ui": "*",
    "lucide-react": "^1.7.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.12"
  }
}
```

发布形态要求：

1. packed manifest 中不能出现 Flux 内部包的 `workspace:*` 依赖。
2. 被 external 的 host-owned singleton 必须作为 `peerDependencies` 声明。
3. 被 external 但不由 host 统一管控的第三方包，必须作为 `dependencies` 或明确的 peer 声明。
4. `private: true` 不影响本地 `pnpm pack` 和 tarball 安装，但会阻止 registry 发布；若要发布到 registry，需要移除 `private` 或生成发布专用 manifest。
5. tarball 默认不应包含 `node_modules` 或第三方依赖目录；它只应包含当前包的发布文件，例如 `dist/`、`package.json`、README、CSS 和必要 assets。
6. 如果 Vite/Rolldown 将第三方库内联进 `dist/index.js`，这些第三方代码仍会随 tarball 间接发布；因此第三方库是否进入 tarball 由 bundling external 策略决定，而不只由 `files` 字段决定。
7. CodeMirror、dnd-kit、canvas editor 等重型可选能力不应进入 `@nop-chaos/flux` 核心包。它们应留在 `@nop-chaos/flux-designers`、独立可选包或远程模块中，并通过按需加载消费。

注意事项：

1. library mode 会把库内导入的 CSS 输出为单独 CSS 文件，需在 `package.json` 的 `exports` 中暴露。
2. Vite library mode 只会输出入口依赖图中实际 import 的 CSS；如果要输出 `style.css`，facade 入口必须 import 对应 CSS。
3. library mode 不会注入 Vite 的 module preload polyfill。如果核心包存在动态 import，需确认所有 JS/CSS chunk 都进入 `files`，并在 tarball 安装后可加载。
4. library mode 默认 `cssCodeSplit: false`，CSS 通常输出为单个文件；如改为 code split，需要额外验证异步 CSS chunk。
5. 不应依赖 `build.rollupOptions`，除非为了兼容旧配置；新配置一律写 `build.rolldownOptions`。
6. 如果需要更高级的 chunk 控制，优先查 Rolldown `codeSplitting` 或相关 chunk 配置，而不是沿用旧 Rollup `manualChunks` 思路。
7. Vite library mode 不负责生成 `.d.ts`。facade 包需要额外使用 `rolldown-plugin-dts`、`tsdown` 或其他类型声明打包工具。只有当源码没有 re-export 泄漏内部包路径时，才可用 `tsc --emitDeclarationOnly` 作为声明生成步骤。
8. 最终 `dist/index.d.ts` 不应暴露 `@nop-chaos/flux-core`、`@nop-chaos/flux-runtime`、`@nop-chaos/flux-react` 等内部包路径；否则这些内部包就不再是隐藏实现细节，必须作为正式依赖发布。
9. 核心 facade 尽量避免动态 import。若必须保留动态 import，需要在 tarball 安装后的 `nop-chaos-next` production build 中验证 chunk URL、CSS chunk、base path 与部署路径。

构建工具选择：

| 工具 | 适用场景 | 注意事项 |
| --- | --- | --- |
| Vite library mode | 浏览器 React 库、需要稳定 CSS/Vite 插件行为 | 需额外生成和校验 `.d.ts` |
| tsdown | 更偏向标准库发布流程、希望内置声明生成和包校验 | CSS 行为需要单独验证 |
| direct Rolldown | 需要底层 chunk/runtime 控制 | 类型声明仍需额外工具 |

---

## 7. Flux 包结构建议

在 `nop-chaos-flux` 新增面向宿主的 facade 包：

```text
packages/flux-bundle/
├── package.json
├── src/
│   ├── index.ts
│   └── style.css
└── vite.config.ts
```

`packages/flux-bundle/src/index.ts` 只导出宿主需要的稳定 API，并显式引入 CSS。不要把内部包 API 机械地全部 re-export 到公共类型声明中；优先用 facade 自己的函数、类型和配置对象包一层稳定 API。

```ts
import './style.css';

import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';

export type { FluxPublicSchema, FluxRendererOptions } from './types';

export function registerFluxRenderers() {
  registerBasicRenderers();
  registerFormRenderers();
  registerDataRenderers();
}

export function createFluxSchemaRenderer(options: FluxRendererOptions) {
  return createSchemaRenderer(options);
}
```

不要从 bundle 包导出所有内部包 API。对宿主只暴露稳定的“渲染入口、注册入口、必要类型”。

类型声明也要遵守 facade 边界：公共类型应由 `@nop-chaos/flux` 拥有或声明打包后内联，不应要求宿主安装 Flux 内部包才能通过 TypeScript 检查。

---

## 8. 主项目集成边界

`nop-chaos-next` 侧只需要实现宿主适配层：

| 文件 | 职责 |
| --- | --- |
| `apps/main/src/flux/init.ts` | 初始化 Flux 默认 runtime 钩子，且保持无副作用直到真正访问 Flux 路由 |
| `apps/main/src/flux/adapter.ts` | 将 host auth、HTTP、navigation、toast、theme 暴露给 Flux runtime |
| `apps/main/src/flux/providers.ts` | 通过后端或 mock 服务获取 Flux schema；当前包含 `mock://flux-demo` 示例 |
| `apps/main/src/flux/FluxRouteRenderer.tsx` | 根据 `schemaPath` 获取 schema 并渲染独立的 Flux mock 页面 |

主项目不应 import Flux 内部包，例如：

```ts
// 不推荐
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { compileAction } from '@nop-chaos/flux-compiler';
```

主项目只 import facade 包：

```ts
// 推荐
import { createFluxSchemaRenderer, registerFluxRenderers } from '@nop-chaos/flux';
```

宿主适配层边界：

1. Flux runtime 访问后端必须通过 host adapter，不应直接读取 token storage 或绕过主项目 HTTP client。
2. adapter request 需要覆盖 `signal`、认证、locale headers、错误消息、401 退出、静默请求和 response type 等主项目已有行为。
3. Flux 不应初始化第二个 i18next 实例；应复用 host 的 i18n/provider，或通过 adapter 获取 `t`、locale 和 namespace 注册能力。
4. Flux schema 应包含 `schemaVersion` 或 renderer capability 标识；版本或 renderer 不兼容时应 fail closed，并显示明确错误。
5. Flux CSS 应由 facade 输出为编译后的 CSS，由 `apps/main/src/flux/init.ts` 统一 import 一次；避免依赖主项目 Tailwind 扫描 Flux 源码。
6. Flux 全局样式应限制在 `.flux` 根、CSS layer 或主题 token 范围内，避免影响 AMIS、Shell 和普通页面。

---

## 9. `flux-lib` 处理策略

当前 `flux-lib/ui/` 仍应保留，因为它已经是当前项目的 `@nop-chaos/ui` 来源，并被 AMIS、Shell、插件示例和普通页面共同使用。

处理策略：

1. 短期：保留 `flux-lib/ui/`，但允许通过当前仓库脚本从同级 `../nop-chaos-flux/packages/ui` 单向同步。
2. Flux 核心包：不要再同步 `flux-core`、`flux-react`、`flux-renderers-*` 到 `flux-lib/`，由 `@nop-chaos/flux` 替代。
3. 后续：如果要统一 UI 来源，先对比 `flux-lib/ui/` 与 `nop-chaos-flux/packages/ui/` 差异，再决定是否通过单独 UI 发行包替换。

当前主项目侧已提供同步脚本：`scripts/sync-flux-lib.sh`

约束：

- 三个项目目录保持同级：`../nop-chaos-flux`、`../nop-chaos-next`、`../amis-react19`
- 默认同步范围是：
  - `../nop-chaos-flux/packages/ui` -> `flux-lib/ui`
  - `../nop-chaos-flux/packages/theme-tokens` -> `packages/theme-tokens`
  - `../nop-chaos-flux/packages/tailwind-preset` -> `packages/tailwind-preset`
- 同步时会删除上游测试源码（`*.test.ts`、`*.test.tsx`、`__tests__`），保证消费侧只保留运行时代码
- 同步完成后会自动执行当前仓库的 `pnpm install`，保证 workspace 链接与根工具链恢复，不允许要求用户再手工修补目标包

因为当前 `pnpm-workspace.yaml` 包含 `flux-lib/*`，任何被复制到 `flux-lib/flux-*` 的目录都会自动变成当前项目 workspace package。这会破坏“Flux 独立编译、主项目只消费发行产物”的边界。因此除 `flux-lib/ui/` 外，不应运行会写入 `flux-lib/flux-*` 的同步流程；除非先调整 workspace glob 和依赖策略。

最终状态：

| 目录/包 | 处理 |
| --- | --- |
| `flux-lib/ui/` | 保留，作为当前项目 UI 工作区包 |
| `flux-lib/flux-*` | 不新增，避免暴露 Flux 内部结构 |
| `@nop-chaos/flux` | 由 `nop-chaos-flux` 独立构建后提供 |

---

## 10. 验证清单

在 `nop-chaos-flux` 中验证：

- `pnpm build` 通过
- `pnpm typecheck` 通过
- `pnpm lint` 通过
- `pnpm --filter @nop-chaos/flux build` 或对应 bundle 构建命令通过
- `pnpm --filter @nop-chaos/flux pack --dry-run` 确认 tarball 内容只包含必要产物
- `pnpm --filter @nop-chaos/flux pack --pack-destination dist-packages` 生成实际 `.tgz`
- packed manifest 中没有 Flux 内部包的 `workspace:*` 依赖
- `dist/index.d.ts` 不暴露 Flux 内部包路径，或这些路径已被作为正式依赖发布
- `./style.css` export 能被消费方导入

在 `nop-chaos-next` 中验证：

- 通过 tarball 安装 `@nop-chaos/flux`
- 安装的 tarball 必须是上一阶段生成的实际 `.tgz`，不能只依赖 `--dry-run` 结果
- `pnpm install` 能解析 `@nop-chaos/flux` 及其 peer/dependencies
- `pnpm typecheck` 通过
- `pnpm build` 通过
- `pnpm lint` 通过
- 配置一个 `pageType: 'flux'` 菜单项后，`RouteRenderer` 能加载真实 Flux 页面
- mock 模式下应至少存在一个可直接访问的 `Flux Demo` 路由，用于验证 `pageType: 'flux'` 的菜单、schema provider 和懒加载边界
- AMIS 页面仍可正常渲染，未被 Flux CSS 或运行时影响

---

## 11. 相关文档与参考资料

相关文档：

- [AMIS 主题桥接](./amis-theme-bridge.md)
- [插件管理页面](./plugin-system.md)
- [插件开发规范](../examples/plugin-dev-guide.md)
- [AMIS helper.css 冲突处理](../bugs/12-amis-helper-css-conflict.md)

外部资料：

- [Vite 8 Library Mode](https://vite.dev/guide/build.html#library-mode)
- [Vite 8 Build Options](https://vite.dev/config/build-options.html)
- [Vite 8 JavaScript API](https://vite.dev/guide/api-javascript.html)
- [Rolldown Introduction](https://rolldown.rs/guide/introduction)
- [pnpm pack](https://pnpm.io/cli/pack)
