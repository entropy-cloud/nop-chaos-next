# 单元测试逻辑与契约覆盖审计提示词

## 目标

用于对 `nop-chaos-next` 仓库执行一次**以契约覆盖和逻辑有效性为中心**的单元测试审计。

本提示词不把行覆盖率、文件覆盖率、断言数量当成最终结论，只把它们当作辅助线索。审计重点是：

1. 每个包的公共契约（`index.ts` 导出的类型、函数、组件、hooks）是否被测试真正约束。
2. 高风险逻辑路径（权限过滤、插件桥接、SystemJS 加载、菜单合并、认证流程）是否被测试覆盖。
3. 测试是否验证了正确的行为结果，而不仅仅是"没有抛错"。
4. 测试是否覆盖了边界条件和错误路径，还是只覆盖了 happy path。
5. 是否存在"虚假覆盖"——有测试文件但测试不约束核心契约。

## 适用场景

- 发布前质量把关：确认各包核心契约被测试保护。
- 大重构后验证：确认重构后测试仍然约束正确行为。
- 新包 / 新模块测试设计评审：确认测试策略是否覆盖关键风险。
- 定期测试健康度审计：发现测试腐化和虚假覆盖。
- CI 质量门禁优化：识别哪些测试真正值得跑，哪些是凑数。

## 核心原则

1. **契约覆盖优先于行覆盖**。重点审查每个包 `index.ts` 导出的公共 API 是否被测试约束，而不是追求 100% 行覆盖。
2. **行为断言优先于结构断言**。测试应该验证"做了正确的事"，而不只是"返回了正确类型"或"调用了正确函数"。
3. **高风险路径优先于低风险路径**。权限绕过、插件注入、认证绕过、状态泄漏是高风险；样式微调、文案格式是低风险。
4. **独立纯函数优先于 React 组件**。纯函数（`filterMenusByRoles`、`validateMenuResponse`、`normalizeLanguageCode`）天然适合单元测试；UI 组件更适合 E2E。
5. **跨包契约优先于包内细节**。`@nop-chaos/plugin-bridge` 的 `PluginBridge` 接口在 host 和 plugin 两端是否都被正确测试，比包内私有实现细节更重要。
6. **真实失败模式优先于假设性风险**。基于代码中实际存在的复杂度、实际发生过的 bug、实际可能出错的边界来评估测试缺口。

## 审计目标

### 包依赖链与契约分层

`nop-chaos-next` 的包依赖链为：

```
@nop-chaos/shared（纯工具与类型）
  → @nop-chaos/core（shell 组件、权限守卫、SystemJS 工具）
  → @nop-chaos/plugin-bridge（host-to-plugin 桥接状态与 hooks）
  → @nop-chaos/main（宿主应用）
  → @nop-chaos/plugin-demo（远程插件示例）
```

审计应按此依赖方向逐层展开，下层包的契约不稳定时，上层包的测试不可信。

### 契约类别

#### 1. Store 契约

- Zustand store 的 state 形状、action 行为、selector 纯度。
- store 是否有双事实来源风险：同一个数据是否从多个 store 或多个 API 分别获取。
- store 的 subscribe / getState 是否符合 Zustand 标准 contract。
- 典型位置：`apps/main/src/store/`。

#### 2. Bridge 契约

- `PluginBridge` 接口的所有方法是否被测试约束。
- `setPluginBridge` / `getPluginBridge` / `subscribePluginBridge` 的生命周期是否完整测试。
- `usePluginBridge` / `usePluginBridgeSnapshot` / `usePluginUser` / `usePluginThemeConfig` 等 hooks 的行为是否被测试覆盖。
- fallback snapshot 的稳定性：bridge 未设置时，所有 getter 是否返回安全的 fallback。
- 订阅机制：listener 是否正确注册、取消注册、bridge 更新时是否触发通知。
- 典型位置：`packages/plugin-bridge/src/index.ts`。

#### 3. 权限契约

- `filterMenusByRoles` 的递归过滤逻辑：父子菜单的保留/移除规则。
- `usePermissionGuard` hook 对路由渲染的控制。
- 角色为空、角色重叠、角色大小写等各种边界。
- 典型位置：`packages/shared/src/utils/menu.ts`、`packages/core/src/hooks/use-permission-guard.ts`。

