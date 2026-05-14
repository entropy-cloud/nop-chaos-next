# 30 AMIS Global CSS Baseline Drift

## Problem

- Opening `Amis Preview` made the host app feel visually different even outside the AMIS page content.
- The visible symptom was a page-wide style shift after the first AMIS visit, caused by document-level baseline styles changing mid-session.

## Diagnostic Method

- Started from the user-visible symptom instead of assuming a component bug, and checked whether the AMIS route loads runtime CSS lazily.
- Inspected `apps/main/src/amis/init.ts` and confirmed `amis/lib/themes/cxd.css` is imported only when `Amis Preview` is opened.
- Read the upstream `cxd.css` global rules and confirmed it contains document-level selectors such as `html`, `body`, `*`, `html, body`, plus baseline rules for `line-height`, `box-sizing`, `margin`, `height`, and `overflow-x`.
- Added a Playwright regression that captures computed `html/body` baseline styles before and after opening `Amis Preview`.
- Verified the fix against a fresh preview server with `tests/e2e/lazy-loading.spec.ts`.

## Root Cause

- `amis/lib/themes/cxd.css` is a global stylesheet, not a route-scoped stylesheet.
- Because it was loaded only when the AMIS route was first opened, its reset and baseline document rules took effect mid-session and changed the host shell's existing visual baseline.
- Host bridge styles were also being imported in parallel, so override order was not guaranteed.

## Fix

- Changed `apps/main/src/amis/init.ts` to load `amis/lib/themes/cxd.css` first and `apps/main/src/styles/amis-theme-bridge.css` second, so host overrides win deterministically.
- Restored the host document baseline in `apps/main/src/styles/amis-theme-bridge.css` by explicitly reasserting `html` and `body` line-height behavior after AMIS CSS is injected.
- Added a regression in `tests/e2e/lazy-loading.spec.ts` that verifies opening the AMIS route does not change host document baseline styles.

## Tests

- `tests/e2e/lazy-loading.spec.ts` - verifies opening `Amis Preview` does not change computed `html/body` baseline styles and still preserves existing AMIS lazy-loading behavior.

## Affected Files

- `apps/main/src/amis/init.ts`
- `apps/main/src/styles/amis-theme-bridge.css`
- `tests/e2e/lazy-loading.spec.ts`

## Notes For Future Refactors

- Treat third-party theme CSS from AMIS as global unless proven otherwise; dynamic import timing alone can create visible host regressions.
- If AMIS style fixes rely on host overrides, keep import order explicit rather than parallel.
