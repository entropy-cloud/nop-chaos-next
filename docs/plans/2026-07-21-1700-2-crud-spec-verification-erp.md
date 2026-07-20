# CRUD Spec Verification for nop-app-erp

> Plan Status: active
> Last Reviewed: 2026-07-21
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 3.4)
> Related: `docs/plans/2026-07-21-1000-2-nop-app-erp-shared-lib-sync-and-cleanup.md`, `docs/plans/2026-07-21-0117-1-navigation-unification-nop-app-erp.md`, `docs/design/e2e-shared-infrastructure.md`
> Mission: e2e-upgrade
> Work Item: Phase 3.4 — CRUD spec 验证

## Purpose

在 nop-app-erp 中运行 40 个 CRUD E2E 测试，验证共享库同步（Phase 3.1+3.2）和 Navigation 统一（Phase 3.3）后 CRUD 测试仍然全部通过。这是 nop-app-erp 迁移的运行时验证收口。

## Current Baseline

- Phase 3.1+3.2 已完成：共享库同步到 `tests/e2e/pages/`，兼容文件（AmisAdapter.ts、FluxAdapter.ts、engine.ts、FormDialog.ts）已替换为共享版，不兼容文件（types.ts、Page.ts、CrudListPage.ts、GraphQLClient.ts、Navigation.ts）保留为本地适配层
- Phase 3.3 已完成：Navigation 登录统一为混合包装模式，`npx playwright test --list` 列出 614 tests 无 import 错误
- Phase 3.1+3.2 的 Phase 4（CRUD smoke 验证）因后端缺失被阻塞，已记录为 deferred
- nop-app-erp 需要 Quarkus 后端运行（`app-erp-all-runner.jar` port 8080），CRUD spec 模拟真实 CRUD 操作（增删改查）
- 40 个 CRUD spec 位于 `tests/e2e/crud/` 目录（roadmap 标记为 41，实际 count 为 40）
- nop-app-erp 仓库在兄弟目录 `../nop-app-erp/` 的可用性待确认（Phase 5.3 CI 审计可能先于本计划执行）

## Goals

- 启动 nop-app-erp 后端（uber-jar 或 Quarkus dev 模式）
- 运行 `npx playwright test tests/e2e/crud/` 全部 40 个 spec 通过
- 运行 `E2E_ENGINE=flux npx playwright test tests/e2e/crud/` 至少 CRUD smoke 级别通过
- 如果存在测试失败：区分共享库同步引入的问题 vs 预存环境问题 vs 后端数据问题
- 记录全部验证结果到日志

## Non-Goals

- 不运行非 CRUD spec（dashboard/report/business-action/orchestration/visual — Phase 3.5-3.7）
- 不修改共享库代码
- 不修改 nop-app-erp 的 CRUD spec 本身
- 不创建新的 CRUD spec
- 不配置 CI（Phase 5.3）

## Scope

### In Scope

- 确认 nop-app-erp 后端可启动（uber-jar 或 Quarkus dev mode）
- 设置测试环境：`E2E_USER`/`E2E_PASSWORD`、`BASE_URL`（默认 `http://localhost:8080`）
- 运行 `npx playwright test tests/e2e/crud/` 记录通过/失败
- 分析失败测试：是同步引入的 API 不兼容还是预存环境问题
- 如果发现共享库导致的 regression：记录具体问题，回退或修补
- 运行 `E2E_ENGINE=flux npx playwright test tests/e2e/crud/` 记录 Flux 引擎兼容性
- 记录测试结果到 `docs/logs/`

### Out Of Scope

- 所有非 CRUD spec（Phase 3.5-3.7 覆盖）
- CI 配置（Phase 5.3）
- 修改共享库或 nop-app-erp 测试代码

## Execution Plan

### Phase 1 — 后端启动与环境准备

Status: planned
Targets: `../nop-app-erp/` (backend JAR)

- Item Types: `Fix | Proof`

