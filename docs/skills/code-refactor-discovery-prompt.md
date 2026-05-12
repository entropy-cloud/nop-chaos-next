# nop-chaos-next 代码重构发现提示词

> **定位**: 这是一份面向 nop-chaos-next 仓库的、以"发现值得重构的代码结构问题"为目标的提示词。它不追求覆盖所有代码风格问题，而是聚焦在那些会造成持续维护成本、阻碍演进、或已经在制造隐性风险的结构性问题。
> **适用对象**: React 19 + Zustand + React Query + TypeScript + Vite monorepo，pnpm workspace，host React shell with plugin support。
> **使用时机**: 当你怀疑某个区域正在累积技术债、当你需要评估某次大改动前的健康度、或当你需要在 sprint 间隙做一次有针对性的重构扫描时。

---

## 项目背景速览

在执行本提示词之前，执行者必须先阅读 `AGENTS.md` 和 `docs/index.md`。

核心结构：

| 包 / 应用 | 职责 | 关键约束 |
|---|---|---|
| `@nop-chaos/shared` | 共享类型和纯工具函数 | 不依赖 React；不依赖任何其他 workspace 包 |
| `@nop-chaos/ui` | 可复用 UI 组件、样式、`cn()` | 可依赖 shared；不依赖 core、plugin-bridge、main |
| `@nop-chaos/core` | Shell 组件、权限守卫、SystemJS 工具 | 可依赖 shared、ui；不依赖 plugin-bridge、main |
| `@nop-chaos/plugin-bridge` | host-to-plugin 桥接状态和 hooks | 可依赖 shared；不依赖 core、ui、main |
| `@nop-chaos/main` | Host React shell：路由、store、页面、主题、i18n | 可依赖所有包；是最终消费端 |
| `@nop-chaos/plugin-demo` | 远程插件示例（SystemJS / ESM） | 可依赖 shared、plugin-bridge；不可打包重复 React/运行时依赖 |

依赖方向：`shared → ui → core → main`，`shared → plugin-bridge → main`，`shared → plugin-bridge → plugin-demo`。不允许反向依赖，不允许跨层绕路。

---

## 审计维度

### 1. 文件过大

**阈值**：

- 500 行以上：值得审查是否职责过多
- 700 行以上：除非是单一职责的天然大文件（如大型路由表、纯数据映射），否则几乎一定需要拆分

**检查要点**：

- 文件是否承担了两个以上不相关的职责
- 是否存在可以提取到 `shared`、`ui`、`core` 或 `plugin-bridge` 的逻辑被堆积在 `main` 里
- 路由渲染器（如 `route-renderer.tsx`）是否因为持续添加新 `pageType` 而膨胀——如果是，应该检查是否需要策略模式或 page-type resolver

**历史教训**：在 host shell 项目中，文件膨胀通常不是一次性写大的，而是每次加一个新页面类型、一个新路由判断、一个新主题 token 就多十几行，半年后突然超过阈值。膨胀速度取决于有多少人往同一个渲染器或同一个 store 里加东西。

---

### 2. 双状态 / 双数据源

**定义**：同一份业务数据同时存在于多个状态容器中，且它们之间的同步是手动维护的。

**典型表现**：

- `useState` + Zustand store 维护同一份数据，用 `useEffect` 做同步
- 组件从 React Query 缓存拿到数据后，又写入 Zustand store，两套都作为渲染源
- `useEffect` 把 props 同步到本地 state（`useEffect(() => setX(props.x), [props.x])`），形成 props → local state 的影子副本
- 插件 bridge 的 snapshot 和 host store 描绘同一份运行时状态，但更新时机不一致

**检查要点**：

- Zustand store 的数据是否和 React Query 的缓存有重叠——如果有，明确谁是 source of truth
- 插件 bridge snapshot 是否和 host store 产生竞态（bridge snapshot 来自 `useSyncExternalStore`，host store 来自 Zustand，两者的更新周期可能不同步）
- Tab store / layout store 中是否有和 URL 状态重复的部分

