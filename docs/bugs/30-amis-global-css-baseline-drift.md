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

### Phase 1 — Sequential loading + bridge overrides

- Changed `apps/main/src/amis/init.ts` to load `amis/lib/themes/cxd.css` first and `apps/main/src/styles/amis-theme-bridge.css` second, so host overrides win deterministically.
- Restored the host document baseline in `apps/main/src/styles/amis-theme-bridge.css` by explicitly reasserting `html` and `body` line-height behavior after AMIS CSS is injected.
- Added a regression in `tests/e2e/lazy-loading.spec.ts` that verifies opening the AMIS route does not change host document baseline styles.

### Phase 2 — Reset pre-extracted to host static bundle

- Traced the upstream reset source to two SCSS files in `amis-react19/packages/amis-ui/scss/base/`:
  - `_reset.scss` (18 lines): hand-written `box-sizing` reset + `figure` margin.
  - `_normalize.scss` (376 lines): vendored normalize.css v8.0.0 + AMIS SVG/disabled-input compat rules.
- Extracted the reset+normalize into `apps/main/src/styles/amis-reset.css` as pure CSS.
- Added `@import './amis-reset.css'` at the top of `apps/main/src/styles/index.css` so the baseline is established at app startup.
- Removed `!important` baseline overrides from `apps/main/src/styles/amis-theme-bridge.css`.
- `cxd.css` component styles remain lazy-loaded via `apps/main/src/amis/init.ts`.

### Phase 3 — Typography globals also pre-extracted

- Discovered that `_typography.scss` also sets global rules: `body { font-family: var(--fontFamilyBase); font-size; font-weight; line-height; color; background }`, `html { font-size: 16px }`, `html,body { width/height: 100% }`, `body { overflow-x: hidden }`, plus `a`, `label`, `h1-h6` styles.
- These rules caused body font-family to change from `Inter` to AMIS system font stack when `cxd.css` lazy-loaded.
- Appended the typography global rules to `apps/main/src/styles/amis-reset.css` so they take effect at startup instead of on first AMIS visit.
- Added dedicated e2e test `tests/e2e/amis-css-isolation.spec.ts` that verifies sidebar styles and document-level styles remain stable after AMIS CSS loads (ignoring route-active color changes).

## Tests

- `tests/e2e/lazy-loading.spec.ts` - verifies opening `Amis Preview` does not change computed `html/body` baseline styles and still preserves existing AMIS lazy-loading behavior.

## Affected Files

- `apps/main/src/styles/amis-reset.css` (new)
- `apps/main/src/styles/index.css`
- `apps/main/src/styles/amis-theme-bridge.css`
- `apps/main/src/amis/init.ts`
- `tests/e2e/lazy-loading.spec.ts`
- `tests/e2e/amis-css-isolation.spec.ts` (new)

## Notes For Future Refactors

- Treat third-party theme CSS from AMIS as global unless proven otherwise; dynamic import timing alone can create visible host regressions.
- If AMIS style fixes rely on host overrides, keep import order explicit rather than parallel.
- The extracted `amis-reset.css` must be kept in sync if the upstream `amis-react19/packages/amis-ui/scss/base/{_reset,_normalize,_typography}.scss` changes.
- `cxd.css` contains more global rules than just reset/normalize — the typography section sets `body { font-family }`, `html { font-size }`, etc. Always check for ALL global selectors when extracting from a third-party CSS bundle.
