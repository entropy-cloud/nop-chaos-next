# 10 Style And Animation Governance Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Completed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-review/round-02-css-animation.md`
> Related: `docs/plans/06-accessibility-and-i18n-contract-plan.md`

## Purpose

将 open-ended 审查中确认的样式与动画技术债收口到分层 owner baseline：先修复用户可见功能 bug 和首屏阻塞问题，再为动画属性、CSS token fallback、任意值泛滥和 z-index/opacity 治理建立可持续规则。

## Current Baseline

- `animate-caret-blink` 缺失，OTP 光标不可见。
- `apps/main/index.html` 没有字体预加载策略，且 Font Awesome 同步阻塞。
- `amis-fix.css` 存在 `transition: all` 和大量 `!important`，后者已被确认是高严重度级联脆弱点。
- flux-lib 侧边栏与菜单存在布局属性动画。
- repo 中存在 219+ 处冗余 `[hsl(...)]` 任意值与不一致的 glass opacity / z-index 体系。

## Goals

- 修复用户可见的样式功能 bug 与首屏加载关键问题。
- 为动画属性、CSS token fallback 与样式约束建立最小治理基线。
- 缩小高风险任意值与层级/opacity 漫游范围。

## Non-Goals

- 不在本计划中重写整个 design system。
- 不一次性消灭所有任意值 class。
- 不处理与样式无关的表单、网络、demo、DX 问题。

## Scope

### In Scope

- `flux-lib/ui/src/components/ui/input-otp.tsx`
- `apps/main/index.html`
- `packages/tailwind-preset/src/index.ts`
- `apps/main/src/styles/amis-fix.css`
- `apps/main/src/styles/flux-spacing.css`
- `apps/main/src/styles/index.css`
- `flux-lib/ui/src/components/ui/sidebar-menu.tsx`
- `flux-lib/ui/src/components/ui/sidebar-layout.tsx`
- `flux-lib/ui/src/components/ui/command.tsx`
- `packages/tailwind-preset/**`
- `apps/main/src/router/RouteRenderer.tsx`
- `apps/main/src/pages/flow-editor/index.tsx`
- `docs/design/styling-system-specification.md`

### Out Of Scope

- 全仓 className 全量重写
- 所有 flux-lib 组件的样式 API 重构

## Execution Plan

### Phase 1 - 功能 bug 与首屏阻塞

Status: completed
Targets: `flux-lib/ui/src/components/ui/input-otp.tsx` `apps/main/index.html` `packages/tailwind-preset/src/index.ts`

- Item Types: `Fix | Proof`

- [x] Fix: 在 `packages/tailwind-preset/src/index.ts` 或等价 owner 样式文件中为 `animate-caret-blink` 提供实际动画定义，修复 OTP 光标不可见。
- [x] Fix: 为主应用字体建立明确的 preload / preconnect / 等价非阻塞加载基线，并同时处理 Font Awesome 的同步阻塞问题。
- [x] Proof: 为 OTP caret 与首屏资源加载策略补 focused verification。

Exit Criteria:

- [x] OTP 输入不再引用缺失动画。
- [x] 字体加载具备明确的 preload / preconnect / 等价非阻塞合同，且图标资源不再保持当前同步阻塞基线。
- [x] `docs/design/styling-system-specification.md` 已同步首屏样式资源加载约定。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - 动画属性与 CSS token 基线

Status: completed
Targets: `apps/main/src/styles/amis-fix.css` `apps/main/src/styles/flux-spacing.css` `flux-lib/ui/src/components/ui/sidebar-menu.tsx` `flux-lib/ui/src/components/ui/sidebar-layout.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: 收敛 `transition: all` 与高风险布局属性动画到可接受范围。
- [x] Fix: 对 `amis-fix.css` 中的高风险 `!important` 使用做最小治理：能消除的消除，必须保留的在 owner 规则中明确原因与边界。
- [x] Fix: 为关键基础设施 CSS 变量补充 fallback。
- [x] Proof: 为动画属性与 token fallback 变更补 focused verification。

Exit Criteria:

- [x] in-scope 动画不再依赖高风险 `transition: all` / 不必要布局属性动画。
- [x] `amis-fix.css` 的高风险 `!important` 已完成治理裁定，不再处于无人认领状态。
- [x] 关键 token 引用具备 fallback。
- [x] `docs/design/styling-system-specification.md` 已同步当前动画/token 基线。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - 样式约束与层级治理

Status: completed
Targets: `apps/main/src/styles/index.css` `apps/main/src/styles/amis-fix.css` `packages/tailwind-preset/**` `apps/main/src/router/RouteRenderer.tsx` `apps/main/src/pages/flow-editor/index.tsx` `flux-lib/ui/src/components/ui/sidebar-menu.tsx` `flux-lib/ui/src/components/ui/command.tsx` `docs/design/styling-system-specification.md`

- Item Types: `Decision | Fix | Proof`

- [x] Decision: 为 z-index、glass opacity、任意值替代策略建立最小 owner 规则。
- [x] Fix: 至少收敛一组高频任意值/opacity 漫游热点，验证规则可落地。
- [x] Decision: 对 `C7` 超长 className strings 与 `C12` Tailwind `!` 跨组件边界问题完成治理裁定，至少覆盖 `sidebar-menu.tsx` 与 `command.tsx` 这两个 in-scope 热点。
- [x] Proof: 用 repo-observable 文档与样例证明约束可执行。

Exit Criteria:

- [x] owner 文档已记录 z-index / opacity / arbitrary value 最小治理规则。
- [x] 至少一组高频热点已按规则收敛。
- [x] `C7` / `C12` 在 in-scope 热点文件上的治理已完成或被明确写入 owner 规则。
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复或被明确移出当前 scope
- [x] 用户可见样式功能 bug 与首屏阻塞问题已收敛
- [x] 样式/动画/token 最小治理基线已建立并写入 owner doc
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: OTP caret、首屏资源加载、动画属性、token fallback 与样式治理 owner docs 已完成收口，并经独立 closure audit 与全量验证确认无剩余 in-scope blocker，可关闭。

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit in current session
- Evidence: 复核 `packages/tailwind-preset/src/index.ts`、`apps/main/index.html`、`apps/main/src/styles/amis-fix.css`、`flux-lib/ui/src/components/ui/sidebar-menu.tsx`、`flux-lib/ui/src/components/ui/sidebar-layout.tsx`、`docs/design/styling-system-specification.md`，并结合 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build` 结果确认样式/动画基线已与 live repo 对齐。

Follow-up:

- 无。