**历史教训**：双状态问题在 host shell 中特别容易在以下位置滋生：插件状态（plugin store vs bridge snapshot）、主题状态（theme store vs CSS 变量 vs bridge）、用户认证状态（auth store vs React Query vs bridge user）。每次加一个新的消费端就容易多一个副本。

---

### 3. React 层承载了不属于它的逻辑

**定义**：`useEffect`、事件处理器、或组件体在做本应由 Zustand、React Query 或纯工具函数承担的工作。

**典型表现**：

- `useEffect` 做数据获取、缓存、轮询——这些应属于 React Query
- `useEffect` 做复杂状态派生——这些应属于 Zustand selector 或 `useMemo`
- 组件体内做副作用（直接调 API、直接操作 DOM）
- 在组件里手动管理 AbortController / cleanup 逻辑，而这些逻辑应封装在 query hook 或 store action 中
- 路由切换时在组件里做权限检查之外的逻辑编排

**检查要点**：

- 列出所有 `useEffect`，判断每一个是否真正需要是 effect（大部分数据获取不应该用 effect，而应该用 React Query 的 query/mutation）
- 检查是否有 `useEffect` 依赖了不稳定的引用（每次渲染都变的对象/函数），导致无限重触发
- 异步 server-state 是否统一走 React Query，而不是零散的 `useEffect` + `useState` + `fetch`

**历史教训**：host shell 的数据获取模式特别容易退化——因为很多页面只做一次简单加载，开发者习惯性用 `useEffect + useState + fetch` 三件套，而不是 React Query。一旦加上轮询、缓存失效、乐观更新等需求，这套模式就会变成维护灾难。

---

### 4. 过宽的响应式订阅

**定义**：Zustand 或 `useSyncExternalStore` 的订阅粒度过宽，导致不相关状态变化引发不必要的重渲染。

**典型表现**：

- `usePluginStore()` 不带 selector，订阅了整个 plugin store——而组件只需要 `plugins.length`
- `usePluginBridgeSnapshot()` 返回整个 bridge snapshot，但消费端只用了 `user`——任何 bridge 属性变化都会触发重渲染
- Zustand selector 返回新对象引用（`(state) => ({ a: state.a, b: state.b })`），每次调用都产生新引用，等于没有 selector
- 在 `plugin-bridge` 的 `usePluginManifest` 中，`snapshot.plugins.find(...)` 每次调用都遍历整个数组并可能返回不同引用

**检查要点**：

- 所有 Zustand `useXxxStore()` 调用是否都带了精确的 selector
- `usePluginBridgeSnapshot()` 的消费端是否应该改用更窄的 hook（如 `usePluginUser()`、`usePluginThemeConfig()`）
- selector 是否使用了 `shallow` 比较（当返回对象时）
- bridge 层的细粒度 hook 是否真正做到了按需订阅，还是只是 `usePluginBridgeSnapshot` 的语法糖

**历史教训**：在 bridge 层，过宽订阅不只是性能问题——它可能导致插件侧的重渲染循环，而这些问题在 host 侧开发时很难察觉，因为 host 的更新频率远高于插件。

---

### 5. 重复 / 未收敛的 API 契约

**定义**：同一概念在多个包中被重复定义或类型不一致。

**典型表现**：

- `@nop-chaos/shared` 中的 `PluginManifest` 和 `@nop-chaos/plugin-bridge` 中的 bridge 类型描述同一个东西但字段名不同
- `MenuItem` 类型和路由层实际消费的 props 之间有隐含的映射关系，但没有在类型层面体现
- 两个包各自定义了 `User` 类型，字段略有差异
- `ThemeConfig` 在 shared 和 theme store 中有微妙不同的结构

**检查要点**：

