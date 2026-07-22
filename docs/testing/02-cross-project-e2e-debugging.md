# 跨项目 E2E 调试指南

> 调试 nop-entropy-e2e、nop-app-erp 等下游项目 E2E 测试时的必读手册。
>
> 配套文档：`docs/testing/01-e2e-developer-guide.md`（本仓库 E2E 总指南）、`docs/design/e2e-frontend-mode.md`（前端模式设计）。

## ⚠️ 核心规则（先读这一段）

**调试下游项目 E2E 时，测试必须访问 nop-chaos-next 前端端口（4173），由 nop-chaos-next 的 Vite proxy 把 API 请求转发到 Java 后端（8080）。绝对不能把测试直接指向后端端口（8080）。**

| ❌ 错误做法 | ✅ 正确做法 |
|----------|----------|
| `BASE_URL=http://localhost:8080` | `BASE_URL=http://localhost:4173` |
| `E2E_BASE_URL=http://localhost:8080` | `E2E_BASE_URL=http://localhost:4173` |
| 让测试访问后端内置前端 | 让测试访问 nop-chaos-next dev server |

**原因**：

1. **后端内置前端可能是旧的**：Quarkus JAR 里打包的静态资源是上次 `mvn install` 时的快照，不一定与当前 nop-chaos-next 源码同步。
2. **Vite proxy 才是稳定的 API 路由**：`/r`、`/graphql`、`/p/`、`/f/`、`/q/` 在 nop-chaos-next 的 `vite.config.ts` 里配置了 proxy 到 `http://localhost:8080`，这是唯一受控的 API 转发路径。
3. **dev server 才能反映当前源码**：本地调试的目的是验证当前 nop-chaos-next 源码与后端的协同，必须用 Vite dev server（HMR + 最新代码）。
4. **后端直连会绕过 proxy**：直接访问 `localhost:8080` 时，前端发起的相对路径 API 请求会被后端的静态资源处理器接管，行为不可预期。

---

