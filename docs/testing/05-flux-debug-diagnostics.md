# Flux 运行时调试诊断机制（FluxDebug）

> 用于诊断 flux 模式下的 ajax 请求、monitor 错误、notify 消息。
> 适用项目：nop-chaos-next（记录器实现）、nop-entropy-e2e / nop-app-erp（e2e 读取）。

## 概述

flux 渲染器本身有完善的 monitor 体系（`env.monitor.onError`、`env.notify`、`env.fetcher`）。
本机制**不修改 nop-chaos-flux 代码**，而是在 nop-chaos-next 的 `createMainFluxEnv`
（`apps/main/src/flux/adapter.ts`）中挂接这些钩子，把 flux 运行时的关键动作记录到
`window.__fluxDebug`（环形缓冲，最多 200 条），供 e2e 测试读取。

## 工作原理

```
flux 运行时动作
   ├─ fetcher 请求发出  ──→ recordFluxDebug({ phase:'request', url, method, data })
   ├─ fetcher 请求完成  ──→ recordFluxDebug({ phase:'response', url, ok, status, dataPreview })
   ├─ monitor.onError   ──→ recordFluxDebug({ phase:'error', url:phase, error })
   └─ notify 消息       ──→ recordFluxDebug({ phase:'notify', level, message })
                                     │
                                     ▼
                            window.__fluxDebug[]
```

开关：`window.__FLUX_DEBUG__ === true`（运行时，页面加载前设置）或构建期
`VITE_FLUX_DEBUG=true`（编译期生效）。

## 使用方式（e2e 测试）

### 1. 开关默认已开启

`@nop-chaos/e2e-shared` 的 `test` fixture 已通过 `page.addInitScript` 自动设置
`window.__FLUX_DEBUG__ = true`，**测试无需任何额外设置**。

> 若使用 Playwright 原生 `test`（不经过 e2e-shared fixtures），需手动调用
> `enableFluxDebug(page)`，且必须在页面加载前执行。

### 2. 读取诊断记录

```ts
import { dumpFluxDebug, dumpFluxDebugFor, formatFluxDebug } from '@nop-chaos/e2e-shared';

// 全部记录
const dump = await dumpFluxDebug(page);
console.log(formatFluxDebug(dump));

// 按 URL 片段过滤（如只看 NopAuthResource 相关的请求）
const updateDump = await dumpFluxDebugFor(page, 'NopAuthResource__update');
console.log(formatFluxDebug(updateDump));
```

返回结构：

```ts
interface FluxDebugDump {
  enabled: boolean;        // 开关是否开启
  entryCount: number;      // 记录条数
  entries: FluxDebugEntryDump[];
  errors: FluxDebugEntryDump[];   // phase=error 或 notify level=error
  requests: FluxDebugEntryDump[]; // phase=request|response
}

interface FluxDebugEntryDump {
  phase: 'request' | 'response' | 'error' | 'notify';
  ts: number;              // 时间戳
  url?: string;            // 请求 URL（error 时为 monitor phase）
  method?: string;
  ok?: boolean;            // response 的 RPC ok
  status?: number;         // response 的 RPC status
  error?: string;
  level?: string;          // notify 级别
  message?: string;
  dataPreview?: string;    // 请求体/响应数据摘要（截断 300 字符）
}
```

### 3. 典型诊断场景

**场景 A：保存/更新请求未生效**

```ts
await userPO.clickSave();
const dump = await dumpFluxDebugFor(page, 'NopAuthUser__update');
console.log(formatFluxDebug(dump));
// 观察：
// - 是否只有 request 没有 response？→ 请求未完成/被 abort
// - response ok=false？→ 后端返回错误，看 errors 列表中的消息
// - response ok=true 但数据未更新？→ 请求体参数问题，看 request 的 dataPreview
```

**场景 B：页面渲染失败**

```ts
const dump = await dumpFluxDebug(page);
console.log(formatFluxDebug(dump));
// 观察 errors 列表：
// - error 条目通常对应 monitor.onError，包含 phase 和错误信息
// - notify level=error 条目对应后端业务错误 toast
```

**场景 C：断言失败时自动导出**

```ts
test('编辑资源', async ({ page }) => {
  // ... 测试逻辑
  expect(resp.data.displayName).toBe(updatedName);
});
// 失败时在 error-context 中看不到 flux 内部信息，
// 可在测试内主动 dump：
//   const dump = await dumpFluxDebug(page);
//   console.log(formatFluxDebug(dump));
```

## 关键实现文件

| 文件 | 职责 |
|------|------|
| `apps/main/src/flux/fluxDebug.ts` | 记录器：`isFluxDebugEnabled` / `recordFluxDebug` / `resetFluxDebug` |
| `apps/main/src/flux/adapter.ts` | `createMainFluxEnv` 中挂接 fetcher/monitor/notify 钩子 |
| `packages/e2e-shared/src/debug.ts` | `enableFluxDebug` / `dumpFluxDebug` / `dumpFluxDebugFor` / `formatFluxDebug` |
| `packages/e2e-shared/src/fixtures.ts` | `test` fixture 默认开启开关 |

## 注意事项

- 开关必须在 **flux env 创建前**设置（首次渲染前）。测试中用 `page.addInitScript`
  或 `enableFluxDebug(page)` 均可；中途 `page.evaluate` 设置对已创建的 env 不生效。
- 记录为环形缓冲，超过 200 条自动丢弃最旧记录。
- 生产构建默认关闭（`window.__FLUX_DEBUG__` 未设置时），无性能影响；
  仅当 `VITE_FLUX_DEBUG=true` 编译时才强制开启。
- 数据预览截断为 300 字符，避免大响应撑爆日志。