- 所有跨包共享的类型是否统一从 `@nop-chaos/shared` 导出
- bridge 接口（`PluginBridgeStores`、`BridgeSnapshot`）的字段是否和 host store 的 state shape 严格对齐
- `MenuItem` 的 `pageType` 联合类型是否和 `route-renderer.tsx` 中的分支处理严格对应
- `PluginManifest` 的字段是否在 shared、plugin-bridge、plugin-demo 三处保持一致

**历史教训**：API 契约漂移在 monorepo 中是慢性病——两个包的类型各自演化，直到 runtime 报错才发现不一致。特别是 bridge 层，host 侧和 plugin 侧如果对同一字段的含义理解不同，后果是插件加载失败或行为异常，而且只在特定插件 + 特定版本的组合下才触发。

---

### 6. 代码块级重复

**定义**：相同或高度相似的代码块在多处重复出现。

**典型表现**：

- 多个页面组件有相似的 loading/error/data 三段式渲染逻辑，没有提取为共享组件或 hook
- 权限检查逻辑在菜单过滤和路由渲染中各实现了一遍，且实现细节不同
- 多个 store 有相似的 persist 配置样板代码
- CSS 类名组合模式（如 `theme-card` + 各种 Tailwind class）在多处硬编码重复

**检查要点**：

- 页面级别的 loading/suspense fallback 是否可以统一
- 权限逻辑是否有单一来源（`usePermissionGuard` 是否同时覆盖了菜单过滤和路由守卫）
- 相似的 store 配置模式是否可以提取为 factory
- 重复的 Tailwind 类名组合是否应该提取为 `@nop-chaos/ui` 中的共享组件

**历史教训**：在 host shell 中，页面级重复最容易积累——每个新页面都是复制粘贴上一个页面的骨架改出来的。当需要统一修改 loading 行为或 error boundary 时，才发现几十个页面各有一套。

---

### 7. 过度拆分

**定义**：文件或模块被拆得过碎，导致读者需要跳跃大量文件才能理解一个完整流程。

**典型表现**：

- 一个简单的工具函数被拆成 3 个文件：types.ts + utils.ts + index.ts，但总共不到 50 行
- 一个 store 的 action 被拆到单独的文件，但 store 本身只有 2 个 action
- 过度使用 barrel export（`index.ts` 只做 re-export），增加跳转层级但不增加清晰度
- 一个组件的 props 类型、组件体、样式被拆成 3 个文件，但组件总共不到 100 行

**检查要点**：

- 读者理解"一个菜单项如何被渲染成一个页面"需要打开多少个文件——如果超过 5 个，可能存在过度拆分
- 单个包的文件数量和代码总量的比例是否合理
- barrel export 是否只是简单的 `export *`，还是有有价值的重新导出逻辑

**判断标准**：拆分应该是为了降低认知负载，而不是为了追求数字上的"每个文件不超过 N 行"。如果一个拆分迫使读者在 3 个文件间来回跳转才能理解一个 30 行的函数，这个拆分是负价值。

---

### 8. 包边界违规

**定义**：代码的依赖关系违反了规定的包层级方向。

**依赖方向规则**：

```
shared ← ui ← core ← main
shared ← plugin-bridge ← main
shared ← plugin-bridge ← plugin-demo
```

**典型违规**：

- `main` 绕过 `core` 或 `plugin-bridge` 的公开接口，直接导入其内部模块（如 `import { something } from '@nop-chaos/core/src/utils/systemjs'`）
- `plugin-bridge` 依赖了 `core` 或 `ui`——它应该只依赖 `shared`
- `core` 依赖了 `plugin-bridge`——这两个包应该是独立的
- `ui` 依赖了 `core`——违反层级方向
- `shared` 依赖了任何其他 workspace 包——它是底层包
- `plugin-demo` 打包了 React 或其他已注册为 SystemJS shared module 的依赖

**检查要点**：

