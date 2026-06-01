# libs

This directory stores the upstream tarball artifacts consumed by this repository during normal `pnpm install` and `pnpm build`.

Current expected files:

- `amis-6.13.1.tgz`
- `amis-core-6.13.1.tgz`
- `amis-formula-6.13.1.tgz`
- `amis-ui-6.13.1.tgz`
- `office-viewer-0.3.14.tgz`
- `nop-chaos-flux-0.1.0.tgz`

Rules:

- These `*.tgz` files are part of the repository state and should be committed.
- Normal `pnpm install`, `pnpm build`, and `pnpm site` depend on these local tarballs rather than sibling repositories.
- Refreshing the tarballs is an explicit action via `pnpm import:amis`, `pnpm import:flux`, and `pnpm refresh:libs`.
- `flux-lib/`, `packages/theme-tokens/`, and `packages/tailwind-preset/` remain in-repo source layers for local customization; refreshing their upstream baseline is a separate explicit action via `pnpm sync:flux:src`.
