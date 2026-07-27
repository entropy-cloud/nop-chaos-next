# 49 Flux Dict Loading via REST RPC Fails with Wrong Selection Syntax

## Problem

Dict comboboxes (userType, gender, status) show empty options. No dict loading requests visible in network tab.

## Diagnostic Method

- Confirmed `loadDict` env function configured in `adapter.ts`.
- Searched network for `/r/DictProvider__getDict` — none found (requests go through `/graphql` initially via `ajaxQuery`).
- Intercepted GraphQL response: `{options: []}`. REST RPC without `@selection` returned full DictBean with `options: [{value:"1", label:"普通用户"}]`.
- Backend log: `unknown-operation-arg: gql:selection` — body parameter rejected.
- Found from `docs-for-ai`: field selection in REST RPC uses `?@selection=` URL query parameter.

## Root Cause

1. `fetchFluxDict` originally used `ajaxQuery` (GraphQL), which worked, but needed to switch to REST RPC (`nopRpcRequest`).
2. First REST attempt passed `gql:selection` in body — rejected because REST handler treats body params as operation args.
3. `nopRpcRequest` regex `^@[a-zA-Z]+:([^/?]+)` only captured the operation name; the selection path (part after `/` in `@query:DictProvider__getDict/options{value,label}`) was silently discarded.
4. When `gql:selection` is missing or incorrect, `@selection` can be used via URL query param: `?@selection=options{value,label}`.
5. Fallback: REST RPC without any selection returns the full DictBean (including options), which works correctly.

## Fix

- Updated `nopRpcRequest` regex from `/^@[a-zA-Z]+:([^/?]+)/` to `/^@[a-zA-Z]+:([^/?]+)(?:\/([^?]+))?/` to capture the selection path after the service name.
- When selection is present, append `?@selection=<encoded_selection>` to the URL.
- `fetchFluxDict` in `providers.ts` uses `nopRpcRequest` with `@query:DictProvider__getDict` (no selection — full DictBean returned).

## Tests

- REST RPC response verified: `options: [{value:"1", label:"普通用户"}, {value:"100", label:"外部用户"}]`

## Affected Files

- `apps/main/src/services/nopRpcResolver.ts` — `resolveNopRpcUrl` extracts operation name + selection from `@query:`/`@mutation:` URL
- `apps/main/src/services/http.ts` — `nopRpcRequest` delegates to `resolveNopRpcUrl` for prefix conversion
- `apps/main/src/flux/providers.ts` — `fetchFluxDict` uses `nopRpcRequest`

## Notes For Future Refactors

- REST RPC handlers treat body keys as operation args; framework-level metadata must go in URL query params.
- `@selection=options{value,label}` works correctly with REST RPC; `?@selection=` is the correct transport.
- DictProvider returns full DictBean without selection; `@selection` is optional optimization.
