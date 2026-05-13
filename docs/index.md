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
- **Plugin development**: `examples/plugin-dev-guide.md` with `design/plugin-system.md` as reference
- **Rendering engines**: `design/amis-flux-rendering-engine-integration.md`, `design/amis-theme-bridge.md`
- **Backend integration**: `design/backend-integration.md`
- **Extension system**: `design/extension-system.md`, `examples/extension-generator.md`
- **Styling**: `references/style-interaction-guidelines.md`, `design/styling-system-specification.md`
