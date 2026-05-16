# 34 Master Detail Query Sync Effect Loop

## Problem

- The order detail page could throw `Maximum update depth exceeded` repeatedly even while the user was idle.
- The symptom appeared on `apps/main/src/pages/data-management/master-detail/[id]/index.tsx` after the detail query resolved.
- The page kept accumulating passive-effect errors instead of settling after the first render.

## Diagnostic Method

- Started from the runtime stack trace and matched the reported `index.tsx` line to the order detail page effect that hydrates `draft` and `savedState` from query data.
- Checked whether the loop came from user-edit handlers or child components first, then narrowed it to the initial query-sync effect because the page reproduced the error without any interaction.
- Compared the effect dependency list with the state writes inside the effect.
- The decisive evidence was that the effect depended on `savedState` while also calling `setSavedState(normalizeOrder(detailQuery.data))`, and `normalizeOrder()` always returns a fresh cloned object.

## Root Cause

- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx` originally coupled the detail hydration effect to `savedState` even though that same effect was also responsible for rewriting the saved snapshot.
- Because `normalizeOrder()` clones the order payload, replacing the saved snapshot with query data easily produced a fresh object reference even when the content had not changed.
- The stable fix required breaking that coupling completely: the effect now depends on query input only and reads the latest saved snapshot through `savedStateRef` when deciding whether local draft state should be preserved.

## Fix

- Moved the hydration guard onto a `savedStateRef` so the effect can stay dependent on `detailQuery.data` only while still comparing against the latest saved snapshot.
- Made the draft and saved snapshot writes content-aware, so identical query payloads reuse the existing state objects instead of creating fresh clones on every effect run.
- This keeps the detail page hydration path idempotent after the query resolves, which prevents idle passive-effect loops while still preserving unsaved user edits.
- Extracted `hasOrderChanged()` in `apps/main/src/pages/data-management/master-detail/[id]/utils.ts` so both runtime logic and tests share the same equality rule.
- While attempting to add Playwright coverage for the detail route, found a separate shell navigation/test-path issue that prevents the current e2e harness from stably reaching this page. That gap still needs a follow-up fix before this route can be guarded in Playwright.

## Tests

- `apps/main/src/pages/data-management/master-detail/[id]/utils.test.ts` verifies identical cloned orders do not count as changes while edited drafts still do.

## Affected Files

- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/utils.ts`
- `apps/main/src/pages/data-management/master-detail/[id]/utils.test.ts`

## Notes For Future Refactors

- Effects that hydrate local state from query results should depend only on external inputs, not on the state they overwrite themselves.
- When cloned snapshots are used for dirty-state tracking, compare content explicitly before replacing the saved snapshot.
