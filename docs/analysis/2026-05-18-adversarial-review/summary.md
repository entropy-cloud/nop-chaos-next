# 对抗性审查 - 最终总结

## 审查信息

- 日期：2026-05-18
- 执行方式：2 轮开放式发现 + 1 轮无新增问题的收束复查
- 结果目录：`docs/analysis/2026-05-18-adversarial-review/`
- 与已有审查的关系：本轮刻意避开了已被多次讨论的大项（AMIS 动态执行、auth 双存储、`systemPages` 接线缺口、`builtinPages` 幽灵契约、plugin bridge 订阅问题），转向运行时时序、状态分叉和新暴露的 extension 契约残余

## 轮次概要

| 轮次 | 文件 | 聚焦领域 | 新增高价值发现 |
|------|------|----------|----------------|
| 1 | `round-01.md` | extension/runtime 契约、主题状态分叉、storage 缓存、AI lifecycle | 5 |
| 2 | `round-02.md` | 动态 homePath 时序、shell 输出契约兑现度 | 2 |
| 3 | — | 窄范围复查（generator / runtime shell config / 构建边界） | 0 |

**本轮新增发现数**：7 条

## 总评：当前最值得关注的 3 个方向

### 1. Extension API 仍在持续生长，但“类型承诺 > 运行时兑现”的裂缝还没有收口

本轮最明显的模式不是单个 bug，而是 extension 契约继续向外扩张时，host 侧只接了中间一段或根本没接：

- `ShellExtension.plugins` 已进入公共类型，但 host 完全不消费
- `helpUrl/aboutUrl/supportUrl` 已 merge 进 runtime config，但主应用没有任何消费点
- `supportedLanguages` 的实现语义不是“扩展 host 能力”，而是“最后一个 extension 覆盖所有语言”

这说明 extension 系统当前更像“允许声明很多东西”，而不是“对外提供一组被完整兑现的稳定能力”。如果不收敛公共 contract，外部 extension 会越来越容易踩进幽灵配置区。

### 2. 当前项目对“状态在运行中被重新定义”的场景防护不足

`homePath`、theme registry、storage cache 都暴露出同一个深层模式：系统假设某些全局状态在启动后基本不再变化，但 extension、persist 或跨 tab 行为会在运行中改变这些前提。

- `homePath` 先被 tabStore 固化，后被 extension 改写，制造双首页 tab
- 失效主题会让 DOM 回退，但 store 和 plugin bridge 继续暴露旧主题
- storage cache 在 `clear()` 之后仍可能保留旧世界视图

这类问题比直接崩溃更难查，因为每一层单看都“合理”，只有跨层串起来才暴露分叉。

### 3. Demo/Mock 驱动页面里的生命周期治理仍然偏松，未来接真实后端时会放大

AI Workbench 当前的流式回复和历史加载逻辑在 mock 模式下还能工作，但它们没有组件卸载取消路径。今天只是定时器/异步链泄漏，未来一旦换成真实流式 API、AbortController、WebSocket 或更重的上下文处理，问题会被直接放大成后台资源消耗和 stale update。

## 本次审查的盲区自评

### 可能漏掉的问题类型

1. 真正的构建产物和 bundle 边界
没有实际运行 `pnpm build` 并检查产物内容，只做了代码级契约审查。

2. 真实运行态的性能剖析
AI Workbench 的生命周期问题是从代码路径推断出来的，没有做 profiler 或浏览器 performance 验证。

3. extension-host 更深层的 teardown / reload 语义
本轮检查了 runtime config 与 host 消费之间的契约，但没有系统复查 extension 热替换、卸载和资源回收的完整生命周期。

### 下一轮最适合的切入点

1. 以“运行中重配置”为主线，专查 theme、language、homePath、extension reload 的一致性
2. 实际运行 AI Workbench 和 extension demo，验证卸载取消、双首页 tab 等问题的可复现性
3. 审查 extension generator 是否继续向新扩展复制过时 contract 或半连接能力
