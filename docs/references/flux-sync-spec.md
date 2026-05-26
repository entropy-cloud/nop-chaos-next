# Flux Sync Specification

## Purpose

This document defines the canonical sync contract between:

- upstream: `../nop-chaos-flux`
- downstream consumer: `nop-chaos-next`

It exists to answer three recurring questions:

1. What exactly is synced?
2. What kinds of downstream changes are allowed?
3. How should dependency metadata be handled?

## Scope

Current sync scope includes only these source packages:

- `packages/ui` -> `flux-lib/ui`
- `packages/theme-tokens` -> `packages/theme-tokens`
- `packages/tailwind-preset` -> `packages/tailwind-preset`

This source sync is separate from the Flux runtime bundle flow:

- `apps/main` consumes `@nop-chaos/flux` from the tarball built in `../nop-chaos-flux/dist-packages/`
- `@nop-chaos/ui`, `@nop-chaos/theme-tokens`, and `@nop-chaos/tailwind-preset` are synced from source

## Runtime-Only Sync Rule

`pnpm sync:flux` is a runtime-oriented source sync, not a full upstream mirror.

The downstream sync keeps:

- package runtime source files
- package buildable source files
- package metadata required for downstream install/build

The downstream sync intentionally drops:

- `src/**/*.test.*`
- `src/**/__tests__`
- accidental source artifacts such as `src/**/*.d.ts` and `src/**/*.d.ts.map`

This is intentional and must be treated as part of the sync contract.

Reasoning:

- `nop-chaos-next` is not the canonical authoring repo for these packages
- upstream tests should primarily live and run in `nop-chaos-flux`
- downstream sync is used to consume runtime code inside the host workspace, not to duplicate the entire upstream maintenance surface

Implication:

- downstream copies of these packages are not a complete source-of-truth mirror
- package scripts in downstream may need `--passWithNoTests` because tests are intentionally removed during sync

## Upstream-First Rule

These packages are treated as shared libraries, not business-specific forks.

Default rule:

- if a change is a shared behavior fix, React 19 migration, styling contract improvement, API cleanup, or dependency-surface correction, make it in `nop-chaos-flux` first
- then sync it into `nop-chaos-next`

Downstream-only changes are allowed only when they are clearly integration-layer concerns, such as:

- host bootstrap wiring
- host-owned runtime registration
- host-owned adapters or bridges
- temporary compatibility patches while upstream is pending

If a host-specific need exists repeatedly, upstream should expose an extension mechanism instead of requiring downstream source edits.

Preferred extension forms:

- registries
- adapters
- injection hooks
- config flags
- token namespaces
- explicit slots or render overrides

## React 19 Rule

React 19 best-practice changes should be resolved upstream, not accumulated as downstream drift.

Examples:

- removing legacy patterns that are no longer preferred
- stabilizing shared mutable bridges
- tightening component contracts
- evolving ref handling toward React 19 conventions

Important nuance:

- “component should expose ref” and “component should use `forwardRef`” are not the same decision
- in React 19, `forwardRef` should not be treated as the preferred new pattern
- if a shared component needs ref exposure, upstream should choose the React 19-appropriate contract deliberately

## Dependency Metadata Policy

### General rule

Downstream should not freely rewrite upstream `package.json` dependency semantics.

In particular, avoid long-lived downstream-only drift in:

- `peerDependencies`
- `dependencies`
- `optionalDependencies`
- package exports

If dependency metadata is wrong for real downstream consumption, the preferred fix is:

1. correct it in upstream
2. sync the corrected package

## Why `peerDependencies` should usually stay upstream-owned

For shared UI/config libraries, keeping correct `peerDependencies` is usually better because it:

- preserves the real ownership boundary of runtime singletons
- avoids silently bundling or duplicating host-owned dependencies
- makes version expectations visible to consumers
- reduces the chance of multiple copies of React-adjacent libraries in complex host/plugin setups

This matters especially for packages such as:

- `react`
- `react-dom`
- potentially host-coordinated UI/runtime libraries when singleton behavior matters

## Why downstream may have changed `peerDependencies` historically

Historical downstream edits usually happen for one of these reasons:

1. to make local workspace consumption easier without aligning upstream packaging first
2. to work around missing installs caused by runtime-only sync
3. to avoid peer warnings during local development
4. to paper over uncertainty about whether a dependency should be host-provided or package-owned

These reasons are understandable, but they are still symptoms of packaging policy drift.

They are not a strong reason to keep downstream metadata permanently different from upstream.

## Current repository decision

For this repo, the default policy is:

- keep `peerDependencies` aligned with upstream whenever possible
- do not move dependencies between `peerDependencies` and `dependencies` in downstream unless there is a documented, unavoidable integration reason
- if such a change is truly required, document why upstream ownership is insufficient and whether the change should be upstreamed

Current assessment:

- for `flux-lib/ui`, keeping upstream `peerDependencies` is generally the better direction unless the package has been intentionally redefined to self-own those runtimes
- absent that explicit decision, downstream rewrites of peer/dependency placement should be treated as drift, not policy

## Sync Output Rules

`pnpm sync:flux` currently does all of the following:

1. replace the target package with upstream source
2. remove runtime-excluded files (`src/**/*.test.*`, `src/**/__tests__`, synced source artifacts such as `src/**/*.d.ts` / `src/**/*.d.ts.map`, caches, and `dist`)
3. apply explicit `package.json` policy
4. run `pnpm install`
5. rebuild synced workspace packages
6. record the upstream baseline in `docs/logs/flux-sync/`

That means the downstream tree after sync is:

- based on upstream
- narrowed to runtime-oriented source content
- then adjusted only by explicit script-managed package metadata policy

## package.json Policy

For the synced packages (`flux-lib/ui`, `packages/theme-tokens`, `packages/tailwind-preset`):

- `peerDependencies`, `dependencies`, `optionalDependencies`, and `exports` are upstream-owned and must match upstream after sync
- `devDependencies` are upstream-owned and must match upstream after sync
- `scripts.test` is the only allowed downstream residual, and only because runtime-only sync removes upstream test sources
- the current runtime-only `scripts.test` value is `vitest run --passWithNoTests`

No generic downstream source patch replay is part of the live sync contract anymore.

## Auditing Rules

When reviewing drift between upstream and downstream:

1. ignore `node_modules`, caches, and generated outputs
2. treat removed tests as expected runtime-only sync behavior, not necessarily product drift
3. classify each remaining delta as one of:
   - upstream already fixed, downstream stale
   - should be upstreamed
   - valid integration-layer patch
   - historical drift that should be removed
4. check React 19 alignment explicitly
5. check dependency metadata drift explicitly

## Recommended Workflow

1. Make shared-library changes in `../nop-chaos-flux`
2. Run the relevant upstream verification there
3. Run `pnpm sync:flux` in `nop-chaos-next`
4. Verify downstream integration with `pnpm typecheck`, `pnpm build`, and `pnpm lint`
5. If a downstream residual remains, document why it is downstream-owned and why it does not belong upstream

## Related Documents

- `docs/references/build-guide.md`
- `docs/logs/flux-sync/index.md`
- `docs/analys/2026-05-26-flux-upstream-delta-analysis.md`
