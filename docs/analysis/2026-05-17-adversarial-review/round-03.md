# 对抗性审查 Round 03 — Extension 接口"幽灵契约"、AMIS 初始化永久失败、Confirm 自动确认

**日期**: 2026-05-17
**发现来源视角**: 契约考古学家（接口承诺 vs 实际兑现）、死代码清道夫（声明但从未处理的能力）、未来破坏者（如果下一个需求到来会发生什么）

---

## 发现 1：HIGH — `builtinPages` 基础设施完整但从未连接：Extension 可以声明页面但什么都不会发生

**在哪里**: `packages/shared/src/types/extension.ts:159`（类型声明）, `apps/main/src/router/pageRegistry.tsx:49-57`（注册函数存在）, `packages/extension-host/src/runtime.ts`（从未处理）

**是什么**: Extension 的 `builtinPages` 声明了一条完整的代码路径：

1. 类型声明：`builtinPages?: ExtensionBuiltinPage[]`（extension.ts:159）
2. 注册函数存在：`registerBuiltinPages()`（pageRegistry.tsx:49-57）
3. Demo extension 实际声明了 `builtinPages`（extension-demo/src/index.ts:79）

但是——**没有任何代码读取已加载 extension 的 `builtinPages` 并调用 `registerBuiltinPages()`**。`resolveShellRuntimeConfig`（runtime.ts）不处理 `builtinPages`。`bootstrap.ts` 中的 `applyExtensionDefinitions` 也不处理它。

这意味着：
- Extension-demo 声明的 `extension-harbor-page` 页面在 host shell 中永远不会被注册
- 如果一个新的 extension 开发者按照类型定义添加 `builtinPages`，它将什么都不做
- 注册基础设施已经存在，只缺一行连接代码

**为什么值得关心**: 这是一个"灯下黑"问题——类型系统告诉开发者这个功能可用，注册函数已经写好，demo 也在用它，但实际上整个链条是断开的。开发者可能在本地 demo 中看到页面工作正常，部署到 host shell 后发现页面消失了，且不会收到任何错误提示。

**信心水平**: 确定

---

## 发现 2：MEDIUM — 至少 5 个 Extension 能力已声明但从未被运行时处理

**在哪里**: `packages/shared/src/types/extension.ts`（类型声明）, `packages/extension-host/src/runtime.ts`（运行时）

**是什么**: 以下 `ShellExtension` 字段在类型中声明，但 `resolveShellRuntimeConfig` 从不处理：

| 字段 | 行号 | 注册函数是否存在 | 实际处理 |
|------|------|----------------|----------|
| `styles` | 157 | 不存在 | 完全死代码 |
| `i18nResources` | 153 | 不存在 | 完全死代码 |
| `themes` | 155 | `registerThemes()` 存在 | 从未调用 |
| `i18n` (baseUrl) | 151 | 不存在 | 完全死代码 |
| `env` | 145 | 不存在 | 完全死代码 |
| `faviconUrl` (branding) | 55 | 不存在 | resolved 但从未应用到 DOM |

**为什么值得关心**: 这些字段构成了"幽灵契约"——类型系统承诺 extension 可以提供样式、i18n 资源、主题、环境变量等，但运行时完全忽略它们。Extension-demo 甚至实际声明了其中一些（themes、styles），给开发者造成了"这些功能可用"的错误印象。

`faviconUrl` 是最微妙的一个：`resolveShellRuntimeConfig` 确实解析了它（runtime.ts:166），但 `apps/main/src/` 中没有任何代码读取解析后的值并应用到 `document.querySelector('link[rel="icon"]')`。resolved 值存在于 runtime config 中但从未被消费。

**信心水平**: 确定

---

## 发现 3：MEDIUM — AMIS 初始化缓存 rejected Promise 且不重试，导致永久性 AMIS 不可用

**在哪里**: `apps/main/src/amis/init.ts:20-23`

**是什么**:

```typescript
amisRuntimeInitPromise = loadAmisStyles().then(() => {
  registerMainXuiComponents();
  didInitAmisRuntime = true;
});
```

如果 `loadAmisStyles()` 抛出（CSS 导入失败、网络问题），`amisRuntimeInitPromise` 保持为 rejected promise，`didInitAmisRuntime` 保持为 `false`。后续所有调用 `ensureAmisRuntime()` 都会返回同一个 rejected promise，**AMIS 永远无法初始化**直到页面刷新。

