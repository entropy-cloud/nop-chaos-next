# nop-chaos-next Documentation

> Primary docs router. Start here before changing workflow, design, implementation, or documentation.

## Purpose

This `docs/` tree is the durable memory and routing surface for `nop-chaos-next`.

- start here before making workflow, design, implementation, or documentation changes
- prefer the smallest file that answers the current question
- keep durable conclusions in files, not only in chat

## Routing Authority

- `docs/index.md` owns top-level navigation and directory responsibilities
- `AGENTS.md` owns execution workflow and mandatory repository rules
- `docs/source-of-truth-and-precedence.md` defines which artifact answers which question
- `docs/design/` owns the current stable target state and active specs

## Read This First

| If you need to... | Read this first | Then read |
| --- | --- | --- |
| Understand document ownership and precedence | `docs/source-of-truth-and-precedence.md` | the relevant owner doc |
| Understand the current stable project baseline | `docs/design/index.md` | the relevant file in `docs/design/` |
| Analyze dependency or bundle issues | `docs/skills/README.md` | `docs/skills/main-bundle-dependency-governance.md`, then the related scripts |
| Start or review non-trivial execution | `docs/plans/00-plan-authoring-and-execution-guide.md` | the active plan and latest log entry |
| Review recent implementation history | `docs/logs/index.md` | the latest dated log file |
| Look up a past subtle regression | `docs/bugs/00-bug-fix-note-writing-guide.md` | the relevant file in `docs/bugs/` |
| Check build and setup workflow | `docs/references/build-guide.md` | the relevant design/spec file |
| Record or review testing notes | `docs/testing/index.md` | the relevant dated testing note |

## Directory Roles

- `docs/design/` - current stable target state, active specs, and chosen technical directions
- `docs/skills/` - reusable methods, prompts, and how to use existing tools
- `docs/references/` - stable lookup material and operator guides
- `docs/plans/` - execution plans with closure criteria
- `docs/logs/` - dated implementation memory
- `docs/bugs/` - non-obvious regression and root-cause history
- `docs/testing/` - manual/exploratory testing notes and guides
- `docs/examples/` - how-to and example docs
- `docs/input/` - raw external input material

## Design (`design/`)

Feature and page design documents. See [`design/index.md`](./design/index.md) for directory purpose and authoring rules.

| Document                                                                    | Description                  |
| --------------------------------------------------------------------------- | ---------------------------- |
| [dashboard.md](./design/dashboard.md)                                       | Dashboard page design        |
| [ai-workbench.md](./design/ai-workbench.md)                                 | AI workbench design          |
| [flow-editor.md](./design/flow-editor.md)                                   | Flow editor design           |
| [master-detail.md](./design/master-detail.md)                               | Master-detail CRUD design    |
| [plugin-system.md](./design/plugin-system.md)                               | Plugin management page       |
| [layout-settings.md](./design/layout-settings.md)                           | Layout settings design       |
| [extension-system.md](./design/extension-system.md)                         | Extension system             |
| [backend-integration.md](./design/backend-integration.md)                   | Backend integration guide    |
| [amis-theme-bridge.md](./design/amis-theme-bridge.md)                       | AMIS theme bridge            |
| [amis-flux-rendering-engine-integration.md](./design/amis-flux-rendering-engine-integration.md) | AMIS/Flux rendering engine integration |
| [icon-system.md](./design/icon-system.md)                                   | Icon system design           |
| [submit-concurrency-guard.md](./design/submit-concurrency-guard.md)         | Submit concurrency guard spec |
| [index.md](./design/index.md)                                                       | Design docs purpose and rules |
| [main-bundle-dependency-spec.md](./design/main-bundle-dependency-spec.md)         | Main app dependency spec |
| [package-exports-spec.md](./design/package-exports-spec.md)                       | Package exports spec |
| [styling-system-specification.md](./design/styling-system-specification.md) | Styling system specification |

## References (`references/`)

Reference manuals, glossaries, and lookup material.

| Document                                                                            | Description                    |
| ----------------------------------------------------------------------------------- | ------------------------------ |
| [build-guide.md](./references/build-guide.md)                                       | Full build and setup guide     |
| [flux-sync-spec.md](./references/flux-sync-spec.md)                                 | Flux sync contract and policy  |
| [mock-data.md](./references/mock-data.md)                                           | Mock data description          |
| [style-interaction-guidelines.md](./references/style-interaction-guidelines.md)     | Style and interaction rules    |
| [icon-naming-and-rendering.md](./references/icon-naming-and-rendering.md)           | Icon system                    |
| [extension-ui-patterns.md](./references/extension-ui-patterns.md)                   | Extension UI patterns          |

## Skills (`skills/`)

Reusable analysis and execution methods.

| Document                                                                                  | Description                         |
| ----------------------------------------------------------------------------------------- | ----------------------------------- |
| [README.md](./skills/README.md)                                                           | Skills purpose and index            |
| [index-routing-audit-prompt.md](./skills/index-routing-audit-prompt.md)                  | Docs routing audit prompt           |
| [main-bundle-dependency-governance.md](./skills/main-bundle-dependency-governance.md)    | Generic bundle dependency analysis  |

## Examples (`examples/`)

Usage examples and how-to guides.

| Document                                                    | Description              |
| ----------------------------------------------------------- | ------------------------ |
| [plugin-dev-guide.md](./examples/plugin-dev-guide.md)       | Plugin development guide |
| [extension-generator.md](./examples/extension-generator.md) | Extension generator      |

