# E2E 测试共享基础设施设计

> 当前生效的设计文档，定义跨项目统一的 E2E 测试基础设施：PageObject 模式、AMIS/Flux 双引擎适配、共享代码存放与分发策略。
>
> 实施路线图见 `docs/backlog/e2e-upgrade-roadmap.md`，由 Mission `e2e-upgrade`（`missions/e2e-upgrade.json`）驱动。

## 背景

Nop 平台生态中有三个独立项目各自维护 E2E 测试：

| 项目 | E2E 目录 | 测试规模 | 前端来源 | 后端 |
|------|---------|---------|---------|------|
| **nop-chaos-next** | `tests/e2e/` | ~23 spec | Vite dev / build+preview | Mock (route interception) |
| **nop-entropy** | `nop-entropy-e2e/` (3 pkg) | ~15 spec | `nop-web-site` JAR (Quarkus) | Quarkus real backend |
| **nop-app-erp** | `tests/e2e/` | ~180 spec | `app-erp-all` uber-jar（含 `nop-web-site` 依赖） | Quarkus uber-jar real backend |

三个项目存在大量重复的基础设施代码——页面交互的定位器逻辑、AMIS/Flux 的 DOM 差异、登录认证、RPC/GraphQL 客户端。同时，它们都在向双引擎（AMIS + Flux）迁移，需要一个统一抽象层。

## Current State 分析

### nop-chaos-next 现状

- 无 PageObject，全部 ad-hoc 选择器内联在 spec 中
- 唯一共享工具：`support/auth.ts`（mock 登录 + route interception）
- 选择器模式混乱：`data-testid`、`data-slot`、AMIS `.cxd-*` CSS 类混用
- 通过 `PLAYWRIGHT_APP_MODE` env var 切换 mock/prototype/extension-demo 模式
- 前端 dev 模式：Vite dev server（port 4173，代理 API 到 `localhost:8080`）

### nop-entropy-e2e 现状

- `packages/e2e-shared` 提供 `LoginPage`、`BasePage`、`AmisCrudPage`
- AMIS 专用：通过 `AMIS` 常量导出 `.cxd-*` CSS 选择器
- 提供 `loginRpc()` / `rpc()` RPC 辅助函数（Nop RPC 协议）
- 无 Flux 适配器，无引擎切换能力
- 每个 e2e 包的 `playwright.config.ts` 各自重复

### nop-app-erp 现状

- 最成熟的架构：`tests/e2e/pages/` 完整的 PageObject + 双引擎适配器
- `EngineAdapter` 接口：`AmisAdapter` + `FluxAdapter` 实现
- `BasePage` → `CrudListPage` + `FormDialog`
- `GraphQLClient`：中心化 GraphQL 操作（增删改查、自定义 mutation/query）
- `Navigation`：登录 + hash 路由导航
- 引擎切换：`E2E_ENGINE=flux` env var，`getEngine()` 全局工厂
- 自定义 Playwright fixtures：`engine` 注入、console error 捕获
- `Navigation.login()` 在每个 `BasePage.goto()` 调用时执行完整浏览器登录（暂未实现全局 setup + storageState 复用）
- 纯 RPC 测试（无浏览器）和浏览器测试混用

### 共同问题

1. **PageObject 模式不统一** — 有的有、有的无、有的不完整
2. **AMIS/Flux 双引擎无统一抽象** — 除了 nop-app-erp，其他项目只能测 AMIS
3. **选择器重复** — `.cxd-*`、`data-testid`、`data-slot` 等常量散落各处
4. **登录认证各自实现** — mock/RPC/浏览器三种模式不共享
5. **API 客户端不统一** — RPC 协议 vs GraphQL，各自封装
6. **前端来源切换无统一方案** — nop-chaos-next 有 `PLAYWRIGHT_APP_MODE`，nop-entropy-e2e 规划了 `FRONTEND_DEV_MODE`，nop-app-erp 使用 `nop-web-site` JAR

