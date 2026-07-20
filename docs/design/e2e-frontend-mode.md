# E2E Test Frontend Mode: Development vs Built

> 当前生效的设计文档，定义 nop-entropy-e2e 测试基础设施如何支持从 nop-chaos-next 开发源码运行浏览器测试。

## Problem

nop-entropy 的 e2e 测试（`nop-entropy-e2e/`）使用 Playwright 对真实 Quarkus 后端进行端到端验证。其浏览器测试当前只能使用 `nop-web-site` JAR 中预打包的前端——这个前端是 nop-chaos-next 早期构建的产物。

在开发调试 nop-chaos-next 时，开发者需要：

1. 修改 nop-chaos-next 源码
2. 执行 `pnpm build`（~2-3 分钟）
3. 执行 `bash scripts/sync-site.sh` 同步到 nop-web-site
4. 执行 `./mvnw clean install -DskipTests`（~5-10 分钟，全量 Java 编译）
5. 才能用 nop-entropy e2e 验证改动

这是慢反馈循环。我们需要一种方式，让 nop-entropy e2e 测试可以直接使用 nop-chaos-next 的 Vite 开发服务器（源码变更即时生效，支持 HMR），同时保持向后兼容——同一个 e2e 测试代码也能在 nop-entropy 内部集成 CI 中使用打包后的 `nop-web-site`。

## Current Architecture

### nop-entropy-e2e

```
nop-entropy-e2e/
  packages/
    e2e-shared/         # Shared helpers (RPC, page objects, selectors)
    nop-auth-e2e/       # Auth backend e2e (port 8080)
    nop-code-e2e/       # Code backend e2e (port 8081)
    nop-job-e2e/        # Job backend e2e (port 8082)
```

每个包的 `playwright.config.ts`:

```typescript
const port = parseInt(process.env.PORT || '8080', 10);
const baseURL = process.env.BASE_URL || `http://localhost:${port}`;
// webServer: auto-starts Quarkus via mvn quarkus:dev
// use: { baseURL } → browser navigates to Quarkus for both frontend and API
```

Quarkus 在 `quarkus:dev` 模式下运行 RPC API + 从 `nop-web-site` JAR 的 `META-INF/resources/` 提供前端静态资源。浏览器通过 `http://localhost:8080` 连到 Quarkus 后端，前端与 API 同源。

### nop-chaos-next

Vite 配置（`apps/main/vite.config.ts`:89-109）已预设 API 代理：

| 路径（Vite proxy 正则） | 代理目标 |
|------------------------|---------|
| `/r` | `http://localhost:8080` |
| `/graphql` | `http://localhost:8080` |
| `^/p/` (正则锚点) | `http://localhost:8080` |
| `^/f/` (正则锚点) | `http://localhost:8080` |
| `^/q/` (正则锚点) | `http://localhost:8080` |

这意味着 nop-chaos-next 的 Vite dev server（默认端口 4173）可以独立服务于前端，而 API 调用由 Vite 透明代理到 Quarkus 后端。

### 关键观察

nop-entropy-e2e 的浏览器测试逻辑与前端来源无关。测试通过 `page.goto('/')` 导航到 `baseURL`，然后通过 RPC 和浏览器交互验证功能。它们不需要关心前端是由 Quarkus JAR 还是 Vite dev server 提供的——只要 `baseURL` 指向正确的前端服务器并且 API 可达。

## Requirements

1. **向后兼容**：默认行为不变——Quarkus 同时提供 API 和前端（当前模式），完全不需要修改 nop-entropy 的 Maven 构建流程。
2. **开发模式**：通过环境变量切换，使浏览器测试前端来自 nop-chaos-next 的 Vite dev server。
3. **最小化测试代码变更**：页面对象、RPC 帮助程序、断言等不应因前端模式而改变。
4. **工作流灵活**：支持两种子模式：
   - **自动启动**：Playwright 自动同时启动 Quarkus 后端和 Vite dev server
   - **外部服务器**：开发者预启动自己的 Vite dev server（`pnpm dev`），测试仅连接它
5. **路径无关**：nop-chaos-next 仓库路径可配置（通过环境变量，不硬编码）。
6. **CI 兼容**：nop-entropy CI 应继续使用内置前端模式（无额外配置）。nop-chaos-next CI 可通过环境变量切换到 dev 模式。

## Design

### 概览

引入单一环境变量 `FRONTEND_DEV_MODE`，控制前端来源。当启用时，Playwright 配置自动：

- 将 `baseURL` 切换到 Vite dev server 端口（默认 `http://localhost:4173`）
- 可选地启动 Vite dev server（如果未提供 `BASE_URL` 或 `SKIP_WEBSERVER`）
- 保持 Quarkus 后端运行以提供 API

