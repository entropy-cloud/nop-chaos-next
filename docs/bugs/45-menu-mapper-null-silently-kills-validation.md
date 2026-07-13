# 45 Menu Mapper Null Silently Kills Validation

## Problem

After login with real backend data (nop/123), the sidebar remained empty. No errors appeared in the browser console. The page showed "Welcome back" content but `.menu-scroll` had 0 children. All 9 SiteMap API calls returned 200 with complete data.

## Diagnostic Method

- **Difficulty**: high. The frontend pipeline (API → `ajaxFetch` → `unwrapApiPayload` → mapper → validator) has many layers. No errors surfaced because React Query catches `queryFn` exceptions internally without re-throwing, and AppShell had no error UI for `isError` state.
- **First hypothesis**: query key mismatch (login page refetch uses different key than AppShell). Ruled out when both keys resolved to the same user/token.
- **Second hypothesis**: `assertOptionalString` timing window or React 18 Strict Mode effects. Ruled out by mock intercept test: same pipeline with synthetic data rendered 226 items.
- **Decisive evidence**: added `console.log` to `AppShell` printing `menuQuery.status`, `menuQuery.data`, and `menuQuery.error`. The error message was: `"Invalid menu config: 'items[0].icon' must be a string"`.
- **Confirmation**: manually traced `toIcon(null)`: `toIcon` returned `null` as-is, `assertOptionalString(null)` threw because `null !== undefined` and `typeof null !== 'string'`.

## Root Cause

The backend returns `null` for optional fields (e.g., `icon: null`, `displayName: null`, `hidden: null`). The mapper (`mapLegacyResource` in `menuMapper.ts`) passes these raw values through to `validateMenuItem`, which uses `assertOptionalString`/`assertOptionalBoolean`. These helpers only accept `undefined` for "absent" — `null` triggers a throw.

The TypeScript type `icon?: string` excludes `null` at compile time, but `JSON.parse` faithfully produces `null` from the backend JSON, bypassing the type guard.

## Fix

Three null-to-undefined coercions in `app/main/src/services/menuMapper.ts`:

- `toIcon(icon?: string | null)`: `return icon ?? undefined`
- `title: resource.displayName ?? undefined`
- `hideInMenu: resource.hidden ?? undefined`

These normalize the backend's `null` to the internal `undefined` convention before validation, matching the existing type expectations.

## Tests

- `apps/main/src/services/menuMapper.test.ts`: 3 new cases — `null icon` → `undefined`, `null displayName` → `undefined title`, `null hidden` → `undefined hideInMenu`.

## Affected Files

- `apps/main/src/services/menuMapper.ts` — `toIcon`, `title`, `hideInMenu` null-coalescing

## Why Console Had No Error

`@tanstack/react-query` v5+ **removed the default `console.error`** for `queryFn` failures (v3/v4 used to log via the `defaultLogger`). Errors are caught internally and stored in `query.state.error` — nothing is written to console. Developers must check `isError` or add explicit `console.error` in `queryFn` to see failures.

## Fix (Secondary)

Added `try/catch` + `console.error` in `fetchMenuConfig` (`apps/main/src/services/menuApi.ts:39-66`), so future menu query errors always generate console output. All other `queryFn` in the codebase should be similarly wrapped if silent errors are unacceptable.

## Notes For Future Refactors

- Any new optional field in `LegacySiteMapResource` that can come from the backend as `null` must be normalized in `mapLegacyResource`.
- The `assertOptional*` validators intentionally reject `null` — if adding new API integrations, normalize at the boundary, not in the validator.
- React Query v5+ does not log `queryFn` errors to console. Wrap query functions with `try/catch` + `console.error` to make failures visible during development, or audit `isError` handling in all consumers.
