# Extension 开发指南（无宿主源码）

> 本文档说明如何**在没有 nop-chaos-next 源码**的情况下，仅凭「打包后的宿主产物 + 官方工具」完成一个 Extension 的**开发、调试、打包与部署**。适用对象：外部业务团队、独立 Extension 项目。
>
> 配套代码：`packages/extension-dev`（官方工具）、`examples/extension-demo`（示例）、`tests/e2e/extension-dev-tooling.spec.ts`（端到端验证）。

## 目录

1. [总体架构](#1-总体架构)
2. [运行时契约](#2-运行时契约)
3. [环境准备](#3-环境准备)
4. [开发循环](#4-开发循环)
5. [打包（如何产出可部署产物）](#5-打包如何产出可部署产物)
6. [调试技巧与常见问题](#6-调试技巧与常见问题)
7. [部署到 nop-web-site](#7-部署到-nop-web-site)
8. [版本契约](#8-版本契约)
9. [官方工具速查](#9-官方工具速查)
10. [验证方式](#10-验证方式)

---

## 1. 总体架构

```
┌──────────────────────────── 运行期（宿主侧，无需源码） ───────────────────────────┐
│                                                                                  │
│  nop-entropy 后端                                 浏览器                          │
│  nop-web-site (META-INF/resources)  ──►  index.html + assets/*（打包好的宿主 SPA） │
│    extensions/<id>/extension.json ──►  Java IndexHtmlProvider                    │
│    extensions/<id>/assets/*            注入 <script data-nop-extension>           │
│                                          └─────► 宿主 bootstrap                   │
│                                                    │                             │
│  ┌──────────────── 宿主共享模块（原生 import map + __NOP_SHARED__ facade）──┐ │
│  │ react / react-dom / @nop-chaos/ui / @nop-chaos/shared /               │       │
│  │ @nop-chaos/plugin-bridge / i18next / zustand / …（SHARED_MODULE_NAMES）│       │
│  └───────────────────────────────────────────────────────────────────────┘       │
│                          ▲ import(entry)（裸名经 import map）                                   │
│  Extension 产物（ESM bundle，只含扩展自身代码，不含共享模块）                     │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── 开发期（无宿主源码） ──────────────────────────────┐
│                                                                              │
│  Extension 项目（独立仓库）                                                    │
│    pnpm dev                     → standalone 预览（UI 快速迭代）              │
│    nop-extension-dev build      → dist/（ESM 产物 + extension.json）          │
│    nop-extension-dev serve      → 用 CORS 静态服务暴露 dist                   │
│    nop-extension-dev dev-in-host→ 代理运行中的宿主，注入 __NOP_EXTENSIONS__    │
│                                    浏览器访问代理 → 真实宿主内联调             │
└──────────────────────────────────────────────────────────────────────────────┘
```

核心结论（为什么可行）：

- **宿主不导出 API**：Extension 通过 `npm 包（SDK，打包后的 JS/CSS + .d.ts）` 与「运行期注入通道」交互，不需要宿主源码。
- **一次 React（统一 ESM）**：扩展构建为 **标准 ESM bundle**，把 `SHARED_MODULE_NAMES` 里的共享依赖全部 external（保留裸名 import）。宿主构建后由 `scripts/build-nop-shared.mjs` 生成**原生 import map** + `nop-shared/<name>.mjs` facade 文件（转发 `window.__NOP_SHARED__` 里的宿主实例，导出清单构建期自动枚举）——浏览器把 `import 'react'` 等解析到宿主同一实例，杜绝双 React 崩溃（详见 §5.1 与 §6.3）。
- **类型校验**：SDK 包（`@nop-chaos/shared`、`@nop-chaos/ui` 等）发布时附带 `.d.ts`，扩展工程 `tsc --noEmit` 即可在编译期校验 `ShellExtension` 等契约。

### 1.1 仓库内示例与外部独立项目

`examples/` 目录下的样本项目**与外部独立项目角色不同**，请勿混淆（详见 §3.3）：

| 路径 | 依赖来源 | 角色 |
|------|---------|------|
| `examples/extension-demo/` | `workspace:*`（monorepo 内部） | E2E 测试、CI 冒烟、参考 ShellExtension 写法 |
| `examples/extension-demo-external/` | `file:./sdks/*.tgz`（**完全独立**） | **外部开发者的真实入口**——模拟拿到 SDK 后的开发环境，含 `dev`（真实后端）与 `dev:mock`（前端 mock）双模式 |
| `examples/amis-prototype-demo/` | `workspace:*` | AMIS schema 原型（演示 amis 在主项目中的渲染） |
| `examples/flux-prototype-demo/` | `workspace:*` | Flux schema 原型 |
| `setup-extension.mjs init` 生成的项目 | `file:.../sdks/*.tgz` | 与 `extension-demo-external` 等价，用于快速初始化新项目 |

---

## 2. 运行时契约

### 2.1 契约常量（单一来源）

| 常量 | 位置 | 含义 |
| --- | --- | --- |
| `HOST_API_VERSION` | `packages/shared/src/version.ts` | 宿主/扩展 API 契约版本（`0.1.0`），宿主启动后暴露为 `window.__NOP_HOST_API_VERSION__` |
| `SHARED_MODULE_NAMES` | `packages/shared/src/plugins/sharedModuleNames.ts` | 宿主运行期提供的共享模块全名（import map 键），extension 构建时必须 external |
| `__NOP_EXTENSIONS__` | `apps/main/src/extensions/config.ts` | 宿主 bootstrap 前可写入的 `ExtensionSource[]` 全局变量（注入通道，优先级最高） |
| `__NOP_HOST_API_VERSION__` | `apps/main/src/extensions/bootstrap.ts` | 宿主暴露的 API 版本全局变量 |

`packages/extension-dev/src/contract.mjs` 维护镜像副本（Node 工具无法直接 import TS），一致性由 `contract.test.mjs` 强制校验。

### 2.2 ExtensionSource（注入通道的数据结构）

```ts
type ExtensionSource =
  | { id: string; entry: string; styleAssets?: string[] }   // 同源路径；裸名依赖由宿主 import map 解析
  | { id: string; load: () => Promise<ExtensionModule> }    // 任意加载方式（可跨域）
```

宿主按 `window.__NOP_EXTENSIONS__` > DOM 注入（`script[data-nop-extension]`）> demo 配置的顺序发现扩展（`getExtensionSources()`）。

### 2.3 ShellExtension（扩展声明的内容）

`ShellExtension` 是扩展向宿主声明「我提供什么」的契约（`packages/shared/src/types/extension.ts`）：`builtinPages`、`themes`、`styles`、`i18nResources`、`systemPages`、`branding`、`loginUi`、`userMenuItems`、`setup()`、`minHostApiVersion` 等。**编译期 `tsc` 会校验该对象** —— 这是"无源码也能类型安全"的关键。

### 2.4 extension.json（部署清单）

每个扩展产物根目录的 `extension.json` 由构建工具自动生成：

```json
{
  "id": "example-extension-demo",
  "name": "Harbor Operations Suite",
  "version": "0.0.1",
  "entry": "./assets/index.js",
  "styleAssets": ["./assets/harbor.css", "./assets/shell.css", "./assets/component-page.css"],
  "assets": ["./assets/harbor-mark.svg"]
}
```

- `id` 必须等于部署目录名（`extensions/<id>/`）。
- Java `IndexHtmlProvider` 读取该文件做服务端注入；宿主的 DOM 扫描也依赖同样的锚点属性。

### 2.5 宿主打包产物清单（扩展开发者视角）

`pnpm build`（`apps/main`）产出的 `dist/`（或部署到 `nop-web-site` 的 `META-INF/resources/`）结构：

| 路径 | 是什么 | 对扩展开发者的意义 |
| --- | --- | --- |
| `index.html` | 宿主页面入口，内含 `<!--nop-shared-import-map-->` 注入的原生 `<script type="importmap">`（在一切 module script 之前） | 扩展的裸名 import（react、@nop-chaos/ui…）就在这里解析 |
| `nop-shared/<name>.mjs`（19 个，含渲染引擎 flux/amis 系） | `scripts/build-nop-shared.mjs` 生成的 **facade**：转发 `window.__NOP_SHARED__` 上的宿主实例，导出清单自动枚举 | 扩展通过 import map 最终拿到宿主同一份 react/ui 实例 |
| `nop-shared/_registry.js` + `*.js` | 旧的 SystemJS shim（插件通道兼容，`.system.js` 插件使用） | 一般无需关心 |
| `assets/*` | 宿主自身的 ESM 分块/CSS（react 等共享包**内嵌**其中，不单独暴露） | **不要**直接引用这些 chunk；共享依赖一律走 import map |
| `extensions/<id>/` | 由 `prebuild` + `scripts/sync-extension-demo.sh` 同步进来的**已部署形态扩展产物**（extension.json + assets） | 上线产物的参照物；外部扩展最终也以同样布局部署 |
| `plugins/`、`vendor/`、`mock/`、`api/`、`data/`、`locales/` | 插件包、字体图标、mock/预览数据、静态数据、语言包 | 一般无需关心 |

构建模式差异：
- **完整构建**（`pnpm build`，含 `sync-site.sh` 前序）：`prebuild` 会先构建 `plugin-demo` 与 `example-extension-demo` 并同步进 `dist/extensions/`；
- **mock 构建**（`vite build --mode devtools-e2e`，仓库 E2E 用）：不跑 prebuild，所以 `dist/extensions/` 为空 —— 用于「没有后端也能跑宿主」的本地联调（见 §4.2 末）。

### 2.6 四种「宿主从哪里来」的调试环境

| 环境 | 宿主来源 | 后端 | 适合 |
| --- | --- | --- | --- |
| ① standalone | 无（只有 SDK） | 无 | UI 快速迭代 |
| ② 真实宿主 | nop-entropy 本地启动（加载 nop-web-site 产物） | 真实 | 上线前完整联调 |
| ③ mock 宿主 | 本地 mock 构建产物 + `vite preview`（仓库 `devtools-e2e` 模式，无需宿主源码） | 内存 mock API | 没有后端/不想搭后端时的集成调试 |
| ④ 远程宿主 | 测试环境 URL | 真实 | 团队共享联调 |

---

## 3. 环境准备

### 3.1 SDK 的产出与分发（本仓库侧）

SDK = 6 个包：`@nop-chaos/{shared, plugin-bridge, ui, theme-tokens, tailwind-preset, extension-dev}`。没有公共 npm registry 也能分发——仓库内置了完整的「打包 → 分发」管线：

```bash
# 1) 打出全部 SDK tarball（自动构建各包 dist + 组装发布 manifest + npm pack）
pnpm pack:sdk          # → dist/sdks/*.tgz × 11（6 个 SDK + 5 个渲染引擎 vendored）
#     （flux/amis 系 tgz 直接复用 libs/ 上游产物，版本跟随上游）
#     同时生成 version-manifest.json（宿主依赖版本）+ setup-extension.mjs（项目初始化脚本）

# 2a) 形态一：tarballs 目录直接分发
#     把 dist/sdks/ 拷给对方（共享盘/邮件/内网 git），消费侧：
pnpm add file:/path/to/dist/sdks/nop-chaos-shared-0.1.0.tgz \
          file:.../nop-chaos-plugin-bridge-0.1.0.tgz \
          file:.../nop-chaos-ui-0.1.0.tgz \
          file:.../nop-chaos-theme-tokens-0.1.0.tgz \
          file:.../nop-chaos-tailwind-preset-0.1.0.tgz \
          file:.../nop-chaos-extension-dev-0.1.0.tgz

# 2b) 形态二：HTTP 文件服务器（公司内网静态目录/对象存储）
pnpm add https://internal.example.com/nop-sdks/nop-chaos-shared-0.1.0.tgz ...

# 2c) 形态三：本地私有 registry（verdaccio，体验与官方 npm 一致，长线推荐）
pnpm dlx verdaccio --config tools/verdaccio/config.yaml &   # 起在 127.0.0.1:4873
bash tools/verdaccio/publish.sh                              # 发布全部 tarball（免交互登录）
# 消费侧（项目里写 .npmrc: registry=http://<verdaccio-host>:4873/）：
pnpm add @nop-chaos/shared@0.1.0 @nop-chaos/ui@0.1.0 @nop-chaos/plugin-bridge@0.1.0 \
  @nop-chaos/theme-tokens@0.1.0 @nop-chaos/tailwind-preset@0.1.0
pnpm add -D @nop-chaos/extension-dev@0.1.0
```

要点：

- tarball 内含 **ESM dist + 完整 `.d.ts`**（`tools/build-lib.mjs`：rollup+esbuild 出 ESM，tsc `--emitDeclarationOnly` 出类型），编译期类型校验即刻可用；
- workspace 的 package.json **不被改动**（仍是源码直引），打包在暂存目录组装发布 manifest，`private`/devDeps 均已剥离；
- 版本纪律：所有 SDK tarball 统一版本（`tools/pack-sdks.mjs` 里 `SDK_VERSION`），与宿主 `HOST_API_VERSION` 同步 bump（见 §8）。

### 3.2 扩展工程侧的安装（推荐：setup-extension 脚本）

`dist/sdks/` 目录下附带 `setup-extension.mjs`，自动从 `version-manifest.json` 读取宿主实际使用的依赖版本，无需手动指定：

```bash
# 方式一：新建扩展项目（目标目录必须无 package.json）
node /path/to/dist/sdks/setup-extension.mjs init --id my-ext --name "My Extension" --target /path/to/project

# 方式二：向已有项目添加 SDK 依赖（目标目录必须有 package.json）
node /path/to/dist/sdks/setup-extension.mjs add --target /path/to/project

# 两种方式完成后，安装依赖：
cd /path/to/project && pnpm install
```

脚本自动完成：
- 安装 6 个 SDK 包 + 5 个 vendored 渲染引擎（flux/amis）用于编译期类型
- 设置 React/ReactDOM 版本与宿主一致（从 `apps/main/package.json` 读取）
- 添加 `@types/react`、`@types/react-dom`、vite、typescript 等 devDependencies
- 生成 `tsconfig.json`、`vite.config.ts`（init 模式）
- 添加 `typecheck` 和 `build` 脚本

手动安装（不使用脚本）：

```bash
# 按上面任一形态装好 SDK 后，补齐运行时对等依赖：
pnpm add react react-dom
pnpm add -D vite typescript @vitejs/plugin-react @types/react @types/react-dom
```

典型工程结构（以仓库内 `examples/extension-demo` 为模板）：

```
extension-project/
├── src/
│   ├── index.ts              # export default extension（ShellExtension 契约）
│   ├── pages/…               # builtin 页面组件
│   ├── standalone/main.tsx   # standalone 预览入口（只依赖 SDK，不依赖宿主）
│   ├── theme.css / shell.css / component-page.css
│   ├── harbor-mark.svg       # 静态资产（new URL 引用或直接 import）
│   └── index.test.ts         # 单测
├── public/locales/{lng}/translation.json   # 远程 i18n 资源（构建时拷入 dist）
├── vite.config.ts            # 仅 standalone dev 用
├── tailwind.config.ts        # presets: [nopTailwindPreset]
└── package.json
```

### 3.3 `examples/extension-demo` vs `examples/extension-demo-external` vs `setup-extension.mjs`：角色差异

仓库内有**两个**示例扩展项目，加 `setup-extension.mjs` 生成的模板，三者**结构等价**但**依赖声明不同**——这是有意设计，请勿混淆：

| 项目 | 依赖来源 | 用途 | 谁用 |
|------|---------|------|------|
| `examples/extension-demo` | `workspace:*`（monorepo 内部包） | E2E 验证 build 管线、CI 冒烟测试、参考 ShellExtension 写法 | 主项目开发者、CI |
| `examples/extension-demo-external` | `file:./sdks/*.tgz`（**完全独立**） | 模拟外部业务团队拿到 SDK 后的真实开发环境，含 `dev`（真实后端）与 `dev:mock`（前端 mock）两种模式 | 外部开发者、CI 端到端模拟 |
| `setup-extension.mjs init` 生成的项目 | `file:.../sdks/*.tgz` | 快速初始化新项目；产物等价于 `extension-demo-external` | 外部开发者（首次创建） |

**为什么需要两个 `extension-demo`？**
- `extension-demo`（workspace）—— 内部开发快，但 CI 不能假设 monorepo 上下文
- `extension-demo-external`（file:）—— 验证"无 workspace、只有 sdks/"的真实场景，CI 必须先 `pnpm pack:sdk` 再跑

**`extension-demo-external` 的双模式 dev：**

| 命令 | 后端要求 | 数据来源 |
|------|---------|---------|
| `pnpm dev` | **Java 后端运行中**（如 nop-entropy 的 quarkusDev） | 后端 `/r/*`、`/graphql`、`/q/*` 等真实 API |
| `pnpm dev:mock` | **无后端** | 前端 mock 数据（需先构建 mock 版本的宿主 dist） |
| `pnpm dev:standalone` | 无 | 只显示扩展 UI，不连宿主 |

**`dev:mock` 前置步骤**（一次性）：
```bash
# 构建带 mock API 的宿主
VITE_ENABLE_MOCK=true pnpm --filter @nop-chaos/main exec vite build --mode devtools-e2e
node scripts/build-nop-shared.mjs
```

**`dev` 模式的后端要求**：
- 默认代理到 `http://localhost:8080`
- 可通过 `BACKEND_ORIGIN=http://host:port` 覆盖
- 代理路径：`/r/*`、`/graphql`、`/p/*`、`/f/*`、`/q/*`
- 这是宿主原 `vite dev` 模式下的 proxy 在我们的 plugin 里复刻（生产 dist 不含 proxy）

**`extension-demo-external` 的初始化流程**（模拟外部开发者）：
```bash
cd examples/extension-demo-external
pnpm setup          # 把 ../../dist/sdks/*.tgz 拷到 ./sdks/
pnpm install        # preinstall hook 校验 sdks/ 完整
pnpm verify:imports # 加载每个 SDK 确认导出齐全
pnpm dev            # 或 dev:mock
```

**如何验证「外部项目能用」？**
仓库已有专门的 E2E 测试覆盖：
- `pnpm test:e2e:extension-dev` — 模拟"外部开发者拿到 sdks/ 后从零搭建项目"的完整流程（setup-extension → install → build → host 加载）
- `extension-demo-external` 的 `pnpm verify:imports` — 在 CI 端到端验证每个 SDK 包的导出可用

**如何手动验证？**
```bash
# 1. 打包 SDK
pnpm pack:sdk

# 2. 走 extension-demo-external 的完整链路
cd examples/extension-demo-external
pnpm setup
pnpm install
pnpm verify:imports
HOST_DIST=../../apps/main/dist pnpm dev
# → 浏览器打开 http://localhost:4180/ 看效果
```

---

## 4. 开发循环

无宿主源码时，一条完整的开发闭环包含三个层次，由浅入深：

### 4.1 层次一：单命令调试（推荐，单进程）

**前提**：获取宿主打包产物 `dist/`（含 `index.html` + `assets/` + `nop-shared/`）。从本仓库构建：
```bash
pnpm --filter @nop-chaos/main build   # 产出 apps/main/dist/
```

```bash
# 单命令：宿主页面 + 自动注入本扩展 + 扩展源 HMR
HOST_DIST=/path/to/apps/main/dist pnpm dev
# 浏览器打开 http://localhost:4180/ —— 完整宿主页面 + 你的扩展已加载
```

工作机制：`vite.config.ts` 内置的 `hostShellPlugin` 把宿主 dist 静态文件服务出来，注入 `window.__NOP_EXTENSIONS__` 让宿主加载 `/src/index.ts`（Vite 提供，HMR 即时生效）。无需 `serve`、`dev-in-host`、`build` 三套进程。

`HOST_DIST` 解析顺序：
1. `HOST_DIST` 环境变量
2. `../../apps/main/dist`（同级放置 nop-chaos-next 仓库）
3. 找不到则降级为 standalone（见 §4.2）

### 4.2 层次二：standalone 预览（无宿主，UI 快速迭代）

```bash
pnpm dev:standalone   # vite --config vite.standalone.config.ts
```

- 只依赖 SDK 包，不碰宿主、不需要后端。
- 覆盖：页面 UI、组件、样式、主题 token、i18n 文案。
- **不覆盖**：宿主集成（菜单、主题注册、i18n 合并、bridge、权限、真实后端 API）。

### 4.3 层次三：产物构建 + 真实后端联调（上线前必跑）

打包后的产物用于部署到 nop-web-site。联调可走 §4.1 或传统方式（`dev-in-host`）：

```bash
# 1. 构建扩展产物（标准 ESM bundle）
pnpm build

# 2. 用 CORS 静态服务暴露产物
node node_modules/@nop-chaos/extension-dev/src/cli.mjs serve --dir dist --port 4180

# 3. 代理宿主并注入扩展
node node_modules/@nop-chaos/extension-dev/src/cli.mjs dev-in-host \
  --backend http://127.0.0.1:8080 \
  --extension my-ext=http://127.0.0.1:4180/assets/index.js \
  --port 5174
```
> 4180 serve / 4176 dev-in-host），可直接参照或复用。

`dev-in-host` 做了两件事：

1. 反向代理后端所有请求（非 HTML 流量原样透传，HTML 会解压后注入再回传）；
2. 在 `<head>` 之后注入一段内联脚本，设置 `window.__NOP_EXTENSIONS__`（**在宿主 bootstrap 之前生效**，宿主模块脚本是 defer 执行的）。

替代方案（二选一即可）：

- **userscript**：`packages/extension-dev/templates/inject-extensions.user.js`（Tampermonkey 等，`document-start` 设置全局），适合单人不愿起代理进程；
- **DevTools 早断点**：临时应急，不推荐。

> ⚠️ **不要** 把 `dev-in-host --extension` 指向 Vite dev server 的 `src/index.ts` 源码入口来做宿主内联调。源码模式会引入第二份 React（见 §6.3），渲染必崩。源码入口只用于 standalone 预览；宿主内联调一律使用 `build` 产物（构建约 1–3 秒，`vite build --watch` + `serve` 或直接改完就 `nop-extension-dev build`）。

细节：**改代码后刷新页面即生效**（宿主不是 Vite 客户端没有 HMR，但刷新快；已登录态由后端保持）。扩展的 assets（css/svg）按 `new URL(..., import.meta.url)` 相对产物定位，`serve` 对应的目录结构即可让主题/样式/图标全部工作。

### 4.3 层次三：产物验证（上线前必跑）

用与生产完全一致的产物形态做最后验证：

```bash
nop-extension-dev build && nop-extension-dev serve --dir dist --port 4180
# 再用 dev-in-host 指向产物，或直接把产物放进 nop-web-site/extensions/<id>/（§7）
```

仓库内的 `scripts/e2e-extension-dev-servers.sh` 就是这三个服务编排的参考实现。

---

## 5. 打包（如何产出可部署产物）

### 5.1 为什么是"标准 ESM + import map"

扩展最终在宿主页面内**渲染 React 组件树**。如果扩展自带一份 React，宿主一份 React，会触发 `Cannot read properties of null (reading 'useSyncExternalStore')` 一类的双 React 崩溃（React hooks 的 dispatcher 存在各自包的内部全局上，两份实例互不感知）。统一 ESM 的解法是让扩展**不携带共享依赖**：

- `nop-extension-dev build` 以 `SHARED_MODULE_NAMES`（react、react-dom、@nop-chaos/ui、@nop-chaos/shared、@nop-chaos/plugin-bridge、i18next、zustand……以及渲染引擎 @nop-chaos/flux、amis/amis-core/amis-ui/amis-formula，共 19 个）为 external 名单，rollup + esbuild 输出 **标准 ESM**（`format: 'es'`，入口 `assets/index.js`），产物里保留 `import { useState } from "react"` 这类裸名；
- 宿主构建后运行 `scripts/build-nop-shared.mjs`：为每个共享名生成 `nop-shared/<name>.mjs` **facade 文件**（`import { getSharedModule } from './_registry.js'` → 转发宿主 bootstrap 时注册在 `window.__NOP_SHARED__` 上的**同一实例**，导出清单由构建期枚举自动生成——CJS 包用 Node require，TS 包用 esbuild 打包枚举），并在 `index.html` 的 `<head>` 之后注入原生 `<script type="importmap">`（在一切 module script 之前）；
- 浏览器加载扩展时，裸名 `react`、`@nop-chaos/ui` 等经 import map 解析到 facade 文件 → 得到宿主实例 → **宿主与扩展共享同一份 React/UI 单实例**；
- 时间线安全：宿主先在 bootstrap 里调用 `registerBaseSharedModules()` 填充 `__NOP_SHARED__`，之后才加载扩展，facade 求值时注册表必然可读；
- 产物体积因此很小（示例扩展 74KB → 14KB），且 **不依赖 SystemJS**——旧的 `.system.js` 扩展入口仍被兼容（`packages/extension-host` 保留 SystemJS 分支），但新产物全是标准 ESM。

### 5.1.1 扩展内渲染 flux / amis 页面

`SHARED_MODULE_NAMES` 同样覆盖渲染引擎（`@nop-chaos/flux`、`amis`、`amis-core`、`amis-ui`、`amis-formula`）。**扩展内渲染 flux/amis schema 时必须使用宿主实例**，原因不只是双实例崩溃：

- **flux**：宿主的 flux 环境由 `createDefaultFluxEnv` + 宿主 http adapter（走 nop RPC/认证/统一错误处理）构建。扩展自己 `createDefaultFluxEnv` 出的环境会**绕过宿主请求层**（请求不带认证、不走统一拦截）。
- **amis**：`amis-core` 的渲染器注册表是**全局单例**——扩展注册自定义 renderer 必须写进宿主那份 `amis-core`，第二份实例的注册表宿主永远看不到。

用法（扩展构建自动 external，运行期经 import map 落到宿主实例）：

```ts
import { createFluxSchemaRenderer } from '@nop-chaos/flux'; // 类型来自 vendored tarball
import { Renderer } from 'amis-core';                       // 注册自定义 amis renderer → 宿主注册表
```

类型与 standalone 预览来源：`pnpm pack:sdk` 产出的 11 个 tarball 里有 5 个 vendored 渲染引擎包（`nop-chaos-flux-*.tgz`、`amis*-6.13.1-fix.0.tgz`，直接复用 `libs/` 上游产物，版本跟随上游），安装后仅用于**编译期类型与 standalone 预览**；扩展产物构建时它们全部 external，不进 bundle。

### 5.2 命令

```bash
nop-extension-dev build \
  --id my-ext \                # = 部署目录名，必须与 extension.json.id 一致
  --name "My Ext" \
  --version 0.1.0 \
  --entry src/index.ts \       # 默认 src/index.ts
  --out dist                   # 默认 dist（pnpm build --outDir <dir> 亦可）
  # 可选: --no-minify --sourcemap --root <dir>  --define KEY=value
```

### 5.3 产物布局

```
dist/
├── extension.json            # 自动生成（见 §2.4）
├── assets/
│   ├── index.js               # ESM 入口（extension.json.entry）
│   ├── <原文件名>            # 运行时 new URL('./x', import.meta.url) 参照
│   └── <原文件名>-<hash>.<ext># 稳定文件名（Java 服务端预注入用）
└── locales/…                 # public/** 整体拷贝（与 Vite 行为一致）
```

构建工具自动处理：

- `new URL('./xxx.css'|'./xxx.svg'|…, import.meta.url)` 字面量：扫描入口源文件，收集并按**双命名**拷贝进 `assets/`（原文件名供运行期相对解析，hash 名供 `extension.json` 稳定引用）；
- 静态 `import './x.css'` / `import url from './x.svg'`：作为资源 emit 到 `assets/`，CSS 自动进 `styleAssets`；svg 等 default 导出为 `new URL(..., import.meta.url).href`（相对产物定位，开发/部署均正确）；
- `public/**` 递归拷贝进 dist；
- `tsconfig.json` 可选项传给 esbuild（jsx automatic）；
- 未 external 的裸模块在构建期直接报错，提示加入共享名单或安装依赖。

### 5.4 类型与 lint

- `tsc -p tsconfig.json --noEmit`：对 `ShellExtension` 等契约做编译期校验（SDK 包带 `.d.ts`）。
- 不要把 `@nop-chaos/*` / `react` 等共享依赖放进 `dependencies`（它们不进产物；放进 `peerDependencies`/`devDependencies` 仅用于类型与 standalone 预览）。

---

## 6. 调试技巧与常见问题

| 症状 | 原因 | 解决 |
| --- | --- | --- |
| `Cannot read properties of null (reading 'useSyncExternalStore')` / `Invalid hook call`，页面空白 | 双 React：扩展把 React 打进了产物（或联调指向 dev server 源码），宿主另有 React | 一律用 `nop-extension-dev build` 的标准 ESM 产物联调；检查产物首部应为 `import { ... } from "react"` 等裸名（不得含 react 实现大包体） |
| 扩展加载失败但宿主正常 | 入口 URL 跨域无 CORS / 宿主未生成 import map | `serve` 默认开 CORS；确认宿主构建后执行过 `scripts/build-nop-shared.mjs`（index.html 含 `importmap`，`nop-shared/` 有 `.mjs` facade） |
| 样式不生效 | 资产文件名与运行期 URL 不一致 | 检查 `assets/` 是否同时存在原文件名与 hash 名；确认 `styleAssets` 路径无 `..` |
| dev server 源码模式无法 HMR | 宿主不是 Vite 客户端；且源码模式会引入第二份 React | 接受「改 → 构建（1–3s）→ 刷新」；standalone 层才用 Vite dev |
| 控制台有 `[extensions] Failed to load extension` | i18n baseUrl 404、超时（默认 10s）或契约校验失败 | 看错误附带的 source id；`loadExtensionI18nFromBaseUrl` 失败只告警不影响加载 |
| `window.__NOP_HOST_API_VERSION__` 显示旧版本 | 宿主产物过期 | 重新同步 nop-web-site（宿主版本与 SDK 版本必须匹配，见 §8） |

其他工具：

- **React DevTools**：扩展组件就在宿主渲染树里，直接查看 props/state；扩展 ESM 模块在 DevTools 里显示为 `index.js` 帧。
- **宿主日志**：`[extensions]` 前缀输出扩展发现/加载/跳过信息；`window.__NOP_SHARED__` 可检查宿主共享注册表。
- **版本自检**：任意页面控制台 `window.__NOP_HOST_API_VERSION__`。
- **import map 自检**：页面控制台 `import.meta.resolve ? import.meta.resolve('react') : null` 应解析到宿主 `nop-shared/react.mjs`。

---

## 7. 部署到 nop-web-site

```bash
# 产物
nop-extension-dev build --id my-ext --name "My Ext" --version 0.1.0

# 拷贝到宿主静态资源目录（与仓库内 scripts/sync-extension-demo.sh 同理）
cp -r dist/* <nop-entropy>/nop-frontend-support/nop-web-site/src/main/resources/META-INF/resources/extensions/my-ext/
```

生产链路：

1. Java `IndexHtmlProvider` 按白名单读取 `extensions/<id>/extension.json`，向 HTML 注入 `<link data-nop-extension data-nop-extension-id="<id>" href="…/styleAssets…">` 与 `<script type="module" data-nop-extension data-nop-extension-id="<id>" src="…/index.js">`（替换 `<!--NOP_EXTENSIONS_INJECT-->` 标记；该脚本位于宿主 `importmap` 之后，裸名依赖可正常解析）；
2. 宿主 DOM 扫描得到 sources（`getDomExtensionSources`），ESM 入口经原生 `import()` 加载，共享名经 import map 落到宿主 facade（`*.system.js` 旧入口仍兼容走 SystemJS）；样式因已由服务端预注入而不会重复注入（`styleAssets` 去重逻辑见 `applyExtensionDefinitions`）。

---

## 8. 版本契约

- SDK 包版本 = 宿主 API 版本（`HOST_API_VERSION`）。宿主与 SDK **同版本发布**：站点产物发布（`pnpm build` + `sync-site.sh`）与 SDK 发布必须成对进行。
- 扩展声明 `minHostApiVersion`（`ShellExtension` 字段）：
  - 宿主版本不满足时宿主 `logger.warn`（不阻塞加载，兼容「不认识该字段」的旧宿主）；
  - 运行时可通过 `window.__NOP_HOST_API_VERSION__` 自检。
- 分支原则：MAJOR＝契约破坏性变更；MINOR＝向后兼容新增；PATCH＝内部修复。

---

## 9. 官方工具速查

`packages/extension-dev`（`nop-extension-dev` CLI，纯 Node 零构建）：

| 命令 | 用途 |
| --- | --- |
| `dev-in-host --backend <origin> --extension <id>=<url>... [--port 5174]` | 代理宿主 + 注入扩展（推荐的内联调入口） |
| `serve --dir <dist> [--port 4180] [--no-cors]` | CORS 静态服务（暴露构建产物） |
| `build --id <id> --name <name> [--version v] [--entry src/index.ts] [--out dist]` | 标准 ESM 产物 + extension.json + 资产双命名 + public 拷贝（共享名保留裸 import，由宿主 import map 解析） |
| `inject --html <file> --extension <id>=<url>` | 打印注入后的 HTML（手动/CI 场景） |
| 模板 `templates/inject-extensions.user.js` | Tampermonkey 版本注入脚本 |

`dist/sdks/setup-extension.mjs`（随 SDK 分发的项目初始化脚本）：

| 命令 | 用途 |
| --- | --- |
| `init --id <id> --name <name> [--target <dir>]` | 新建扩展项目（目标目录必须无 package.json），生成 package.json / tsconfig.json / vite.config.ts / src/index.ts |
| `add [--target <dir>]` | 向已有项目添加 SDK 依赖（目标目录必须有 package.json），自动设置正确版本 |

编程接口（`@nop-chaos/extension-dev`，带 `.d.ts`）：`buildExtension` / `startDevInHostProxy` / `startStaticServer` / `injectExtensionSources` / `extensionManifestPlugin` / `SHARED_MODULE_NAMES`。

---

## 10. 验证方式

仓库内已内置端到端验证，模拟「无宿主源码」的完整闭环：

```bash
pnpm test:e2e:extension-dev
```

它依次：构建宿主（mock 模式 `devtools-e2e`）→ 构建示例扩展 → 启动 `vite preview`（4175）+ `serve`（4180）+ `dev-in-host`（4176）→ Playwright 只访问代理，断言：

1. 宿主暴露 `__NOP_HOST_API_VERSION__`；
2. 注入的扩展真的被加载（登录页变为扩展提供的 harbor 变体，证明 import map → facade 共享模块链路工作）；
3. 扩展注册的 builtin 页面可渲染（双 React 排查）；
4. `extension.json` 部署清单合法。

单测：`packages/extension-dev`（注入/代理/serve/契约镜像 16 例）、`packages/extension-host`（加载逻辑含 SystemJS 兼容入口 2 例）、`packages/shared`（版本与共享名单）、`examples/extension-demo/src/build.test.ts`（ESM 产物管线回归）。