### 环境变量引用

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `FRONTEND_DEV_MODE` | (unset) | 设为 `true` 启用开发模式（使用 Vite 提供前端） |
| `NOP_CHAOS_NEXT_DIR` | `../../../nop-chaos-next` | 从 e2e package 目录到 nop-chaos-next 仓库根目录的相对路径（仅 dev 模式使用） |
| `FRONTEND_PORT` | `4173` | Vite dev server 端口（仅 dev 模式使用） |
| `BASE_URL` | (动态) | 完全覆盖 baseURL（已存在，保持不变） |
| `SKIP_WEBSERVER` | (unset) | 跳过 web server 启动，使用已运行的外部服务器（已存在） |
| `PORT` | `8080`/`8081`/`8082` | Quarkus 后端端口（已存在） |

### 配置变化（playwright.config.ts）

每个 e2e 包的 `playwright.config.ts` 应统一采纳以下模式：

```typescript
import { defineConfig, devices } from '@playwright/test';

const backendPort = parseInt(process.env.PORT || '8080', 10);
const backendTimeout = parseInt(process.env.BACKEND_TIMEOUT || '120000', 10); // 各包保留自己的值（如 auth-e2e 用 60000）
const frontendDevMode = process.env.FRONTEND_DEV_MODE === 'true';
const frontendPort = parseInt(process.env.FRONTEND_PORT || '4173', 10);
const nopChaosNextDir = process.env.NOP_CHAOS_NEXT_DIR || '../../../nop-chaos-next';

// baseURL:
//   - 如果显式设置了 BASE_URL，使用该值
//   - 否则，dev 模式 → Vite dev server; 非 dev 模式 → Quarkus
const explicitBaseUrl = process.env.BASE_URL;
const baseURL = explicitBaseUrl ?? (
  frontendDevMode
    ? `http://localhost:${frontendPort}`
    : `http://localhost:${backendPort}`
);

