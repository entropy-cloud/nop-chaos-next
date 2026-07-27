# 48 Flux CRUD LoadAction Cancelled by Signal Abort

## Problem

CRUD table renders 0 rows even though backend `findPage` returns correct data (status=0, items=1). Mock fetcher works, real fetcher does not.

## Diagnostic Method

- First assumed backend issue. Confirmed via curl that backend returns correct data.
- Second looked at fetcher response format. Confirmed `nopRpcRequest` returns correct envelope.
- Breakthrough: `monitor.onActionEnd` showed result had `items=1` but `rows=0`. Mock fetcher (synchronous) worked; `nopRpcRequest` (async via `mainHttpClient`) did not.
- Isolated by testing fetcher with and without `ctx.signal`: with `signal` → crud empty; without `signal` → crud renders rows=1.

## Root Cause

1. Flux crud `useCrudLoadAction` `useEffect` cleanup does NOT abort `ctx.signal` (only sets a `cancelled` flag). However `loadReaction.dispatch` creates a per-fire `AbortController` that aborts old signals on deps change (cancel-previous).
2. `mainHttpClient.createAbortSignal` (client.ts:20-46) responds to parent signal abort by calling `controller.abort(signal.reason)`. When flux dispatches a new action, it aborts the old `AbortController`, causing the in-flight fetch to reject.
3. When parent abort has no `reason` (undefined), client.ts:188-190 misclassifies it as timeout: `error.cause instanceof Error ? error.cause : createTimeoutError(timeoutMs)`. The error reads "Request timed out after 15000ms" even though it is a cancel-previous abort.
4. The rejected fetch causes `nopRpcRequest` to return `{ok: false}`, which triggers `reportError` in `useCrudLoadAction`, putting the crud into error state.

## Fix

- Fetcher in `adapter.ts` no longer passes `ctx.signal` to `nopRpcRequest`. Flux already handles cancel semantics through the `cancelled` flag (useEffect closure at crud-renderer-state.ts:670-672). The `ctx.signal` is redundant for cancel semantics and causes the abort chain issue.
- Added `signal.aborted` guard in `nopRpcRequest` catch to return neutral `{ok: true, data: null}` instead of `{ok: false}` for aborted requests (belt and suspenders).

## Tests

- `tests/auth-user.spec.ts` — 7 flux-mode tests pass with crud rendering

## Affected Files

- `apps/main/src/extensions/flux/adapter.ts` — removed `ctx.signal` from fetcher call
- `packages/core/src/nopRpcRequest.ts` — added `signal.aborted` guard in catch

## Notes For Future Refactors

- Do not pass `ctx.signal` from flux reaction dispatch to async HTTP clients; flux manages cancellation via the `cancelled` closure flag.
- Any new AbortController chains must ensure parent abort reasons are propagated explicitly, not left `undefined`.
- If `mainHttpClient` timeout error logic is refactored, preserve the distinction between real timeout and parent-initiated abort.
