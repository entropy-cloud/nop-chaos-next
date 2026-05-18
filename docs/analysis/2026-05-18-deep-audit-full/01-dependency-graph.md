# 维度 01：依赖图与包边界

## 第 1 轮（初审）

# 维度 01（依赖图与包边界）第 1 轮初审

本轮已先阅读：

- `C:\can\nop\nop-chaos-next\docs\index.md`
- `C:\can\nop\nop-chaos-next\AGENTS.md`
- `C:\can\nop\nop-chaos-next\tsconfig.base.json`

本轮已覆盖目录：

- `C:\can\nop\nop-chaos-next\apps\main`
- `C:\can\nop\nop-chaos-next\examples\plugin-demo`
- `C:\can\nop\nop-chaos-next\examples\extension-demo`
- `C:\can\nop\nop-chaos-next\packages\shared`
- `C:\can\nop\nop-chaos-next\packages\core`
- `C:\can\nop\nop-chaos-next\packages\plugin-bridge`
- `C:\can\nop\nop-chaos-next\packages\amis-core`
- `C:\can\nop\nop-chaos-next\packages\amis-react`
- `C:\can\nop\nop-chaos-next\packages\theme-tokens`
- `C:\can\nop\nop-chaos-next\packages\tailwind-preset`
- `C:\can\nop\nop-chaos-next\packages\extension-host`
- `C:\can\nop\nop-chaos-next\flux-lib\ui`

以上目录均存在，无缺失目录。

---

### [维度01-01] 多个内部库以包形态暴露，但没有独立构建产物与 `tsconfig.build.json`
- **文件**: `C:\can\nop\nop-chaos-next\packages\shared\package.json:5-13`; `C:\can\nop\nop-chaos-next\packages\shared\tsconfig.json:1-4`; `C:\can\nop\nop-chaos-next\packages\core\package.json:5-27`; `C:\can\nop\nop-chaos-next\packages\core\tsconfig.json:1-4`; `C:\can\nop\nop-chaos-next\packages\plugin-bridge\package.json:5-23`; `C:\can\nop\nop-chaos-next\packages\plugin-bridge\tsconfig.json:1-4`; `C:\can\nop\nop-chaos-next\packages\amis-core\package.json:5-16`; `C:\can\nop\nop-chaos-next\packages\amis-core\tsconfig.json:1-4`; `C:\can\nop\nop-chaos-next\packages\amis-react\package.json:5-26`; `C:\can\nop\nop-chaos-next\packages\amis-react\tsconfig.json:1-4`; `C:\can\nop\nop-chaos-next\packages\extension-host\package.json:5-20`; `C:\can\nop\nop-chaos-next\packages\extension-host\tsconfig.json:1-4`
- **证据片段**:
```ts
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit",
```
- **严重程度**: P1
- **现状**: `@nop-chaos/shared`、`@nop-chaos/core`、`@nop-chaos/plugin-bridge`、`@nop-chaos/amis-core`、`@nop-chaos/amis-react`、`@nop-chaos/extension-host` 都以包名被其他应用/包依赖，但 `exports` 直接指向 `src/index.ts`，`build` 仅做 `--noEmit` 类型检查，且本轮未在这些目录下发现 `tsconfig.build.json`。与 `flux-lib/ui`、`packages/theme-tokens`、`packages/tailwind-preset` 的 dist 构建模式不一致。
- **风险**: 这些包在 monorepo 外部消费、独立打包、Node/非 TS-aware 工具解析时，容易出现“包可解析但无实际构建产物”的边界问题；同时也会让“build”脚本名义上是构建，实际上只是类型检查，削弱依赖图治理。
- **建议**: 二选一统一治理：其一，为这些库补齐 `tsconfig.build.json`、输出 `dist`、并将 `exports/main/types` 指向构建产物；其二，如果明确是 repo 内部 source-only 包，则应显式收敛这种定位，避免保留误导性的包级 `build` 语义。
- **误报排除**: 这不是单纯的仓内开发便利性问题；这些目录都有正式包名、`exports`、且被 `apps/main` 等作为 workspace 依赖消费，已经具备“包边界”语义。
- **复核状态**: `未复核`