#### 4. SystemJS 契约

- `isSystemJsEntry` 对各种 URL 格式（system.js 后缀、query string、data URL、https URL）的判断。
- `loadRemoteComponent` 对 SystemJS 模块和 ESM 模块的正确分发。
- `registerSharedModules` 对共享依赖的注册行为。
- SystemJS 全局对象不存在时的错误处理。
- 典型位置：`packages/core/src/utils/systemjs.ts`。

#### 5. HTTP 契约

- `createHttpClient` 的请求拦截：auth header 注入、locale header、query 参数序列化。
- 响应拦截：token 更新回调、401 unauthorized 回调。
- 错误路径：网络错误、超时、非 JSON 响应。
- 典型位置：`packages/shared/src/http/client.ts`。

#### 6. 菜单配置契约

- `validateMenuResponse` 对后端菜单数据的校验和规范化。
- `mergeBuiltinSystemMenus` 对内置页面和扩展菜单的合并逻辑。
- 扩展覆盖菜单时内置系统页面（Settings、Help）的保留保证。
- 典型位置：`packages/shared/src/utils/menu-config.ts`、`apps/main/src/config/system-menus.ts`。

#### 7. 认证契约

- Mock 模式下的完整认证流程：login、fetchCurrentUser、logout。
- 真实模式下的 HTTP 委托和响应映射。
- Token 生命周期：获取、存储、刷新、清除。
- 典型位置：`apps/main/src/services/auth-api.ts`、`packages/shared/src/auth/token-manager.ts`。

#### 8. UI 组件行为契约

- 组件 props 的默认值、边界值、必填/选填行为。
- `cn()` 组合的 class 合并是否与预期一致。
- 组件在缺失可选 props 时的降级行为。
- 典型位置：`packages/ui/` 下的组件。

#### 9. 页面级工具函数契约

- Flow Editor 的节点创建、边规范化、快照深拷贝、历史记录判断。
- AI Workbench 的 markdown 解析块类型识别。
- Master-Detail 的过滤匹配逻辑。
- i18n 语言代码规范化。
- 典型位置：各页面目录下的 `*.test.ts`。

### 依赖链覆盖要求

审计时必须检查契约在依赖链上的**纵向一致性**：

- `@nop-chaos/shared` 导出的类型和函数，在 `@nop-chaos/core` 和 `@nop-chaos/main` 中被使用时，行为是否符合 shared 中测试描述的契约。
- `@nop-chaos/plugin-bridge` 的 `PluginBridge` 接口，在 host 端（`@nop-chaos/main`）的注入逻辑和 plugin 端（`@nop-chaos/plugin-demo`）的消费逻辑中，是否都正确遵循。
- `@nop-chaos/core` 的 `PluginSlot` 组件是否正确处理了 plugin 页面加载的各个阶段（加载中、加载成功、加载失败、fallback）。

## 虚假覆盖模式

以下模式表示"有测试但没有真正约束风险"，审计时必须识别：

### 1. 断言空壳

```typescript
it('works', () => {
  const result = filterMenusByRoles(items, roles);
  expect(result).toBeDefined();
});
```

只断言了"返回值不是 undefined"，没有验证过滤逻辑是否正确。

### 2. Happy Path 唯一论

只测试"角色匹配且菜单有权限"的场景，没有测试：
- 角色为空数组。
- 菜单无 roles 字段（应视为全部可见还是全部不可见）。
- 父菜单无权限但子菜单有权限的保留规则。
- 父菜单有权限但所有子菜单都无权限时的行为。

### 3. Mock 遮蔽

```typescript
it('calls the right API', async () => {
  ajaxFetch.mockResolvedValue({ accessToken: 'fake' });
  const result = await loginWithPassword('user', 'pass');
  expect(ajaxFetch).toHaveBeenCalled();
});
```

只验证了"调用了 API"，没有验证响应映射逻辑是否正确（字段名映射、默认值填充、角色数组提取）。

### 4. 实现耦合测试