## 统一架构

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
            ▲                    ▲                    ▲
            │ sync               │ sync               │ sync
            │                    │                    │
  ┌─────────┴──────────┐ ┌──────┴──────────┐ ┌──────┴──────────┐
  │ nop-chaos-next e2e │ │ nop-entropy e2e │ │ nop-app-erp e2e │
  │                    │ │                  │ │                  │
  │ tests/e2e/         │ │ packages/        │ │ tests/e2e/       │
  │  ✗ adopt page obj  │ │  e2e-shared/     │ │  pages/          │
  │  ✗ adopt engine    │ │  (replace with   │ │  (replace with   │
  │                     │ │   shared copy)   │ │   shared copy)   │
  └────────────────────┘ └──────────────────┘ └──────────────────┘
```

### 核心接口设计

```typescript
// types.ts  — EngineAdapter 接口
export interface EngineAdapter {
  engineName: string;

  // CRUD 列表
  crudContainer(page: Page): Locator;
  table(page: Page): Locator;
  rows(page: Page): Locator;
  cellValue(row: Locator, fieldName: string, columnHeaders: string[]): Promise<string>;
  addButton(page: Page): Locator;
  rowAction(row: Locator, actionNamePattern: RegExp): Promise<void>;

  // 对话框 / 表单
  dialog(page: Page): Locator;
  formField(dialog: Locator, fieldName: string): Locator;
  submitButton(dialog: Locator): Locator;
  selectOption(dialog: Locator, fieldLabels: string[], optionText: string[]): Promise<void>;
  dateInputByLabel(page: Page, labelText: string): Locator;
}

// types.ts — 配置
export interface CrudPageConfig {
  entityRoute: string;     // hash 路由段，如 "NopAuthUser"
  entityName?: string;     // GraphQL 实体名（与 entityRoute 不同时设置）
  domain?: string;         // 业务域（用于日志、筛选）
  engine?: EngineAdapter;
  columnHeaders?: string[];
}
```

### 引擎选择器分界

| 交互 | AMIS 适配器 | Flux 适配器 |
|------|------------|------------|
| CRUD 容器 | `#main-content, main, .cxd-Page` | `[data-slot="crud-table"]` |
| 表格 | `.cxd-Crud, .cxd-Table` | `[data-slot="crud-table"] .nop-table` |
| 行 | `tr, .cxd-Table-row` | `tbody tr[data-slot="table-row"]` |
| 单元格 | `> td:nth-child(N)` | `[data-field="fieldName"]` |
| 新增按钮 | `button:has(.fa-plus)` | `[data-testid="btn-add"]` |
| 行操作 | AMIS popover dropdown | `getByRole('button')` / `data-testid` |
| 对话框 | `.cxd-Modal, .cxd-Dialog` | `[data-slot="dialog-surface"]` |
| 表单字段 | `input[name="fieldName"]` | `getByLabel('Field Label')` |
| 提交按钮 | `getByRole('button', { name: /确定|确认|保存|Confirm|Save/ })` | 同上 |
| 下拉选择 | `document.querySelectorAll` AMIS menu | `getByRole('option')` |
| 日期输入 | `.cxd-Form-item` + label + input | `getByLabel(labelText)` |

### 实现注意事项（AMIS 引擎实战经验）

以下经验来自 nop-entropy-e2e 全量适配（38/38 通过）的实战调试。

#### 1. 三种 AMIS 下拉组件不可混用

| 组件 | DOM 结构 | 用途 |
|------|---------|------|
| `Select` | `.cxd-Select` → `.cxd-Select-menu` → `.cxd-Select-option` | 表单字段下拉选择 |
| `DropDownButton` | `button:has-text("更多")` → `.cxd-DropDown-menu` → `li.cxd-DropDown-button` | 行操作折叠菜单 |
| `.cxd-DropDown-menuItem` | **不存在于 AMIS 源码** | — |

