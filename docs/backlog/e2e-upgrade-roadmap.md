# E2E 升级路线图

> Mission: `e2e-upgrade` (`missions/e2e-upgrade.json`)
> 状态：进行中
> 开始日期：2026-07-20

## Overview

统一 nop-chaos-next、nop-entropy（nop-entropy-e2e）、nop-app-erp 三个项目的 E2E 测试基础设施。核心产出：

1. **共享库** `packages/e2e-shared`（nop-chaos-next 托管，sync 分发）
2. **EngineAdapter 接口** + AmisAdapter / FluxAdapter 双引擎
3. **PageObject 层次** BasePage → CrudListPage + FormDialog
4. **API 客户端** GraphQLClient + RpcClient
5. **Env var 统一体系** E2E_ENGINE、E2E_AUTH_MODE、FRONTEND_DEV_MODE 等
6. **前端模式切换** FRONTEND_DEV_MODE 支持在真实后端上调试开发版前端

详细设计见 `docs/design/e2e-shared-infrastructure.md` 和 `docs/design/e2e-frontend-mode.md`。

## Phase 0：基础设施搭建（nop-chaos-next）

| # | 工作项 | 描述 | 预计投入 |
|---|--------|------|---------|
| 0.1 | 创建 `packages/e2e-shared` | 从 nop-app-erp `pages/` 提取 EngineAdapter 接口、AmisAdapter、FluxAdapter、BasePage、CrudListPage、FormDialog、GraphQLClient、Navigation、engine 工厂、fixtures。适配为独立 workspace 包。 | 1 plan | ✅ |
| 0.2 | 创建 `scripts/sync-e2e-shared.sh` | 同步脚本，将 `packages/e2e-shared/src/` 拷贝到目标项目指定路径、生成/更新 version 标记。 | 1 plan | ✅ |
| 0.3 | 创建 `tools/mission-driver.sh` | Mission driver 启动脚本，指向 AGE 模板引擎。 | 1 plan |

**完成标准**：
- `pnpm --filter @nop-chaos/e2e-shared typecheck` 通过
- 可以通过 `./tools/mission-driver.sh run e2e-upgrade --step CHECK` 执行健康检查
- 同步脚本可以成功将包拷贝到目标目录

## Phase 1：nop-chaos-next 自用

| # | 工作项 | 描述 | 预计投入 |
|---|--------|------|---------|
| 1.1 | 支持 `E2E_ENGINE` env var | 在 `playwright.config.ts` 中读取 `E2E_ENGINE`，注入 engine fixture（用于双引擎切换测试）。 | 1 plan | ✅ |
| 1.2 | 支持 `BASE_URL` alias | `playwright.config.ts` 同时识别 `PLAYWRIGHT_BASE_URL` 和 `BASE_URL`。 | 1 plan | ✅ |
| 1.3 | PageObject 改造：登录 + dashboard 相关 spec | 改造 `login.spec.ts`、`sidebar-user-menu.spec.ts`、`permission.spec.ts`、`i18n-persistence.spec.ts` 使用共享库 PageObject。 | 1 plan | ✅ |
| 1.4 | PageObject 改造：流编辑器和插件 spec | 改造 `flow-editor.spec.ts`、`plugin-demo.spec.ts`、`extension-demo.spec.ts`。 | 1 plan | ✅ |
| 1.5 | PageObject 改造：AMIS 相关 spec | 改造 `amis-demo.spec.ts`、`amis-preview-crud.spec.ts`、`amis-css-isolation.spec.ts`、`amis-react19-transition.spec.ts`。 | 1 plan | ✅ |
| 1.6 | PageObject 改造：CRUD 和 AI Workbench spec | 改造 `master-detail-buttons.spec.ts`、`master-detail-dialogs.spec.ts`、`ai-workbench-styles.spec.ts`。 | 1 plan | ✅
| 1.7 | PageObject 改造：lazy loading + prototype spec | 改造 `lazy-loading.spec.ts`、`amis-prototype.spec.ts`、`flux-prototype.spec.ts`。 | 1 plan | ✅ |
| 1.8 | MockAuthAdapter | 将 `support/auth.ts` 的 mock login pattern 适配为共享库可用的 `MockAuthAdapter`（不阻塞、逐步迁移）。 | 1 plan | ✅ |

**完成标准**：
- `pnpm test:e2e` 全部 23+ spec 通过
- `E2E_ENGINE=flux pnpm test:e2e` 至少通过 flux 原型测试
- `BASE_URL=http://external:4175 pnpm test:e2e` 使用外部服务器正常工作

## Phase 2：nop-entropy-e2e 升级