### [维度01-02] `tsconfig.base.json` 的通配路径别名绕过了包的公开导出边界
- **文件**: `C:\can\nop\nop-chaos-next\tsconfig.base.json:21-40`; `C:\can\nop\nop-chaos-next\packages\shared\package.json:5-7`; `C:\can\nop\nop-chaos-next\packages\amis-core\package.json:5-7`; `C:\can\nop\nop-chaos-next\packages\amis-react\package.json:5-7`; `C:\can\nop\nop-chaos-next\packages\plugin-bridge\package.json:5-7`; `C:\can\nop\nop-chaos-next\packages\theme-tokens\package.json:11-17`; `C:\can\nop\nop-chaos-next\packages\tailwind-preset\package.json:9-14`; `C:\can\nop\nop-chaos-next\flux-lib\ui\package.json:11-26`
- **证据片段**:
```ts
    "paths": {
      "@nop-chaos/shared": ["packages/shared/src/index.ts"],
      "@nop-chaos/shared/*": ["packages/shared/src/*"],
      "@nop-chaos/amis-core": ["packages/amis-core/src/index.ts"],
      "@nop-chaos/amis-core/*": ["packages/amis-core/src/*"],
      "@nop-chaos/amis-react": ["packages/amis-react/src/index.ts"],
      "@nop-chaos/amis-react/*": ["packages/amis-react/src/*"],
```
- **严重程度**: P2
- **现状**: TypeScript 层面对多个包都开放了 `@nop-chaos/*/* -> src/*` 的源码级通配映射，但对应 `package.json` 的 `exports` 并不等价：如 `@nop-chaos/shared` 仅导出 `.`，`@nop-chaos/ui` 仅导出少数白名单子路径。当前这会让“未公开的内部文件”在仓内依然可被编译通过。
- **风险**: 未来一旦有人写出 `@nop-chaos/shared/foo`、`@nop-chaos/ui/components/...` 之类的跨包内部导入，TS 会放行，但真实包导出契约并未承诺这些路径；结果是仓内能跑、包边界实际已破。
- **建议**: 将 `paths` 收敛到真实公开入口；只为确有 `exports` 的子路径保留 alias；最好增加一层静态检查，防止导入未公开子路径。
- **误报排除**: 本轮在受检源码中未发现实际 `@nop-chaos/*/内部路径` 违规导入，因此这条是“配置级边界缺口”，不是已落地的大面积源码违规；但缺口本身客观存在。
- **复核状态**: `未复核`

### [维度01-03] 根级消费者直接导入 `tailwind-preset` 的私有 `src` 路径
- **文件**: `C:\can\nop\nop-chaos-next\tailwind.config.ts:1-5`; `C:\can\nop\nop-chaos-next\packages\tailwind-preset\package.json:9-14`
- **证据片段**:
```ts
import type { Config } from 'tailwindcss';
import { nopTailwindPreset } from './packages/tailwind-preset/src';

const config: Config = {
  presets: [nopTailwindPreset],
```
- **严重程度**: P2
- **现状**: 根目录 `tailwind.config.ts` 没有通过 `@nop-chaos/tailwind-preset` 的公开入口消费包，而是直接穿透到 `./packages/tailwind-preset/src`。这已经是一次真实的“跨包内部路径导入”。
- **风险**: 根配置与包内部目录结构强耦合；后续若切换为 dist-only 构建、调整目录布局、或收紧导出映射，根配置会直接失效，并掩盖包边界问题。
- **建议**: 改为通过 `@nop-chaos/tailwind-preset` 公开入口导入；若确需未构建源码消费，也应在包边界策略中明确，而不是绕开 `exports`。
- **误报排除**: 这不是普通相对路径的 app-local 导入；目标是另一个 workspace 包的 `src` 私有目录，符合本次审计的“跨包内部路径导入”定义。
- **复核状态**: `未复核`

## 内部依赖图

以下依赖图以本轮读取的 `package.json`、`src/index.ts`、以及必要导入点为依据，优先反映内部包/应用之间的真实依赖关系。

- `@nop-chaos/shared`
  - 无内部 `@nop-chaos/*` 依赖。

- `@nop-chaos/ui`（目录实际位于 `C:\can\nop\nop-chaos-next\flux-lib\ui`）
  - 无内部 `@nop-chaos/*` 依赖。

- `@nop-chaos/core`
  - 依赖 `@nop-chaos/shared`
  - 依赖 `@nop-chaos/ui`

- `@nop-chaos/plugin-bridge`
  - 依赖 `@nop-chaos/shared`