export default defineConfig({
  // ... testDir, fullyParallel, workers, timeout, reporter, etc. (unchanged) ...

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },

  webServer: (() => {
    const servers: Exclude<import('@playwright/test').PlaywrightTestConfig['webServer'], undefined> = [];

    // 1. Quarkus backend (always, unless SKIP_WEBSERVER)
    if (!process.env.SKIP_WEBSERVER) {
      servers.push({
        command: `mvn quarkus:dev -Dquarkus.http.port=${backendPort} -Dquarkus.profile=dev`,
        cwd: '../../../nop-auth/nop-auth-app',
        port: backendPort,
        timeout: backendTimeout,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
      });
    }

    // 2. Vite dev server (only in dev mode, unless explicitly skipped)
    if (frontendDevMode && !process.env.SKIP_WEBSERVER && !explicitBaseUrl) {
      servers.push({
        command: `pnpm --filter @nop-chaos/main exec vite dev --port ${frontendPort} --strictPort`,
        cwd: nopChaosNextDir,
        port: frontendPort,
        timeout: 60_000,
        reuseExistingServer: !process.env.CI,
      });
    }

    return servers.length > 0 ? servers : undefined;
  })(),

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

### 关键设计决策

1. **为什么用 `FRONTEND_DEV_MODE` 而不是复用 `BASE_URL`？**
   - `BASE_URL` 已存在且语义为"完全覆盖 URL"。在 CI 中，nop-entropy 可能通过 `BASE_URL` 指向远程测试环境。`FRONTEND_DEV_MODE` 有不同语义——它改变前端的提供方式，而 API 仍由本地 Quarkus 提供服务。

2. **为什么 Vite dev server 是可选的（`explicitBaseUrl` 检查）？**
   - 开发者可能在本地手动启动了 `pnpm dev`。他们可以设置 `FRONTEND_DEV_MODE=true BASE_URL=http://localhost:4173 SKIP_WEBSERVER=1`，完全绕过自动启动，使用自己的 dev server 和已运行的 Quarkus。

3. **为什么每个包的 playwright.config.ts 单独修改而不是提取共享配置？**
   - 每个包已经独立，只有 `port`、`cwd`、`timeout` 不同。提取共享工厂函数会增加这一层的抽象，而当前模式是直接的复制-修改模式。提取共享配置可以在单独的改进中进行（不在本范围内）。

### 边界情况

- **`playwright.config.ts` 中的 `timeout` 差异**：auth-e2e 使用 60s，code-e2e 使用 120s，job-e2e 使用 60s。这些差异与前端模式无关，保持不变。
- **纯 RPC 测试**：API-only 测试根本不与浏览器交互，完全不依赖于 `baseURL` 是 Quarkus 还是 Vite。它们总是能正常工作。
- **端口冲突**：如果 Quarkus 端口与 `FRONTEND_PORT` 相同（例如两者都为 8080），Vite dev server 将因 `strictPort` 而失败。默认情况下，Quarkus 为 8080-8082，Vite 为 4173，不应冲突。用户可以显式设置两者以避免冲突。

## Integration Points

### nop-chaos-next 侧

nop-chaos-next 不需要代码变更。但在开发工作流中，开发者需要：

1. 在 nop-chaos-next 中运行 `pnpm dev`（或 `pnpm dev:main`）以启动 Vite dev server
2. 在 nop-entropy 中运行 e2e 测试，指向 Vite dev server

### nop-entropy-e2e 侧

每个包的 `playwright.config.ts` 需要按上述描述修改。这不是重大重构——每个包大约 +15 行配置。

### 测试代码侧

测试代码（spec 文件、页面对象、RPC 帮助程序）**零变更**。它们完全不知道前端来源，只通过 `page.goto()` 和标准 Playwright API 与 `baseURL` 交互。

### nop-chaos-next 现有 e2e 测试侧

nop-chaos-next 现有的 e2e 测试（`tests/e2e/`）使用模拟模式，不依赖于真实后端。它们不受此设计影响——它们保持独立，拥有自己的 `playwright.config.ts`。

## Workflow Examples

### 工作流 1：最简（自动启动一切）

```bash
cd nop-entropy-e2e
FRONTEND_DEV_MODE=true pnpm test:auth
```

Playwright 自动：
1. 启动 Quarkus 后端（端口 8080）
2. 启动 nop-chaos-next Vite dev server（端口 4173）
3. 设置 `baseURL = http://localhost:4173`
4. Vite 将 `/r`、`/graphql` 等代理到 `http://localhost:8080`
5. 运行测试

### 工作流 2：预启动 Vite dev server + 后端

终端 1：
```bash
cd nop-chaos-next
pnpm dev
# Vite dev server running on http://localhost:4173
```

终端 2：
```bash
cd nop-entropy-e2e/packages/nop-auth-e2e
SKIP_WEBSERVER=1 FRONTEND_DEV_MODE=true BASE_URL=http://localhost:4173 pnpm test
```

### 工作流 3：CI（nop-entropy，不变）

```bash
cd nop-entropy-e2e
pnpm test:auth
```

默认行为——Quarkus 同时提供 API 和前端。零配置变更。

### 工作流 4：nop-chaos-next 本地 QA

```bash
cd nop-chaos-next
pnpm build && bash scripts/sync-site.sh
cd ../nop-entropy
./mvnw clean install -DskipTests -T 1C
cd nop-entropy-e2e
pnpm test:auth
```

这是旧工作流。仍受支持，但不再是最快的开发路径。

## nop-chaos-next 的 e2e 与 nop-entropy 的 e2e 关系

```
nop-chaos-next e2e                     nop-entropy e2e
 (tests/e2e/)                            (nop-entropy-e2e/)
    |                                          |
    |  Mock API (route intercept)              |  Real Quarkus backend
    |  Frontend behavior                       |  Full-stack integration
    |  Fast (~30s)                             |  Slower (~2-5min)
    |  No Java required                        |  Java 21 + Maven required
    |                                          |
    |  Dev mode (FRONTEND_DEV_MODE) ───────────┤
    |  Vite dev server serves frontend         │
    |  (HMR, fast feedback)                    │
```

这两种 e2e 层服务于不同目的且相互补充：
- **nop-chaos-next e2e**：测试前端行为、模拟边界、AMIS 渲染、CSS 隔离等。纯前端，仅轻量级模拟。
- **nop-entropy e2e**：测试完整集成——真实后端 + 前端渲染。有状态、数据库回溯、RPC 互操作性。
- **开发模式桥接**：`FRONTEND_DEV_MODE` 允许 nop-entropy e2e 从 nop-chaos-next 的 Vite dev server 获取前端，弥合纯前端测试和完整集成测试之间的差距，无需完整构建周期。

## 验证

实现后，验证包含：

1. **回归：默认模式不变**
   ```
   cd nop-entropy-e2e && pnpm test:auth
   ```
   必须通过，零配置，使用 nop-web-site JAR 前端。

2. **开发模式：自动启动**
   ```
   cd nop-entropy-e2e && FRONTEND_DEV_MODE=true pnpm test:auth
   ```
   必须通过，启动 Vite dev server + Quarkus，使用 Vite 前端。

3. **开发模式：外部服务器**
   ```
   # Terminal 1: start Vite
   cd nop-chaos-next && pnpm dev
   # Terminal 2: run tests
   cd nop-entropy-e2e && SKIP_WEBSERVER=1 FRONTEND_DEV_MODE=true BASE_URL=http://localhost:4173 pnpm test:auth
   ```
   必须通过，使用外部 Vite dev server。

4. **RPC-only 测试不变**
   它们不应关心前端模式，总是通过。