`AmisAdapter.selectOption()` 用 `[data-amis-name="字段名"]` 定位 form-item 后选 `.cxd-Select-option`。
`AmisAdapter.rowAction()` 先找行内直接按钮，找不到则展开"更多"后找 `li.cxd-DropDown-button`。

#### 2. `position: fixed` 对话框需原生 DOM click

nop-chaos-next 的删除确认对话框使用自定义 alert-dialog（`data-slot="alert-dialog-content"`，`position: fixed`）。Playwright 的 locator click 在这类元素上可能**静默失败**（不抛异常但不触发事件处理器）。

**解决方案**：`CrudListPage.deleteRow()` 用 `page.evaluate()` 执行原生 `element.click()`：

```typescript
await page.evaluate(() => {
  const dlg = document.querySelector('[role="alertdialog"]');
  if (!dlg) return;
  for (const btn of dlg.querySelectorAll('button')) {
    if (/^(confirm|确定|确认|ok)$/i.test(btn.textContent?.trim() || '')) {
      (btn as HTMLElement).click();
      return;
    }
  }
});
```

#### 3. AMIS CRUD 搜索表单

搜索表单在 `.cxd-Table-searchableForm` 内，filter input 命名为 `filter_<字段名>__contains`。搜索按钮是 `button[type="submit"]`。**不要**点 `.fa-sync` 刷新按钮——它会重置 filter。

#### 4. AMIS 表单字段定位用 `data-amis-name`

AMIS form-item 元素有 `data-amis-name="字段名"` 属性。编辑表单中的输入框：`[data-amis-name="字段名"] input`。查看（只读）对话框中的静态值：`[data-amis-name="字段名"] .cxd-Form-static`。

#### 5. DOM 诊断优先于截图

调试 Playwright locator 问题时，优先用 `page.evaluate()` 检查 `innerHTML`、`getComputedStyle`、`getBoundingClientRect`、`offsetParent`，而非截图。截图只能看到视觉效果，无法判断 `pointer-events`、`z-index`、`display` 等影响点击的 CSS 属性。

### PageObject 层次

```typescript
// BasePage (abstract)
export abstract class BasePage {
  constructor(protected page: Page, protected engine: EngineAdapter) {}
  async goto(hashRoute: string): Promise<void>;
}

// CrudListPage — 完整方法集，覆盖 nop-app-erp 现有实现的所有方法
export class CrudListPage extends BasePage {
  async navigate(): Promise<void>              // goto entityRoute-main
  async waitForList(): Promise<void>
  get graphQL(): GraphQLClient

  // 按钮操作
  async getAddButton(): Promise<Locator>
  async clickAdd(): Promise<FormDialog>
  async editRow(row: Locator): Promise<FormDialog>
  async deleteRow(row: Locator): Promise<void>
  async deleteEntityViaApi(entityName: string, id: string | number): Promise<void>

  // 行查询
  async findRowByField(field: string, value: string): Promise<Locator | null>
  async findRowByText(text: string): Promise<Locator | null>
  async getCellText(rowIndex: number, fieldName: string): Promise<string>

  // 断言
  async assertGraphQLOk(): Promise<void>
}

// FormDialog
export class FormDialog {
  async waitForVisible(): Promise<void>
  async waitForHidden(): Promise<void>
  async setField(name: string, value: string): Promise<void>
  async getField(name: string): Promise<string>
  async selectOption(fieldLabels: string[], optionTexts: string[]): Promise<void>
  async submit(): Promise<void>
}
```

### API 客户端

统一提供两种 API 风格（项目根据需要选择）：

