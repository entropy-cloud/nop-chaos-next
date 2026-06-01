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

### 2026-05

- [05-29](2026/05-29.md) — Backend-owned navigation menus and extension user-menu delta customization
- [05-26](2026/05-26.md) — Added one-command AMIS+Flux rebuild flow and hardened Flux sync with downstream patch reapply
- [05-18](2026/05-18.md) — Plan 27 executed: extension contract closure, runtime state coherence fixes, and AI Workbench lifecycle hardening
- [05-12](2026/05-12.md) — Plan 04 executed: Turborepo, ESLint rules, Prettier/lint-staged, knip/jscpd, Vitest workspace, check scripts, docs restructuring, AGENTS.md update
