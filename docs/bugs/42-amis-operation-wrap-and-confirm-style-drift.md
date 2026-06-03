# 42 AMIS Operation Wrap And Confirm Style Drift

## Problem

- AMIS CRUD row actions could wrap even when the column only contained a `View` button and a `More` dropdown group.
- AMIS-triggered confirm popups used the host alert dialog shell with large rounded corners, which visibly drifted from AMIS dialog styling.

## Diagnostic Method

- Compared the host AMIS bridge CSS against upstream AMIS theme rules instead of assuming the generated page schema was wrong.
- Inspected upstream `amis-ui` theme CSS and confirmed `.cxd-ButtonGroup` defaults to `flex-wrap: wrap`, while `.cxd-OperationField` itself does not force `nowrap`.
- Verified that the current host maps `env.confirm` to `confirmInApp()` in `apps/main/src/amis/adapter.ts`, so the popup was not AMIS native UI at all.
- Added a focused mock AMIS CRUD preview and Playwright coverage to reproduce both the wrapping risk and the confirm-style mismatch under `dev:mock`.

## Root Cause

- The issue crossed package boundaries: upstream AMIS operation cells allow nested button groups to wrap, and the host bridge did not add a table-operation override for the common `View + More` pattern.
- AMIS confirm actions were intentionally routed through the host confirmation service, but that host dialog used the default shell `AlertDialog` styling with `rounded-xl`, not an AMIS-aligned presentation.

## Fix

- Added a narrow AMIS-only CSS override in `apps/main/src/styles/amis-fix.css` to keep `.cxd-OperationField` and nested button groups on a single line.
- Extended confirm options with `className` and tagged AMIS-originated confirms as `amis-confirm-dialog` in `apps/main/src/amis/adapter.ts`.
- Added AMIS-specific dialog styling overrides so the bridged confirm remains host-controlled but visually aligns with the AMIS radius and spacing tokens.
- Expanded the mock AMIS preview schema with a small CRUD sample that exercises operation buttons and confirm flow.

## Tests

- `tests/e2e/amis-preview-crud.spec.ts` - verifies AMIS preview row actions remain on one line and AMIS-triggered confirm dialogs use the AMIS-specific class and compact radius.

## Affected Files

- `apps/main/src/styles/amis-fix.css`
- `apps/main/src/amis/adapter.ts`
- `apps/main/src/services/confirm.ts`
- `apps/main/src/components/common/ConfirmDialogHost.tsx`
- `apps/main/src/amis/testSchema.ts`
- `tests/e2e/amis-preview-crud.spec.ts`

## Notes For Future Refactors

- Keep AMIS bridge styling scoped to `.amis` or explicit AMIS-only classes so host dialogs and non-AMIS pages do not inherit these overrides.
- If AMIS confirm is ever switched back to native AMIS dialogs, remove the host-side `amis-confirm-dialog` bridge class rather than stacking another visual override on top.