- `packages/*/package.json` 的 `dependencies` 字段是否遵守了层级规则
- 源码中的 `import` 语句是否有路径穿透（直接 import 另一个包的 `src/` 目录）
- `plugin-demo` 的 Vite 构建配置是否正确 externals 了共享依赖
- `core` 的 barrel export（`index.ts`）是否暴露了不该暴露的内部实现

**历史教训**：包边界违规通常发生在"只是临时用一下"的场景——开发者在 `main` 里直接 import `core` 的内部工具函数，绕过了公开 API。三个月后这个内部函数被重构，`main` 的构建就崩了，而且错误信息指向一个看起来毫不相关的文件。

---

### 9. 兼容层 / 过渡路径残留

**定义**：为了一次性迁移而引入的临时桥接代码、兼容函数、或废弃但未清理的导出。

**典型表现**：

- 导出但没有任何消费者使用的函数或类型（knip 应该能检测到一部分）
- 注释写着 `// TODO: remove after migration` 但已经过了三个月
- 为旧版插件接口保留的适配代码，但所有插件已经迁移到新接口
- 菜单配置中保留了已经不存在的 `pageType` 值的处理逻辑

**检查要点**：

- 运行 `pnpm audit:knip`，检查其报告中的未使用导出
- 搜索 `TODO`、`FIXME`、`DEPRECATED`、`@deprecated`、`HACK`、`TEMP` 等标记
- 检查是否有只被测试文件导入但从不被生产代码使用的导出
- 检查 `MenuItem.pageType` 的联合类型成员是否都有对应的渲染分支

**历史教训**：兼容层残留最大的危害不是代码量，而是认知干扰——新人读到一段逻辑，不知道它是当前有效代码还是历史遗留，花了半小时才搞清楚"这段代码已经没用了但没人删"。比代码残留更贵的是理解成本。

---

### 10. 隐式行为 / 隐藏语义

**定义**：代码的实际行为需要阅读实现才能理解，仅看接口声明或调用点无法判断。

**典型表现**：

- 组件在渲染时隐式修改全局状态（如 mount 时修改 CSS 变量、注册全局事件）
- `setPluginBridge` 在被调用时隐式通知所有 bridge 订阅者，但调用者不知道这个副作用
- Zustand store 的 action 有副作用（如 `setPlugins` 内部调了 `persistPluginSeeds`），但函数签名看不出来
- 插件加载（`PluginSlot`）在失败时静默 fallback 而不是报错，让问题难以排查
- `usePermissionGuard` 的实现隐含了角色名称的大小写敏感假设

**检查要点**：

- 组件是否有"mount 时副作用"（如 `useEffect` 修改 CSS 变量、注册全局 listener），且这个副作用在组件 unmount 时是否正确清理
- bridge 的 `setPluginBridge` 和 `subscribe` 是否形成了隐式的事件广播链
- store action 的命名是否清晰表达了副作用（如 `persistAndSetPlugins` 比 `setPlugins` 更诚实）
- 插件 slot 的错误边界是否吞掉了关键错误信息

**历史教训**：在 host-plugin 架构中，隐式行为的影响范围特别大——一个 host 侧的隐式全局状态修改可能导致所有已加载插件的行为异常，而且在插件侧调试时完全看不到 host 做了什么。最典型的例子是 bridge 初始化时机：如果 host 在 bridge 还没就绪时就渲染了 plugin slot，插件拿到的是 fallback 值，但没有任何警告或错误。

---

### 11. 脆弱的异步 / 取消模式

**定义**：异步操作的生命周期管理不当，可能导致竞态、内存泄漏、或状态不一致。

**典型表现**：

- React Query 的 query 在组件 unmount 后仍然更新了已卸载组件的状态
- 手动 `fetch` 没有 AbortController，组件卸载后仍在处理响应
- Zustand store 的异步 action 没有处理"多次调用的最后一次覆盖之前的结果"的竞态
- 插件远程加载（SystemJS）失败后没有清理注册的模块，导致重试时使用缓存的错误结果
- `ensurePluginSharedModules` 或 `registerSharedModules` 被并发调用时没有去重保护