- `@nop-chaos/amis-core`
  - 依赖 `@nop-chaos/shared`

- `@nop-chaos/amis-react`
  - 依赖 `@nop-chaos/amis-core`
  - 依赖 `@nop-chaos/ui`

- `@nop-chaos/theme-tokens`
  - 无内部 `@nop-chaos/*` 依赖。

- `@nop-chaos/tailwind-preset`
  - 无内部 `@nop-chaos/*` 依赖。

- `@nop-chaos/extension-host`
  - 依赖 `@nop-chaos/shared`

- `@nop-chaos/main`（`apps/main`）
  - 依赖 `@nop-chaos/amis-core`
  - 依赖 `@nop-chaos/amis-react`
  - 依赖 `@nop-chaos/core`
  - 依赖 `@nop-chaos/extension-host`
  - 依赖 `@nop-chaos/plugin-bridge`
  - 依赖 `@nop-chaos/shared`
  - 依赖 `@nop-chaos/ui`

- `@nop-chaos/plugin-demo`（`examples/plugin-demo`）
  - 源码实际使用 `@nop-chaos/plugin-bridge`
  - 源码实际使用 `@nop-chaos/ui`
  - `peerDependencies` 中还声明了 `@nop-chaos/shared`，但本轮未见源码直接使用

- `@nop-chaos/example-extension-demo`（`examples/extension-demo`）
  - 依赖 `@nop-chaos/plugin-bridge`
  - 依赖 `@nop-chaos/shared`
  - 依赖 `@nop-chaos/ui`
  - 在 `tailwind.config.ts` 中依赖 `@nop-chaos/tailwind-preset`
  - 在 standalone 入口中依赖 `@nop-chaos/theme-tokens`

图上未发现内部包之间的直接循环依赖迹象，也未发现从低层包反向依赖高层包的回边。

## 违规清单

本轮确认的边界问题共有 3 项：

- [维度01-01] 多个内部库以包形态暴露，但没有独立构建产物与 `tsconfig.build.json`
- [维度01-02] `tsconfig.base.json` 的通配路径别名绕过了包的公开导出边界
- [维度01-03] 根级消费者直接导入 `tailwind-preset` 的私有 `src` 路径

其中：

- 已落地的真实跨包内部路径导入：`[维度01-03]`
- 配置层的边界缺口：`[维度01-02]`
- 包构建/发布形态不完整：`[维度01-01]`

## 合规清单

以下规则在本轮检查范围内未发现违规：

- 规则 1：`@nop-chaos/shared` 不能依赖任何其他 `@nop-chaos/*`
  - 已检查 `package.json` 与源码导入，未发现内部依赖。

- 规则 2：`@nop-chaos/ui` 不能依赖 `@nop-chaos/core`、`@nop-chaos/plugin-bridge`、`apps/*`
  - 已检查 `flux-lib/ui/package.json` 与源码导入，未发现违规方向依赖。

- 规则 3：`@nop-chaos/core` 只能依赖 `@nop-chaos/shared` 和 `@nop-chaos/ui`
  - `package.json` 与源码导入均符合。

- 规则 4：`@nop-chaos/plugin-bridge` 只能依赖 `@nop-chaos/shared`
  - `package.json` 与源码导入均符合。

- 规则 5：`@nop-chaos/amis-core` 只能依赖 `@nop-chaos/shared`
  - `package.json` 与源码导入均符合。

- 规则 6：`@nop-chaos/amis-react` 只能依赖 `@nop-chaos/amis-core`、`@nop-chaos/shared` 和 `@nop-chaos/ui`
  - 当前实际内部依赖为 `@nop-chaos/amis-core`、`@nop-chaos/ui`，未超界。

- 规则 7：`@nop-chaos/theme-tokens` 和 `@nop-chaos/tailwind-preset` 不能依赖任何运行时包
  - 未发现它们依赖任何内部运行时包；`theme-tokens` 无内部依赖，`tailwind-preset` 仅见 Tailwind 构建侧依赖。

- 规则 8：`apps/main` 可以依赖所有 `@nop-chaos/*` 包
  - 本轮观察到的内部依赖方向均允许。

- 规则 9：`examples/plugin-demo` 只能依赖 `peerDependencies` 中声明的包
  - 本轮检查到的源码导入与 `build-with-rollup.mjs` external 列表均落在其 `peerDependencies` 声明范围内。

补充合规结论：

