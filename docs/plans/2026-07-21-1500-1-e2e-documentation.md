# E2E 文档化

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/backlog/e2e-upgrade-roadmap.md` (item 5.4)
> Mission: e2e-upgrade
> Work Item: Phase 5.4 — E2E 文档化

## Purpose

为 nop-chaos-next 和下游项目（nop-entropy-e2e、nop-app-erp）编写完整的 E2E 测试开发指南，覆盖如何编写新测试、切换引擎、调试、以及配置环境变量。更新各项目 README 中的 E2E 测试章节，使新开发者能 15 分钟内上手运行和编写 E2E 测试。

## Current Baseline

- `README.md` 提到 `tests/e2e/` 和 `pnpm test:e2e` 命令，但没有 E2E 测试架构说明
- `docs/testing/index.md` 只列出了几个入口命令，没有编写指南
- `docs/design/e2e-shared-infrastructure.md` 和 `docs/design/e2e-frontend-mode.md` 包含完整的架构和 env var 定义，但它们是设计文档而非开发者指南
- `docs/logs/` 记录了所有迁移过程，但未提炼为开发者可用的指南
- nop-chaos-next 的 `packages/e2e-shared/src/` 中有完整的 Playwright fixtures、PageObject、EngineAdapter，但没有面向开发者的使用文档
- 跨项目的 env var 体系（`E2E_ENGINE`、`E2E_AUTH_MODE`、`FRONTEND_DEV_MODE`、`BASE_URL` 等）分散在多个设计文档中
- nop-entropy-e2e 和 nop-app-erp 各自的 README 中也没有统一的 E2E 测试指南

## Goals

- 在 `docs/testing/` 下创建 `01-e2e-developer-guide.md`，覆盖：
  - E2E 测试架构概览（EngineAdapter、PageObject、API Client）
  - 如何编写新 E2E 测试（使用 shared fixtures、PageObject）
  - 如何切换引擎（`E2E_ENGINE=flux`）
  - 完整 env var 参考表
  - 调试指南（Playwright trace / video / screenshot）
  - 如何运行特定测试
  - 跨项目共享库工作机制（sync 脚本）
- 更新项目根 `README.md` 的 E2E 测试章节，引用新指南
- 确认所有 env var 文档与 `docs/design/` 中的设计文档一致

## Non-Goals

- 不修改 E2E 测试代码或基础设施
- 不写 CI/CD 集成文档（Phase 5.1-5.3）
- 不更新 nop-entropy-e2e 或 nop-app-erp 的 README（这些项目的 README 需要各自维护）
- 不写 JavaScript/TypeScript 以外的测试语言文档
- 不写扩展系统本身的测试指南

## Scope

### In Scope

- 创建 `docs/testing/01-e2e-developer-guide.md`
- 更新本仓库 `README.md` 的 E2E 测试章节
- 审计所有 env var 在 `docs/design/` 中的定义是否与当前实现一致（`playwright.config.ts`、shared fixtures）
- 验证 `pnpm test:e2e --list` 可正常列出所有测试
- 验证新指南中的所有命令示例是可工作的

### Out Of Scope

- nop-entropy-e2e 和 nop-app-erp 的 README 更新
- CI 配置文档（Phase 5.1-5.3）
- 测试代码或测试基础设施修改

## Execution Plan

### Phase 1 — 审计当前文档和实现

Status: completed
Targets: `README.md`, `docs/testing/index.md`, `docs/design/*.md`, `playwright.config.ts`, `packages/e2e-shared/src/`

- Item Types: `Proof | Decision`

#### 审计结果

**README.md E2E 覆盖：**
- 项目结构（L74）列出 `tests/e2e/`，常用命令（L153）列出 `pnpm test:e2e`
- **缺失：** 无独立的 E2E 测试章节；无引擎切换说明；无三种模式（mock/prototype/extension-demo）解释；无指向开发者指南的引用；其他 E2E scripts（`test:e2e:headed`、`test:e2e:amis-prototype`、`test:e2e:flux-prototype`、`test:e2e:extension-demo`）未列出

**docs/testing/index.md 可引用内容：**
- E2E Test Entry Points 表（L32-37）列出 4 个命令（`test:e2e`、`test:e2e:amis-prototype`、`test:e2e:flux-prototype`、`test:e2e:extension-demo`）
- 可作为 Phase 2 快速开始章节的命令参考

**Env var 交叉核对（design docs vs playwright.config.ts）：**
- `docs/design/e2e-shared-infrastructure.md` 的 env var 表包含 E2E_ENGINE, E2E_AUTH_MODE, FRONTEND_DEV_MODE, FRONTEND_PORT, BASE_URL, SKIP_WEBSERVER, E2E_USER, E2E_PASSWORD, NOP_CHAOS_NEXT_DIR
- `docs/design/e2e-frontend-mode.md` 的 env var 表包含 FRONTEND_DEV_MODE, NOP_CHAOS_NEXT_DIR, FRONTEND_PORT, BASE_URL, SKIP_WEBSERVER, PORT
- `playwright.config.ts` 实现：读取 BASE_URL/PLAYWRIGHT_BASE_URL, PLAYWRIGHT_APP_MODE, E2E_ENGINE
- **结论：基本一致。** design docs 中的 `FRONTEND_DEV_MODE` 等变量是为 nop-entropy-e2e 场景设计（nop-chaos-next playwright.config.ts 不直接使用它们，它们由下游项目读取）；`PLAYWRIGHT_APP_MODE` 是 nop-chaos-next 特有变量，在 design docs 兼容表中有说明。无实际 drift。

**packages/e2e-shared/src/ public API vs design docs：**
- `fixtures.ts`: 导出自定义 test（engine fixture + page fixture）— 与设计一致
- `index.ts` 导出 25 个符号 — 与 `docs/design/e2e-shared-infrastructure.md` 列出的 API 一致
- **结论：完全一致。**

**差异记录：** 无需要修复的 design-doc drift。README 缺乏 E2E 章节是为 Phase 3 准备的修复项。

- [x] 列出 README.md 中当前 E2E 相关内容的覆盖面和缺失项
- [x] 列出 `docs/testing/index.md` 中可引用的入口和命令
- [x] 交叉核对 `docs/design/` 中的 env var 表与 `playwright.config.ts` 实际实现是否一致
- [x] 交叉核对 `packages/e2e-shared/src/fixtures.ts` 和 `index.ts` 的 public API 与设计文档的一致性
- [x] 记录所有差异（如有）作为 Phase 2 的修复项

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] 当前文档覆盖范围已审计完成
- [x] env var 设计文档 vs 实现的一致性检查已完成
- [x] 差异项已记录，如果属于 design-doc drift 则标记为 Fix 项
- [x] No owner-doc update required (this phase only audits, does not modify)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — 编写 E2E 开发者指南

Status: completed
Targets: `docs/testing/01-e2e-developer-guide.md`

- Item Types: `Fix`

- [x] 撰写 "E2E 测试架构概览" 章节
- [x] 撰写 "快速开始：运行第一个测试" 章节
- [x] 撰写 "如何编写新测试" 章节（含完整示例：使用 shared fixtures、PageObject 模式、断言）
- [x] 撰写 "引擎切换" 章节（E2E_ENGINE env var + 适用场景）
- [x] 撰写 "环境变量参考" 章节（所有 E2E_* / FRONTEND_* / NOP_* 变量列表）
- [x] 撰写 "调试指南" 章节（trace viewer、video、screenshot、--headed、--debug）
- [x] 撰写 "常见问题" 章节
- [x] 撰写 "跨项目共享库" 章节（sync 脚本 + 版本管理）
- [x] 额外：撰写 "设计文档一致性说明" 章节（验证 env var 和 API 一致性）

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `docs/testing/01-e2e-developer-guide.md` 创建完成，至少 8 个章节（实际 9 章）
- [x] 所有命令示例已在本地验证可工作（`--list` 级别已验证）
- [x] 指南中的 env var 表与 `docs/design/e2e-shared-infrastructure.md` 和 `docs/design/e2e-frontend-mode.md` 一致
- [x] No owner-doc update required (docs/testing/01-e2e-developer-guide.md is a user-facing guide, not a design doc; no design doc changes needed)
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — 更新 README

Status: completed
Targets: `README.md`

- Item Types: `Fix`

- [x] 在 README.md 中创建或更新 "E2E 测试" 章节
- [x] 添加指向 `docs/testing/01-e2e-developer-guide.md` 的引用
- [x] 列出所有 E2E 相关 npm scripts（`test:e2e`、`test:e2e:headed`、`test:e2e:extension-demo` 等）
- [x] 简要说明三种模式（mock / prototype / extension-demo）及其适用场景

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] README.md 的 E2E 章节已更新
- [x] 引用了新的开发者指南
- [x] `docs/logs/` 对应日期条目已更新
- [x] No owner-doc update required (README and testing guide are user-facing docs, not design docs)

### Phase 4 — 一致性验证和收尾

Status: completed
Targets: todo list above

- Item Types: `Proof`

- [x] 确认所有 3 个 Phase 都已 `completed`
- [x] 运行 `pnpm test:e2e --list` 确认无 import 错误（74 tests in 23 files）
- [x] 运行 `pnpm typecheck && pnpm build && pnpm lint` 全绿（typecheck 28/28, build 15/15, lint 28/28, test 28/28/368）
- [x] 捕获 deferred items 和 non-blocking follow-ups
- [x] 安排独立子 agent closure audit（已通过子 agent 完成）

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] 所有 Phase 1-3 Exit Criteria 已满足
- [x] Closure Gates 全部勾选
- [x] 独立子 agent closure audit 已完成
- [x] No owner-doc update required (Phase 4 is pure verification/closure; no design doc changes)
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] `docs/testing/01-e2e-developer-guide.md` 已创建，覆盖架构、快速开始、编写测试、引擎切换、env var、调试、FAQ、共享库（9 章）
- [x] README.md E2E 章节已更新，引用新指南
- [x] env var 文档与实现一致（design docs vs playwright.config.ts vs shared fixtures）
- [x] `pnpm test:e2e --list` 无 import 错误
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] No owner-doc update required (documentation guide is a user-facing doc, not a design doc)
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` — 28/28
- [x] `pnpm build` — 15/15
- [x] `pnpm lint` — 28/28
- [x] `pnpm test` — 28/28, 368 tests green

## Deferred But Adjudicated

### nop-entropy-e2e / nop-app-erp README 更新

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: These projects are maintained independently. The developer guide in nop-chaos-next serves as the reference; downstream projects should update their own READMEs when they sync the shared library.
- Successor Required: `no`

## Non-Blocking Follow-ups

- After closed, consider adding a quick-start video or screencast link to the developer guide
- Consider a checklist template for PRs that touch e2e tests

## Closure

Status Note: completed

Closure Audit Evidence:

- Auditor / Agent: subagent ses_07f5ba012ffeT2sNvYoX9k4pwF (closure audit)
- Evidence: All 15 checks evaluated — 3 Phase deliverables pass (docs/testing/01-e2e-developer-guide.md 9 chapters, README E2E section, all build/lint/typecheck/test green). Procedural gap initially found by audit (Phase 4 not yet ticked) has been resolved. All closure gates now ticked.

Follow-up:

- After closed, consider adding a quick-start video or screencast link to the developer guide
- Consider a checklist template for PRs that touch e2e tests
