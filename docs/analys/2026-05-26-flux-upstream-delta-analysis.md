# sync-flux / nop-chaos-flux 差异分析

## 结论先行

- 原则上应该优先改 `nop-chaos-flux` 上游，再同步到 `nop-chaos-next`。
- `nop-chaos-flux` 的主要使用者目前确实就是 `nop-chaos-next`，这进一步说明通用库里的通用改动不应长期只保留在下游副本里。
- 当前差异里，只有很少一部分属于“下游同步流程产物”或“宿主集成层暂时兜底”；大部分更像是：
  - 上游已经修了，但下游没同步回来。
  - 下游做了通用改进，却还没回推上游。
  - 历史上为了当前宿主视觉/交互而直接改了通用库，但更合理的做法应该是上游提供可注入机制或语义扩展点。
- React 19 最佳实践相关修改，应该直接在上游落实，然后由下游同步消费，而不是继续在 `nop-chaos-next` 里保留一层 fork。

## 比较基线

- 对比时间：`2026-05-26`
- 上游基线：`C:/can/nop/nop-chaos-flux`
- 上游最近相关提交：`0fadc9a3d92d64b3cd10fb82bcdc551e1b2c7c0d` `fix: close deep audit remediation with full-green verification`
- 对比范围：
  - `nop-chaos-flux/packages/ui` vs `nop-chaos-next/flux-lib/ui`
  - `nop-chaos-flux/packages/theme-tokens` vs `nop-chaos-next/packages/theme-tokens`
  - `nop-chaos-flux/packages/tailwind-preset` vs `nop-chaos-next/packages/tailwind-preset`
- 对比时重点关注源码与包配置；`node_modules`、`dist`、缓存文件不作为主结论依据。
- 另确认：上游这三个包路径当前是干净的，没有未提交工作区改动。

## 差异总览

- `ui`：存在 29 个有意义的源码差异，另有 `package.json` 差异。
- `theme-tokens`：核心差异集中在 `src/index.ts` 和 `src/styles.css`。
- `tailwind-preset`：核心差异集中在 `src/index.ts`。
- 另有一类不是业务差异，而是同步脚本主动造成的差异：`nop-chaos-next/scripts/sync-flux-lib.sh` 会删除同步过来的 `src/**/*.test.*`，因此下游又把相关包的 `test` script 改成了 `vitest run --passWithNoTests`。

## 差异分类与判断

### 1. 已经应该回归上游，甚至上游其实已经更合理了

#### `flux-lib/ui/src/lib/i18n.ts`

- 下游现状：仍是模块级 `let i18nGetter`。
- 上游现状：已经改成 `Symbol.for('nop.ui.i18nBridge')` 的全局桥接实现。
- 判断：这里不是下游定制，而是下游残留旧实现。
- 原因：模块级 getter 在多包、多入口、remote/plugin 场景里更容易出现副本分裂；上游的全局桥接更符合共享库语义。
- 结论：应该以**上游实现为准**，下游本地补丁没有继续存在的必要。

#### `flux-lib/ui/src/components/ui/dialog.tsx`

- 下游现状：删除了上游的拖拽手柄、键盘移动、`DialogDragContext` 等能力。
- 上游现状：能力更完整，也更偏可访问性友好。
- 判断：这不是 React 19 最佳实践驱动的差异，更像历史上的本地简化。
- 结论：若 `nop-chaos-next` 没有明确产品要求必须去掉这些能力，则不应继续作为下游 fork 存在。
- 更合理方向：如果宿主不想显示 drag handle，应由上游提供显式配置，而不是下游直接删实现。

#### `flux-lib/ui/src/components/ui/dropdown-menu.tsx`

- 下游现状：删掉了 `DropdownMenuPositioner`、`DropdownMenuPopup` 导出。
- 仓内搜索：当前未发现实际消费者。
- 判断：这是 API 面分叉，但没有明显收益。
- 结论：历史修改大概率**没必要继续存在**；要么回归上游 API，要么上游正式收缩 API。

