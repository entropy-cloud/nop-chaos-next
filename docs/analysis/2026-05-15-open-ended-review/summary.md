# 对抗性审查 - 最终总结

## 审查信息
- **日期**: 2026-05-15
- **执行方式**: 5 轮开放式发现 + 子 agent 并行探索
- **结果目录**: `docs/analysis/2026-05-15-open-ended-review/`
- **与已有审查的关系**: 在 `docs/analysis/2026-05-15-deep-audit-next/`（12 维度 103 发现）之后独立执行，聚焦于维度间空白和维度外发现

## 轮次概要

| 轮次 | 文件 | 聚焦领域 | 高严重度发现数 |
|------|------|----------|--------------|
| 1 | `round-01-a11y.md` | 可访问性 | 7 |
| 1 | `round-01-i18n.md` | 国际化 | 5 |
| 2 | `round-02-network-resilience.md` | 网络弹性 | 5 |
| 2 | `round-02-forms.md` | 表单模式 | 0 (8 个中) |
| 2 | `round-02-css-animation.md` | CSS/动画 | 4 |
| 2 | `round-02-demo-quality.md` | Demo 质量 | 8 |
| 3 | `round-03-eslint-stores-dx.md` | ESLint/Store/DX | 3 |
| 4 | `round-04-cross-cutting.md` | 跨领域/安全 | 2 |
| 5 | — | 最终验证 | 0（无新发现） |

**总发现数**: ~85 条（含不同严重度）
**高严重度**: ~34 条

## 总评：当前最值得关注的 1-3 个方向

### 1. 可访问性是最大的系统性盲区

之前的维度审核完全没有覆盖 a11y。本次发现 7 个高严重度 a11y 问题，包括：
- **TabContextMenu 完全无法通过键盘访问** — 这是日常功能（关闭/刷新标签），纯键盘用户完全无法使用
- **所有页面没有 `document.title`** — 每次导航屏幕阅读器都无法告知用户当前页面
- **FlowNodeCard 浮动工具栏键盘不可达** — 流程编辑器的核心编辑功能对键盘用户不可用
- **10 个纯图标按钮缺少 `aria-label`** — 整个应用的按钮标签覆盖率很低

这不是个别遗漏，而是系统性的空白。建议：
1. 添加 `eslint-plugin-jsx-a11y` 到 ESLint 配置
2. 为核心交互组件（TabsBar、Sidebar、FlowNodeCard）添加键盘支持
3. 为所有页面添加 `useDocumentTitle` hook

### 2. Demo 作为参考实现存在严重的误导风险

plugin-demo 和 extension-demo 是插件/扩展开发者的主要参考，但质量远低于主应用：
- **两个 demo 零测试** — 违反 AGENTS.md 的测试覆盖规则
- **extension-demo 硬编码密码 `123456`** — 安全反模式
- **plugin-dev-guide.md 文档严重过时** — 目录结构和版本号都不对
- **extension-demo 缺少 `lucide-react` 依赖声明** — 移出 monorepo 即崩溃
- **两个 demo 的 i18n 几乎不存在** — plugin-demo 用 `t()` 但无 locale 文件，extension-demo 全部硬编码英文

新人开发者复制这些 demo 时会继承所有这些问题。建议：
1. 将 demo 的质量标准提升到与主应用一致
2. 添加 CI 检查确保 demo 依赖完整
3. 更新 plugin-dev-guide.md 或标注其为"待更新"

### 3. Flux-lib 的 i18n 旁路 + CSS `animate-caret-blink` 缺失构成隐藏的用户体验 bug

Flux-lib UI 组件（dialog、sheet、breadcrumb、carousel、pagination、sidebar）使用独立的 i18n 系统，`setI18nGetter` 从未被调用，导致无论用户选择什么语言，所有这些组件始终显示英文。同时 `animate-caret-blink` 的 keyframes 从未定义，OTP 输入的光标不可见。

这两个问题都是"存在接口但未连接"的模式 — API 表面看起来正确，但实际从未被使用。

## 与之前维度审核的交叉分析

之前审核的 P0 清单（3 条）和 P1 清单（22 条）聚焦在：
- Error boundary（已部分修复 — main.tsx 现在有 bootstrap fallback）
- 测试覆盖（authStore 现在有 84 行测试）
- 插件桥接和订阅精度

本次审核发现的新问题**几乎完全不与之前的 P0/P1 重叠**，验证了开放式审查的价值：
- a11y 的 34 条发现全部是新的
- i18n 的 flux-lib 旁路是新的
- 网络弹性的离线处理是新的
- CSS 的 `animate-caret-blink` 缺失是新的
- Demo 质量问题是新的

## 本次审查的盲区自评

### 可能漏掉的问题类型

1. **运行时性能剖析** — 我没有实际运行应用来测量性能。CSS 动画的布局触发、React 重渲染、大数据量的列表性能都只通过代码审查推断，未实际验证。

2. **E2E 测试质量** — 我没有深入检查 `tests/e2e/` 下的 Playwright 测试质量和覆盖率。测试可能有误判（flaky tests）或遗漏关键路径。

3. **移动端响应式设计** — 我注意到移动端侧边栏的 Escape 键问题和一些 `md:` breakpoint 使用，但没有系统检查所有页面在不同屏幕尺寸下的表现。

4. **包发布和版本管理** — 我没有检查各包的 `publishConfig`、`exports` 字段、`typesVersions` 等是否正确配置为可独立发布。

5. **AMIS/Flux 渲染引擎的深层逻辑** — `packages/amis-core/` 和 `packages/amis-react/` 的内部实现（graphql 构建、ajax 适配、schema 解析）我没有深入审查，可能存在复杂的数据处理 bug。

6. **Extension 系统（`packages/extension-host/`）** — 我没有深入审查扩展加载、沙箱隔离、生命周期管理等核心逻辑。

### 下一轮最适合的切入点

如果做下一轮审查，建议从以下方向切入：
1. **移动端完整审查** — 用真实移动设备或模拟器测试所有交互
2. **AMIS/Flux 渲染引擎深度审查** — 特别关注 schema 解析和安全性
3. **E2E 测试审计** — 检查测试覆盖率、flaky tests 和关键路径遗漏
4. **包发布就绪度检查** — 各包是否可以独立发布到 npm
5. **React Compiler 兼容性** — 当前 `react-compiler` ESLint 设为 error，但已有 2 处 disable，随着 React Compiler 演进可能产生更多冲突
