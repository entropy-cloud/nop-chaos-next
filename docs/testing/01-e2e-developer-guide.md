# E2E 测试开发者指南

> 面向 nop-chaos-next 及其下游项目（nop-entropy-e2e、nop-app-erp）的 E2E 测试开发手册。
>
> 架构设计文档：`docs/design/e2e-shared-infrastructure.md`、`docs/design/e2e-frontend-mode.md`

## 目录

1. [E2E 测试架构概览](#1-e2e-测试架构概览)
2. [快速开始：运行第一个测试](#2-快速开始运行第一个测试)
3. [如何编写新测试](#3-如何编写新测试)
4. [引擎切换](#4-引擎切换)
5. [环境变量参考](#5-环境变量参考)
6. [调试指南](#6-调试指南)
7. [常见问题](#7-常见问题)
8. [跨项目共享库](#8-跨项目共享库)
9. [设计文档一致性说明](#9-设计文档一致性说明)

---

## 1. E2E 测试架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    @nop-chaos/e2e-shared                         │
│              (nop-chaos-next/packages/e2e-shared/)              │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ EngineAdapter│  │  PageObjects │  │    API Clients        │  │
│  │  (interface) │  │              │  │                       │  │
│  │  AmisAdapter │  │  BasePage    │  │  GraphQLClient        │  │
│  │  FluxAdapter │  │  CrudListPage│  │  RpcClient            │  │
│  │              │  │  FormDialog  │  │  (Nop RPC protocol)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         │                 │                      │               │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────────┴────────────┐  │
│  │ engine.ts    │  │ Navigation  │  │ types.ts              │  │
│  │ getEngine()  │  │ login()     │  │ config / constants    │  │
│  └──────────────┘  └─────────────┘  └───────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ fixtures.ts  (Playwright custom fixtures: engine, page)    │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 核心组件

| 组件 | 文件 | 职责 |
|------|------|------|
| `EngineAdapter` | `types.ts` | 接口定义，AMIS/Flux 引擎都实现此接口 |
| `AmisAdapter` | `AmisAdapter.ts` | AMIS 引擎的 DOM 定位器实现（`.cxd-*` selectors） |
| `FluxAdapter` | `FluxAdapter.ts` | Flux 引擎的 DOM 定位器实现（`data-slot` / `data-testid`） |
| `BasePage` | `Page.ts` | 页面对象抽象基类，提供 `goto(hashRoute)` |
| `CrudListPage` | `CrudListPage.ts` | CRUD 列表页面对象，封装增删改查操作 |
| `FormDialog` | `FormDialog.ts` | 表单对话框页面对象，封装字段填写和提交 |
| `GraphQLClient` | `GraphQLClient.ts` | 中心化 GraphQL 操作（适用于有后端的项目） |
| `RpcClient` | `RpcClient.ts` | Nop RPC 协议客户端（兼容 nop-entropy-e2e 现有代码） |
| `engine.ts` | `engine.ts` | 引擎工厂：`getEngine()`、`createEngine()`、`resetEngine()` |
| `fixtures.ts` | `fixtures.ts` | Playwright 自定义 fixtures：注入 `engine`、console error 捕获 |
| `Navigation` | `Navigation.ts` | 登录 + 导航工具函数 |

### EngineAdapter 接口

`EngineAdapter` 封装 AMIS 和 Flux 之间 DOM 结构的差异，使测试代码不受引擎选择影响：

```typescript
interface EngineAdapter {
  engineName: string;
  crudContainer(page: Page): Locator;
  table(page: Page): Locator;
  rows(page: Page): Locator;
  cellValue(row: Locator, fieldName: string, columnHeaders: string[]): Promise<string>;
  addButton(page: Page): Locator;
  rowAction(row: Locator, actionNamePattern: RegExp): Promise<void>;
  dialog(page: Page): Locator;
  formField(dialog: Locator, fieldName: string): Locator;
  submitButton(dialog: Locator): Locator;
  selectOption(dialog: Locator, fieldLabels: string[], optionText: string[]): Promise<void>;
  dateInputByLabel(page: Page, labelText: string): Locator;
}
```

引擎选择器分界：

| 交互 | AMIS 适配器 | Flux 适配器 |
|------|------------|------------|
| CRUD 容器 | `#main-content, main, .cxd-Page` | `[data-slot="crud-table"]` |
| 表格 | `.cxd-Crud, .cxd-Table` | `[data-slot="crud-table"] .nop-table` |
| 行 | `tr, .cxd-Table-row` | `tbody tr[data-slot="table-row"]` |
| 单元格 | `> td:nth-child(N)` | `[data-field="fieldName"]` |
| 对话框 | `.cxd-Modal, .cxd-Dialog` | `[data-slot="dialog-surface"]` |

### 三种测试模式

nop-chaos-next 的 E2E 测试支持三种模式，通过 `PLAYWRIGHT_APP_MODE` 环境变量切换：

| 模式 | 命令 | 说明 |
|------|------|------|
| Mock（默认） | `pnpm test:e2e` | 使用 MSW route interception 模拟 API，纯前端行为测试 |
| AMIS Prototype | `pnpm test:e2e:amis-prototype` | 使用 AMIS JSON 原型文件，测试 AMIS 渲染完整性 |
| Flux Prototype | `pnpm test:e2e:flux-prototype` | 使用 Flux JSON 原型文件，测试 Flux 渲染完整性 |
| Extension Demo | `pnpm test:e2e:extension-demo` | 测试 extension 系统示例的 Harbor login 和内置页面 |

---

## 2. 快速开始：运行第一个测试

### 前置条件

```bash
pnpm install
pnpm build
```

### 运行全部 E2E 测试

```bash
pnpm test:e2e          # 无头模式（Headless）
pnpm test:e2e:headed   # 有头模式（浏览器可见）
```

### 运行单个测试文件

```bash
pnpm test:e2e -- tests/e2e/login.spec.ts
pnpm test:e2e:headed -- tests/e2e/flow-editor.spec.ts
```

### 按名称运行单个测试

```bash
pnpm test:e2e -- --grep "can start from login and enter dashboard"
pnpm test:e2e:headed -- --grep "flow editor supports grouped palette"
```

### 列出所有测试（不运行）

```bash
pnpm test:e2e --list
```

### 运行特定模式

```bash
# AMIS Prototype 模式
pnpm test:e2e:amis-prototype

# Flux Prototype 模式
pnpm test:e2e:flux-prototype

# Extension Demo 模式（模拟 Harbor 登录）
pnpm test:e2e:extension-demo
```

---

## 3. 如何编写新测试

### 使用共享 fixtures

所有测试应使用 `@nop-chaos/e2e-shared` 导出的 `test` fixture，而非 `@playwright/test` 的 `test`：

```typescript
import { expect } from '@playwright/test';
import { test } from '@nop-chaos/e2e-shared';

test('my test', async ({ page, engine }) => {
  // page: 标准 Playwright Page 对象（附加了 console error 收集）
  // engine: 根据 E2E_ENGINE 注入的 EngineAdapter 实例
});
```

`test` fixture 自动提供：
- `page` — 标准 Playwright Page，自动收集 console error（通过 `E2E_ASSERT_NO_CONSOLE_ERRORS` 控制）
- `engine` — 根据 `E2E_ENGINE` 环境变量注入的 `AmisAdapter` 或 `FluxAdapter`

### PageObject 模式

```typescript
import { test, CrudListPage, getEngine } from '@nop-chaos/e2e-shared';
import { login } from '@nop-chaos/e2e-shared';

test('CRUD: add a new user', async ({ page, engine }) => {
  // 1. 登录（Mock 模式）
  await login(page);

  // 2. 创建 PageObject
  const crudPage = new CrudListPage(page, engine, {
    entityRoute: 'NopAuthUser',
    columnHeaders: ['username', 'email', 'status'],
  });

  // 3. 导航到页面
  await crudPage.navigate();

  // 4. 等待列表加载
  await crudPage.waitForList();

  // 5. 点击新增 → 填写表单 → 提交
  const dialog = await crudPage.clickAdd();
  await dialog.setField('username', 'testuser');
  await dialog.setField('email', 'test@example.com');
  await dialog.submit();

  // 6. 验证新增的行
  const row = await crudPage.findRowByField('username', 'testuser');
  expect(row).not.toBeNull();
});
```

### 断言

```typescript
import { expect } from '@playwright/test';
import { test, loginAndNavigate } from '@nop-chaos/e2e-shared';

test('dashboard displays correctly', async ({ page }) => {
  await loginAndNavigate(page, '/dashboard');

  // 页面级别的断言
  await expect(page).toHaveURL(/#\/dashboard$/);
  await expect(page.locator('aside')).toBeVisible();

  // 无页面级 JS 错误
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  // ... 执行交互 ...
  expect(pageErrors).toHaveLength(0);
});
```

### 完整示例：登录 → 导航 → 交互 → 断言

参考 `tests/e2e/login.spec.ts`：

```typescript
import { expect } from '@playwright/test';
import { test, login } from '@nop-chaos/e2e-shared';

test('can start from login and enter dashboard', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const variant = await login(page);

  if (variant === 'harbor') {
    await expect(page).toHaveURL(/#\/dashboard$/);
    await expect(page.locator('aside')).not.toContainText('Extension Harbor Page');
    expect(pageErrors).toHaveLength(0);
    return;
  }

  await expect(page).not.toHaveURL(/#\/auth\/login$/);
  await expect(page.locator('aside')).toBeVisible();
  await expect(page.locator('aside').getByRole('button', { name: 'Dashboard' })).toBeVisible();
  expect(pageErrors).toHaveLength(0);
});
```

---

## 4. 引擎切换

### 引擎选择机制

通过环境变量 `E2E_ENGINE` 切换引擎适配器：

```bash
# 使用 AMIS 引擎（默认）
pnpm test:e2e

# 使用 Flux 引擎
E2E_ENGINE=flux pnpm test:e2e
```

引擎选择在 `packages/e2e-shared/src/engine.ts` 中实现：

```typescript
export function getEngineType(): EngineType {
  const raw = process.env.E2E_ENGINE;
  if (raw === 'flux') return 'flux';
  return 'amis';  // 默认
}
```

### 适用场景

| 引擎 | 适用场景 | 选择器风格 |
|------|---------|-----------|
| AMIS（默认） | 测试 AMIS 渲染的页面、CRUD、表单 | `.cxd-*` CSS 类、`input[name]` |
| Flux | 测试 Flux 渲染的页面、使用 data-slot 的组件 | `[data-slot]`、`[data-testid]` |

### 架构说明

引擎差异完全封装在 Adapter 内，spec 代码不出现 `if (amis) ... else ...`。两种引擎下测试编写方式一致：

```typescript
// 不管 E2E_ENGINE=amis 还是 E2E_ENGINE=flux，以下代码都工作
const crudPage = new CrudListPage(page, engine, {
  entityRoute: 'NopAuthUser',
});
await crudPage.navigate();
const dialog = await crudPage.clickAdd();
await dialog.setField('username', 'testuser');
await dialog.submit();
```

---

## 5. 环境变量参考

### E2E 通用配置

| 变量 | 默认值 | 描述 | 适用范围 |
|------|--------|------|---------|
| `E2E_ENGINE` | `amis` | 引擎选择：`amis` / `flux` | 所有项目 |
| `E2E_AUTH_MODE` | `browser` | 登录方式：`browser` / `rpc` | 有真实后端的项目 |
| `E2E_USER` | `nop` | 登录用户名 | 有真实后端的项目 |
| `E2E_PASSWORD` | `123` | 登录密码 | 有真实后端的项目 |
| `E2E_ASSERT_NO_CONSOLE_ERRORS` | (unset) | 设为 `true` 时，console error 自动导致测试失败 | 所有项目 |

### 前端来源切换

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `FRONTEND_DEV_MODE` | (unset) | 设为 `true` 启用开发模式（使用 Vite dev server 提供前端，而非 Quarkus JAR） |
| `FRONTEND_PORT` | `4173` | Vite dev server 端口 |
| `NOP_CHAOS_NEXT_DIR` | `../../../nop-chaos-next` | nop-chaos-next 仓库路径（用于 `FRONTEND_DEV_MODE` 时定位 Vite dev server） |

### Playwright 标准变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `BASE_URL` | (动态) | 覆盖 baseURL。在 nop-chaos-next 中默认 `http://127.0.0.1:4175` |
| `PLAYWRIGHT_BASE_URL` | (同 `BASE_URL`) | Playwright 兼容别名，与 `BASE_URL` 任设一个即可 |
| `PLAYWRIGHT_APP_MODE` | `mock` | 应用模式：`mock` / `amis-prototype` / `flux-prototype` / `extension-demo`（nop-chaos-next 特有） |
| `SKIP_WEBSERVER` | (unset) | 跳过后端自动启动，使用已运行的外部服务器 |

### 环境变量命名规则

| 前缀 | 举例 | 语义 |
|------|------|------|
| `E2E_*` | `E2E_ENGINE` | 通用 E2E 测试配置，跨项目一致 |
| `FRONTEND_*` | `FRONTEND_DEV_MODE` | 前端来源切换（Vite dev server vs Quarkus JAR） |
| `NOP_*` | `NOP_CHAOS_NEXT_DIR` | 与项目路径相关，非测试语义配置 |
| 无前缀 | `BASE_URL` | 已有 Playwright 常用变量名，保留兼容性 |

---

## 6. 调试指南

### 查看浏览器操作

```bash
# 有头模式（浏览器窗口可见）
pnpm test:e2e:headed

# 调试模式（Playwright Inspector + 逐步执行）
pnpm test:e2e -- --debug
```

### Trace Viewer

Playwright 配置已启用 `trace: 'on-first-retry'`——首次失败时自动录制 trace：

```bash
# 运行测试（如果失败，trace 自动录制）
pnpm test:e2e

# 查看 trace
pnpm exec playwright show-trace test-results/**/trace.zip
```

Trace Viewer 提供：
- 时间线 + 每一步的 DOM 快照
- 网络请求详情
- console 日志
- 源码映射

### 截图与视频

```bash
# 截图仅失败时（默认）
# playwright.config.ts: screenshot: 'only-on-failure'
# 视频仅失败时（默认）
# playwright.config.ts: video: 'retain-on-failure'
```

截图输出：`test-results/`
视频输出：`test-results/`

### 特定测试快速调试

```bash
# 运行单个测试文件（有头）
pnpm test:e2e:headed -- tests/e2e/login.spec.ts

# 运行单个测试名称
pnpm test:e2e -- --grep "can start from login"

# 慢动作（每一步停顿 500ms）
SLOW_MO=500 pnpm test:e2e:headed
```

### Console 错误检查

shared fixtures 中的 `page` fixture 自动收集 console error。在 spec 结束时，如果 `E2E_ASSERT_NO_CONSOLE_ERRORS=true`，任何 console error 都会导致测试失败。

**建议**：本地调试时关闭（不设环境变量），CI 中开启。

---

## 7. 常见问题

### Q: 测试报 `Error: Cannot find module '@nop-chaos/e2e-shared'`

A: 确认 `pnpm install` 已运行。如果是下游项目（nop-entropy-e2e），需要先运行 sync 脚本：

```bash
bash scripts/sync-e2e-shared.sh ../nop-entropy/nop-entropy-e2e/packages/e2e-shared
```

### Q: 如何跳过 webServer 启动？

A: 设置 `SKIP_WEBSERVER=1`，测试将使用已有的 dev server：

```bash
SKIP_WEBSERVER=1 pnpm test:e2e
```

### Q: 如何指向外部服务器？

A: 设置 `BASE_URL`，测试将跳过内置 webServer：

```bash
BASE_URL=http://localhost:4173 pnpm test:e2e
```

### Q: 测试总是超时？

A: Playwright 默认 timeout 30 秒，expect 10 秒。如果前端编译慢，增大 `webServer` 的 `timeout`（playwright.config.ts 中已设为 180 秒）。如果测试本身慢，可以：

```bash
# 全局增加 timeout
PLAYWRIGHT_TIMEOUT=60000 pnpm test:e2e
```

### Q: 如何只测试特定引擎的 spec？

A: 目前 spec 文件不区分引擎（fixture 自动注入引擎适配器）。如果需要区分，使用 `test.skip`：

```typescript
test.skip(process.env.E2E_ENGINE === 'flux', 'Flux 引擎暂不支持此功能');
```

### Q: 为我的项目编写 E2E 测试应该从哪里开始？

A: 参考：
1. `tests/e2e/login.spec.ts` — 最简单的登录 → 断言测试
2. `tests/e2e/flow-editor.spec.ts` — 页面交互测试
3. `tests/e2e/check-btn-pos.spec.ts` — 布局检测测试

如果要在项目中使用共享 PageObject，参考 `packages/e2e-shared/README.md`。

### Q: Mock 模式下后端 API 怎么处理？

A: Mock 模式使用 MSW（Mock Service Worker）在浏览器中拦截所有 HTTP 请求。Mock 数据定义在 `apps/main/src/mock/` 中。无需真实后端。

---

## 8. 跨项目共享库

### 仓库位置

共享库源码位于 `packages/e2e-shared/`，由 nop-chaos-next 维护，通过 sync 脚本分发到下游项目：

### 同步脚本

```bash
# 语法
bash scripts/sync-e2e-shared.sh <target-directory>

# 同步到 nop-entropy-e2e
bash scripts/sync-e2e-shared.sh ../nop-entropy/nop-entropy-e2e/packages/e2e-shared

# 同步到 nop-app-erp
bash scripts/sync-e2e-shared.sh ../nop-app-erp/tests/e2e/pages
```

同步脚本功能：
1. 拷贝 `packages/e2e-shared/src/` 到目标路径
2. 在目标项目生成/更新 `package.json` 的依赖声明（指向源目录的 `file:` 依赖）
3. 写入 `e2e-shared-version.txt` 版本标记
4. **不覆盖**目标项目已有的特定测试文件（如 `_helper.ts`、spec 文件）

### 版本管理

- 版本标识：`packages/e2e-shared/package.json` 中的 `version` 字段（当前：`0.0.1`）
- 同步时自动生成 `e2e-shared-version.txt` 记录版本
- 不强制版本锁定——同步即最新，鼓励各项目保持同步

### 分发架构

```
nop-chaos-next/
  packages/e2e-shared/          ← 代码源
    src/                        ← 源码（共享给下游项目）
    package.json
    README.md
  scripts/sync-e2e-shared.sh    ← 同步脚本
       │
       ▼
nop-entropy-e2e/  ────  nop-app-erp/
  packages/                       tests/e2e/
    e2e-shared/                     pages/
      src/    ← 同步拷贝              ← 同步拷贝
```

---

## 9. 设计文档一致性说明

### 环境变量对照

以下变量在 `docs/design/e2e-shared-infrastructure.md`、`docs/design/e2e-frontend-mode.md`、`playwright.config.ts` 中定义一致：

| 变量 | 设计文档 | playwright.config.ts | 状态 |
|------|---------|---------------------|------|
| `E2E_ENGINE` | 定义 ✅ | 读取并传递 ✅ | 一致 |
| `E2E_AUTH_MODE` | 定义 ✅ | 下游项目使用 | 一致（本仓库不使用） |
| `FRONTEND_DEV_MODE` | 定义 ✅ | 下游项目使用 | 一致（本仓库不使用） |
| `FRONTEND_PORT` | 定义 ✅ | 下游项目使用 | 一致（本仓库不使用） |
| `BASE_URL` | 定义 ✅ | 读取（含别名） ✅ | 一致 |
| `PLAYWRIGHT_BASE_URL` | 兼容表说明 ✅ | 读取 ✅ | 一致 |
| `PLAYWRIGHT_APP_MODE` | 兼容表说明 ✅ | 读取 ✅ | 一致 |
| `SKIP_WEBSERVER` | 定义 ✅ | 下游项目使用 | 一致（本仓库不使用） |
| `E2E_USER` / `E2E_PASSWORD` | 定义 ✅ | 下游项目使用 | 一致（本仓库不使用） |
| `NOP_CHAOS_NEXT_DIR` | 定义 ✅ | 下游项目使用 | 一致（本仓库不使用） |

### 共享库 API

`packages/e2e-shared/src/index.ts` 的 public API 与 `docs/design/e2e-shared-infrastructure.md` 中的定义完全一致。当前无 drift。