对比 i18n 初始化（`apps/main/src/config/i18n/index.ts:35-39`）：

```typescript
.catch((error: unknown) => {
  initializationPromise = undefined;  // 允许重试
  throw new Error(...);
});
```

i18n 正确地在 `.catch()` 中重置了 promise 引用，允许下次重试。AMIS 缺少这个模式。

**为什么值得关心**: 如果 AMIS CSS 加载偶尔失败（CDN 抖动、网络波动），整个 AMIS 功能将永久不可用，即使用户后续网络恢复。唯一的恢复方式是刷新整个页面。

**信心水平**: 确定

---

## 发现 4：MEDIUM — AMIS `confirm()` 始终返回 `true`，自动确认所有破坏性操作

**在哪里**: `apps/main/src/amis/adapter.ts:90-93`

**是什么**:

```typescript
confirm: async (message) => {
  toast(message);
  return true;
},
```

对比 Flux adapter（`apps/main/src/flux/adapter.ts:47`）：

```typescript
confirm: async (message) => window.confirm(message),
```

AMIS adapter 只显示一个 toast 就自动确认，不等待用户输入。这意味着任何 AMIS schema 中的破坏性确认对话框（删除确认、覆盖确认等）都会被自动跳过。

**为什么值得关心**: 如果后端配置了一个"删除所有数据"按钮并要求确认，AMIS 页面会直接执行而不给用户拒绝的机会。这是 AMIS 和 Flux adapter 之间的行为不一致。

**信心水平**: 确定

---

## 发现 5：MEDIUM — Extension 可通过 `persistRefreshToken: true` + `tokenStorage: 'localStorage'` 组合暴露长期 Refresh Token

**在哪里**: `packages/shared/src/auth/config.ts:13`, `packages/shared/src/types/extension.ts`（ExtensionAuthConfig）

**是什么**: `ExtensionAuthConfig` 包含 `persistRefreshToken` 和 `tokenStorage` 字段。任何已加载的 extension 可以调用 `setAuthConfig({ persistRefreshToken: true, tokenStorage: 'localStorage' })`，将 refresh token 持久化到 localStorage。

没有验证、警告或审计日志。如果已启用，refresh token 在 localStorage 中以明文 JSON 存储（通过 `createJSONStorage`），对任何 XSS 攻击可见。

**为什么值得关心**: 虽然 extension 是受信任的代码，但 `window.__NOP_EXTENSIONS__` 注入向量（Round 01 发现 5）使得恶意 extension 可以启用这个组合，将 refresh token 持久化为 XSS 攻击的便利目标。

**信心水平**: 很可能

---

## 发现 6：LOW — `decodeJwtPayload` 和 `getTokenExpiry` 是死代码：导出但从未在生产中使用

**在哪里**: `packages/shared/src/auth/tokenManager.ts:196-211`

**是什么**: 两个工具函数通过 `packages/shared/src/index.ts` 导出，有完整测试（6 个测试用例），但没有任何生产代码调用它们。Token 过期检查依赖 `tokens.expiresAt`（服务端提供的 `expiresIn` 计算值）而非 JWT payload 解码。

**为什么值得关心**: 未来开发者可能以为系统做客户端 JWT 验证（因为这些函数存在且有测试），但实际上 `isTokenExpiringSoon()` 和 `isTokenExpired()` 只检查 `expiresAt` 存储值。

**信心水平**: 确定

---

## 发现 7：LOW — Flux init 缺少并发调用去重

**在哪里**: `apps/main/src/flux/init.ts:3-10`

**是什么**:

```typescript
export async function ensureFluxRuntime() {
  if (didInitFluxRuntime) return;
  await import('@nop-chaos/flux/style.css');
  await import('../styles/flux-spacing.css');
  didInitFluxRuntime = true;
}
```

没有缓存 Promise。如果两个并发调用同时进入（在 lazy() 加载路径中不太可能但理论上可能），两者都会执行 CSS import。

**对比**: AMIS init 缓存了 Promise 但不重试；Flux init 不缓存 Promise 但能重试。两个初始化模式各有缺陷。

**信心水平**: 有趣的猜测（需要非常特殊的时序才能触发）
