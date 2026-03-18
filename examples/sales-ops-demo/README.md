# Sales Ops Demo

This contribution package is generated from the workspace contribution scaffold.

## Commands

### Standalone development

```bash
pnpm --filter @nop-chaos/example-sales-ops-demo dev
```

### Host-mode development

```bash
pnpm --filter @nop-chaos/example-sales-ops-demo dev:host
```

### Build

```bash
pnpm --filter @nop-chaos/example-sales-ops-demo build
```

Output file:

```text
dist/sales-ops-demo.host.js
```

## Host integration

- Start this package with `dev:host`
- Point the main app contribution entry to `http://127.0.0.1:4180/src/index.ts`
- Point the contribution asset origin to `http://127.0.0.1:4180`

Then customize:

- contribution metadata in `src/index.ts`
- builtin pages in `src/pages/*`
- standalone preview in `src/standalone/main.tsx`
- styles in `src/theme.css`, `src/shell.css`, and `src/component-page.css`
