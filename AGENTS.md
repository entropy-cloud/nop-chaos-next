# AGENTS.md

## Scope

- Apply these rules to the entire repository.
- This repo is a PNPM workspace monorepo.
- Primary host app: `apps/main`.
- Remote demo plugin: `apps/plugin-demo`.
- Shared packages: `packages/shared`, `packages/ui`, `packages/core`, `packages/plugin-bridge`.

## Workspace Layout

- `apps/main`: host React shell, routes, stores, pages, theme, i18n.
- `apps/plugin-demo`: SystemJS-loaded remote plugin example.
- `packages/shared`: shared types and pure utilities.
- `packages/ui`: reusable UI components, styles, and `cn()` helper.
- `packages/core`: shell components, permission helpers, SystemJS utilities.
- `packages/plugin-bridge`: host-to-plugin bridge state and hooks.
- `tests/e2e`: Playwright tests.
- `docs`: project documentation.

## Package Manager

- Use `pnpm` only.
- Root package manager: `pnpm@10.0.0`.
- Workspace file: `pnpm-workspace.yaml`.

## Root Commands

- `pnpm install`
- `pnpm dev`
- `pnpm dev:main`
- `pnpm dev:plugin`
- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm test:e2e:headed`

## Package Commands

- `pnpm --filter @nop-chaos/main dev|build|preview|typecheck|lint|test`
- `pnpm --filter @nop-chaos/plugin-demo dev|build|preview|typecheck|lint|test`
- `pnpm --filter @nop-chaos/core build|typecheck|lint|test`
- `pnpm --filter @nop-chaos/shared build|typecheck|lint|test`
- `pnpm --filter @nop-chaos/ui build|typecheck|lint|test`
- `pnpm --filter @nop-chaos/plugin-bridge build|typecheck|lint|test`
- Building `@nop-chaos/main` triggers a prebuild of `@nop-chaos/plugin-demo`.

## Single-Test Commands

### Vitest: one file
- `pnpm --filter @nop-chaos/main exec vitest run src/pages/ai-workbench/index.test.ts`
- `pnpm --filter @nop-chaos/main exec vitest run src/pages/flow-editor/[id]/index.test.ts`
- `pnpm --filter @nop-chaos/plugin-bridge exec vitest run src/index.test.ts`

### Vitest: one test name
- `pnpm --filter @nop-chaos/main exec vitest run -t "parses unordered lists, ordered lists, and code blocks"`
- `pnpm --filter @nop-chaos/plugin-bridge exec vitest run -t "stores and returns the active bridge"`

### Playwright: one spec
- `pnpm test:e2e -- tests/e2e/login.spec.ts`
- `pnpm test:e2e -- tests/e2e/flow-editor.spec.ts`
- `pnpm test:e2e:headed -- tests/e2e/plugin-demo.spec.ts`

### Playwright: one test name
- `pnpm test:e2e -- --grep "can start from login and enter dashboard"`
- `pnpm test:e2e -- --grep "flow editor supports grouped palette, canvas editing, and minimap"`

## Test Runtime Notes

- Playwright config is in `playwright.config.ts`.
- `testDir` is `tests/e2e`.
- Base URL is `http://127.0.0.1:4175`.
- Playwright starts its own preview server with `pnpm build` plus Vite preview for `@nop-chaos/main`.
- Unit tests are mostly colocated as `*.test.ts`.
- E2E tests use `*.spec.ts`.

## Tooling

- ESLint flat config: `eslint.config.js`.
- TypeScript base config: `tsconfig.base.json`.
- Tailwind base config: `tailwind.config.ts`.
- App scanning config: `apps/main/tailwind.config.ts`.
- There is no repo Prettier config file.
- Do not assume import sorting is enforced automatically.

## Formatting

- Follow the existing handwritten style.
- Use 2-space indentation, single quotes, and no semicolons.
- Keep JSX compact and readable.
- Avoid broad formatting churn.
- Preserve generator-style formatting in `packages/ui` unless the touched code truly needs changes.

## Imports

- Prefer this grouping order: React, third-party, workspace packages, then relative imports.
- Use `import type` for type-only imports.
- Use workspace aliases only for packages declared in `tsconfig.base.json`.
- Use relative imports for app-local files; current app code does not use an `@/` alias.

## TypeScript

- Keep code strongly typed; avoid `any` except at unavoidable dynamic boundaries.
- Prefer `unknown` for caught errors and untrusted external values.
- Narrow values explicitly with guards.
- Keep reusable pure logic in `packages/shared`.
- Keep React-specific reusable logic in `packages/core`, `packages/ui`, or `packages/plugin-bridge`.
- Export package API types from package entry points when they are part of the public surface.
- Use non-null assertions only when the runtime guarantee is obvious.

## Naming

- Components: PascalCase.
- Hooks: `useX`.
- Zustand stores: `useXStore`.
- Utility functions: camelCase.
- Interfaces and types: PascalCase.
- Page entry files usually use `index.tsx`.
- Dynamic route folders use bracket notation such as `[id]`.
- Unit tests use `*.test.ts`.
- E2E tests use `*.spec.ts`.

## React Patterns

- Use function components only.
- Prefer route-level lazy loading for larger pages.
- Use `useMemo` and `useEffect` intentionally, not mechanically.
- Keep app-global state in Zustand stores under `apps/main/src/store`.
- Keep async server-state in React Query for ordinary React pages.
- Prefer narrow hooks over spreading raw store usage everywhere.
- Preserve host/plugin coordination through `packages/plugin-bridge` rather than ad hoc globals.

## Error Handling

- Throw explicit `Error` objects for invalid config and impossible states.
- In `catch` blocks, normalize `unknown` safely.
- Preferred message pattern: `error instanceof Error ? error.message : 'Fallback message'`.
- Surface user-facing failures with toast notifications where the surrounding UI already does so.
- Only swallow errors for intentional best-effort behavior such as storage or optional browser APIs.

## Routing, Permissions, Plugins

- Current menu model supports `pageType: 'builtin' | 'plugin'`.
- Builtin pages resolve through `apps/main/src/router/pageRegistry.tsx`.
- Plugin pages resolve through `PluginSlot` and SystemJS loading.
- Permission checks happen both in menu filtering and route rendering; preserve both layers.
- Avoid bundling duplicate React/runtime dependencies into remote plugins.
- Shared plugin dependencies are registered from the host via SystemJS import maps.

## Styling

- Tailwind is the main styling approach.
- Theme tokens come from CSS custom properties in `apps/main/src/styles/index.css` and Tailwind config.
- Reuse primitives from `@nop-chaos/ui` before adding local one-off components.
- Use `cn()` for class composition.
- Preserve the repo's glass/theme-driven visual language instead of flattening it into generic defaults.

## Testing Expectations

- Add or update colocated Vitest tests for shared logic changes.
- Consider Playwright when changing visible cross-component flows.
- For routing, permissions, theme, plugin loading, or shell changes, run the narrowest meaningful test first.
- If you cannot run verification, state exactly what should be run manually.

## Agent Habits

- Keep changes package-aware and minimal.
- Respect package boundaries.
- Avoid broad refactors unless requested.
- Check whether new logic belongs in `shared`, `core`, `ui`, or an app before adding files.
- When adding runtime capabilities, think about host app, plugin demo, and bridge compatibility together.
