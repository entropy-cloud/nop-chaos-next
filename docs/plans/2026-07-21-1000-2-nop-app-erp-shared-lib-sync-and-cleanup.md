# 16 nop-app-erp 共享库同步和本地清理

> Plan Status: active
> Last Reviewed: 2026-07-21
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (items 3.1, 3.2)
> Related: `docs/plans/2026-07-20-1928-2-create-e2e-shared-sync-script.md`, `docs/plans/2026-07-20-2000-2-sync-e2e-shared-to-nop-entropy.md`
> Mission: e2e-upgrade
> Work Item: Phase 3.1 + 3.2 — Sync shared library to nop-app-erp + delete local duplicates

## Purpose

将 `@nop-chaos/e2e-shared` 同步到 nop-app-erp 的 `tests/e2e/pages/` 目录，并删除已被共享库替代的本地重复文件，使 nop-app-erp 从本地副本切换到共享来源，同时保持 40 个 CRUD spec 的向后兼容性。

## Current Baseline

- nop-app-erp 是独立项目，位于 `../nop-app-erp/`，拥有 230+ 个 e2e spec 文件（40 CRUD、94 business action、22 dashboard、45 report、10 orchestration、11 visual、4 diagnostic）
- nop-app-erp 已有完善的 PageObject 基础设施，目录 `tests/e2e/pages/` 包含：`AmisAdapter.ts`, `FluxAdapter.ts`, `types.ts`, `engine.ts`, `Page.ts`, `CrudListPage.ts`, `FormDialog.ts`, `GraphQLClient.ts`, `Navigation.ts` 等文件（注意：共享库使用 `GraphQlClient.ts` 小写 'l'，nop-app-erp 使用 `GraphQLClient.ts` 大写 'L'）
- nop-app-erp 的 pages/ 目录已经实现 EngineAdapter 双引擎模式（与共享库架构一致），但代码是本地独立实现的，不与 `@nop-chaos/e2e-shared` 共享
- `scripts/sync-e2e-shared.sh` 已在 nop-chaos-next 就绪，接受单一 `<target-directory>` 参数，将文件同步到 `<target-directory>/src/` 子目录
- nop-entropy-e2e 已完成同步（Plan 10），其共享库位于 monorepo 的 `packages/e2e-shared/src/`，与 sync 脚本的 `src/` 子目录结构自然兼容
- nop-app-erp 不使用 Monorepo workspace，`tests/e2e/pages/` 是扁平目录（无 `src/` 子目录）；需要同步后手动将文件从 `src/` 移到 `pages/`

## Goals

- 通过 sync-e2e-shared.sh 将共享库同步到 `tests/e2e/pages/`，处理 `src/` 子目录结构
- 删除被共享库替代的本地重复文件（`AmisAdapter.ts`, `FluxAdapter.ts`, `types.ts`, `engine.ts`, `Page.ts`, `CrudListPage.ts`, `FormDialog.ts`, `GraphQLClient.ts`）
- 确认 `npx playwright test tests/e2e/crud/` 的 40 个 CRUD spec 仍然全部通过
- 确认 `E2E_ENGINE=flux npx playwright test tests/e2e/crud/` 至少 smoke 级别通过

## Non-Goals

- 不迁移 dashboard/report/business-action/orchestration/visual spec（Phase 3.4–3.7）
- 不统一 Navigation 登录逻辑（Phase 3.3）
- 不修改 nop-chaos-next 或 nop-entropy-e2e 代码
- 不修改 Playwright config

## Scope

### In Scope

- 运行 sync-e2e-shared.sh 同步到 nop-app-erp（脚本将文件放入 `<target>/src/`）
- 处理 sync 脚本的 `src/` 子目录与 `pages/` 扁平目录之间的布局差异（mv 或链接）
- 识别 nop-app-erp 本地实现与共享库之间的差异（如 `GraphQLClient.ts` vs `GraphQlClient.ts` 命名差异）
- 删除被完全替代的本地文件
- 保留 nop-app-erp 特有的文件（`index.ts`、`README.md`、以及可能需要本地 override 的 `Navigation.ts`）
- 验证 TypeScript 编译和 import 解析通过
- 运行 CRUD smoke spec（40 个 spec）验证向后兼容

### Out Of Scope

- Navigation 登录统一（Phase 3.3）
- 非 CRUD 类 spec 的迁移验证（Phase 3.4–3.7）
- FluxAdapter 功能补齐（Phase 4.1）

## Execution Plan

### Phase 1 — 同步前审计

Status: planned
Targets: `../nop-app-erp/tests/e2e/pages/`

- Item Types: `Proof | Decision`

- [ ] 列出 `tests/e2e/pages/` 中所有与共享库同名的文件
- [ ] 逐一比对同名的本地实现与共享库版本的 API 差异（导出类名、方法签名、构造参数）
- [ ] 识别 nop-app-erp 特有的本地扩展（如额外的 selector、自定义方法）是否需要在共享库中添加或保留为本地适配层
- [ ] 检查 `tests/e2e/pages/README.md` 是否需要更新
- [ ] 确认删除文件列表：哪些可以安全删除，哪些需要保留

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 所有同名文件的 API 差异已记录
- [ ] 删除文件列表和保留文件列表已确认
- [ ] 如果有本地特有逻辑需要保留为适配层，方案已记录
- [ ] No owner-doc update required (design doc already describes sync strategy)
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 — 同步共享库

