# Development Log

Development log entries are organized by date — one file per day.

## Structure

```
docs/logs/
├── index.md                ← this file (daily log writing guide + index)
├── flux-sync/              ← Flux source sync history
│   ├── index.md
│   └── 2026/
│       └── 05-26.md
├── 2026/
│   ├── 05-12.md
│   ├── 05-11.md
│   └── ...
└── 2027/
    └── ...
```

**Convention**: `docs/logs/{year}/{month}-{day}.md`

Flux sync history uses a dedicated convention: `docs/logs/flux-sync/{year}/{month}-{day}.md`

## Writing Guide

### Purpose

Each daily log captures short dated notes about:

- What document was added or updated
- What design decision was made
- What work is planned next
- Small context useful to remember later but not belonging in formal design docs

### Rules

- **One file per day** — all work on the same day goes into the same file
- **Append new entries** — add new `### YYYY-MM-DD` sections at the top of the file (reverse chronological)
- **Keep entries short** — prefer bullet points, link to main docs or code paths
- **Not source of truth** — this is lightweight context, not normative design
- **Link to real docs** — when referencing a design decision, link to the design doc or code path
- **Treat log files as append-only history** — file length alone is not a defect; do not flag daily logs just because they grow beyond the active-doc size guideline

### Entry Format

```markdown
# Development Log — YYYY-MM-DD

### YYYY-MM-DD

- Brief description of what happened.
- Link to doc or code path: `docs/design/plugin-system.md` or `packages/core/src/baz.ts:42`
- Key decision: ...
- Next step: ...
```

### Adding a New Entry

When adding a new log entry for today:

1. Open `docs/logs/{year}/{month}-{day}.md` (create if it doesn't exist)
2. Add a `### YYYY-MM-DD` section at the top (before any existing entries)
3. Write your bullets
4. If the day already has earlier entries, append after a blank line separator

## Index (Reverse Chronological)

### Flux Sync

- [flux-sync/index.md](flux-sync/index.md) — Script-generated sync baseline records for `scripts/sync-flux-lib.sh`

### 2026-07

- [07-21](2026/07-21.md) — Executed Plan 14: Navigation Login Unification in nop-entropy-e2e — migrated 7 spec files across auth-e2e, code-e2e, job-e2e from LoginPO to shared Navigation.login(); updated Navigation.ts with credentials, locale, and E2E_AUTH_MODE support; removed 3 login.po.ts files
- [07-20](2026/07-20.md) — Executed 12 plans: e2e-shared package creation, sync script, E2E_ENGINE/BASE_URL support, MockAuthAdapter, 5 PageObject migration plans (login, dashboard, permissions, i18n, flow editor, plugin, AMIS, CRUD, AI workbench, lazy loading, prototypes), AMIS PageObject replacement in nop-entropy-e2e, RpcClient integration in nop-entropy-e2e
- [07-13](2026/07-13.md) — 兼容旧版 amis JSON 的 `vue-form-item` + `icon-picker`：amis-react 新增通用 name→React 组件桥接渲染器，apps/main 新增 React `IconPicker`（复用 `LowCodeIcon`，lucide 图标集）；修复 host/bridge 分层违规
- [07-10](2026/07-10.md) — Decoupled prototype extension from main default build path: removed static `import('@prototype-extension')` from `config.ts`; prototype-server plugin now injects `window.__NOP_EXTENSIONS__` via `transformIndexHtml` (`/@fs/` entry). Fixes default `pnpm dev:main` resolution error.
- [07-05](2026/07-05.md) — Created `docs/design/overview.md` (generic-shell vision) and `docs/design/shell-profiles.md` (multi-client profile mechanism: web/mobile/kiosk via single build artifact)
- [07-04](2026/07-04.md) — Corrected stale Flux runtime status in `amis-flux-rendering-engine-integration.md`: Flux is now integrated via `@nop-chaos/flux` tarball with a real `FluxRouteRenderer`, not a placeholder

### 2026-06

- [06-19](2026/06-19.md) — Fixed AMIS schemaPath double-prefix bug; fixed Flux nested menu handling; created `prototypes/flux-demo/` data and Flux e2e test; both demos now have complete data and e2e coverage
- [06-17](2026/06-17.md) — Moved `amis-guide/` AMIS framework reference into repo root; added AMIS/Flux JSON prototyping demo design; **Plan 31 implemented** (delta-merge, vite plugin, two demo extensions, host integration)

### 2026-05

- [05-29](2026/05-29.md) — Backend-owned navigation menus and extension user-menu delta customization
- [05-26](2026/05-26.md) — Added one-command AMIS+Flux rebuild flow and hardened Flux sync with downstream patch reapply
- [05-18](2026/05-18.md) — Plan 27 executed: extension contract closure, runtime state coherence fixes, and AI Workbench lifecycle hardening
- [05-12](2026/05-12.md) — Plan 04 executed: Turborepo, ESLint rules, Prettier/lint-staged, knip/jscpd, Vitest workspace, check scripts, docs restructuring, AGENTS.md update