## Bugs (`bugs/`)

Bug fix records for non-trivial issues.

| Document                                                                    | Description                |
| --------------------------------------------------------------------------- | -------------------------- |
| [00-bug-fix-note-writing-guide.md](./bugs/00-bug-fix-note-writing-guide.md) | Bug fix note writing guide |
| [12-amis-helper-css-conflict.md](./bugs/12-amis-helper-css-conflict.md)     | AMIS CSS conflict handling |
| [23-doc-code-consistency-audit.md](./bugs/23-doc-code-consistency-audit.md) | Doc-code consistency audit |
| [24-main-bundle-chunk-boundary-regression.md](./bugs/24-main-bundle-chunk-boundary-regression.md) | Main bundle chunk boundary regression |
| [25-amis-file-dependency-runtime-split.md](./bugs/25-amis-file-dependency-runtime-split.md) | AMIS file dependency runtime split |
| [26-flux-tarball-runtime-require-mismatch.md](./bugs/26-flux-tarball-runtime-require-mismatch.md) | Flux tarball runtime require mismatch |
| [27-main-i18n-initialization-menu-title-fallback.md](./bugs/27-main-i18n-initialization-menu-title-fallback.md) | Main i18n initialization menu title fallback |
| [28-core-i18next-singleton-split.md](./bugs/28-core-i18next-singleton-split.md) | Core i18next singleton split |
| [29-flux-react-i18next-default-instance-pollution.md](./bugs/29-flux-react-i18next-default-instance-pollution.md) | Flux react-i18next default instance pollution |
| [30-amis-global-css-baseline-drift.md](./bugs/30-amis-global-css-baseline-drift.md) | AMIS global CSS baseline drift |
| [31-e2e-mock-menu-config-missing-dynamic-route.md](./bugs/31-e2e-mock-menu-config-missing-dynamic-route.md) | E2E mock menu config missing dynamic route |
| [32-plugin-bridge-unstable-snapshot-loop.md](./bugs/32-plugin-bridge-unstable-snapshot-loop.md) | Plugin bridge unstable snapshot render loop |
| [33-dialog-padding-and-drawer-select-broken.md](./bugs/33-dialog-padding-and-drawer-select-broken.md) | Dialog padding and drawer select broken |
| [34-master-detail-query-sync-effect-loop.md](./bugs/34-master-detail-query-sync-effect-loop.md) | Master detail query sync effect loop |
| [35-auth-managed-token-sync-and-shared-refresh-lock.md](./bugs/35-auth-managed-token-sync-and-shared-refresh-lock.md) | Auth managed token sync and shared refresh lock |
| [36-extension-contract-half-connection-closure.md](./bugs/36-extension-contract-half-connection-closure.md) | Extension contract half-connection closure |
| [37-runtime-state-canonicalization-fixes.md](./bugs/37-runtime-state-canonicalization-fixes.md) | Runtime state canonicalization fixes |
| [38-ai-workbench-lifecycle-cancellation.md](./bugs/38-ai-workbench-lifecycle-cancellation.md) | AI Workbench lifecycle cancellation |
| [39-master-detail-detail-form-button-submit-loop.md](./bugs/39-master-detail-detail-form-button-submit-loop.md) | Master detail detail confirm loop and empty dialog |
| [40-main-tailwind-ui-content-scan-drift.md](./bugs/40-main-tailwind-ui-content-scan-drift.md) | Main Tailwind UI content scan drift |

## Testing (`testing/`)

Manual diagnosis and manual test issue records.

| Document                                                                          | Description                  |
| --------------------------------------------------------------------------------- | ---------------------------- |
| [index.md](./testing/index.md)                                                    | Manual test issue index      |
| [00-testing-issue-writing-guide.md](./testing/00-testing-issue-writing-guide.md) | Manual test issue guide      |

## Logs (`logs/`)

Development log entries organized by date.

| Document                                      | Description                           |
| --------------------------------------------- | ------------------------------------- |
| [index.md](./logs/index.md)                   | Daily log writing guide and index     |
| [flux-sync/index.md](./logs/flux-sync/index.md) | Flux source sync history and baselines |

## Plans (`plans/`)

Execution plans with status tracking.

| Document                                                                                     | Description        |
| -------------------------------------------------------------------------------------------- | ------------------ |
| [00-plan-authoring-and-execution-guide.md](./plans/00-plan-authoring-and-execution-guide.md) | Plan writing guide |

## Input (`input/`)

External reference material and design inputs.

## Reading Guide

- **Pages and features**: Start with `design/` documents (01-06 range)
- **Docs ownership and precedence**: `source-of-truth-and-precedence.md`
- **Setup and build**: `references/build-guide.md` for full build instructions
- **Flux sync policy**: `references/flux-sync-spec.md`
- **Plugin development**: `examples/plugin-dev-guide.md` with `design/plugin-system.md` as reference
- **Rendering engines**: `design/amis-flux-rendering-engine-integration.md`, `design/amis-theme-bridge.md`
- **Bundle dependency optimization**: `skills/README.md`, `skills/main-bundle-dependency-governance.md`, `design/main-bundle-dependency-spec.md`
- **Backend integration**: `design/backend-integration.md`
- **Extension system**: `design/extension-system.md`, `examples/extension-generator.md`
- **Styling**: `references/style-interaction-guidelines.md`, `design/styling-system-specification.md`
- **Manual diagnosis and test issues**: `testing/index.md`