```typescript
// GraphQLClient — 完整方法集，覆盖 nop-app-erp 现有实现的所有方法
export class GraphQLClient {
  // CRUD 标准操作
  async findPage<T>(entity, fields, filter?, limit?): Promise<T[]>
  async get<T>(entity, id, fields): Promise<T | null>
  async save<T>(entity, data, fields?): Promise<T>
  async update<T>(entity, data, fields): Promise<T>
  async delete(entity, id): Promise<boolean>

  // 高级查询
  async findPageTotal(entity, filter): Promise<number>
  async findFirst<T>(entity, filter, selection): Promise<T | null>
  async findItems<T>(entity, filter, selection, limit?): Promise<T[]>
  async deleteByFilter(entity, filter): Promise<number>
  async deleteById(entity, id): Promise<void>

  // 自定义操作
  async callMutation<T>(entity, action, args, fields?): Promise<{ data: T | null; errors: any[] | null }>
  async callMutationOk<T>(entity, action, args, fields?): Promise<T>
  async callQuery<T>(entity, action, args): Promise<{ data: T | null; errors: any[] | null; json: any }>

  // 原始操作
  async raw<T>(query, variables?): Promise<T>
}

// RpcClient 与独立函数兼容导出 — 用于兼容 Nop RPC 协议的场景
// 支持两种导入风格：
//   import { loginRpc, rpc } from '@nop-chaos/e2e-shared';    ← 独立函数（兼容现有 nop-entropy-e2e 代码）
//   import { RpcClient } from '@nop-chaos/e2e-shared';        ← 类风格
export async function loginRpc(request, username?, password?): Promise<string>;  // 独立函数
export async function rpc<T>(request, operation, params?): Promise<RpcResponse<T>>;
export function resetAuth(): void;
export class RpcClient {
  static loginRpc = loginRpc;
  static rpc = rpc;
  static resetAuth = resetAuth;
}
```

### 引擎工厂与 Fixtures

```typescript
// engine.ts
export type EngineType = 'amis' | 'flux';
export function getEngineType(): EngineType;          // 读 E2E_ENGINE env var
export function createEngine(type?: EngineType): EngineAdapter;
export function getEngine(): EngineAdapter;           // 缓存单例

// fixtures.ts
export const test = base.extend<{ engine: EngineAdapter }>({
  engine: async ({}, use) => { await use(getEngine()); },
  page: async ({ page }, use) => {
    // console error 收集 + 过滤 + 自动断言（可选，通过 env 控制）
    await use(page);
  },
});
```

### 登录认证

提供两种登录模式，由 env var `E2E_AUTH_MODE` 切换：

| 模式 | 值 | 行为 |
|------|-----|------|
| 浏览器登录 | `browser`（默认） | 浏览器自动填表单、提交，保存 storage state |
| RPC 登录 | `rpc` | 通过 `POST /r/LoginApi__login` 获取 token，设到 localStorage |

全局 setup 通过 `global-setup.ts` 登录一次、保存 auth state，所有测试自动复用。

## 前端来源切换

结合之前的 `docs/design/e2e-frontend-mode.md` 设计，统一前端来源切换：

