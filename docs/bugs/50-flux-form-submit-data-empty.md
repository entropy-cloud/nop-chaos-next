# 50 Flux Form Submit Data Not Passed to API

## Problem

After clicking submit button, dialog does not close. Backend log shows `NopAuthUser__save参数[data]不允许为空` (data parameter is null).

## Diagnostic Method

- Backend log: `field-null-arg: argName=data`.
- Inspected `submitAction` in form schema: `{url:..., data: null}`. 
- `_n.data` from `NormalizeApi` is null because `@mutation:NopAuthUser__save/id` has no explicit data definition.
- Two issues: data was null, and data format was wrong (needs `{data: ...}` wrapper for mutation).

## Root Cause

1. **Data was null**: `page_simple.xpl` passed `data: _n.data` — `_n.data` is null when API has no explicit data.
2. **Missing mutation wrapper**: Data for `@mutation:` operations must be wrapped as `{data: formFields}` — the backend mutation parameter name is `data`.
3. **Template syntax for runtime resolution**: `genScope.formData` has `{userName: '$userName', ...}` — the `$fieldName` values are resolved by flux runtime evaluator against the form's scope.

## Fix

1. **page_simple.xpl**: Changed `data: _n.data` to `data: _n.data || genScope.formData` — falls back to form field templates when no explicit API data.
2. **nopRpcResolver.ts**: `resolveNopRpcUrl` detects `@mutation:` prefix and wraps data as `{data: originalData}` — handles all mutation calls uniformly.
3. **nopRpcRequest** (`http.ts`): Delegates `@query:`/`@mutation:` URL processing to `resolveNopRpcUrl`.

## Tests

- Save API now succeeds (backend log: `errorCode=null`), dialog closes.

## Affected Files

- `apps/main/src/services/nopRpcResolver.ts` — mutation data wrapping
- `apps/main/src/services/http.ts` — delegates to resolver
- `nop-frontend-support/nop-web/.../flux-web/page_simple.xpl` — data fallback

## Notes For Future Refactors

- `_n.data` from `NormalizeApi` is nullable when API has no explicit data — always provide a fallback.
- The `@mutation:` prefix wrapping is centralized in `nopRpcResolver.ts`, not in XPL templates.
- `$fieldName` template syntax is resolved by flux runtime evaluator at dispatch time.
