# Manual Test Issues

人工诊断和人工测试问题按日期归档。

## Structure

```
docs/testing/
├── 00-testing-issue-writing-guide.md
├── index.md
├── 2026/
│   ├── 05-14.md
│   └── ...
└── 2027/
    └── ...
```

## Usage

- Path convention: `docs/testing/{year}/{month}-{day}.md`
- Writing rules and entry format: `docs/testing/00-testing-issue-writing-guide.md`

## Index (Reverse Chronological)

### 2026-05

- [05-19](2026/05-19.md) - master-detail 详情页删除物流后反复弹出空 confirm；AI Workbench 等页面语义按钮出现深色底配深色文字；Theme settings 主题选项卡文案溢出
- [05-14](2026/05-14.md) - 登录页输入框图标与文字重叠；mock 模式英文登录后菜单显示 `menuKey`；进入 Flux Demo 后宿主文案退回翻译 key

## E2E Test Entry Points

| Spec | Command |
|------|---------|
| Login, Dashboard, Plugins, Flow Editor | `pnpm test:e2e` |
| AMIS Prototype | `pnpm test:e2e:amis-prototype` |
| Flux Prototype | `pnpm test:e2e:flux-prototype` |
| **Extension Demo** | `pnpm test:e2e:extension-demo` |

## E2E Developer Guides

- [01-e2e-developer-guide.md](01-e2e-developer-guide.md) — 本仓库 E2E 测试开发手册（架构、编写、引擎切换、调试）
- **[02-cross-project-e2e-debugging.md](02-cross-project-e2e-debugging.md)** — **调试下游项目（nop-entropy-e2e、nop-app-erp）E2E 时必读**。核心规则：测试必须访问 nop-chaos-next 前端（4173）通过 Vite proxy 转发到后端（8080），**不能直接访问后端端口**。**注意：本手册只覆盖跨项目链路；下游项目自身的 E2E 调试知识（RPC 错误处理、SiteMapApi 陷阱、render-mode 等）在 `../nop-entropy/docs-for-ai/` 下，调试前也必须读。**

## Quick Rule for Cross-Project E2E

```
✅ BASE_URL=http://localhost:4173   (nop-chaos-next frontend + Vite proxy)
❌ BASE_URL=http://localhost:8080   (backend direct — bypasses proxy, stale frontend)
```