- 本轮未在受检应用/包源码中发现 `from '@nop-chaos/包名/内部文件'` 形式的实际源码违规导入。
- `@nop-chaos/ui`、`@nop-chaos/theme-tokens`、`@nop-chaos/tailwind-preset` 三个包具备较完整的 dist 导向构建配置。
- 未发现内部循环依赖的直接证据。

## 总结评估

本轮维度 01 初审结论：

- 依赖方向总体健康，核心分层基本符合既定规则。
- 当前最主要的问题，不是低层包反向依赖高层包，也不是明显循环依赖，而是“包边界治理不一致”：
  - 一部分包是 dist 导向构建；
  - 另一部分包则是 source-only 公开；
  - 同时 `tsconfig.base.json` 还把内部源码子路径整体暴露出来。
- 已确认 1 处真实跨包内部路径导入（根 `tailwind.config.ts` 直接导入 `packages/tailwind-preset/src`）。
- 已确认 1 组系统性构建边界问题（多个内部库无独立构建产物/无 `tsconfig.build.json`）。
- 已确认 1 组系统性导出边界缺口（`paths` 通配 alias 超出 `exports` 契约）。

综合判断：

- **总体评估**: 边界规则“方向上大体合规”，但“包导出与构建契约”存在结构性松动。
- **优先级建议**:
  1. 先修复 `[维度01-01]`，统一内部库的构建/导出模式。
  2. 再修复 `[维度01-03]`，消除已存在的跨包内部路径导入。
  3. 最后收紧 `[维度01-02]`，把 TS alias 与公开导出面重新对齐。

## 深挖第 2 轮追加

### [维度01-04] `apps/main` 直接穿透 `@nop-chaos/theme-tokens` 的私有样式源码，并绕过已声明公开导出
- **文件**: `apps/main/src/main.tsx:12-15`; `packages/theme-tokens/package.json:11-17`; `examples/extension-demo/src/standalone/main.tsx:3-5`
- **证据片段**:
```ts
import './styles/tailwind.css';
import '../../../packages/theme-tokens/src/styles.css';
import '@nop-chaos/ui/styles.css';

"exports": {
  "./styles.css": "./dist/styles.css"
}
```
- **严重程度**: P1
- **现状**: `@nop-chaos/theme-tokens` 已通过 `package.json` 正式公开 `./styles.css`，且 `examples/extension-demo` 已按 `@nop-chaos/theme-tokens/styles.css` 使用；但 `apps/main` 仍直接相对路径导入 `packages/theme-tokens/src/styles.css`。同时 `apps/main/package.json` 未显式声明 `@nop-chaos/theme-tokens` 依赖，依赖图里也看不见这条真实依赖。
- **风险**: 这是“跨包内部路径导入 + 隐式未声明依赖”的组合问题，会让依赖图失真；未来一旦 `theme-tokens` 切到 dist-only、调整目录、或在仓外复用 `apps/main` 构建逻辑，主应用会直接失效。
- **建议**: 将导入改为 `@nop-chaos/theme-tokens/styles.css`，并在 `apps/main/package.json` 中显式声明 `@nop-chaos/theme-tokens`。
- **误报排除**: 这不是 app-local 相对导入；目标是另一个 workspace 包的 `src` 私有目录，且同仓已有消费者证明公开子入口可正常使用。
- **复核状态**: `未复核`

## 维度复核结论

- [维度01-01]: 降级 (P3)。live code 确认这些包采用 `exports -> src` 且 `build` 仅做 `--noEmit`，但当前仓库整体就是 workspace 源码消费模式，暂无证据证明它们必须产出独立 `dist`。
- [维度01-02]: 降级 (P3)。`tsconfig.base.json` 的通配映射确实宽于部分包的 `exports`，但复核未发现 live code 已实际出现 `@nop-chaos/包名/内部路径` 导入，属于配置级边界缺口。
- [维度01-03]: 降级 (P3)。根 `tailwind.config.ts` 直接导入 `./packages/tailwind-preset/src` 属实，但问题发生在仓库根构建配置层，影响面小于应用运行时或已发布包契约破坏。
- [维度01-04]: 降级 (P2)。`apps/main/src/main.tsx` 真实穿透 `packages/theme-tokens/src/styles.css`，且 `apps/main/package.json` 未声明 `@nop-chaos/theme-tokens`，这是已落地的跨包私有路径导入并使依赖图失真。
