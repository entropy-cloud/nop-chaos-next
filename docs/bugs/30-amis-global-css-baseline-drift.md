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

### Phase 4 — Upstream global reset removal + scoped typography

- Modified `amis-react19` upstream to completely remove global reset/normalize/typography from `cxd.css`:
  - `packages/amis-ui/scss/themes/_common.scss`: commented out `@import '../base/reset'`, `'../base/normalize'`, `'../base/typography'`.
  - `packages/amis-ui/scss/layout/_layout.scss`: removed `html,body { width/height: 100% }` and `body { overflow-x: hidden }`.
- Rebuilt amis-ui, re-packed all tarballs (`amis`, `amis-ui`, `amis-core`, `amis-formula`, `office-viewer`), and re-installed in nop-chaos-next.
- Refactored `amis-reset.css` to only contain rules **not** covered by Tailwind preflight and that don't use AMIS CSS variables:
  - Removed all standard normalize/reset rules (covered by Tailwind).
  - Removed typography rules that use AMIS CSS variables (`--fontFamilyBase`, `--body-size`, etc.) — these only get values when cxd.css loads.
  - Kept only AMIS-specific rules: `svg.icon`, browser compat for disabled inputs, structural classes (`.amis-routes-wrapper`, `.amis-animation-placeholder`).
- Scoped AMIS typography rules to `.amis` container in `amis-fix.css` — these use AMIS CSS variables that are defined by cxd.css and only apply inside AMIS pages.
- This ensures: (a) cxd.css lazy-loading never affects host global styles, (b) AMIS components still get their typography baseline inside the AMIS container.

## Tests

- `tests/e2e/amis-css-isolation.spec.ts` — verifies sidebar (215 elements) and document-level (`html`/`body`) computed styles remain identical before and after AMIS CSS lazy-loads. Route-active color changes are ignored.
- `tests/e2e/lazy-loading.spec.ts` — verifies opening `Amis Preview` does not change computed `html/body` baseline styles and still preserves existing AMIS lazy-loading behavior.

## Affected Files

- `apps/main/src/styles/amis-reset.css` (new)
- `apps/main/src/styles/index.css`
- `apps/main/src/styles/amis-theme-bridge.css`
- `apps/main/src/amis/init.ts`
- `tests/e2e/lazy-loading.spec.ts`
- `tests/e2e/amis-css-isolation.spec.ts` (new)

## Notes For Future Refactors

- `cxd.css` no longer contains global `html`/`body` rules — it is now purely component styles + CSS custom property definitions.
- The global baseline is entirely managed by: (1) Tailwind preflight (reset/normalize), (2) host `index.css` (body/html sizing), (3) `amis-reset.css` (AMIS-specific compat rules).
- AMIS typography rules (font-family, color, etc.) are scoped to `.amis` in `amis-fix.css` — they only affect AMIS page content.
- If upstream `amis-react19` is updated, verify that `_common.scss` and `_layout.scss` modifications are preserved, and that the new cxd.css still has no global `html`/`body` rules.
