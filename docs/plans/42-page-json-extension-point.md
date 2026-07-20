# 42 Page JSON Extension Point Implementation

> Plan Status: active
> Last Reviewed: 2026-07-20
> Source: `docs/design/page-json-extension-point.md`
> Related: `docs/design/extension-system.md`

## Purpose

在 extension 系统中实现页面 JSON 后处理扩展点：新增 `pageTransformers` 类型定义、registry 和执行引擎，并将其接入 AMIS 和 Flux 两条页面加载流水线的 `apps/main` 层。

## Current Baseline

- `ShellExtension` 支持启动时配置注入（品牌、主题、语言、内置页面等），但不支持运行时页面 JSON 后处理
- 页面加载流水线：
  - AMIS: `fetchAmisPage` → `AmisPageRoute` setSchema → `AmisSchemaPage` transformPageJson → render
  - Flux: `fetchFluxPage` → `FluxRouteRenderer` setSchema → `FluxSchemaRenderer` render
- Extension 框架（`packages/extension-host`）已有 `loadExtensions`、`runtime.ts` 等基础设施，无通用 JSON 转换中间件
- `packages/amis-react` 包**不**依赖 `@nop-chaos/extension-host`，因此 transformer 应用点必须在 `apps/main` 层
- `packages/extension-host` 依赖 `packages/shared`，无额外依赖
- 设计文档已完成并经过独立子 agent review 确认：`docs/design/page-json-extension-point.md`

## Goals

- 新增 `PageTransformerRegistration`、`PageTransformFn<T>`、`PageTransformerContext` 类型，位于 `packages/shared/src/types/pageTransformer.ts`
- 修改 `ShellExtension` 新增 `pageTransformers` 字段
- 实现 registry + 执行引擎，位于 `packages/extension-host/src/pageTransformers.ts`
- Bootstrap 时注册 extension 提供的 transformer
- AMIS 侧：在 `apps/main/src/amis/providers.ts` 的 `mainAmisPageProvider.getPage` 中应用 transformer
- Flux 侧：在 `FluxRouteRenderer.tsx`（初始加载）和 `flux/adapter.ts`（内部导航 `loadPage`）中应用 transformer
- 单元测试覆盖 registry、执行引擎、错误处理、排序逻辑
- `pnpm typecheck` / `pnpm build` / `pnpm test` / `pnpm lint` 全绿

## Non-Goals

- 不修改 `packages/amis-react` 或 `packages/amis-core`（transformer 在 `apps/main` 层注入，对共享渲染器透明）
- 不涉及运行时动态卸载 transformer（`unregisterPageTransformer` 接口存在但无 UI 触发场景）
- 不涉及提供度量的 transformer 性能追踪（可后续在 `Non-Blocking Follow-ups` 中考虑）
- 不包含对 transformer 影响页面渲染时间的端到端 e2e 测试

## Scope

### In Scope

- 类型定义（`packages/shared/src/types/pageTransformer.ts`）
- `ShellExtension.pageTransformers` 字段（`packages/shared/src/types/extension.ts`）
- Registry + 执行引擎（`packages/extension-host/src/pageTransformers.ts`）
- 公共 API 导出（`packages/extension-host/src/index.ts`）
- Bootstrap 注册（`apps/main/src/extensions/bootstrap.ts`）
- AMIS provider 包装（`apps/main/src/amis/providers.ts`）
- Flux 初始加载（`apps/main/src/flux/FluxRouteRenderer.tsx`）
- Flux 内部导航（`apps/main/src/flux/adapter.ts`）
- 单元测试（registry、执行引擎、排序、错误处理）
- 验证命令通过

### Out Of Scope

- E2E 测试覆盖 transformer 页面渲染效果
- Transformer 性能监控和超时机制
- `packages/amis-react` 或 `packages/amis-core` 的修改

## Execution Plan

### Phase 1 - 类型定义

Status: planned
Targets: `packages/shared/src/types/pageTransformer.ts` (new), `packages/shared/src/types/extension.ts` (modify)

- Item Types: `Fix | Decision | Proof`

- [x] Proof: 设计文档已验证包边界、类型签名正确
- [ ] 新增 `packages/shared/src/types/pageTransformer.ts`，导出 `PageTransformerContext`、`PageTransformFn<T>`、`PageTransformerRegistration<T>`
- [ ] 修改 `packages/shared/src/types/extension.ts`，在 `ShellExtension` 接口新增 `pageTransformers?: PageTransformerRegistration[]`

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 新增文件存在，类型导出正确
- [ ] `ShellExtension` 接口包含 `pageTransformers` 字段
- [ ] `pnpm --filter @nop-chaos/shared typecheck` 通过
- [ ] No owner-doc update required（纯类型新增，已有设计文档覆盖）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - Registry + 执行引擎

Status: planned
Targets: `packages/extension-host/src/pageTransformers.ts` (new), `packages/extension-host/src/index.ts` (modify)

- Item Types: `Fix | Proof`

- [ ] 新增 `packages/extension-host/src/pageTransformers.ts`，实现：
  - `registerPageTransformer(registration)` — 按 `order` 升序插入，同 order 按注册顺序
  - `unregisterPageTransformer(id)` — 按 `id` 删除
  - `getPageTransformers()` — 返回只读快照
  - `applyPageTransformers<T>(schema, context)` — 串联执行，异常跳过并记录 `console.warn`
