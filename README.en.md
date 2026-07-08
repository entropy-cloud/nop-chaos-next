# NOP Chaos Next

[中文](README.md)

<div align="center">

**A frontend application framework built on AMIS, with extension and plugin capabilities.**

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8.svg)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-10-f69220.svg)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## What This Repo Is

NOP Chaos Next is a frontend application framework built on AMIS, providing a complete extension system and plugin architecture. It serves as a business application scaffold that allows teams to rapidly build complex enterprise applications through declarative configuration and plugin mechanisms.

Target audience:

- Business teams needing to quickly build enterprise dashboards and workbenches
- Platform teams needing an extensible application framework with multi-tenant, multi-theme, and multi-language support
- Plugin developers needing standardized plugin development and distribution

## Relationship with NOP Chaos Flux

| Dimension     | NOP Chaos Flux                      | NOP Chaos Next               |
| ------------- | ----------------------------------- | ---------------------------- |
| **Purpose**   | Low-code runtime and rendering framework | Frontend application framework and scaffold |
| **Core**      | Runtime built on seven primitives   | Extension system + Plugin system |
| **Rendering** | Custom renderer architecture        | Based on AMIS (React 19 migration) |
| **Use case**  | Platform teams building low-code infrastructure | Business teams building enterprise apps |

- **Flux** = "How to generate UI from JSON" (low-level runtime)
- **Next** = "How to build extensible business applications" (application framework)

Next currently syncs three packages (`ui`, `theme-tokens`, `tailwind-preset`) from Flux, and will integrate the Flux rendering engine as an optional page renderer in the future.

## At a Glance

- Declarative UI powered by AMIS, migrated to React 19; Flux as an optional renderer being phased in
- Extension system: unified configuration for branding, themes, menus, languages, and built-in pages
- Plugin system: SystemJS-based remote plugin loading and isolation
- Complete business page templates: Dashboard, AI Workbench, Flow Editor, Master-Detail CRUD
- Multi-tenant and multi-theme support with runtime switching
- Full internationalization (i18n) support
- Mock data and developer tooling
- Bundle optimization: AMIS/Flux loaded on demand based on menu configuration

## Project Structure

```
nop-chaos-next/
├── apps/main/              # Main application (host)
├── packages/
│   ├── core/               # Core utilities and types
│   ├── shared/             # Shared type definitions
│   ├── amis-core/          # AMIS host bridge layer
│   ├── amis-react/         # AMIS React integration
│   ├── plugin-bridge/      # Plugin communication bridge
│   ├── theme-tokens/       # Theme tokens (synced from nop-chaos-flux)
│   ├── tailwind-preset/    # Tailwind preset (synced from nop-chaos-flux)
│   └── ui/                 # Shared UI components (synced from nop-chaos-flux)
├── flux-lib/
│   └── ui/                 # @nop-chaos/ui workspace package (synced from nop-chaos-flux)
├── examples/
│   ├── plugin-demo/        # Plugin example
│   └── extension-demo/     # Extension example
├── tests/e2e/              # E2E tests
├── scripts/                # Build, analysis, and sync scripts
└── docs/                   # Documentation
```

## Core Features

### 1. Extension System

Extensions are the host application's configuration mechanism, injecting:

- Branding (name, logo, title, etc.)
- Theme and style resources
- Language and i18n resources
- Menu extensions
- Built-in page registration
- Plugin manifest declarations
- Authentication configuration

Extensions are loaded once at startup for configuration and resource injection.

**Learn more**: [Extension System](docs/15-extension-system.md)

### 2. Plugin System

Plugins are page-level extensions loaded remotely via SystemJS:

- Independent page rendering logic
- Independent build and deployment
- Runtime loading and unloading
- Isolated communication with the host

Plugins are suited for business pages, workbenches, and admin interfaces that require independent development and deployment.

**Learn more**: [Plugin Dev Guide](docs/08-plugin-dev-guide.md)

### 3. Built-in Page Templates

The project provides complete business page templates:

| Page             | Description            | Docs                                          |
| ---------------- | ---------------------- | --------------------------------------------- |
| Dashboard        | Data overview and stat cards | [Dashboard](docs/01-dashboard.md)             |
| AI Workbench     | AI-assisted workbench  | [AI Workbench](docs/02-ai-workbench.md)       |
| Flow Editor      | Flow editor            | [Flow Editor](docs/03-flow-editor.md)         |
| Master-Detail    | Master-detail CRUD     | [Master-Detail](docs/04-master-detail.md)     |
| Plugin Management | Plugin management page | [Plugin System](docs/05-plugin-system.md)     |
| Layout Settings  | Layout settings        | [Layout Settings](docs/06-layout-settings.md) |

## Quick Start

### Prerequisites

| Tool    | Version |
| ------- | ------- |
| Node.js | 20+     |
| pnpm    | 10.0.0  |
| Git     | any     |

### 1. Install and run

```bash
pnpm install
pnpm dev
```

`libs/*.tgz` is committed repository state, so `pnpm install` works without sibling repos present.

Local playground: `http://localhost:5173`

### 2. Common commands

```bash
pnpm install          # install dependencies
pnpm dev              # start dev server
pnpm build            # build all packages
pnpm typecheck        # type check
pnpm lint             # lint
pnpm test             # unit tests
pnpm test:e2e         # E2E tests
pnpm site             # build and sync to the nop-web-site deploy directory
```

### 3. Refresh upstream baselines (optional)

Sibling repos are not needed for daily development. Only when you need to repack and refresh `libs/*.tgz` from upstream, clone `amis-react19` / `nop-chaos-flux` under the same parent:

```bash
cd /path/to/parent
git clone https://gitee.com/canonical-entropy/amis-react19.git
git clone https://gitee.com/canonical-entropy/nop-chaos-flux.git
git clone <this-repo-url>
```

| Scenario | Command |
| -------- | -------- |
| Update Flux (most common) | `pnpm rebuild:flux:build` |
| Update AMIS + Flux together | `pnpm rebuild:amis-flux:build` |

`pnpm rebuild:flux:build` does it all in one shot: pack upstream → copy `tgz` to `libs/` → sync `ui/theme-tokens/tailwind-preset` source baseline → refresh `file` dependency cache → full `build`.

For atomic commands (`import:amis`, `import:flux`, `refresh:libs`, `sync:flux:src`, etc.), AMIS development workflow, CI pipeline, and troubleshooting, see the [Build Guide](docs/references/build-guide.md).

## Extension Development

Create a new extension:

```bash
pnpm generate:extension
```

See [Extension Generator](docs/22-extension-generator.md) for details.

### Local debugging

Two approaches:

1. **Remote ESM mode**: Point to the ESM URL exposed by the business repo's dev server
2. **Local alias mode**: Point to external source via environment variable

```env
# apps/main/.env.local
VITE_ENABLE_MOCK=true
VITE_DEMO_EXTENSION_ALIAS_PATH=../external-extension/src/index.ts
```

See [Extension System - Debug & Deploy](docs/15-extension-system.md#73-调试与部署) for details.

## Plugin Development

See the complete [Plugin Dev Guide](docs/08-plugin-dev-guide.md).

### Plugin example

The project includes a complete plugin example:

```bash
pnpm dev:extensions
```

Example location: `examples/plugin-demo/`

## Documentation Index

- [Docs Index](docs/00-index.md)
- [Build Guide](docs/references/build-guide.md)
- [Mock Data](docs/07-mock-data.md)
- [Style & Interaction Guidelines](docs/09-style-interaction-guidelines.md)
- [Backend Integration](docs/16-backend-integration.md)
- [AMIS Theme Bridge](docs/18-amis-theme-bridge.md)

## Tech Stack

- **Framework**: React 19
- **Build**: Vite 8, TypeScript 6
- **UI**: AMIS (React 19 migration), TailwindCSS 4
- **State**: Zustand, React Query
- **Routing**: React Router 7
- **i18n**: i18next
- **Charts**: Recharts
- **Testing**: Vitest, Playwright
- **Plugins**: SystemJS

## Project Status

- Suited for: enterprise application development, plugin architecture, multi-tenant systems
- Current status: active development, includes complete business page templates
- Main entry: `apps/main`

## Contributing

- Use `pnpm` scripts for cross-workspace operations
- Keep `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm lint` passing for relevant packages
- Follow the [Style & Interaction Guidelines](docs/09-style-interaction-guidelines.md)

## License

MIT — see [LICENSE](LICENSE).

Built on [Baidu AMIS](https://github.com/baidu/amis), migrated to React 19.