```typescript
it('reads from the right global key', () => {
  expect((globalThis as any).__NOP_PLUGIN_BRIDGE__).toBeDefined();
});
```

测试绑死了实现细节（全局 key 名称），而不是测试公共 API 的行为。实现重构时测试会假通过或假失败。

### 5. 快照膨胀

```typescript
it('matches snapshot', () => {
  expect(createNode('task', { x: 0, y: 0 })).toMatchSnapshot();
});
```

大快照断言在没有人工 review 的情况下逐渐腐化，任何修改都"通过"因为快照被自动更新。

### 6. 无边界测试

只有一组正常输入，没有测试：
- 空输入（空数组、空字符串、undefined）。
- 极端输入（超长字符串、循环引用、null）。
- 类型边界（数字溢出、编码字符）。

### 7. 过度隔离

测试把所有依赖都 mock 掉了，导致被测函数只剩一行 pass-through 逻辑，测试实际上什么都没验证。

### 8. 遗漏的异步路径

- Promise rejection 未被测试。
- 竞态条件（bridge 在 hook 执行中途被设置/清除）。
- 订阅的取消注册是否真正停止了通知。

### 9. Zustand Store 的浅断言

只测试了 store 的初始状态，没有测试：
- action 调用后 state 的变化。
- selector 在 state 变化时的返回值变化。
- 多个 action 的组合效果。

### 10. 类型测试伪装

```typescript
it('has correct types', () => {
  const bridge: PluginBridge = createBridge();
  expect(typeof bridge.navigate).toBe('function');
});
```

用 `typeof` 检查替代了行为断言。类型系统已经保证的约束不需要运行时测试来重复。

## 高风险逻辑类型

以下逻辑类型在 `nop-chaos-next` 中风险最高，测试缺口影响最大：

### 1. 递归过滤与树操作

- `filterMenusByRoles` 对嵌套菜单树的递归过滤。
- 父子节点的保留/删除语义。
- 空子树裁剪。

### 2. 全局状态桥接

- `plugin-bridge` 的 `globalThis` 读写。
- bridge 未设置时的 fallback 行为。
- 多个 listener 的注册、通知、取消注册时序。
- bridge 更新与 React `useSyncExternalStore` 的协调。

### 3. 动态模块加载

- SystemJS 与 ESM 的分发逻辑。
- 加载失败时的错误处理和 fallback。
- 共享依赖注册的幂等性。

### 4. 认证与权限

- mock/真实模式切换。
- token 生命周期（获取、刷新、过期、清除）。
- 权限守卫对路由渲染的拦截。

### 5. 菜单合并

- 内置页面与扩展菜单的合并顺序。
- 扩展 `overrideMenus: true` 时的保留保证。
- 系统页面（Settings、Help）的 `hideInMenu` 标记。

### 6. HTTP 拦截链

- 请求拦截：header 注入、query 序列化。
- 响应拦截：token 更新、unauthorized 回调。
- 错误路径：非 JSON 响应解析、网络异常。

### 7. 页面级有状态逻辑

- Flow Editor 的历史记录判断（哪些 change 应该记录、哪些应该忽略）。
- Flow Editor 的快照深拷贝隔离性。
- AI Workbench 的 markdown 块解析边界（空输入、未闭合代码块、混合嵌套）。

## 执行步骤

### 第一阶段：契约盘点

1. 读取每个包的 `index.ts`（或主入口），列出所有公共导出。
2. 分类：类型导出、函数导出、组件导出、hook 导出。
3. 标记每个导出是否是包的核心契约（被外部包使用）还是内部工具。

### 第二阶段：测试文件映射

1. 扫描所有 `*.test.ts` 文件。
2. 建立映射：契约 → 测试文件 → 测试用例。
3. 识别**无测试的契约**和**有测试但不覆盖核心行为的契约**。

### 第三阶段：逐包深度审计

按依赖链顺序逐包审计：

```
@nop-chaos/shared → @nop-chaos/core → @nop-chaos/plugin-bridge → @nop-chaos/main → @nop-chaos/plugin-demo
```

对每个包：

