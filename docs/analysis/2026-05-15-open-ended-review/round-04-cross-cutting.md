# 对抗性审查 - 第 4 轮：跨领域问题与安全

## 发现来源视角
恶意输入者 + 组合爆炸测试者

## 高严重度发现

### X1. 两套独立的 storage 工具系统并行存在，互不感知
- **文件 A**: `apps/main/src/utils/storage.ts` — 有内存缓存 (`storageCache`) + `storage` 事件监听
- **文件 B**: `apps/main/src/services/mockApi/shared.ts` — 有独立的 `memoryStore` + 直接 localStorage 操作
- **Zustand persist**: `createJSONStorage(() => localStorage)` — 第三条路径，通过 zustand middleware 直接操作 localStorage
- **问题**: 三个独立的 storage 访问路径：
  1. `storage.ts` 的缓存层（监听 `storage` 事件失效）
  2. `mockApi/shared.ts` 的 `memoryStore`/直接 localStorage（不走缓存）
  3. Zustand persist 的 `createJSONStorage`（不走缓存）
- **影响**: `storage.ts` 的 `storageCache` 假设所有写操作都通过 `setStorageItem`，但 Zustand persist 和 mockApi 直接写 localStorage，导致缓存与实际值不同步。`pluginStore` 的双重持久化问题（已在之前审计中发现）是此模式的一个实例。
- **信心**: 确定

### X2. `amis/adapter.ts` 使用 `new Function()` 执行动态代码
- **文件**: `apps/main/src/amis/adapter.ts:100`
- **代码**: `compileFunction: (code, page) => new Function('page', \`return (${code})\`)(page) as AmisAction`
- **问题**: AMIS schema 中的 `code` 字段被直接传入 `new Function()` 执行。如果 AMIS schema 来自不可信来源（例如通过 API 加载的第三方 schema），这就是一个 XSS 向量。ESLint 规则 `no-new-func` 在此文件被禁用。
- **缓解**: AMIS schema 通常来自可信来源（内部 API 或本地文件），且此代码在生产构建中存在。
- **信心**: 很可能（取决于 schema 来源的可信度）

## 中严重度发现

### X3. `storageCache` 在同标签页的 Zustand persist 写入后不失效
- **文件**: `apps/main/src/utils/storage.ts:35-40`
- **问题**: `window.addEventListener('storage', ...)` 仅在**跨标签页**的 storage 变化时触发（浏览器 spec）。同一标签页内 Zustand persist 写入 localStorage 不触发 `storage` 事件。因此 `storageCache` 永远不会因为 Zustand 写入而失效。
- **影响**: 如果有代码先通过 `setStorageItem` 设置缓存值，然后 Zustand persist 更新了同一个 key，后续 `getStorageItem` 返回过期的缓存值。
- **信心**: 确定

### X4. `animate-caret-blink` 确认仍然缺失
- **文件**: `flux-lib/ui/src/components/ui/input-otp.tsx:64`
- **问题**: 此类引用了 `@keyframes caret-blink` 但整个代码库中无定义。OTP 输入的光标不可见。
- **信心**: 确定

### X5. `bootstrapExtensions()` 的错误通过 `main.tsx` 的 catch 捕获但无具体错误信息
- **文件**: `apps/main/src/main.tsx:54-63`
- **问题**: 之前的审计发现 bootstrap 无错误处理。现在有 `try/catch` 和 fallback UI（`renderBootstrapFallback`），这是一个改进。但 fallback UI 中的 `<h1>Bootstrap Failed</h1>` 和 `<p>{error.message}</p>` 是硬编码英文，没有 i18n。`error.message` 直接来自底层异常（可能是中文、英文或无意义的内部错误）。
- **信心**: 确定

### X6. markdown.tsx 的 `react/no-array-index-key` 6 处禁用可能导致 AI streaming 问题
- **文件**: `apps/main/src/pages/ai-workbench/markdown.tsx`
- **问题**: 渲染 AI 回复的 markdown 时，所有列表项、代码块使用 index 作为 key。在 AI streaming 场景中，内容不断增长，列表项可能增加。React 可能因 key 复用导致 DOM 状态异常（如错误的展开/折叠状态）。
- **信心**: 很可能

## 低严重度发现

### X7. `useAuth.ts` 的 catch 块仅设置 `bootstrapStatus: 'error'` 但不清理
- **文件**: `apps/main/src/hooks/useAuth.ts:46-48`
- **问题**: 错误时仅设状态为 'error'，不调用 `logout()` 或 `clearTokens()`。无效 token 留在 store 和 storage 中，页面刷新后会再次尝试使用同一 token bootstrap。
- **信心**: 确定

### X8. chart.tsx 的 `dangerouslySetInnerHTML` 有适当净化
- **文件**: `flux-lib/ui/src/components/ui/chart.tsx:117`
- **正面发现**: 使用 `sanitizeChartId`、`sanitizeConfigKey`、`sanitizeColorValue` 三个正则检查。`SAFE_COLOR_VALUE` 正则阻止注入。
- **信心**: 确定（非问题）

## 总结
| 严重度 | 数量 | 关键领域 |
|--------|------|----------|
| 高 | 2 | 三路 storage 不一致、`new Function()` 安全风险 |
| 中 | 4 | 缓存失效、缺失 keyframes、fallback 无 i18n、markdown key |
| 低 | 1 | auth bootstrap 不清理 |