**检查要点**：

- 所有 React Query 的 query/mutation 是否正确配置了 staleTime、gcTime、以及 retry 策略
- 手动 `fetch` 是否都有 AbortController 且在 cleanup 时取消
- 插件加载（`loadRemoteComponent`）是否有超时和取消机制
- SystemJS module 注册是否有幂等性保证

**历史教训**：在 plugin 加载场景中，异步问题最常见于：用户快速切换路由，触发多次插件加载，前一次加载还没完成就被新的覆盖，但前一次的回调仍然执行并修改了状态。React Query 天然处理了部分竞态，但 SystemJS 加载不在 React Query 的管理范围内，需要手动保护。

---

### 12. 测试文件问题

**定义**：测试文件存在结构性问题，导致测试价值低于维护成本。

**典型表现**：

- 测试只验证 happy path，不覆盖错误边界、空状态、权限不足等场景
- 测试通过 mock 绕过了被测逻辑的核心路径，实际测的是 mock 而不是代码
- 测试文件过于臃肿（setup 超过 100 行），真正有价值的断言被淹没
- 一个 test file 测了太多不相关的逻辑，或者一个 test case 塞了太多 assert
- E2E 测试的 selector 脆弱（依赖具体的 class 名或 DOM 结构），页面小改就全断
- 测试文件的位置和被测文件不匹配（没有按照 colocated `*.test.ts` 的约定放置）

**检查要点**：

- 测试是否覆盖了 `route-renderer.tsx` 的所有 `pageType` 分支
- bridge 相关的测试是否覆盖了 bridge 未初始化时的 fallback 行为
- store 的测试是否覆盖了 persist 逻辑（localStorage 读写）
- E2E 测试的 selector 是否使用了 data-testid 而不是脆弱的 CSS 选择器
- 测试文件是否和被测文件放在同一目录（colocated 约定）

**历史教训**：在 host shell 中，最容易被忽略的测试是权限相关的逻辑——菜单过滤和路由渲染各有一层权限检查，两层都需要测试。但开发者通常只测了其中一层，或者测了"有权限"的情况但没有测"没权限"的情况。

---

### 13. 目录结构混乱

**定义**：文件和目录的组织方式不符合既定约定，增加了导航成本。

**典型表现**：

- 页面组件不放在 `apps/main/src/pages/` 下，而是放在了其他位置
- 应该放在 `packages/shared/src/types/` 下的类型定义被放在了 `apps/main/src/` 下
- 应该放在 `packages/core/` 下的 shell 组件被放在了 `packages/ui/` 下（或反过来）
- hooks 没有放在对应的 `hooks/` 目录，而是散落在各个组件文件中
- 动态路由没有使用 `[id]` 括号命名约定的目录结构

**检查要点**：

- 新增的类型是否遵循"共享类型在 shared，应用类型在 app"的规则
- 新增的组件是否遵循"纯 UI 在 ui，shell 组件在 core，页面组件在 main"的规则
- 新增的 hook 是否遵循"React 无关的逻辑在 shared，React 相关通用逻辑在 core/ui/plugin-bridge，应用逻辑在 main"的规则
- 测试文件是否和被测文件在同一目录

**判断标准**：目录结构的核心目标是让一个新加入的开发者能够根据文件路径猜到文件内容。如果一个人需要打开文件才知道"哦，这个组件居然在这里"，说明结构有问题。

---

### 14. 文档 owner / 代码 owner 漂移

**定义**：设计文档（`docs/design/`）描述的架构和实际代码实现之间出现了不一致。

**典型表现**：