1. 读公共 API 实现和测试。
2. 判断测试是否覆盖了核心行为、边界条件、错误路径。
3. 识别虚假覆盖模式。
4. 评估契约稳定性：测试是否会在实现细节变更时假失败。

### 第四阶段：跨包一致性检查

1. 检查 shared 包的函数在 core 和 main 中的使用是否与测试描述的契约一致。
2. 检查 plugin-bridge 的接口在 host 端和 plugin 端是否都正确遵循。
3. 检查 core 的组件（PluginSlot、MainLayout、Sidebar）在 main 中的集成是否被测试覆盖。

### 第五阶段：输出报告

按输出格式要求生成审计报告。

## 输出格式

### 1. 契约覆盖矩阵

以表格形式展示每个包的公共 API 被测试覆盖的情况：

| 包 | 契约 | 有测试 | 覆盖质量 | 风险等级 |
|---|---|---|---|---|
| @nop-chaos/shared | filterMenusByRoles | ✓ | 高 | - |
| @nop-chaos/shared | validateMenuResponse | ✓ | 中 | P2 |
| @nop-chaos/shared | createHttpClient | ✓ | 高 | - |
| @nop-chaos/plugin-bridge | PluginBridge 接口 | ✓ | 高 | - |
| @nop-chaos/plugin-bridge | usePluginBridgeSnapshot | ✗ | - | P1 |
| @nop-chaos/core | usePermissionGuard | ✗ | - | P0 |
| ... | ... | ... | ... | ... |

覆盖质量分级：
- **高**：覆盖了核心行为、边界条件、错误路径。
- **中**：覆盖了核心行为，但缺少边界条件或错误路径。
- **低**：有测试但存在虚假覆盖模式。
- **无**：无测试文件。

### 2. 发现列表

按严重度排序。每条发现必须包含：

1. **严重度**：`P0` / `P1` / `P2` / `P3`
2. **类别**：契约缺失、虚假覆盖、边界遗漏、错误路径遗漏、跨包不一致、测试腐化
3. **位置**：包名 + 契约名 + 文件路径 + 行号范围
4. **现状**：一句话说明问题
5. **为什么重要**：说明真实风险（不是抽象风险）
6. **修复方向**：一句话说明建议补什么测试
7. **建议测试命令**：可直接运行的 `pnpm --filter ...` 命令

严重度标准：
- `P0`：核心安全或功能契约完全没有测试保护（权限绕过、认证绕过、插件注入）。
- `P1`：核心契约有测试但覆盖不完整，存在已知边界未被测试。
- `P2`：非核心契约缺少测试，或测试质量可提升。
- `P3`：建议性改进，测试优化、可维护性提升。

### 3. 包级评估

对每个包给出：

- 契约总数 / 已测试数 / 覆盖质量高数。
- 该包测试的最大风险点。
- 该包最值得补充的 1-3 个测试。

### 4. 总评

- 整体测试健康度判断。
- 哪些包测试质量高，为什么高。
- 哪些包测试风险高，为什么风险高。
- 最值得立即行动的 1-3 个改进。

### 5. 自动化建议

- 哪些契约应该加入 CI 的必过门禁。
- 是否建议引入变异测试（如 Stryker）对特定包进行测试质量验证。
- 是否建议引入覆盖率门禁（仅对特定包、特定契约，而非全局）。

## 执行方式

1. 使用子 agent 分包并行审计，每个子 agent 负责一个包。
2. 每个子 agent 输出该包的契约覆盖矩阵和发现列表。
3. 主 agent 汇总跨包一致性问题，输出总报告。
4. 所有结果保存到 `docs/analysis/` 下的独立结果目录中。

## 结果落盘与重复执行

每次真正执行这份提示词时，都必须遵守以下规则：

1. 在 `docs/analysis/` 下创建一个新的结果目录，用于保存这次执行的全部轮次结果。目录名应包含日期或执行序号，例如 `unit-test-audit-2026-05-12/`。
2. 每个子 agent 的输出作为该目录下的一个单独文件保存，例如 `01-shared.md`、`02-core.md`、`03-plugin-bridge.md`。
3. 跨包一致性检查结果保存为 `cross-package-consistency.md`。
4. 总报告保存为 `summary.md`。
5. 不同执行批次的结果不应混写到同一目录。
6. 每一轮文件名都应能体现轮次或包名，确保后续可追溯。