```typescript
// playwright.config.ts 中的前端模式逻辑
const frontendDevMode = process.env.FRONTEND_DEV_MODE === 'true';
const baseURL = process.env.BASE_URL ?? (
  frontendDevMode
    ? `http://localhost:${FRONTEND_PORT}`
    : `http://localhost:${BACKEND_PORT}`
);
```

统一 env var 命名：

| 变量 | 默认值 | 描述 | 适用范围 |
|------|--------|------|---------|
| `E2E_ENGINE` | `amis` | 引擎选择：`amis` / `flux` | 所有项目 |
| `E2E_AUTH_MODE` | `browser` | 登录方式：`browser` / `rpc` | 有真实后端的项目 |
| `FRONTEND_DEV_MODE` | (unset) | 启用 Vite dev server 模式 | 需要调试前端的项目 |
| `FRONTEND_PORT` | `4173` | Vite dev server 端口 | 同上 |
| `BASE_URL` | (动态) | 覆盖 baseURL | 所有项目 |
| `SKIP_WEBSERVER` | (unset) | 跳过后端自动启动 | 所有项目 |
| `E2E_USER` | `nop` | 登录用户名 | 有真实后端的项目 |
| `E2E_PASSWORD` | `123` | 登录密码 | 有真实后端的项目 |
| `NOP_CHAOS_NEXT_DIR` | 见各项目 | nop-chaos-next 仓库路径（默认相对路径，假设兄弟目录布局；CI 或非标准布局应通过 `MISSION_DRIVER_HOME` 或直接设置该变量覆盖） | 启用 FRONTEND_DEV_MODE 时 |

## 共享代码存放与分发策略

### 决策：nop-chaos-next 作为代码源

选型理由：

| 选项 | 评估 |
|------|------|
| **nop-chaos-next `packages/e2e-shared`** ← **推荐** | 代码源与前端框架在同一仓库，引擎适配器语义由前端定义；已有 tgz 打包流程 (`libs/`) |
| nop-entropy-e2e 现有 `e2e-shared` | nop-chaos-next 不依赖 nop-entropy，单向依赖不合适 |
| 独立仓库 | 管理成本高，不匹配现有"单仓库+兄弟目录"工作流 |
| nop-app-erp 的 `pages/` 作为源 | 最成熟的实现，但语义上 e2e 基础设施应属前端框架项目 |

### 分发方式：npm pack + libs/ + sync 脚本

```
nop-chaos-next/
  packages/e2e-shared/          ← 源码源
    src/index.ts
    src/types.ts
    src/engine.ts
    src/AmisAdapter.ts
    src/FluxAdapter.ts
    src/Page.ts
    src/CrudListPage.ts
    src/FormDialog.ts
    src/GraphQLClient.ts
    src/RpcClient.ts
    src/Navigation.ts
    src/fixtures.ts
    package.json
    README.md
  scripts/sync-e2e-shared.sh    ← 同步脚本
  libs/
    nop-chaos-e2e-shared-1.0.0.tgz  ← 打包产物（可选）
```

**同步脚本** (`scripts/sync-e2e-shared.sh`) 将 `packages/e2e-shared/` 发布到目标项目：

```bash
# 同步到 nop-entropy-e2e
./scripts/sync-e2e-shared.sh ../nop-entropy/nop-entropy-e2e/packages/e2e-shared