## 1. 架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                      正确的调试架构                                │
│                                                                  │
│   Playwright Test                                                │
│        │                                                         │
│        │  page.goto('http://localhost:4173/...')                 │
│        ▼                                                         │
│   ┌─────────────────────────────────────┐                       │
│   │  nop-chaos-next Vite dev server      │                       │
│   │  http://localhost:4173               │                       │
│   │                                       │                       │
│   │  - 静态资源（React 前端，最新源码）   │                       │
│   │  - proxy /r       ─────┐             │                       │
│   │  proxy /graphql  ─────┤             │                       │
│   │  proxy /p/       ─────┤             │                       │
│   │  proxy /f/       ─────┤             │                       │
│   │  proxy /q/       ─────┤             │                       │
│   └──────────────────────┼─────────────┘                       │
│                          │                                       │
│                          │  转发到 http://localhost:8080         │
│                          ▼                                       │
│   ┌─────────────────────────────────────┐                       │
│   │  Java / Quarkus 后端                  │                       │
│   │  http://localhost:8080               │                       │
│   │                                       │                       │
│   │  - /r/*    REST API                  │                       │
│   │  - /graphql  GraphQL endpoint        │                       │
│   │  - /p/*     页面元数据               │                       │
│   │  - /f/*     表单元数据               │                       │
│   │  - /q/*     查询元数据               │                       │
│   └─────────────────────────────────────┘                       │
└──────────────────────────────────────────────────────────────────┘
```

### 端口约定

| 服务 | 默认端口 | 环境变量 | 启动方式 |
|------|---------|---------|---------|
| Java 后端 | 8080 | `PORT` | `mvn quarkus:dev` 或 `java -jar` |
| nop-chaos-next Vite dev | 4173 | `FRONTEND_PORT` | `pnpm dev` 或 `pnpm preview` |
| nop-chaos-next Vite preview | 4173（strictPort） | — | `pnpm preview` |

### nop-chaos-next Vite proxy 配置

源文件：`apps/main/vite.config.ts:88-109`

```ts
proxy: {
  '/r':       { target: 'http://localhost:8080', changeOrigin: true },
  '/graphql': { target: 'http://localhost:8080', changeOrigin: true },
  '^/p/':     { target: 'http://localhost:8080', changeOrigin: true },
  '^/f/':     { target: 'http://localhost:8080', changeOrigin: true },
  '^/q/':     { target: 'http://localhost:8080', changeOrigin: true },
},
```

**关键**：如果后端端口不是 8080，必须同步修改这里的 `target`，否则 proxy 转发会失败。

---

## 2. 调试步骤：nop-entropy-e2e

### 前置假设

- 三个项目是兄弟目录：`../nop-chaos-next/`、`../nop-entropy/`、`../nop-app-erp/`
- Java 和 Maven 已安装
- nop-chaos-next 已执行过 `pnpm install && pnpm build`

### 方式 A：全自动（推荐）

`FRONTEND_DEV_MODE=true` 时，下游项目的 `playwright.config.ts` 会自动启动两个 webServer：Java 后端 + nop-chaos-next Vite dev server。

```bash
# 在 nop-entropy-e2e 仓库根目录
cd ../nop-entropy/nop-entropy-e2e

# 调试 auth 模块（自动启动 nop-auth 后端 + nop-chaos-next 前端）
FRONTEND_DEV_MODE=true pnpm --filter nop-auth-e2e test

# 调试 code 模块
FRONTEND_DEV_MODE=true pnpm --filter nop-code-e2e test

# 调试 job 模块
FRONTEND_DEV_MODE=true pnpm --filter nop-job-e2e test

# 有头模式调试单个 spec
FRONTEND_DEV_MODE=true pnpm --filter nop-auth-e2e exec playwright test tests/auth-user.spec.ts --headed

# 只跑某个测试名
FRONTEND_DEV_MODE=true pnpm --filter nop-auth-e2e exec playwright test -g "创建新用户" --headed
```

**底层逻辑**（以 `nop-auth-e2e/playwright.config.ts` 为例）：

```ts
const frontendDevMode = process.env.FRONTEND_DEV_MODE === 'true';
const frontendPort    = parseInt(process.env.FRONTEND_PORT || '4173', 10);
const nopChaosNextDir = process.env.NOP_CHAOS_NEXT_DIR || '../../../nop-chaos-next';

const baseURL = explicitBaseUrl ?? (
  frontendDevMode
    ? `http://localhost:${frontendPort}`   // → 4173 ✅
    : `http://localhost:${backendPort}`    // → 8080（仅 CI 用）
);

// webServer 启动两个进程：
// 1. mvn quarkus:dev -Dquarkus.http.port=8080（后端，总是启动）
// 2. pnpm --filter @nop-chaos/main exec vite dev --port 4173（仅 FRONTEND_DEV_MODE=true 时）
```

### 方式 B：预编译 JAR（推荐，后端代码频繁变动时）

当 nop-entropy 代码正在被频繁修改（例如其他 Agent 在并行开发）时，`mvn quarkus:dev` 的 live reload 会导致 classpath 不一致和 `ClassNotFoundException` 崩溃。使用预编译的 JAR 完全避开此问题。

**步骤**：

```bash
# ── 1. 编译 fast-jar（如果 target/quarkus-app 不存在或已过期） ──
cd ../nop-entropy
mvn clean package -DskipTests -pl nop-auth/nop-auth-app -am -q

# ── 2. 复制到临时目录（隔离源码目录的文件变动） ──
rm -rf /tmp/nop-auth-backend
mkdir -p /tmp/nop-auth-backend
cp -R nop-auth/nop-auth-app/target/quarkus-app/* /tmp/nop-auth-backend/

# ── 3. 用 dev profile 启动（H2 内存库，自动建表） ──
java -Dquarkus.profile=dev -jar /tmp/nop-auth-backend/quarkus-run.jar \
  -Dquarkus.http.port=8080

# ── 4. 启动前端（另一个 Terminal） ──
cd ../nop-chaos-next && pnpm dev

# ── 5. 跑测试（第三个 Terminal） ──
cd ../nop-entropy/nop-entropy-e2e/packages/nop-auth-e2e
SKIP_WEBSERVER=true BASE_URL=http://localhost:4173 npx playwright test
```

**关键点**：
- **必须用 `-Dquarkus.profile=dev`**：默认 profile 连 MySQL（需要外部数据库且 schema 可能不同步），dev profile 用 H2 内存库（每次启动自动建表，schema 始终最新）
- **复制到 `/tmp/` 是关键**：从源码目录直接运行 JAR 仍可能被文件监控干扰；复制到临时目录完全隔离
- JAR 在 `target/quarkus-app/quarkus-run.jar`（Quarkus fast-jar 格式，整个 `quarkus-app/` 目录约 72MB，不能只复制 jar 文件）
- 重新编译后需要重新复制

### 方式 C：手动启动 dev server + 后端（原始方式）

适合需要分别观察后端日志、前端日志的场景。**注意：nop-entropy 代码频繁变动时 dev 模式不稳定。**

```bash
# ── Terminal 1: 启动 Java 后端（保持运行） ──
cd ../nop-entropy/nop-auth/nop-auth-app
mvn quarkus:dev -Dquarkus.http.port=8080 -Dquarkus.profile=dev
# 等待 "Quarkus enhancements completed" 或 curl http://localhost:8080 返回 200

# ── Terminal 2: 启动 nop-chaos-next 前端（保持运行） ──
cd ../nop-chaos-next
pnpm dev
# 等待 "Local: http://localhost:4173/"

# ── Terminal 3: 跑测试（不自动启动 server） ──
cd ../nop-entropy/nop-entropy-e2e/packages/nop-auth-e2e

# 关键：SKIP_WEBSERVER=true 跳过自动启动，BASE_URL 指向 4173
SKIP_WEBSERVER=true BASE_URL=http://localhost:4173 npx playwright test --reporter=list

# 调试单个 spec
SKIP_WEBSERVER=true BASE_URL=http://localhost:4173 npx playwright test tests/auth-user.spec.ts --headed

# 加 Playwright Inspector
SKIP_WEBSERVER=true BASE_URL=http://localhost:4173 npx playwright test tests/auth-user.spec.ts --debug
```

### 方式 C：preview 模式（验证构建产物）

适合验证 `pnpm build` 后的产物能否正常工作。

```bash
# Terminal 1: 后端
cd ../nop-entropy/nop-auth/nop-auth-app && mvn quarkus:dev

# Terminal 2: 前端 preview（用 build 产物，端口 4173）
cd ../nop-chaos-next && pnpm build && pnpm preview

# Terminal 3: 测试
cd ../nop-entropy/nop-entropy-e2e/packages/nop-auth-e2e
SKIP_WEBSERVER=true BASE_URL=http://localhost:4173 npx playwright test
```

---

## 3. 调试步骤：nop-app-erp

nop-app-erp 使用 npm（不是 pnpm），路径约定略有不同。

```bash
# 方式 A：手动启动
# Terminal 1: ERP 后端（uber-jar 方式）
cd ../nop-app-erp
java -jar target/nop-app-erp-*-runner.jar --quarkus.http.port=8011
# 或 mvn quarkus:dev

# Terminal 2: nop-chaos-next 前端（注意：ERP 后端端口是 8011，需修改 vite.config.ts 的 proxy target）
cd ../nop-chaos-next
# 编辑 apps/main/vite.config.ts 把 proxy target 从 8080 改为 8011
pnpm dev

# Terminal 3: 测试
cd ../nop-app-erp
SKIP_WEBSERVER=true BASE_URL=http://localhost:4173 npx playwright test
```

⚠️ **nop-app-erp 后端默认端口是 8011，与 nop-entropy（8080）不同。** 调试前必须确认 nop-chaos-next 的 `vite.config.ts` proxy target 与之后端端口一致。

---

## 4. 环境变量速查表

| 变量 | 作用 | 推荐值（本地调试） |
|------|------|-------------------|
| `FRONTEND_DEV_MODE` | 让下游 playwright config 自动启动 nop-chaos-next | `true` |
| `FRONTEND_PORT` | nop-chaos-next 前端端口 | `4173`（默认） |
| `BASE_URL` | Playwright baseURL（优先级最高） | `http://localhost:4173` |
| `SKIP_WEBSERVER` | 跳过 playwright.config.ts 里的 webServer 自动启动 | `true`（手动启动时） |
| `PORT` | Java 后端端口 | `8080`（nop-entropy）/ `8011`（nop-app-erp） |
| `BACKEND_TIMEOUT` | 后端启动超时（毫秒） | `120000` |
| `NOP_CHAOS_NEXT_DIR` | nop-chaos-next 源码目录（相对路径） | `../../../nop-chaos-next` |
| `E2E_ENGINE` | 引擎选择：`amis` / `flux` | `amis`（nop-entropy 默认 AMIS） |
| `E2E_USER` / `E2E_PASSWORD` | 登录凭据 | `nop` / `123`（默认） |

### 优先级

```
BASE_URL (env)  >  playwright.config.ts 计算值
                  ├── FRONTEND_DEV_MODE=true  → http://localhost:4173
                  └── FRONTEND_DEV_MODE=false → http://localhost:8080
```

`BASE_URL` 一旦设置，会覆盖 `FRONTEND_DEV_MODE` 的计算逻辑。手动启动场景下应该同时设置 `BASE_URL=http://localhost:4173` 和 `SKIP_WEBSERVER=true`。

---

## 5. 验证调试环境是否正确

跑测试前，先确认三件事：

### Step 1：后端 API 可达

```bash
curl -s -o /dev/null -w "Backend: HTTP %{http_code}\n" http://localhost:8080/r/login__get
# 期望：HTTP 405 或 401（接口存在，未授权）
# 若 HTTP 000：后端没启动
```

### Step 2：前端 dev server 可达

```bash
curl -s -o /dev/null -w "Frontend: HTTP %{http_code}\n" http://localhost:4173/
# 期望：HTTP 200
# 若 HTTP 000：Vite dev server 没启动
```

### Step 3：proxy 转发正常

```bash
curl -s -o /dev/null -w "Proxy: HTTP %{http_code}\n" http://localhost:4173/r/login__get
# 期望：HTTP 405 或 401（请求通过 proxy 到达后端）
# 若 HTTP 404 或 500：proxy 配置有问题，检查 vite.config.ts 的 target 端口
```

**只有这三步都通过，才能开始跑 e2e 测试。**

### Step 4（推荐）：运行 e2e-shared 诊断工具

`@nop-chaos/e2e-shared` 提供了一套 engine-agnostic 的诊断函数，可以直接在 Playwright spec 中调用，快速定位环境/auth/proxy/RPC/页面结构问题。

**可用函数**（全部从 `@nop-chaos/e2e-shared` 导出）：

| 函数 | 用途 |
|------|------|
| `dumpEnv(page)` | 读取 Vite 模式（dev/prod）和已知 env vars |
| `dumpAuthState(page)` | 读取 React auth store 状态（token、user、isAuthenticated） |
| `probeRpc(page, endpoint, payload?)` | 从浏览器上下文调用单个 RPC，返回 status/duration/body |
| `probeProxy(page, path)` | 探测 proxy 路径可达性（GET 请求） |
| `dumpMenuConfig(page)` | 抓取菜单配置，识别来源（mock/backend/prototype） |
| `dumpPageStructure(page)` | 扫描页面语义结构（forms/tables/dialogs/buttons），用 name/aria-label/caption 标识 |
| `diagnose(page, options?)` | 一键运行全套诊断，返回结构化 `DiagnosticReport` |
| `formatReport(report)` | 把 `DiagnosticReport` 格式化成可读文本 |

**典型用法**——在目标项目写一个临时诊断 spec：

```ts
import { test } from '@nop-entropy/e2e-shared'; // 或 '@nop-chaos/e2e-shared'
import { diagnose, formatReport, probeRpc } from '@nop-entropy/e2e-shared';

test('diagnose environment', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  await page.waitForLoadState('networkidle');

  // 单独探测某个 RPC
  const loginProbe = await probeRpc(page, 'LoginApi__login', {
    loginType: 1, principalId: 'nop', principalSecret: '123',
  });
  console.log('Login RPC:', loginProbe.status, loginProbe.durationMs + 'ms');

  // 全量诊断报告
  const report = await diagnose(page, {
    proxyProbes: ['/r/LoginApi__get', '/graphql', '/r/SiteMapApi__getSiteMap'],
  });
  console.log(formatReport(report));
});
```

运行：`SKIP_WEBSERVER=true BASE_URL=http://localhost:4173 npx playwright test tests/diagnose.spec.ts`

**诊断报告内容**：

- **Environment**：Vite 模式、dev/prod、已知 VITE_* env vars
- **Auth**：isAuthenticated、user（username/nickname/roles）、token preview、storage keys
- **Proxy**：每条 proxy 路径的 reachable/status/duration/body preview
- **RPC**：每次 RPC 调用的 ok/status/duration/data preview/error
- **Menu**：source（mock/backend/prototype/empty）、item count、前 10 个菜单项
- **Page Structure**（可选）：URL/title/404 标记、cxd/data-slot 计数、forms（by name）、tables（by caption/aria-label）、dialogs（by title）、buttons（by aria-label/test-id）

**诊断的判断逻辑**：

| 现象 | 可能原因 |
|------|---------|
| proxy 全部 `reachable: false` | Vite dev server 没启动或 proxy target 端口错误 |
| proxy reachable 但 status=404 | proxy path 不匹配 vite.config.ts 配置 |
| RPC `ok: true` 但 auth `isAuthenticated: false` | 前端 axios 客户端有问题（interceptor/token 逻辑），直接 fetch 正常 |
| Menu source 是 `mock` | `VITE_ENABLE_MOCK=true`，前端用 mock 菜单，不会访问后端 |
| Menu source 是 `empty` | 登录失败或 token 没设置到 React auth store |
| Page Structure `has404: true` | 路由不存在或菜单未加载 |
| cxdClassCount > 0 | 页面用 AMIS 引擎渲染 |
| fluxSlotCount > 0 | 页面用 Flux 引擎渲染 |

---

## 6. 常见错误与诊断

### 错误 1：`net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4175`

**原因**：`Navigation.ts` 的 fallback 默认是 `http://127.0.0.1:4175`（旧默认端口），既不是 4173 也不是 8080。

**修复**：显式设置 `BASE_URL=http://localhost:4173`。

### 错误 2：`TimeoutError: locator.waitFor('.cxd-Crud') Timeout 10000ms`

**可能原因**（按概率排序）：

1. **测试访问的是后端（8080）而不是前端（4173）**：后端内置前端可能是旧版本，不包含 AMIS 渲染逻辑或路由配置过期。**修复**：设置 `BASE_URL=http://localhost:4173`。
2. **页面路由不存在**：直接 goto 了错误的 hash route（如 `#/NopAuthUser` 而不是 `#/NopAuthUser-main`）。**诊断**：手动浏览器访问对应 URL，看是否 404。
3. **AMIS 还没渲染完**：后端冷启动时页面 JSON 加载慢。**修复**：增加 `waitForList` 超时，或确保后端已预热。
4. **引擎选错**：用 `FluxAdapter` 测 AMIS 页面，或反之。**修复**：确认 `E2E_ENGINE` 与被测页面一致。

### 错误 3：后端启动失败 `ClassNotFoundException`

**原因**：Quarkus dev 模式类路径问题。

**修复**：先在对应 app 目录执行一次完整 `mvn clean install -DskipTests`，再 `mvn quarkus:dev`。

### 错误 4：proxy 转发 502 / connection refused

**原因**：`vite.config.ts` 的 proxy target 端口与实际后端端口不一致。

**修复**：编辑 `apps/main/vite.config.ts`，把所有 `target: 'http://localhost:8080'` 改成实际后端端口（如 ERP 的 8011）。

### 错误 5：测试通过但报 console error

**原因**：可能后端返回了非 200，前端吞掉了错误。

**诊断**：设置 `E2E_ASSERT_NO_CONSOLE_ERRORS=true` 让测试失败暴露问题；或用 `--headed` 观察浏览器 Network 面板。

---

## 7. 完整示例：调试 nop-auth-e2e 的"创建新用户"测试

```bash
# ── 1. 启动后端 ──
cd ../nop-entropy/nop-auth/nop-auth-app
mvn quarkus:dev -Dquarkus.http.port=8080 -Dquarkus.profile=dev
# 等待 "installed features" 出现

# ── 2. 新 Terminal：启动前端 ──
cd ../nop-chaos-next
pnpm dev
# 等待 "http://localhost:4173/"

# ── 3. 验证环境 ──
curl -s -o /dev/null -w "Backend: %{http_code}\n"  http://localhost:8080/r/login__get
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:4173/
curl -s -o /dev/null -w "Proxy: %{http_code}\n"    http://localhost:4173/r/login__get

# ── 4. 跑测试（headed + debug） ──
cd ../nop-entropy/nop-entropy-e2e/packages/nop-auth-e2e
SKIP_WEBSERVER=true \
BASE_URL=http://localhost:4173 \
npx playwright test tests/auth-user.spec.ts -g "创建新用户" --headed --debug
```

---

## 8. 与本仓库 E2E 的区别

| 维度 | nop-chaos-next（本仓库） | 下游项目（nop-entropy-e2e 等） |
|------|------------------------|-------------------------------|
| 后端 | 不需要（Mock 模式） | 必须启动 Java 后端 |
| 前端 | Playwright 自动启动 Vite preview | 手动启动或 `FRONTEND_DEV_MODE=true` |
| 默认 baseURL | `http://127.0.0.1:4175` | 4173（dev mode）或 8080（CI mode） |
| 登录方式 | `MockAuthAdapter`（MSW） | 真实后端登录或 RPC login |
| 引擎 | `amis` / `flux` / mock 都支持 | 通常 `amis`（nop-entropy）/ `amis`（nop-app-erp） |
| PageObject | `CrudListPage` + `FormDialog` | 同上（共享库）+ 项目专属 PO |

**核心差异**：本仓库用 Mock，下游项目必须接真实后端。下游项目调试时务必走 nop-chaos-next 前端 + Vite proxy 的链路。

---

## 9. 反模式（绝对不要这样做）

```bash
# ❌ 反模式 1：直接访问后端，绕过 Vite proxy
BASE_URL=http://localhost:8080 npx playwright test

# ❌ 反模式 2：只设置 E2E_BASE_URL（Navigation.ts 用），不设置 BASE_URL（Playwright baseURL 用）
E2E_BASE_URL=http://localhost:8080 npx playwright test

# ❌ 反模式 3：依赖 Navigation.ts 的 fallback 默认值
npx playwright test
# → 默认指向 http://127.0.0.1:4175，端口都不对

# ❌ 反模式 4：改了 vite.config.ts proxy target 后忘记还原
# → 会污染本仓库的 git 状态，且影响其他项目调试

# ❌ 反模式 5：在 CI 里用 FRONTEND_DEV_MODE=true
# → CI 应该用后端内置前端（build 时打包），FRONTEND_DEV_MODE 仅用于本地调试
```

---

## 10. 引用

- 本仓库 E2E 总指南：`docs/testing/01-e2e-developer-guide.md`
- 共享库设计：`docs/design/e2e-shared-infrastructure.md`
- 前端模式设计：`docs/design/e2e-frontend-mode.md`
- Vite proxy 配置：`apps/main/vite.config.ts:88-109`
- 下游 playwright 配置示例：`../nop-entropy/nop-entropy-e2e/packages/nop-auth-e2e/playwright.config.ts`
- Mission roadmap：`docs/backlog/e2e-upgrade-roadmap.md`
