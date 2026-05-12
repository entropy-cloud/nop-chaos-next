# 文档与代码一致性核对报告（2026-03-30）

> 目标：深度核对 `docs` 与当前实现一致性，并自动修复已确认偏差。

---

## 1. 核对范围

本次重点核对以下“现行文档”与代码实现：

- `docs/08-plugin-dev-guide.md`
- `docs/16-backend-integration.md`
- `docs/17-icon-naming-and-rendering.md`
- `docs/18-amis-theme-bridge.md`

对应代码核验点包括：

- `packages/core/src/utils/iconMap.tsx`
- `packages/shared/src/types/icon.ts`
- `apps/main/index.html`
- `apps/main/src/amis/init.ts`
- `apps/main/src/styles/index.css`
- `examples/plugin-demo/package.json`
- `apps/main/src/services/menuMapper.ts`
- `apps/main/src/router/RouteRenderer.tsx`

---

## 2. 发现并修复的问题

### 问题 A：图标系统文档仍按“仅 FontAwesome”描述

- 文档位置：`docs/17-icon-naming-and-rendering.md`
- 实际代码：`packages/core/src/utils/iconMap.tsx` 已实现 **Lucide 优先 + FontAwesome 兼容回退** 的混合策略。

已修复内容：

- 更新概述，明确为混合策略。
- 更新渲染规则顺序（显式 FA -> Lucide -> FA alias -> fallback）。
- 补充 `resolveIcon()` 入口与 `normalizeAppIconName()` 说明。

### 问题 B：AMIS 文档中的 FontAwesome 加载方式错误

- 文档位置：`docs/18-amis-theme-bridge.md`
- 原描述：通过 script 标签或 `main.tsx` import 加载。
- 实际代码：`apps/main/index.html` 使用 `<link rel="stylesheet" href="/vendor/fontawesome/all.min.css" />`。

已修复内容：

- 改为静态资源加载说明（`public/vendor/fontawesome`）。
- 文件清单改为“通过 `<link rel="stylesheet">` 加载”。
- 补充 `apps/main/src/amis/init.ts` 是 AMIS 主题桥接入口。
- 补充 `amis-fix.css` 由 `apps/main/src/styles/index.css` 引入。

### 问题 C：插件开发文档依赖清单缺少 `systemjs`

- 文档位置：`docs/08-plugin-dev-guide.md`
- 实际代码：`examples/plugin-demo/package.json` 的 peerDependencies/devDependencies 均包含 `systemjs`。

已修复内容：

- 在“可直接依赖”列表补充 `systemjs`。
- 在依赖声明示例中补充 `systemjs`。

### 问题 D：后端联调菜单链路重点文件不完整

- 文档位置：`docs/16-backend-integration.md`
- 实际代码：菜单类型映射与渲染职责分别在 `menuMapper.ts` 与 `RouteRenderer.tsx`。

已修复内容：

- 在 Step 2 重点文件中补充：
  - `apps/main/src/services/menuMapper.ts`
  - `apps/main/src/router/RouteRenderer.tsx`

---

## 3. 本次修改清单

- `docs/08-plugin-dev-guide.md`
- `docs/16-backend-integration.md`
- `docs/17-icon-naming-and-rendering.md`
- `docs/18-amis-theme-bridge.md`
- `docs/23-doc-code-consistency-audit-2026-03-30.md`（新增）

---

## 4. 结论

本轮已完成可证实不一致项的自动修复，核心文档与当前实现已对齐到以下事实：

- 菜单页面类型链路覆盖 `builtin/plugin/amis/iframe/external`。
- 图标渲染是 Lucide + FontAwesome 兼容策略，而非单一 FontAwesome。
- AMIS 场景下 FontAwesome 来源为静态 vendor 资源并通过 HTML `link` 引入。
- 插件开发依赖边界包含 `systemjs`。

---

## 5. 补充说明

- `docs/input/*` 与 `docs/plans/*` 中包含历史草案和规划文档，存在大量示例性路径与伪代码片段，并不总是与当前仓库结构一一对应。
- 本轮自动修复聚焦“现行说明文档”（`docs/00` 到 `docs/22` 主线中的关键技术文档），避免误改历史设计输入。
