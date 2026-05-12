# AGENTS.md

## Scope

- Apply these rules to the entire repository.
- This repo is a PNPM workspace monorepo.
- Primary host app: `apps/main`.
- Remote demo plugin: `examples/plugin-demo`.
- Shared packages: `packages/shared`, `packages/ui`, `packages/core`, `packages/plugin-bridge`.

## Workspace Layout

- `apps/main`: host React shell, routes, stores, pages, theme, i18n.
- `examples/plugin-demo`: remote plugin example for SystemJS and ESM loading.
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

- Turborepo: `turbo.json`（构建缓存与依赖拓扑编排）。
- ESLint flat config: `eslint.config.js`。
- Prettier config: `.prettierrc`。
- EditorConfig: `.editorconfig`。
- TypeScript base config: `tsconfig.base.json`。
- Tailwind base config: `tailwind.config.ts`。
- App scanning config: `apps/main/tailwind.config.ts`。
- Dead code detection: `knip.json`。
- Duplicate code detection: `.jscpd.json`。
- Vitest workspace: `vitest.workspace.ts` + `vitest.shared.ts`。

## Commands

```bash
pnpm install                # install deps
pnpm dev                    # starts dev server (turbo)
pnpm dev:main               # starts main app only
pnpm dev:plugin             # starts plugin demo only
pnpm build                  # turbo run build (all packages)
pnpm typecheck              # turbo run typecheck (all packages)
pnpm test                   # turbo run test (all packages)
pnpm lint                   # turbo run lint + src-artifacts check
pnpm format                 # prettier --write .
pnpm format:check           # prettier --check .
pnpm audit:knip             # dead code analysis
pnpm check:duplicates       # duplicate code analysis
pnpm test:e2e               # playwright test
pnpm test:e2e:headed        # playwright test --headed
```

Always run `typecheck`, `build`, and `lint` after making **CODE** changes. Run tests when relevant.

## Formatting

- Prettier handles formatting automatically via `.prettierrc` and pre-commit hook.
- Config: 2-space indentation, single quotes, trailing commas, print width 100, semicolons, LF line endings.
- Keep JSX compact and readable.
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
- Builtin pages resolve through `apps/main/src/router/page-registry.tsx`.
- Plugin pages resolve through `PluginSlot` and runtime remote loading.
- Permission checks happen both in menu filtering and route rendering; preserve both layers.
- Avoid bundling duplicate React/runtime dependencies into remote plugins.
- Shared plugin dependencies are registered from the host via SystemJS import maps.

## Styling

- Tailwind is the main styling approach.
- Theme tokens come from CSS custom properties in `apps/main/src/styles/index.css` and Tailwind config.
- Reuse primitives from `@nop-chaos/ui` before adding local one-off components.
- Use `cn()` for class composition.
- Preserve the repo's glass/theme-driven visual language instead of flattening it into generic defaults.

## Docs Maintenance

**Docs live in `docs/`** and are the primary source of project knowledge. Always consult `docs/index.md` first for navigation. See `docs/logs/index.md` for log writing conventions and `docs/index.md` for directory roles.

### Mandatory Updates

After completing any significant **CODE CHANGE**, you MUST:

1. **Update the daily dev log** at `docs/logs/{year}/{month}-{day}.md` (reverse chronological, see `docs/logs/index.md` for format).
2. **Update relevant design docs** when changing:
   - Package boundaries or ownership → `docs/design/`
   - Plugin system or bridge logic → `docs/design/plugin-system.md`
   - Routing, permissions, or shell behavior → relevant doc under `docs/design/`

### Plan Authoring And Execution

When creating, revising, executing, or auditing a file under `docs/plans/`, you MUST read `docs/plans/00-plan-authoring-and-execution-guide.md` first. Plans are execution docs with explicit status, scope, exit criteria, and validation checklists. Re-audit the live repo before claiming completion.

---

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

## Verification Checklist

Before finishing any task:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes (if applicable)
- [ ] `pnpm test` passes (if applicable)
- [ ] Formatting handled by Husky pre-commit hook (no manual `format:check` needed)
- [ ] `docs/logs/` updated (for significant changes)
- [ ] Relevant architecture docs updated (if design changed)

## Bug Fix Test Coverage Rule

After fixing any non-trivial bug, you MUST:

1. **Evaluate whether regression tests are needed.** If the bug had a non-obvious root cause, could be reintroduced by refactoring, or crossed package boundaries, add a test.
2. **Add tests that verify the correct result**, not just the absence of an error.
3. **Prefer adding new regression tests instead of rewriting or weakening existing ones.** Preserve prior coverage whenever possible.
4. **Record complex bugs** in `docs/bugs/` following `docs/bugs/00-bug-fix-note-writing-guide.md`.
5. **Re-run the full test suite** after adding new tests to confirm nothing is broken.
