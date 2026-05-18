# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] @nop-chaos/core 声明了未使用的运行时依赖 `clsx` 和 `react-router-dom`

- **文件**: `packages/core/package.json:8-14`
- **证据片段**:
```json
  "dependencies": {
    "@nop-chaos/shared": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    "clsx": "^2.1.1",
    "react-router-dom": "^7.14.0",
    "systemjs": "^6.15.1"
  },
```
- **严重程度**: P2
- **现状**: `@nop-chaos/core` 的 package.json 将 `clsx`（第12行）和 `react-router-dom`（第13行）声明为直接运行时依赖，但搜索 `packages/core/src/` 下全部 14 个源文件，没有任何文件 import `clsx` 或 import 任何 `react-router-dom` API（如 `Link`、`NavLink`、`useNavigate`、`useLocation` 等）。core 中的所有组件使用 `cn()` from `@nop-chaos/ui` 替代 `clsx`，使用 `onNavigate` 回调 prop 替代 `react-router-dom` 导航。
- **风险**: (1) 虚假的依赖声明会误导后续开发者以为 core 包直接使用了这些库，导致错误假设；(2) 在 core 包独立安装（如果未来从 monorepo 中抽取）时，会拉入不必要的运行时依赖增加包体积；(3) 如果 core 的 peerDependencies 版本约束与 apps/main 的 dependencies 版本不一致，可能引入幽灵依赖版本冲突。
- **建议**: 从 `packages/core/package.json` 的 `dependencies` 中移除 `clsx` 和 `react-router-dom`。`clsx` 已经通过 `@nop-chaos/ui` 间接提供，`react-router-dom` 不被 core 使用。
- **误报排除**: 已逐一检查 core/src 下所有 14 个 .ts/.tsx 文件，确认没有任何直接或间接引用。这不是"看起来多余"而是"实际零引用"。
- **复核状态**: 未复核

---

### [维度01-02] 基线数据中 examples/plugin-demo 的 peerDependencies 列表严重不完整

- **文件**: `examples/plugin-demo/package.json:30-43`
- **证据片段**:
```json
  "peerDependencies": {
    "@nop-chaos/plugin-bridge": "workspace:*",
    "@nop-chaos/shared": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    "@tanstack/react-query": "^5.96.1",
    "i18next": "26.0.5",
    "lucide-react": "^1.7.0",
    "react-i18next": "17.0.4",
    "react-router-dom": "^7.14.0",
    "recharts": "^3.8.1",
    "sonner": "^2.0.7",
    "systemjs": "^6.15.1",
    "zustand": "^5.0.12"
  }
```
- **严重程度**: P2
- **现状**: 审核任务提供的基线数据中，`examples/plugin-demo` 的 peerDependencies 仅列出了 `@nop-chaos/plugin-bridge, @nop-chaos/shared, @nop-chaos/ui` 三个包。实际 package.json 中有 12 个 peerDependencies，包括 `@tanstack/react-query`、`i18next`、`lucide-react`、`react-i18next`、`react-router-dom`、`recharts`、`sonner`、`systemjs`、`zustand` 共 9 个未被基线记录的外部运行时 peer。该插件作为远程插件通过 SystemJS 加载，所有这些 peer 都在宿主端通过 shared modules 注册提供。
- **风险**: 基线数据不完整会导致后续审核维度（如 bundle 策略、externals 对齐）无法正确判断插件期望从宿主获取哪些运行时依赖。如果有新增 peer 没有被宿主注册为 shared module，将导致运行时加载失败。
- **建议**: 更新基线文档以反映完整的 peerDependencies 列表。同时建议将 `react` 和 `react-dom` 也加入 peerDependencies（参见 [维度01-04]）。
- **误报排除**: 实际 package.json 的完整内容已确认，这不是代码问题而是审计输入数据问题，但它直接影响后续维度的审核准确性。
- **复核状态**: 未复核

---

### [维度01-03] 基线数据中 examples/extension-demo 的 peerDependencies 列表不完整

- **文件**: `examples/extension-demo/package.json:29-35`
- **证据片段**:
```json
  "peerDependencies": {
    "@nop-chaos/plugin-bridge": "workspace:*",
    "@nop-chaos/shared": "workspace:*",
    "lucide-react": "^1.7.0",
    "@nop-chaos/ui": "workspace:*",
    "react": "^19.0.0"
  }
```
- **严重程度**: P3
- **现状**: 基线数据记录 extension-demo 的 peers 为 `@nop-chaos/plugin-bridge, @nop-chaos/shared, @nop-chaos/ui`，但实际还包含 `lucide-react` 和 `react`。extension-demo 的代码确实在运行时导入 `lucide-react`（如 `ExtensionLoginPage.tsx` 第 3 行 `import { ArrowRight, KeyRound, ... } from 'lucide-react'`）和 JSX（隐含 react）。
- **风险**: 与 [维度01-02] 相同，基线不完整影响后续审核准确性。风险低于 plugin-demo 因为 extension-demo 是 Vite 应用而非远程加载的 SystemJS 插件，其 peer 期望的表达方式不同。
- **建议**: 更新基线数据以包含完整的 peerDependencies。
- **误报排除**: 实际代码确认 lucide-react 和 react 是运行时必需的。
- **复核状态**: 未复核

---

### [维度01-04] examples/plugin-demo 缺少 `react` 和 `react-dom` 的 peerDependencies 声明