# 同步到 nop-app-erp
./scripts/sync-e2e-shared.sh ../nop-app-erp/tests/e2e/pages
```

同步脚本功能：
1. 拷贝 `src/` 目录到目标路径
2. 根据目标项目的包管理器生成/更新 `package.json` 的依赖声明
3. 不覆盖目标项目已有的项目特定测试文件（如 `_helper.ts`、spec 文件）

### 版本策略

- `packages/e2e-shared/package.json` 中的 `version` 字段作为版本标识
- 同步时自动在目标项目生成 `e2e-shared-version.txt` 记录当前同步版本
- 不强制版本锁定——同步即最新，鼓励各项目保持同步

## 各项目集成计划

### Phase 1：nop-chaos-next 自用

1. 创建 `packages/e2e-shared/` 目录，从 nop-app-erp 的 `pages/` 提取核心接口 + 适配器
2. 适配 nop-chaos-next 的 mock 登录模式（`support/auth.ts` 的 login pattern 作为 `MockAuthAdapter`）
3. 改造 `tests/e2e/` 中的 spec 文件逐步采用 PageObject
4. 新增 `playwright.config.ts` 中的 `E2E_ENGINE` 支持
5. 在 `playwright.config.ts` 中增加 `BASE_URL` 作为 `PLAYWRIGHT_BASE_URL` 的别名，两者任一设置均可跳过内置 webServer

### Phase 2：nop-entropy-e2e 升级

1. 通过 sync 脚本将共享库同步到 `nop-entropy-e2e/packages/e2e-shared/`
2. 替换现有 AMIS-only 的 `AmisCrudPage` 为双引擎 `CrudListPage`
3. 加入 `FRONTEND_DEV_MODE` 支持（见 `docs/design/e2e-frontend-mode.md`）
4. 统一登录方式（`RpcClient.loginRpc` → 与 Navigation 集成）

### Phase 3：nop-app-erp 迁移

1. 通过 sync 脚本将共享库同步到 `tests/e2e/pages/`
2. nop-app-erp 现有的 `pages/` 代码已经是共享库的基础——迁移意味着：
   - 删除本地 `AmisAdapter.ts`、`FluxAdapter.ts`、`types.ts`、`engine.ts`、`Page.ts`、`CrudListPage.ts`、`FormDialog.ts`、`GraphQLClient.ts`
   - 改为 import from shared package
   - 保留项目特有的 `_helper.ts`、`Navigation.ts`（如果覆盖了默认行为）
3. 统一 env var 命名（如有不兼容，做重命名过渡）

### 兼容性保障

- `nop-app-erp` 现有的 `E2E_ENGINE` env var 保持兼容，共享库继续使用同名变量
- `nop-entropy-e2e` 现有 `loginRpc()` / `rpc()` 导出保持兼容（共享库提供相同签名）
- 每个项目的 `playwright.config.ts` 保持不变形（配置模板由各项目维护，不放入共享库）
- 项目特有 `_helper.ts` 模式保留——共享库提供基础设施，业务逻辑辅助函数在各项目本地定义

## 设计原则

1. **引擎差异封装在 Adapter 内** — spec 代码不出现 `if (amis) ... else ...`
2. **测试按业务字段名操作** — `setField('userName', 'nop')`，不直接操作 DOM
3. **条件等待** — 使用 engine 提供的容器定位器，消除硬编码 timeouts
4. **API 操作中心化** — GraphQL/RPC 客户端统一管理，不在 spec 中拼接查询
5. **可组合** — 各模块独立（EngineAdapter + BasePage + API Client），项目可按需选取
6. **同步即升级** — 不维护复杂版本依赖，sync 即更新到最新
7. **不侵入项目特定逻辑** — 共享库不包含任何项目的 spec、业务辅助函数、playwright.config.ts

## 包结构参考

```
packages/e2e-shared/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                  # 公共导出
│   ├── types.ts                  # EngineAdapter 接口 + CrudPageConfig + 常量
│   ├── engine.ts                 # getEngine() / createEngine() 工厂
│   ├── AmisAdapter.ts            # AMIS 引擎实现 (.cxd-* selectors)
│   ├── FluxAdapter.ts            # Flux 引擎实现 (data-slot / data-testid)
│   ├── Page.ts                   # BasePage 抽象基类
│   ├── CrudListPage.ts           # CRUD 列表页面对象
│   ├── FormDialog.ts             # 表单对话框页面对象
│   ├── GraphQLClient.ts          # GraphQL API 客户端
│   ├── RpcClient.ts              # Nop RPC 协议客户端
│   ├── Navigation.ts             # login() + navigateTo() + loginAndNavigate()
│   └── fixtures.ts               # Playwright custom fixtures (engine, page)
├── scripts/
│   └── sync-e2e-shared.sh        # 同步到其他项目的脚本
└── test/
    └── *.test.ts                 # 单元测试（可选）
