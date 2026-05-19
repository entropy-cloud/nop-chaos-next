# nop-chaos-next Documentation

> Primary source of project knowledge. Start here.

## Design (`design/`)

Feature and page design documents.

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
| [main-bundle-dependency-strategy.md](./design/main-bundle-dependency-strategy.md) | Main bundle dependency strategy |
| [styling-system-specification.md](./design/styling-system-specification.md) | Styling system specification |

## References (`references/`)

Reference manuals, glossaries, and lookup material.

| Document                                                                            | Description                    |
| ----------------------------------------------------------------------------------- | ------------------------------ |
| [build-guide.md](./references/build-guide.md)                                       | Full build and setup guide     |
| [mock-data.md](./references/mock-data.md)                                           | Mock data description          |
| [style-interaction-guidelines.md](./references/style-interaction-guidelines.md)     | Style and interaction rules    |
| [icon-naming-and-rendering.md](./references/icon-naming-and-rendering.md)           | Icon system                    |
| [extension-ui-patterns.md](./references/extension-ui-patterns.md)                   | Extension UI patterns          |
| [bundle-measurement-methodology.md](./references/bundle-measurement-methodology.md) | Bundle measurement methodology |

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
| [32-plugin-bridge-unstable-snapshot-loop.md](./bugs/32-plugin-bridge-unstable-snapshot-loop.md) | Plugin bridge unstable snapshot render loop |
| [33-dialog-padding-and-drawer-select-broken.md](./bugs/33-dialog-padding-and-drawer-select-broken.md) | Dialog padding and drawer select broken |
| [34-master-detail-query-sync-effect-loop.md](./bugs/34-master-detail-query-sync-effect-loop.md) | Master detail query sync effect loop |
| [36-extension-contract-half-connection-closure.md](./bugs/36-extension-contract-half-connection-closure.md) | Extension contract half-connection closure |
| [37-runtime-state-canonicalization-fixes.md](./bugs/37-runtime-state-canonicalization-fixes.md) | Runtime state canonicalization fixes |
| [38-ai-workbench-lifecycle-cancellation.md](./bugs/38-ai-workbench-lifecycle-cancellation.md) | AI Workbench lifecycle cancellation |
| [39-master-detail-detail-form-button-submit-loop.md](./bugs/39-master-detail-detail-form-button-submit-loop.md) | Master detail detail confirm loop and empty dialog |
| [40-main-tailwind-ui-content-scan-drift.md](./bugs/40-main-tailwind-ui-content-scan-drift.md) | Main Tailwind UI content scan drift |
| [39-master-detail-detail-form-button-submit-loop.md](./bugs/39-master-detail-detail-form-button-submit-loop.md) | Master detail detail form button submit loop |
| [40-main-tailwind-ui-content-scan-drift.md](./bugs/40-main-tailwind-ui-content-scan-drift.md) | Main Tailwind UI content scan drift |

## Testing (`testing/`)

Manual diagnosis and manual test issue records.

| Document                                                                          | Description                  |
| --------------------------------------------------------------------------------- | ---------------------------- |
| [index.md](./testing/index.md)                                                    | Manual test issue index      |
| [00-testing-issue-writing-guide.md](./testing/00-testing-issue-writing-guide.md) | Manual test issue guide      |

## Logs (`logs/`)

Development log entries organized by date.

| Document                    | Description                 |
| --------------------------- | --------------------------- |
| [index.md](./logs/index.md) | Log writing guide and index |

## Plans (`plans/`)

Execution plans with status tracking.

| Document                                                                                     | Description        |
| -------------------------------------------------------------------------------------------- | ------------------ |
| [00-plan-authoring-and-execution-guide.md](./plans/00-plan-authoring-and-execution-guide.md) | Plan writing guide |

## Input (`input/`)

External reference material and design inputs.

## Reading Guide

- **Pages and features**: Start with `design/` documents (01-06 range)
- **Setup and build**: `references/build-guide.md` for full build instructions
- **Plugin development**: `examples/plugin-dev-guide.md` with `design/plugin-system.md` as reference
- **Rendering engines**: `design/amis-flux-rendering-engine-integration.md`, `design/amis-theme-bridge.md`
- **Backend integration**: `design/backend-integration.md`
- **Extension system**: `design/extension-system.md`, `examples/extension-generator.md`
- **Styling**: `references/style-interaction-guidelines.md`, `design/styling-system-specification.md`
- **Manual diagnosis and test issues**: `testing/index.md`