- **文件**: `examples/plugin-demo/package.json:14-43`
- **证据片段**:
```json
  "devDependencies": {
    ...
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    ...
  },
  "peerDependencies": {
    "@nop-chaos/plugin-bridge": "workspace:*",
    "@nop-chaos/shared": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
    ...
    /* 注意: react 和 react-dom 不在此列表中 */
  }
```
- **严重程度**: P3
- **现状**: `examples/plugin-demo/src/index.tsx` 使用 JSX（第 13 行 `export default function PluginDemo()` 的返回值为 JSX），这隐式依赖 `react` 和 `react/jsx-runtime`。构建脚本 `scripts/build-with-rollup.mjs` 第 26-28 行显式将 `react`、`react-dom`、`react/jsx-runtime`、`react/jsx-dev-runtime` 标记为 external，确认运行时由宿主提供。但 `react` 和 `react-dom` 仅在 devDependencies 中出现，未在 peerDependencies 中声明。
- **风险**: 功能上无影响（rollup 已 externalize，运行时由宿主 SystemJS 注册提供），但作为接口契约文档，缺少 `react` peer 不利于理解插件与宿主之间的运行时依赖约定。如果有人仅根据 peerDependencies 判断插件需要宿主提供哪些模块，会遗漏 react。
- **建议**: 将 `react: "^19.0.0"` 和 `react-dom: "^19.0.0"` 添加到 `peerDependencies`，与 rollup external 列表保持一致。
- **误报排除**: 由于 plugin-demo 是 private 包且 rollup 构建已正确 externalize，这不会导致运行时错误，因此不是 P0/P1。但作为接口声明的一致性问题，值得记录。
- **复核状态**: 未复核

---

### [维度01-05] examples/extension-demo 中 `react-router-dom` 在 devDependencies 中但代码未引用

- **文件**: `examples/extension-demo/package.json:22`
- **证据片段**:
```json
  "devDependencies": {
    ...
    "react-router-dom": "^7.14.0",
    ...
  }
```
- **严重程度**: P3
- **现状**: `examples/extension-demo/package.json` 的 devDependencies 中包含 `react-router-dom: "^7.14.0"`（第22行），但搜索 `examples/extension-demo/src/` 下全部源文件，没有任何文件 import `react-router-dom` 或使用其 API。extension-demo 使用 `getPluginBridge().navigate()` 进行导航而非 react-router-dom。
- **风险**: 作为 devDependency 的多余声明影响极小（不增加运行时 bundle），但会误导开发者以为 extension-demo 使用了 react-router-dom。在 `pnpm install` 时会不必要地安装该包。
- **建议**: 从 devDependencies 中移除 `react-router-dom`。
- **误报排除**: 已检查 extension-demo/src/ 下全部文件，确认零引用。如果 vite.config.ts 或其他配置文件间接需要它作为类型来源，那就不是误报，但 extension-demo 不涉及路由配置。
- **复核状态**: 未复核

---

## 依赖图

```
                    ┌─────────────────────┐
                    │    apps/main         │
                    └──────┬──────────────┘
                           │ depends on
          ┌────────────────┼────────────────────┐
          ▼                ▼                     ▼
   ┌──────────────┐ ┌───────────────┐   ┌──────────────────┐
   │ @nop-chaos/  │ │ @nop-chaos/   │   │  @nop-chaos/     │
   │ shared       │ │ core          │   │  plugin-bridge   │
   │ (leaf)       │ │ shared+ui     │   │  shared          │
   └──────────────┘ │ +clsx(unused) │   └──────────────────┘
          ▲         │ +rrd(unused)  │             │
          │         │ +systemjs     │             │ deps on
          │         └──────┬────────┘             ▼
          │                │              ┌──────────────┐
          │                ▼              │ @nop-chaos/  │
          │         ┌──────────────┐      │ shared       │
          │         │ @nop-chaos/  │      └──────────────┘
          │         │ ui (leaf)    │
          │         └──────────────┘
          │
   ┌──────┴──────────┐  ┌──────────────────┐
   │ @nop-chaos/     │  │ @nop-chaos/      │
   │ amis-core       │  │ extension-host   │
   │ shared          │  │ shared           │
   └──────┬──────────┘  └──────────────────┘
          ▼
   ┌──────────────┐
   │ @nop-chaos/  │     Build-only:
   │ amis-react   │     tailwind-preset, theme-tokens
   │ amis-core+ui │     (no runtime deps)
   └──────────────┘

   External examples:
   plugin-demo: peers=12 (missing react/react-dom)
   extension-demo: peers=5 (unused react-router-dom in devDeps)
```

## 合规包清单

| 包名 | 合规 |
|------|------|
| @nop-chaos/shared | 零依赖 — 合规 |
| @nop-chaos/ui | 零 @nop-chaos 依赖 — 合规 |
| @nop-chaos/plugin-bridge | 仅依赖 shared — 合规 |
| @nop-chaos/amis-core | 仅依赖 shared — 合规 |
| @nop-chaos/amis-react | 仅依赖 amis-core + ui — 合规 |
| @nop-chaos/extension-host | 仅依赖 shared — 合规 |
| @nop-chaos/tailwind-preset | 无运行时依赖 — 合规 |
| @nop-chaos/theme-tokens | 无运行时依赖 — 合规 |
| apps/main | 依赖所有包 — 合规 |

## 额外检查

- 跨包内部路径导入：**零发现**
- 循环依赖：**不可能**（strict DAG）
- exports 字段：两组模式，组内一致
- 缺失 build 脚本：**零发现**