Status: planned
Targets: `../nop-app-erp/tests/e2e/pages/`

- Item Types: `Fix | Proof`

- [ ] 运行 `./scripts/sync-e2e-shared.sh ../nop-app-erp/tests/e2e/pages` — 脚本将文件放入 `../nop-app-erp/tests/e2e/pages/src/`
- [ ] 将 `src/` 中与本地 pages/ 同名的文件移动到 `pages/` 根目录（覆盖本地副本）
- [ ] 删除 `pages/src/` 目录（sync 脚本创建的临时子目录）
- [ ] 注意保持 nop-app-erp 独有的 `index.ts` 和 `README.md` 不被覆盖（不在共享库中）
- [ ] 注意 `GraphQLClient.ts`（nop-app-erp 大写 L）与共享库 `GraphQlClient.ts`（小写 l）的命名差异：将 `src/GraphQlClient.ts` 拷贝为 `pages/GraphQLClient.ts`（保持 nop-app-erp 的 import 兼容性）
- [ ] 验证同步后的文件版本标记已写入（`pages/e2e-shared-version.txt`）
- [ ] 同步后检查是否有文件需要做本地适配（如 import 路径差异）
- [ ] 验证 `npx tsc --noEmit` 在 nop-app-erp 中通过（或 `npx playwright test --list` 验证 import 解析）

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `scripts/sync-e2e-shared.sh` 成功执行，文件已覆盖
- [ ] TypeScript 编译通过（或 `npx playwright test --list` 不报 import 错误）
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 — 删除本地重复文件

Status: planned
Targets: `../nop-app-erp/tests/e2e/pages/`

- Item Types: `Fix | Proof`

- [ ] 先确认 Phase 1 审计得出的保留文件列表（`index.ts`、`README.md`、可能保留本地 `Navigation.ts`）
- [ ] 再删除 Phase 1 确认的可删除文件（被共享库替代的本地副本：`AmisAdapter.ts`、`FluxAdapter.ts`、`types.ts`、`engine.ts`、`Page.ts`、`CrudListPage.ts`、`FormDialog.ts`；`GraphQLClient.ts` 已在 Phase 2 由共享版重命名替换）
- [ ] 保留 nop-app-erp 特有的文件：`index.ts`、`README.md`
- [ ] 保留需要本地 override 的文件（如 `Navigation.ts` 的本地定制）
- [ ] 验证 `npx tsc --noEmit` 仍然通过（或 `npx playwright test --list`）
- [ ] 检查 `index.ts` 中的 export 路径是否正确指向替换后的文件

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 确认删除的文件列表已执行
- [ ] 确认保留的文件及其原因已记录
- [ ] TypeScript 编译通过
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 — CRUD smoke 验证

Status: planned
Targets: `../nop-app-erp/tests/e2e/crud/`

- Item Types: `Proof`

- [ ] 运行 `npx playwright test tests/e2e/crud/` 确认 40 个 CRUD spec 仍然通过（需要后端运行）
- [ ] 运行 `E2E_ENGINE=flux npx playwright test tests/e2e/crud/` 确认至少不崩溃
- [ ] 如有测试失败，分析是同步引入的问题还是预存的环境问题

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 全部 40 个 CRUD spec 通过（或失败原因已明确记录为预存环境问题）
- [ ] Flux smoke 验证结果已记录
- [ ] 如果测试被阻塞，已记录至 Deferred But Adjudicated
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。
>
> **说明**：本计划涉及文件同步和 TypeScript 编译验证（不是纯文档计划），因此保留 `npx tsc --noEmit` 验证项。nop-chaos-next workspace 不受本计划影响，因此不要求 `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`。

- [ ] 共享库已同步到 nop-app-erp `tests/e2e/pages/`
- [ ] 本地重复文件已删除
- [ ] `npx playwright test tests/e2e/crud/` 全部通过
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] No owner-doc update required
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `scripts/sync-e2e-shared.sh` 成功执行（nop-chaos-next workspace 自身不受影响）
- [ ] nop-app-erp 中 `npx tsc --noEmit`（或 `npx playwright test --list`）通过，import 路径全部正确

## Deferred But Adjudicated

### Navigation 登录统一

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Navigation unification for nop-app-erp is explicitly Phase 3.3 work. This plan only syncs the shared files and deletes duplicates. Navigation.ts may need local overrides preserved.
- Successor Required: `yes` (Phase 3.3)

### 非 CRUD spec 验证

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: dashboard (22), report (45), business-action (94), orchestration (10), visual (11) specs are covered by Phase 3.4–3.7. This plan only verifies CRUD backward compat.
- Successor Required: `yes` (Phase 3.4, 3.5, 3.6, 3.7)

## Non-Blocking Follow-ups

- After sync completes, consider whether `tests/e2e/pages/README.md` should reference the shared library source of truth

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<no remaining plan-owned work>>