- `docs/design/plugin-system.md` 描述的插件加载流程和 `PluginSlot` 的实际实现不同
- `docs/design/dashboard.md` 描述的页面结构和实际组件树不同
- `docs/references/style-interaction-guidelines.md` 描述的样式规范和实际 Tailwind 用法不一致
- 设计文档中提到了某个 `pageType` 值，但代码中已经改了名字
- 文档中的类型定义和 `packages/shared/src/types/` 中的实际类型不同

**检查要点**：

- `docs/design/` 下的文档最后一次更新时间和对应代码的最后修改时间是否匹配
- 文档中引用的文件路径是否仍然有效
- 文档中描述的 API 和类型签名是否和代码中的实际定义一致
- 新增的 `pageType` 是否有对应的设计文档

**历史教训**：文档漂移最危险的时刻是重构之后——代码改了，但文档没跟着改。下一个读文档的开发者按照文档的描述去理解系统，结果做出错误的决策。在 monorepo 中，这个问题在跨包边界处尤其严重：一个包的接口改了，但另一个包的文档还在描述旧接口。

---

## 输出格式

对每个发现，按以下格式输出：

```markdown
### F-{序号}: {一句话标题}

- **维度**: {对应上面的 14 个维度之一}
- **严重度**: P0 / P1 / P2 / P3
- **位置**: `{文件路径}:{行号范围}`
- **现状**: {用一到两句话说明问题是什么}
- **为什么重要**: {说明不修会怎样，或真实风险}
- **修复方向**: {一句话说明建议怎么修}
- **证据**: {引用具体代码片段}
```

### 严重度标准

- **P0**: 当前已构成错误行为、安全风险、数据损坏、或硬性包边界违约。必须立即修复。
- **P1**: 高概率回归、核心契约漂移、热点设计缺陷、或关键测试缺失。应在下一个迭代修复。
- **P2**: 真实维护成本问题、局部重复、局部抽象失衡、热点持续膨胀风险。应纳入技术债 backlog。
- **P3**: 观察项、轻度组织问题、暂不值得立即改动。记录但不排优先级。

### 报告结构

1. **摘要**：列出所有发现的严重度和维度分布，给出整体判断
2. **发现列表**：按严重度从高到低排列
3. **交叉分析**：如果多个发现之间存在关联（比如维度 2 的双状态问题加剧了维度 11 的竞态风险），单独说明
4. **自动化建议**：哪些发现可以通过工具（knip、dependency-cruiser、eslint 规则等）自动检测

---

## 执行方式

1. **准备阶段**：先读 `AGENTS.md`、`docs/index.md`，建立对项目结构的整体理解。快速浏览每个包的 `package.json`（关注 dependencies）和 barrel export（`index.ts`）。
2. **扫描阶段**：对每个维度进行针对性扫描。先从结构性问题（维度 1、7、8、13）开始，因为它们的影响范围最大。然后扫描运行时问题（维度 2、3、4、11），再扫描契约和组织问题（维度 5、6、9、10、12、14）。
3. **验证阶段**：对每个候选发现，读相关上下文代码确认问题是否真实存在。排除误报（比如某个看似过大的文件实际上是合理的路由表）。
4. **输出阶段**：按输出格式整理发现，确保每条都有文件路径、行号和代码证据。

### 扫描顺序建议

| 轮次 | 维度 | 理由 |
|---|---|---|
| 1 | 8（包边界违规） | 影响范围最广，一次违规可能引发多处下游问题 |
| 2 | 1（文件过大）、13（目录结构） | 结构性问题，为后续扫描建立地图 |
| 3 | 2（双状态）、3（React 层越权） | 运行时正确性风险最高 |
| 4 | 4（过宽订阅）、11（异步模式） | 性能和稳定性风险 |
| 5 | 5（API 契约）、10（隐式行为） | 跨包协作风险 |
| 6 | 6（代码重复）、7（过度拆分） | 维护成本 |
| 7 | 9（兼容层残留）、12（测试问题） | 清理和覆盖面 |
| 8 | 14（文档漂移） | 知识管理 |