- [ ] 确认 nop-app-erp 仓库路径（`../nop-app-erp/` 或替代路径）
- [ ] 找到 `app-erp-all-runner.jar` 或 Maven 构建方式
- [ ] 启动后端（`java -jar app-erp-all-runner.jar` 或 `mvn quarkus:dev`）
- [ ] 确认后端在 `localhost:8080` 可访问（健康检查 endpoint）
- [ ] 确认 `BASE_URL` 环境变量指向 `http://localhost:8080`
- [ ] 确认已有测试用户（`E2E_USER`/`E2E_PASSWORD`）
- [ ] 确认 `ls ../nop-app-erp/tests/e2e/crud/*.spec.ts | wc -l` 实际文件数（避免 roadmap 数据和实际数据不一致）

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 后端成功启动并响应
- [ ] 测试用户可登录
- [ ] `npx playwright test --list` 确认 40 个 CRUD spec 可被解析
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 — CRUD spec 运行

Status: planned
Targets: `../nop-app-erp/tests/e2e/crud/`

- Item Types: `Proof | Fix`

- [ ] 运行 `npx playwright test tests/e2e/crud/`（等待完整运行）
- [ ] 记录结果：通过数、失败数、失败 spec 名称及错误信息
- [ ] 对每个失败项分析根因：共享库回归 vs 预存环境问题 vs 数据依赖问题
- [ ] 如果发现共享库导致的 regression：定位到具体文件/方法，评估修复范围
- [ ] 运行 `E2E_ENGINE=flux npx playwright test tests/e2e/crud/`（若 AMIS 模式全部通过后可选）
- [ ] 记录 Flux 引擎测试结果

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 全部 CRUD spec 运行完成
- [ ] 失败分析完成：每个失败项已归因（共享库 regression vs 预存问题）
- [ ] 如果发现共享库 regression：已在共享库或 nop-app-erp 适配层修复
- [ ] Flux 引擎测试结果已记录
- [ ] No owner-doc update required
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 — 验证与收口

Status: planned
Targets: `docs/backlog/e2e-upgrade-roadmap.md`

- Item Types: `Proof | Follow-up`

- [ ] 确认 Phase 2 结果：全部 CRUD spec 通过 或 仅预存问题（非共享库引入）
- [ ] 更新 `docs/backlog/e2e-upgrade-roadmap.md`：Phase 3.4 标记为 ✅
- [ ] 捕获 deferred items 和 non-blocking follow-ups
- [ ] 独立子 agent closure audit

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] 所有 Phase 1-2 Exit Criteria 已满足
- [ ] `docs/backlog/e2e-upgrade-roadmap.md` 已更新
- [ ] 独立子 agent closure audit 已完成
- [ ] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [ ] 全部 40 个 CRUD spec 通过（或每个失败项已明确归因为预存环境问题，非共享库引入）
- [ ] Flux smoke 验证结果已记录
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck` (nop-chaos-next — no changes expected, verify no regression)
- [ ] `pnpm build` (nop-chaos-next — no changes expected)
- [ ] `pnpm lint` (nop-chaos-next — no changes expected)
- [ ] `pnpm test` (nop-chaos-next — no changes expected)

## Deferred But Adjudicated

### dashboard / report / business-action / orchestration / visual spec 验证 (Phase 3.5-3.7)

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: CRUD spec 验证是该 plan 的收口范围；非 CRUD spec 属于后续 Phase 3.5-3.7 的计划。
- Successor Required: `yes` (Phase 3.5, 3.6, 3.7)

### Flux 引擎全覆盖 (Phase 4.2-4.3 在 nop-app-erp)

- Classification: `watch-only residual`
- Why Not Blocking Closure: Flux CRUD e2e 测试已在 nop-chaos-next 中通过（Phase 4.2-4.3）。nop-app-erp 的 Flux 测试覆盖取决于 nop-app-erp 的 UI 是否已启用 Flux 渲染，不影响当前迁移验证。
- Successor Required: `no`

## Non-Blocking Follow-ups

- After CRUD verification passes, consider running a quick smoke on nop-app-erp CI (Phase 5.3) to lock in the result

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者>>
- Evidence: <<task id / daily log>>

Follow-up:

- <<明确写 no remaining plan-owned work>>
