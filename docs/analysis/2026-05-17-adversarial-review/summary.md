# 对抗性审查 - 最终总结

## 审查信息
- **日期**: 2026-05-17
- **执行方式**: 4 轮开放式发现 + 并行子 agent 深度探索
- **结果目录**: `docs/analysis/2026-05-17-adversarial-review/`
- **与已有审查的关系**: 在 `docs/analysis/2026-05-15-open-ended-review/`（5 轮 85 发现）和 `docs/analysis/2026-05-16-deep-audit-full-run/`（12 维度 120 发现）之后独立执行，聚焦于 AMIS/Flux 安全、Extension 生命周期、Auth 双存储、跨边界契约和 E2E 覆盖

## 轮次概要

| 轮次 | 文件 | 聚焦领域 | 高严重度发现数 |
|------|------|----------|--------------|
| 1 | `round-01.md` | AMIS 安全、Extension 生命周期、E2E 覆盖盲区 | 5 |
| 2 | `round-02.md` | 跨边界契约、Auth 双存储、React 性能热点 | 2 |
| 3 | `round-03.md` | Extension 幽灵契约、AMIS 初始化、Confirm 行为 | 1 |
| 4 | `round-04.md` | 全屏 Desync、ErrorBoundary 恢复、Tab 边界行为 | 0 |

**本轮新增发现数**: 31 条
**高严重度 (CRITICAL/HIGH)**: 8 条
**中严重度 (MEDIUM)**: 17 条
**低严重度 (LOW/INFO)**: 6 条

## 与之前审查的关系

本轮发现与之前审查（open-ended-review + deep-audit-full-run）的重叠度极低：

- **CRITICAL 发现 1**（`@fn:` 任意代码执行）和 **发现 2**（`xui:import` 远程模块导入）：之前审查未涉及 AMIS schema 安全层面
- **Extension 生命周期问题**：之前审查提到过 plugin-bridge 订阅精度，但未触及 Extension 系统的 teardown/资源泄漏
- **Auth 双存储不同步**：之前审查提到过 "Token 存储双源"（04-01），但未深入到 login/logout 的具体同步缺口和双 refreshPromise 竞态
- **`BoundStore` selector 契约断裂**：之前审查提到过 "BoundStore selector 签名但实现不支持"（03-04），但本次验证了实际运行时影响
- **E2E 覆盖盲区**和 **AI Workbench 性能**是完全新的发现

## 总评：当前最值得关注的 3 个方向

### 1. AMIS Schema 驱动的安全攻击面需要立即收敛

`@fn:` + `new Function()` 和 `xui:import` + 任意远程模块导入构成完整的代码注入攻击链。这些功能的设计意图可能是为了 schema 灵活性，但当前实现没有任何安全边界（无沙箱、无签名、无域名白名单）。

配合 `window.__NOP_EXTENSIONS__` 注入向量和 extension 可覆盖登录页的能力，一个 XSS 漏洞可以被放大为凭据窃取攻击。

**建议优先级**: 最高。至少应在 `compileFunction` 前添加 schema 签名验证，对 `xui:import` 添加域名白名单。

### 2. Extension 系统存在大量"幽灵契约"——接口承诺了但运行时不兑现

至少 6 个 `ShellExtension` 字段（`builtinPages`, `styles`, `i18nResources`, `themes`, `i18n`, `env`）在类型中声明但从未被运行时处理。其中 `builtinPages` 最严重：注册函数已经写好、demo 已经在用，但连接代码缺失。

同时，`BoundStore<T>` 的 selector 重载是另一类幽灵契约——TypeScript 类型说"selector 可用"，运行时静默忽略 selector 参数。

**建议**: 对未实现的能力添加 `@deprecated` 或 `@planned` JSDoc 标注；对 `BoundStore` selector 要么实现要么移除类型签名。补齐 `builtinPages` 的连接代码（只需一行）。

### 3. Auth 系统的双存储（authStore + tokenManager）从 Login 开始就不同步

Login 不写入 tokenManager，Logout 不清除 tokenManager，两个 `refreshPromise` 单例独立运行。当前靠 fallback 机制没有崩溃，但任何依赖 tokenManager 主动刷新路径的代码都在操作空/过时数据。Tab Store 的零测试覆盖和 closeTab 边界行为也是类似的"看起来工作但边界条件未保护"模式。

**建议**: 统一为单一 token 存储入口，或在 login/logout 时同步两个存储。为 tabStore 添加基础测试覆盖。

## 本次审查的盲区自评

### 可能漏掉的问题类型

1. **移动端和触屏交互** — 仍然未覆盖。之前审查也提到这一点。触摸事件、手势、软键盘行为都没有检查。

2. **构建产物分析** — 没有实际运行 `pnpm build` 并检查产物大小、chunk 组成、tree-shaking 效果。lazy-loading 的效果只通过代码结构推断，未实际验证。

3. **可访问性深度审查** — Round 01 发现了 10+ a11y 问题（来自之前审查的结论），本次没有重新深入。键盘导航、ARIA 属性、屏幕阅读器兼容性仍是盲区。

4. **国际化内容完整性** — 检查了 i18n 系统的架构问题，但没有逐条验证翻译 key 的覆盖率和翻译质量。

5. **Webpack/Vite 配置的优化空间** — 没有检查 `vite.config.ts` 的 build 配置、rollup 选项、是否可以进一步优化 bundle。

### 下一轮最适合的切入点

1. **运行时性能剖析** — 实际运行应用，用 React DevTools Profiler 验证 AI Workbench 的 80+ renders/sec 推断
2. **Schema 安全加固方案设计** — 针对 `@fn:` 和 `xui:import` 设计具体的安全边界
3. **移动端完整审查** — 用真实设备测试所有交互
4. **Extension 系统完整性补齐** — 连接所有幽灵契约，补齐 teardown 生命周期
