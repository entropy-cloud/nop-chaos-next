# Package Exports Strategy

> Last updated: 2026-05-16

## Overview

The monorepo uses two distinct `exports` map strategies depending on whether a package requires a build step. Both strategies are intentional; this document explains the rationale and lists which packages use which approach.

## Strategy A: src-style exports (no build step)

Packages that are **pure TypeScript** and can be consumed directly by downstream packages (via TypeScript project references or Vite/TS path resolution) use `exports` entries that point to source files:

```jsonc
{
  "exports": {
    ".": "./src/index.ts"
  }
}
```

These packages use `"build": "tsc -p tsconfig.json --noEmit"` (type-check only, no emit) because the source is consumed directly.

**Packages using src-style exports:**

| Package              | Rationale                                          |
| -------------------- | -------------------------------------------------- |
| `@nop-chaos/shared`  | Pure types and utilities; leaf dependency          |
| `@nop-chaos/core`    | Shell components and helpers; consumed by apps     |
| `@nop-chaos/plugin-bridge` | Bridge hooks; consumed by host app and plugins |
| `@nop-chaos/amis-core`  | AMIS adapter types and helpers                 |
| `@nop-chaos/amis-react`  | AMIS React wrapper components                 |
| `@nop-chaos/extension-host` | Extension loading and runtime config       |

## Strategy B: dist-style exports (build step required)

Packages that produce **non-TypeScript artifacts** (CSS, bundled JS, etc.) and need a real build step use `exports` entries with conditional sub-paths:

```jsonc
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./styles.css": "./dist/styles.css"
  }
}
```

These packages use a build script that compiles TypeScript to JS and copies/assets CSS files.

**Packages using dist-style exports:**

| Package                   | Build artifact                | Rationale                                       |
| ------------------------- | ----------------------------- | ----------------------------------------------- |
| `@nop-chaos/ui`           | Component JS bundle + CSS     | Requires tree-shakeable dist for app bundling   |
| `@nop-chaos/theme-tokens` | Token name constants JS + CSS | CSS file is the primary artifact                |
| `@nop-chaos/tailwind-preset` | Tailwind config JS         | Consumed by Tailwind runtime, not TS references |

## peerDependency Strategy

React and React-related packages (`react`, `react-dom`, `lucide-react`) are declared as **peerDependencies** in library packages to avoid duplicate React instances at runtime:

- `react` and `react-dom` are peerDeps in all `@nop-chaos/*` packages that use React.
- `lucide-react` is a peerDep in `@nop-chaos/core` and `@nop-chaos/amis-react` (it is re-exported via `@nop-chaos/ui` components).
- The host app (`apps/main`) declares these as regular `dependencies` since it is the runtime provider.

## Adding a new package

1. If the package is pure TS with no build artifacts → use **src-style exports**.
2. If the package produces CSS, bundled JS, or other build artifacts → use **dist-style exports**.
3. React and related libraries should be `peerDependencies`, not `dependencies`.
