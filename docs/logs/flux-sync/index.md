# Flux Sync Log

Flux sync history is tracked separately from the daily dev log because it records repeated source-import baselines from the sibling `nop-chaos-flux` repo.

Policy and rules for what gets synced belong in `docs/references/flux-sync-spec.md`. This directory only records sync history.

## Structure

```text
docs/logs/flux-sync/
├── index.md
└── 2026/
    └── 05-26.md
```

## Purpose

Each entry records the exact upstream baseline used by `scripts/sync-flux-lib.sh`.

Record:

- The sibling repo path used for the sync
- The upstream `nop-chaos-flux` commit SHA
- Which packages were synced
- Start and finish timestamps
- The post-sync policy that was applied after the upstream copy (currently runtime-only package policy only)

## Rules

- One file per day under `docs/logs/flux-sync/{year}/{month}-{day}.md`
- New sync entries append to that day's file
- These logs are script-generated history, not hand-authored design docs
- When auditing what should be upstreamed, compare the current local copy against the last recorded sync baseline instead of comparing directly to the live moving `nop-chaos-flux` working tree

## Current Index

### 2026-05

- [05-26](2026/05-26.md) — Flux sync log initialized; future `pnpm sync:flux` runs append upstream-baseline records here