```

## 与现有项目的关系

### nop-chaos-next 的 `tests/e2e/support/auth.ts`

保留不动。`support/auth.ts` 的 mock login pattern 是 nop-chaos-next 特有的（无后端、纯 mock 路由拦截）。它不进入共享库。但共享库的 `Navigation.login()` 会提供可重写的登录流程，nop-chaos-next 可以传入自定义的登录策略。

### nop-entropy-e2e 的 `helpers/` 和 `pages/`

现有 `e2e-shared` 中的：
- `rpc/rpc-helper.ts` → 迁移到共享库的 `RpcClient`
- `pages/login-page.ts` → 迁移到共享库的 `Navigation` + `BasePage`
- `pages/amis-crud-page.ts` → 被共享库的 `CrudListPage` + `FormDialog` 替代
- `helpers/amis-selectors.ts` → 合并到 `AmisAdapter`
- `helpers/modal-helper.ts` → 合并到 `FormDialog`
- `helpers/table-helper.ts` → 合并到 `CrudListPage`
- `helpers/form-helper.ts` → 合并到 `FormDialog`
- `helpers/button-helper.ts` → 合并到 EngineAdapter 的 `rowAction()` / `addButton()`

### nop-app-erp 的 `tests/e2e/pages/`

现有的 `pages/` 代码是共享库的直接前身。迁移后：
- 共享库取走通用部分（EngineAdapter、BasePage、CrudListPage、FormDialog、GraphQLClient、Navigation）
- nop-app-erp 保留项目特有的 `_helper.ts` 和 spec
- `Navigation.ts` 中的 `login()` 实现（填 `input[name="username"]` / `input[name="password"]`）可作为 `AmisAdapter` 的默认实现进入共享库

## Env Var 兼容性

| 项目现有变量 | 统一变量 | 兼容措施 |
|-------------|---------|---------|
| nop-app-erp: `E2E_ENGINE` | `E2E_ENGINE` | 同名，完全兼容 |
| nop-app-erp: `E2E_USER` / `E2E_PASSWORD` | `E2E_USER` / `E2E_PASSWORD` | 同名，完全兼容 |
| nop-entropy-e2e: `PORT` | `PORT` | 保留，`FRONTEND_DEV_MODE` 时读 `FRONTEND_PORT` |
| nop-entropy-e2e: `BASE_URL` | `BASE_URL` | 同名，语义不变 |
| nop-entropy-e2e: `SKIP_WEBSERVER` | `SKIP_WEBSERVER` | 同名，语义不变 |
| nop-chaos-next: `PLAYWRIGHT_APP_MODE` | 保留 | nop-chaos-next 特有（控制 mock/模式选择） |
| nop-chaos-next: `PLAYWRIGHT_BASE_URL` | `BASE_URL` | 建议别名，不强制迁移 |
| 新增 | `FRONTEND_DEV_MODE` | — |
| 新增 | `FRONTEND_PORT` | — |
| 新增 | `E2E_AUTH_MODE` | — |
| 新增 | `NOP_CHAOS_NEXT_DIR` | — |

### Env Var 命名说明

环境变量使用三种前缀，各有语义区分：

| 前缀 | 举例 | 语义 |
|------|------|------|
| `E2E_*` | `E2E_ENGINE`、`E2E_AUTH_MODE`、`E2E_USER` | 通用 E2E 测试配置，跨项目一致 |
| `FRONTEND_*` | `FRONTEND_DEV_MODE`、`FRONTEND_PORT` | 前端来源切换（区别于引擎选择），因为影响的是 Vite dev server 而非测试行为 |
| `NOP_*` | `NOP_CHAOS_NEXT_DIR` | 与项目路径相关，非测试语义配置 |
| 无前缀 | `BASE_URL`、`SKIP_WEBSERVER`、`PORT` | 已有 Playwright 常用变量名，保留不重名以降低迁移成本 |

其中 `FRONTEND_*` 与 `E2E_*` 的区分是刻意的：`E2E_ENGINE=flux` 改变的是引擎适配器（测试逻辑如何解析页面结构），而 `FRONTEND_DEV_MODE=true` 改变的是前端静态资源的服务方式（从 Quarkus JAR 切换到 Vite dev server）。两者正交——可以 `FRONTEND_DEV_MODE=true E2E_ENGINE=flux` 用 Vite dev server + Flux 适配器测试。后文 `docs/design/e2e-frontend-mode.md` 对此有独立详细设计。