### 2. 属于通用修复，应该直接做在上游

#### 交互/缺陷修复

#### `flux-lib/ui/src/components/ui/alert-dialog.tsx`

- 下游增加了 `data-closed:pointer-events-none`。
- 这对应仓内已记录问题：关闭动画阶段 overlay 仍拦截点击。
- 判断：这是典型通用缺陷修复，不是业务定制。
- 结论：应该上游化。

#### React 19 / 通用组件契约改进

#### `flux-lib/ui/src/components/ui/textarea.tsx`

- 下游改成了 `React.forwardRef`。
- 判断：这里真正合理的点是“补齐 ref 能力”，而不是 `forwardRef` 这个实现手段本身。
- React 19 视角下，`forwardRef` 不再是推荐优先方案；如果上游要继续演进，更合理的方向是直接采用 `ref` prop 语义，而不是继续新增 `forwardRef` 用法。
- 结论：如果这个组件确实需要暴露 ref，那么这项能力应在上游统一设计；但不应把“改成 `forwardRef`”表述成 React 19 最佳实践。

### 3. 属于通用主题能力，但现在混入了下游宿主语义

#### `packages/theme-tokens/src/styles.css`

- 下游新增了 `--surface-primary`、`--surface-secondary`、`--surface-ghost`、`--surface-highlight`、`--surface-hover`、`--surface-overlay` 等 surface 语义 token。
- 下游同时新增了多组 `--host-*` token。
- 判断：
  - `surface-*` 是通用语义能力，明显应该上游化。
  - `host-*` 则暴露出下游宿主语义已经渗入通用 token 包，这部分不够理想。
- 结论：
  - `surface-*` 建议保留并上游化。
  - `host-*` 不建议作为“通用库内置宿主定制”长期存在；如果确有需要，应由上游提供扩展槽、主题覆盖约定或额外 token namespace 机制，而不是把 `host` 语义硬编码进通用库默认面。

#### `packages/tailwind-preset/src/index.ts`

- 下游新增了 `backgroundColor.surface*` 工具类，并把若干颜色映射切到新的 surface token。
- 判断：这和上面的 `surface-*` token 是一组配套通用能力，不属于 `nop-chaos-next` 独占逻辑。
- 结论：应该上游化。

#### 多个 `flux-lib/ui/src/components/ui/*`

- 如 `alert-dialog.tsx`、`dialog.tsx`、`drawer.tsx`、`sheet.tsx`、`slider.tsx`、`chart.tsx`、`table-row-class-name.ts` 等文件，下游大量改动本质上是在把裸色值替换成语义 token，例如 `bg-surface-overlay`、`hover:bg-surface-hover`。
- 判断：这类修改本质上是共享 UI 的主题契约完善，不应长期停留在下游副本。
- 结论：应优先在上游形成稳定语义层，再同步到下游。

### 4. 更像同步流程妥协，不应该沉淀成库差异

#### 删除上游测试文件 + `--passWithNoTests`

- `scripts/sync-flux-lib.sh` 会主动删除同步包内的 `src/**/*.test.*` 与 `__tests__`。
- 因此下游又把：
  - `flux-lib/ui/package.json`
  - `packages/theme-tokens/package.json`
  - `packages/tailwind-preset/package.json`
  的 `test` script 改成了 `vitest run --passWithNoTests`。
- 判断：这不是业务定制，也不是库能力差异，而是同步策略造成的“派生差异”。
- 结论：
  - 从长期看，这类差异不应该存在。
  - 要么同步时保留上游测试；要么明确把这些包视为只同步运行时代码、并停止把它们当完整源码包比较。
  - 就当前原则而言，更推荐**保留上游测试并消除这类 package.json 漂移**。

### 5. 历史修改中，当前看起来没有明显继续存在的必要

#### `packages/theme-tokens/src/index.ts`

