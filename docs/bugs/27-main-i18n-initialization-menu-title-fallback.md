# 27 Main I18n Initialization Menu Title Fallback

## Problem

- In `apps/main`, when mock mode was enabled and the user entered the app in English, sidebar menu labels could render as translation keys instead of readable titles.
- The visible symptom was menu items showing values like `menu.dashboard` rather than `Dashboard`.

## Diagnostic Method

- Checked the mock menu payload first and confirmed `apps/main/public/data/menu-config.json` already used valid `titleKey` entries such as `menu.dashboard`.
- Checked English locale resources next and confirmed `apps/main/public/locales/en-US/translation.json` contained the expected `menu.*` translations.
- Traced sidebar rendering through `apps/main/src/router/AppShell.tsx` and confirmed labels were produced by `t(item.titleKey)` rather than hard-coded text.
- Direct evidence came from the bootstrap path: `apps/main/src/main.tsx` only imported `./config/i18n`, while `apps/main/src/config/i18n/index.ts` did not auto-run initialization at module load time. The app could therefore render before i18n resources finished loading.

## Root Cause

- The main app bootstrap path did not await `initializeI18n()` before mounting React.
- Menu labels depended on `t(titleKey)` during the first render, so an uninitialized i18n instance could fall back to raw keys.

## Fix

- Updated `apps/main/src/main.tsx` to `await initializeI18n()` before `bootstrapExtensions()` and `renderApp()`.
- This guarantees locale resources are ready before route shell components localize menu items.

## Tests

- `apps/main/src/config/i18n/index.test.ts` - verifies `initializeI18n()` initializes once and reuses the same promise, protecting the new bootstrap contract.

## Affected Files

- `apps/main/src/main.tsx`
- `apps/main/src/config/i18n/index.test.ts`

## Notes For Future Refactors

- Do not rely on a bare side-effect import to imply i18n initialization unless the module explicitly auto-initializes.
- Any future bootstrap refactor must preserve the invariant that locale resources are ready before menu-localized shell UI renders.
