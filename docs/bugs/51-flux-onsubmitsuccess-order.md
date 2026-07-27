# 51 Form onSubmitSuccess closeSurface Before refreshTable Causes Stale Table

## Problem

After form submit, dialog closes but table does not show newly created data. The data remains stale.

## Diagnostic Method

- Observed dialog closed immediately on submit, but table still showed pre-submit state.
- Inspected `onSubmitSuccess` action chain: `{action:'closeSurface', then:{action:'refreshTable'}}`.
- `closeSurface` removes the dialog component from the React tree, which also removes the action dispatch context. The `then` chain's `refreshTable` may not execute after the surface is removed.

## Root Cause

`closeSurface` unmounts the dialog component, destroying the action dispatch context. The chained `refreshTable` action (via `then`) never executes because its dispatch context is gone.

## Fix

Reversed the order in `onSubmitSuccess`: `{action:'refreshTable', then:{action:'closeSurface'}}`. The table refreshes first while the dispatch context is still alive, then the dialog closes.

## Tests

- Manual verification: table refreshes with new data before dialog closes.

## Affected Files

- `apps/main/src/extensions/flux/pages/page_simple.xpl` — `onSubmitSuccess` action order swapped

## Notes For Future Refactors

- Always execute side effects (refresh, navigation) before surface-destroying actions (close surface, unmount).
- Action chains via `then` depend on the React tree context being alive — any action that removes context must be last.
- If action dispatch is ever moved to a context-less system, this constraint may change, but the current flux renderer relies on tree-based context propagation.