- 下游新增 `TOKEN_NAMES` / `TokenName` 导出。
- 仓内搜索结果：当前没有实际 TS/运行时代码消费者，只有文档引用。
- 判断：这属于“为了让 CSS-only 包看起来更像 JS 包”而加的导出，但当前并未形成真实依赖面。
- 结论：
  - 这不是必须存在的历史修改。
  - 如果未来真的需要程序化 token 名称，可在上游正式定义；否则可以删除，避免把通用包 API 做宽却无人使用。

#### `flux-lib/ui/package.json` 中 peer/deps 重新分布

- 下游把 `lucide-react`、`recharts`、`sonner` 从 `peerDependencies` 挪到了 `dependencies`，并且去掉了对应 devDependency 组合。
- 判断：这是发布/消费策略差异，不是业务能力差异。
- 对于通用 UI 包，优先保持上游一致更合理，除非已经明确决定该包必须自带这些运行时依赖。
- 结论：当前没有足够证据说明这必须作为下游长期差异保留。

## 为什么会出现这些修改

可以归纳成四类：

1. `nop-chaos-next` 先发现问题并直接在本地同步副本里修了。
2. 一部分修复后来已经进入上游，但下游没有及时重新同步，导致本地下游还保留旧代码。
3. 一部分修改其实是共享 UI / 主题契约改进，本应在上游沉淀，却因为历史路径直接落在了下游副本里。
4. 还有一部分差异根本不是产品差异，而是同步流程本身删测试、改脚本后的副作用。

## 关于“是否应该在上游就做对应修改”

答案是：**大多数情况下应该。**

尤其是下面三类，几乎都应该上游优先：

1. React 19 最佳实践相关修改
2. 共享组件行为缺陷修复
3. 主题 token / Tailwind preset / 通用组件 API 的契约调整

真正不适合直接写死在上游源码里的，只应该是宿主自己的装配逻辑，例如：

1. 宿主注入翻译实现
2. 宿主注入主题覆盖
3. 宿主决定是否启用某种交互能力
4. 宿主注册特定 renderer / adapter / bridge

也就是说，正确方向不是“下游长期改库”，而是“上游提供注册器、配置项、slot、token namespace 或 adapter 接口，下游只注入自己的实现”。

## React 19 视角下的判断

- React 19 最佳实践不应在 `nop-chaos-next` 本地副本里各自修补。
- 一旦确认某个组件模式在 React 19 下更合理，例如：
  - ref 透传
  - 更稳定的共享状态桥接
  - 避免脆弱的模块级可变单例
  - 更清晰的组件契约边界
  就应该直接沉淀到上游。
- 当前对比结果说明：这条原则实际上已经部分发生了，但流程还没完全收敛。典型例子就是 `ui/src/lib/i18n.ts`：上游已经走向更合理实现，下游反而还停在旧版本。

## 建议的处理顺序

1. 先把“上游已更合理、下游仍残留旧实现”的差异清掉
   - 例如 `ui/src/lib/i18n.ts`
2. 再把“明确属于通用修复”的下游补丁回推上游
   - 例如 `alert-dialog.tsx`、`textarea.tsx`、surface token/preset 配套改动
3. 重新审视“宿主语义泄漏进通用库”的部分
   - 例如 `host-*` token、删除 drag handle、裁掉 dropdown-menu 导出
4. 最后处理同步流程导致的伪差异
   - 尽量不要再删除上游测试
   - 消除 `--passWithNoTests` 这类被动漂移

## 最终判断

- 现在和上游确实存在可见差异，但其中很多并不是“应该继续保留的下游定制”。
- 更准确地说，当前差异是三种东西混在一起：
  - 未重新同步的旧补丁
  - 应该上游化的通用修复
  - 不该沉淀为库分叉的历史妥协
- 如果继续遵守“这些库是通用库，原则上直接拷贝”的要求，那么下一步方向应该是：
  - 缩小差异面
  - 把通用修复往上游收敛
  - 把宿主定制改造成注册/注入机制
  - 让 `nop-chaos-next` 只承担集成层，而不是长期维护一份 `nop-chaos-flux` 的变体
