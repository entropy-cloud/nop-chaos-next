# @nop-chaos/extension-dev

Official dev tooling for building nop-chaos extensions **without host source**.
All commands run in plain Node (no build step, no TS runtime needed).

The built host (the SPA shipped to `nop-web-site`) already supports loading
extensions from runtime-injected sources (`window.__NOP_EXTENSIONS__`, checked
before host bootstrap, see `apps/main/src/extensions/config.ts`). This package
turns that mechanism into a convenient development workflow.

## Commands

```
nop-extension-dev dev-in-host --backend <origin> --extension <id>=<url> [--extension ...] [--port 5174]
nop-extension-dev build --id <id> --name <name> [--version v] [--entry src/index.ts] [--out dist]
nop-extension-dev serve --dir <extension-dist> [--port 4180]
nop-extension-dev inject --html <file> --extension <id>=<url>
```

### `build` — produce the deployable ESM bundle

```bash
nop-extension-dev build --id my-ext --name "My Ext" --version 0.1.0 --out dist
```

- Output: `dist/assets/index.js` (plain ESM) + `dist/extension.json`
  + `dist/assets/*` (per-extension assets, original name + hashed name) +
  `public/**` copied verbatim.
- Every `SHARED_MODULE_NAMES` entry stays external (bare imports preserved).
  The host injects a native import map (`scripts/build-nop-shared.mjs`
  generates `nop-shared/<name>.mjs` facades over its `__NOP_SHARED__`
  instances), so the browser resolves `import 'react'` etc. to the host's
  single React/UI instances — plain ESM, one instance, no duplicate React.
- Handles `new URL('./x', import.meta.url)` literals, static `import './x.css'`,
  static `import url from './x.svg'` and `public/` (e.g. `locales/`).

### `dev-in-host` — debug against the real host

Reverse-proxy the deployed host and inject your extension source(s) into every
HTML response, right after `<head>` (before the host's deferred module script
executes). Browse the proxy URL and your extension runs inside the real host.

```bash
# host runs at 127.0.0.1:8080 (nop-entropy); extension dev server at 4180
nop-extension-dev dev-in-host \
  --backend http://127.0.0.1:8080 \
  --extension my-ext=http://127.0.0.1:4180/src/index.ts \
  --port 5174
# open http://127.0.0.1:5174
```

Notes:

- `url` must be an absolute http(s) URL served with CORS — Vite dev serves it
  by default; `nop-extension-dev serve` sets CORS too.
- The host exposes `window.__NOP_HOST_API_VERSION__`; the proxy prints the
  expected API version at startup (see `HOST_API_VERSION`).
- HTML responses are decompressed (gzip/br/deflate), injected, and re-sent;
  all other traffic streams through unchanged.

### `serve` — static extension assets with CORS

Serve a built extension `dist/` (hash-stable `assets/`, `locales/`, etc.) so
cross-origin `import()` from the host page succeeds.

```bash
nop-extension-dev serve --dir dist --port 4180
```

### `inject` — manual HTML injection (DevTools/override flows)

```bash
nop-extension-dev inject --html index.html --extension my-ext=http://127.0.0.1:4180/src/index.ts
# or: printf '<html>...</html>' | nop-extension-dev inject --extension my-ext=...
```

## Browser extension alternative

`templates/inject-extensions.user.js` is a Tampermonkey/Violentmonkey userscript
with the same effect, useful when you prefer no proxy process.

## Vite manifest plugin

`extensionManifestPlugin` (`@nop-chaos/extension-dev/manifest-plugin`) emits the
`extension.json` deploy manifest for library-style extension builds (entry,
styleAssets, per-extension assets referenced via `new URL(..., import.meta.url)`).
It is the same plugin used by `examples/extension-demo`.

```ts
import { extensionManifestPlugin } from '@nop-chaos/extension-dev/manifest-plugin';

export default defineConfig({
  plugins: [react(), extensionManifestPlugin({ id: 'my-ext', name: 'My Ext', version: '0.0.1' })],
  build: { /* library-style build: input src/index.ts, format es */ },
});
```

## Contract mirrors

`HOST_API_VERSION` / `SHARED_MODULE_NAMES` mirrors live in `src/contract.mjs`.
They must match `packages/shared` (the authority); parity is enforced by
`src/contract.test.mjs`. When bumping the contract, update both sides.

## Design doc

See `docs/design/extension-development-guide.md` in the repository for the full
development / debugging / packaging workflow.