- [ ] 修改 `packages/extension-host/src/index.ts`，导出全部 4 个函数
- [ ] 单元测试：`packages/extension-host/src/pageTransformers.test.ts`（暂放 Phase 6）

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 新增文件存在，公共 API 从 `@nop-chaos/extension-host` 正确导出
- [ ] `pnpm --filter @nop-chaos/extension-host build` 通过
- [ ] `pnpm --filter @nop-chaos/extension-host typecheck` 通过
- [ ] No owner-doc update required（实现与设计文档一致）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - Bootstrap 注册

Status: planned
Targets: `apps/main/src/extensions/bootstrap.ts`

- Item Types: `Fix`

- [ ] 在 `applyExtensionDefinitions` 中遍历 `loaded`，对每个 extension 的 `pageTransformers` 调用 `registerPageTransformer`

- [ ] 确保 transformer 注册在 bootstrap 的 `applyExtensionDefinitions` 阶段完成（与 `themes`、`plugins`、`builtinPages` 等一致）

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `applyExtensionDefinitions` 包含 `pageTransformers` 注册逻辑
- [ ] `pnpm --filter @nop-chaos/main typecheck` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - AMIS 集成

Status: planned
Targets: `apps/main/src/amis/providers.ts`

- Item Types: `Fix`

- [ ] 在 `mainAmisPageProvider.getPage` 中，`fetchAmisPage` 返回后调用 `applyPageTransformers`，然后返回转换结果

```ts
async getPage(schemaPath) {
  const schema = await fetchAmisPage(schemaPath);
  return applyPageTransformers(schema as Record<string, unknown>, {
    schemaPath,
    pageType: 'amis',
  });
}
```

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `providers.ts` 中 `mainAmisPageProvider.getPage` 已包装 transformer
- [ ] `AmisPageRoute.tsx` 无任何修改（共享包不受影响）
- [ ] `pnpm --filter @nop-chaos/main typecheck` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 5 - Flux 集成

Status: planned
Targets: `apps/main/src/flux/FluxRouteRenderer.tsx`, `apps/main/src/flux/adapter.ts`

- Item Types: `Fix`

- [ ] 修改 `FluxRouteRenderer.tsx`：在 `fetchFluxPage` 的 `.then` 回调中，setSchema 前插入 `applyPageTransformers`
- [ ] 修改 `flux/adapter.ts`：在 `loadPage` 的 `fetchFluxPage` 回调后插入 `applyPageTransformers`

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `FluxRouteRenderer.tsx` 的初始加载路径已应用 transformer
- [ ] `adapter.ts` 的内部导航 `loadPage` 已应用 transformer
- [ ] `pnpm --filter @nop-chaos/main typecheck` 通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 6 - 单元测试

Status: planned
Targets: `packages/extension-host/src/pageTransformers.test.ts` (new)

- Item Types: `Fix | Proof`

- [ ] 测试 `registerPageTransformer` 按 order 排序
- [ ] 测试同 order 按注册顺序执行
- [ ] 测试 `unregisterPageTransformer` 删除指定 transformer
- [ ] 测试 `applyPageTransformers` 串联执行，前一个输出是后一个输入
- [ ] 测试 transformer 返回 `undefined` 时保持输入不变
- [ ] 测试 transformer 抛出异常时跳过、记录警告、不影响后续
- [ ] 测试全部 transformer 抛出异常时返回原始 schema
- [ ] 测试 `getPageTransformers` 返回快照不被外部修改影响
- [ ] 测试 `PageTransformFn<T>` 泛型类型的正确推断

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 所有用例通过：`pnpm --filter @nop-chaos/extension-host test`
- [ ] `pnpm --filter @nop-chaos/extension-host typecheck && build && test` 全绿
- [ ] No owner-doc update required（纯测试新增）
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] 所有 in-scope 类型定义已落地并可被消费方正确 import
- [ ] Registry 接口正确，执行引擎行为与设计文档一致
- [ ] Bootstrap 注册 transformer 流程已实现
- [ ] AMIS 页面加载经过 transformer
- [ ] Flux 页面初始加载和内部导航均经过 transformer
- [ ] 单元测试覆盖核心行为（排序、错误处理、串联执行）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline（每个 Phase Exit Criteria 已有裁定）
- [ ] `pnpm typecheck` 全包全绿
- [ ] `pnpm build` 全包通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 全绿
- [ ] 独立子 agent closure-audit 已完成并记录证据

## Deferred But Adjudicated

### Transformer 超时保护

- Classification: `optimization candidate`
- Why Not Blocking Closure: 当前 transformer 由 extension 作者自行保证轻量，大规模部署时可根据实际性能数据决定是否需要超时包裹层
- Successor Required: `no`

### E2E 测试覆盖

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: transformer 的单元测试覆盖了 registry 和执行引擎行为，transformer 具体逻辑由 extension 开发者自行测试
- Successor Required: `no`

## Non-Blocking Follow-ups

- Transformer 执行的可观测性（debug 日志、性能标记）可在有真实 extension 使用时按需添加

## Closure

Status Note: 待计划执行完毕后填写

Closure Audit Evidence: 待计划执行完毕后填写

Follow-up: 待计划执行完毕后填写