## 可直接复用的提示词正文

```text
请对 nop-chaos-next 仓库执行一次"契约覆盖与逻辑有效性"导向的单元测试审计。

背景：
- 本仓库是一个 React 宿主 Shell + 插件支持项目，不是低代码引擎。
- 单元测试框架：Vitest（*.test.ts，与源码同目录）。
- E2E 测试框架：Playwright（tests/e2e/*.spec.ts）。
- 包依赖链：@nop-chaos/shared → @nop-chaos/core → @nop-chaos/plugin-bridge → @nop-chaos/main → @nop-chaos/plugin-demo。
- 稳定契约来源：每个包 index.ts 的公共导出、Zustand store 接口、plugin bridge hooks、权限守卫、SystemJS 工具、UI 组件 props。

要求：
1. 不要只看覆盖率数字。必须阅读测试代码，判断测试是否真正约束了契约行为。
2. 按包依赖链顺序逐包审计：shared → core → plugin-bridge → main → plugin-demo。
3. 对每个包，先列出 index.ts 的所有公共导出，再逐一判断是否有测试覆盖、覆盖质量如何。
4. 识别虚假覆盖模式：断言空壳、happy path 唯一论、mock 遮蔽、实现耦合测试、快照膨胀、无边界测试、过度隔离、遗漏异步路径、浅断言、类型测试伪装。
5. 重点关注高风险逻辑：权限过滤、插件桥接、SystemJS 加载、认证流程、菜单合并、HTTP 拦截链。
6. 检查跨包一致性：shared 的函数在 core/main 中的使用是否与测试契约一致；plugin-bridge 的接口在 host 和 plugin 两端是否都正确遵循。
7. 不把个人风格偏好当成问题。不机械追求 100% 覆盖率。
8. 区分"缺少测试"和"测试质量不够"——前者是契约缺失，后者是虚假覆盖。

输出格式：
1. Contract Coverage Matrix
   - 每个包的公共 API 覆盖矩阵表格（包、契约、有测试、覆盖质量、风险等级）。
2. Findings
   - 按严重度排序（P0/P1/P2/P3）。
   - 每条包含：严重度、类别、包名、契约名、文件路径、行号范围、问题现状、真实风险、修复方向、建议测试命令。
3. Package Assessment
   - 每个包的契约总数/已测试数/覆盖质量高数、最大风险点、最值得补充的测试。
4. Overall Assessment
   - 整体测试健康度判断。
   - 质量高的包及原因。
   - 风险高的包及原因。
   - 最值得立即行动的改进。
5. Automation
   - CI 门禁建议。
   - 变异测试建议。
   - 覆盖率门禁建议（仅针对特定包和契约）。
6. Evidence
   - 引用实际测试文件和源码文件，不要只引用 barrel 文件或 README。

结论必须以当前 live code 为准，不以历史计划、旧日志或假设中的理想架构为准。

执行方式：
1. 使用子 agent 分包并行审计。
2. 每个子 agent 输出该包的契约覆盖矩阵和发现列表。
3. 主 agent 汇总跨包一致性问题，输出总报告。
4. 所有结果保存到 docs/analysis/ 下的独立结果目录中。
5. 每个子 agent 结果作为单独文件保存（如 01-shared.md、02-core.md）。
6. 跨包一致性检查结果保存为 cross-package-consistency.md。
7. 总报告保存为 summary.md。

测试运行命令参考：
- 全部单元测试：pnpm test
- 单包测试：pnpm --filter @nop-chaos/main exec vitest run
- 单文件测试：pnpm --filter @nop-chaos/main exec vitest run src/pages/flow-editor/[id]/index.test.ts
- 单测试名：pnpm --filter @nop-chaos/plugin-bridge exec vitest run -t "stores and returns the active bridge"
- E2E 测试：pnpm test:e2e
- 类型检查：pnpm typecheck
- 构建：pnpm build
- Lint：pnpm lint
```