### 工具辅助

执行本提示词时，可以结合以下自动化工具提高效率：

- `pnpm audit:knip`：检测未使用的导出和依赖
- `pnpm check:duplicates`：检测重复代码
- `pnpm typecheck`：类型错误可能暴露契约不一致
- `pnpm lint`：lint 错误可能暴露结构性问题
- `rg` / `grep`：搜索 `TODO`、`FIXME`、`DEPRECATED`、`any`、`@ts-ignore`、`// eslint-disable` 等标记
- `dependency-cruiser`：可视化依赖方向，检测违规

---

## 可直接复用的提示词正文

```text
你是一位资深前端架构师，正在对 nop-chaos-next 项目做一次代码重构发现审查。

项目背景：React 19 + Zustand + React Query + TypeScript + Vite monorepo（pnpm workspace）。
这是一个 host React shell 项目，支持插件系统（SystemJS / ESM 远程加载）。

包结构：
- @nop-chaos/shared：共享类型和纯工具函数（底层，不依赖 React）
- @nop-chaos/ui：可复用 UI 组件和 cn()（可依赖 shared）
- @nop-chaos/core：Shell 组件、权限守卫、SystemJS 工具（可依赖 shared、ui）
- @nop-chaos/plugin-bridge：host-to-plugin 桥接状态和 hooks（可依赖 shared）
- @nop-chaos/main：Host React shell——路由、store、页面、主题、i18n（可依赖所有包）
- @nop-chaos/plugin-demo：远程插件示例（可依赖 shared、plugin-bridge）

要求：

1. 先读 AGENTS.md 和 docs/index.md，建立对项目的整体理解。
2. 然后按以下 14 个维度扫描代码，找出值得重构的结构性问题：
   (1) 文件过大（>500行审查，>700行几乎一定拆分）
   (2) 双状态 / 双数据源（useState + Zustand 同一数据，useEffect 同步 props 到 state）
   (3) React 层承载了不属于它的逻辑（useEffect 做数据获取/缓存/轮询，应属 React Query）
   (4) 过宽的响应式订阅（Zustand 订整个 store、bridge snapshot 不窄选）
   (5) 重复 / 未收敛的 API 契约（同概念多类型定义，跨包类型不一致）
   (6) 代码块级重复（相似 loading/error 渲染，权限检查双实现）
   (7) 过度拆分（跳转超过3个文件才能理解一个30行函数）
   (8) 包边界违规（反向依赖、路径穿透、plugin-demo 打包重复 React）
   (9) 兼容层 / 过渡路径残留（未使用的导出、过时的 TODO）
   (10) 隐式行为 / 隐藏语义（mount 时副作用、bridge 隐式广播、store action 隐式持久化）
   (11) 脆弱的异步/取消模式（无 AbortController、SystemJS 加载无超时）
   (12) 测试文件问题（只覆盖 happy path、mock 绕过核心路径、selector 脆弱）
   (13) 目录结构混乱（文件放错包、hook 散落、测试不 colocated）
   (14) 文档 owner / 代码 owner 漂移（设计文档和实现不一致）

3. 对每个发现，给出：
   - 维度编号
   - 严重度（P0/P1/P2/P3）
   - 文件路径 + 行号范围
   - 一句话现状描述
   - 真实风险
   - 修复方向
   - 具体代码证据

4. 不把个人风格偏好当成问题。不机械追求"更多抽象"或"更碎的文件"。
5. 区分"必要复杂度"和"失控复杂度"。host shell + plugin 桥接的天然复杂度不是问题。
6. 结论以当前 live code 为准，不以历史计划或理想架构为准。

输出格式：
1. 摘要（严重度分布 + 整体判断）
2. 发现列表（按严重度从高到低）
3. 交叉分析（发现之间的关联）
4. 自动化建议（哪些发现可以用工具自动检测）
```