| # | 工作项 | 描述 | 预计投入 |
|---|--------|------|---------|
| 2.1 | sync 共享库到 `e2e-shared` | 通过 sync 脚本将共享库同步到 `nop-entropy-e2e/packages/e2e-shared/`。 | 0.5 plan | ✅ |
| 2.2 | 替换 AMIS-only PageObject | 将现有 `AmisCrudPage` 替换为双引擎 `CrudListPage` + `FormDialog`；迁移 `helpers/` 中相关逻辑到共享库。 | 1 plan | ✅ |
| 2.3 | RpcClient 集成 | 将现有的 `loginRpc()` / `rpc()` 独立函数替换为共享库的兼容导出（保持import兼容）。 | 1 plan | ✅ |
| 2.4 | `FRONTEND_DEV_MODE` 支持 | 在各 e2e 包的 `playwright.config.ts` 中增加前端模式切换逻辑。 | 1 plan | ✅ |
| 2.5 | Navigation 统一登录 | 将现有 `LoginPage` / `LoginPO` 迁移到共享库的 `Navigation.login()`。 | 1 plan | ✅
| 2.6 | auth-e2e 测试适配 | 改造 `nop-auth-e2e` 下所有 spec 使用新 PageObject。 | 1 plan | ✅ |
| 2.7 | code-e2e / job-e2e 测试适配 | 改造其他 e2e 包。 | 1 plan | ✅ |

**完成标准**：
- `pnpm test:auth` / `pnpm test:code` / `pnpm test:job` 全部通过
- `FRONTEND_DEV_MODE=true pnpm test:auth` 使用 Vite dev server 通过
- `E2E_ENGINE=flux pnpm test:auth` 通过 Flux 适配器

## Phase 3：nop-app-erp 迁移

| # | 工作项 | 描述 | 预计投入 |
|---|--------|------|---------|
| 3.1 | sync 共享库到 `tests/e2e/pages/` | 通过 sync 脚本同步共享库，覆盖现有本地文件。 | 0.5 plan | ✅ |
| 3.2 | 删除本地重复文件 | 删除/替换被共享库替代的本地副本（AmisAdapter.ts、FluxAdapter.ts、engine.ts、FormDialog.ts → 共享版；types.ts、Page.ts、CrudListPage.ts、GraphQLClient.ts、Navigation.ts 保留为本地适配层）。 | 0.5 plan | ✅ |
| 3.3 | Navigation 统一 | 确认 `Navigation.ts` 的 `login()` 实现是否一致，是否需要保留本地 override。 | 1 plan |
| 3.4 | CRUD spec 验证 | 确保 41 个 CRUD spec 仍通过。 | 1 plan |
| 3.5 | Dashboard + report spec 验证 | 确保 67 个 dashboard/report spec 仍通过。 | 1 plan |
| 3.6 | Business action + orchestration spec 验证 | 确保 105 个 action/orchestration spec 仍通过。 | 1 plan |
| 3.7 | Visual regression spec 验证 | 确保 snapshot/visual spec 仍通过。 | 1 plan |

**完成标准**：
- `npx playwright test` 全部 ~180 spec 通过
- `E2E_ENGINE=flux npx playwright test tests/e2e/crud/` 至少通过 CRUD smoke

## Phase 4：Flux 全覆盖

| # | 工作项 | 描述 | 预计投入 |
|---|--------|------|---------|
| 4.1 | FluxAdapter 完善 | 补齐 `AmisAdapter` 已实现但 `FluxAdapter` 缺失的方法（`selectOption` 完善、date 输入、特殊弹窗）。 | 1 plan |
| 4.2 | Flux CRUD 端到端测试 | 写一组 Flux CRUD e2e spec（每个项目各一套）。 | 1 plan |
| 4.3 | Flux dashboard + report 测试 | 写 Flux 版 dashboard/report spec。 | 1 plan |
| 4.4 | CI 双引擎矩阵 | CI 配置同时运行 `E2E_ENGINE=amis` 和 `E2E_ENGINE=flux`。 | 1 plan |

**完成标准**：
- `E2E_ENGINE=flux pnpm test:e2e` 在 nop-chaos-next 全部通过
- CI 同时跑双引擎各自的结果

## Phase 5：CI / 质量加固

| # | 工作项 | 描述 | 预计投入 |
|---|--------|------|---------|
| 5.1 | nop-chaos-next CI 接入 e2e | 将 e2e 测试加入 GitHub Actions（turbo 构建 + playwright run）。 | 1 plan |
| 5.2 | nop-entropy CI 接入 e2e | 在 Maven CI 后触发 e2e 测试。 | 1 plan |
| 5.3 | nop-app-erp CI 加固 | 确认现有 CI 覆盖全部 e2e，添加 `BASE_URL`/`FRONTEND_DEV_MODE` 可选参数。 | 1 plan |
| 5.4 | E2E 文档化 | 更新各项目 README，写 E2E 开发者指南（如何写新测试、如何切换引擎、如何调试）。 | 1 plan |

**完成标准**：
- CI 中 e2e 自动运行，失败时 artifact 可下载
- README 中有完整的 e2e 测试编写指南

## 跨项目跟踪

| 阶段 | 工作项合计 | 预计 plan 数 | 状态 |
|------|-----------|-------------|------|
| Phase 0 | 3 | 3 | 🟡 2/3 完成 |
| Phase 1 | 8 | 8 | 🟡 7/8 完成 |
| Phase 2 | 7 | 6.5 | 🟢 7/7 完成 |
| Phase 3 | 6 | 4 | 🟡 2/7 完成（3.1+3.2） |
| Phase 4 | 4 | 4 | ❌ 未开始 |
| Phase 5 | 4 | 4 | ❌ 未开始 |
| **总计** | **32** | **~29.5** | |

## 设计文档

- `docs/design/e2e-shared-infrastructure.md` — 共享库架构 + 分发策略
- `docs/design/e2e-frontend-mode.md` — 前端开发模式切换
