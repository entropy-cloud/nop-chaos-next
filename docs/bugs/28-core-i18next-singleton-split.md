# 28 Core I18next Singleton Split

## Problem

- In `apps/main`, English translations could look correct right after login, but after ordinary shell interactions such as collapsing or expanding the sidebar, menu labels and other shell text could fall back to raw translation keys.
- Once the issue appeared, logging out did not recover the UI immediately; the login page could also render keys like `auth.login` or `menu.dashboard`-style strings instead of translated text.

## Diagnostic Method

- First verified that translation resources themselves were present: `apps/main/public/locales/en-US/translation.json` contained the expected `menu.*` and `auth.*` entries.
- Then verified that the symptom was not caused by menu payload shape. The mock menu config already used valid `titleKey` values and the login page used `useTranslation()` directly.
- Added bootstrap protection in `apps/main/src/main.tsx` to await `initializeI18n()`. That removed the first-render race but did not fully explain the later runtime regression after shell interactions.
- The decisive clue came from dependency resolution: `pnpm --filter @nop-chaos/main why i18next` showed `@nop-chaos/core` resolving `react-i18next` against a different `i18next` peer chain than `apps/main`, while `TabsBar` and `PluginSlot` in `packages/core` both use `useTranslation()`.
- After declaring `i18next` as a peer of `@nop-chaos/core` and reinstalling dependencies, the resolution tree collapsed back to a single `i18next 26.0.5`, which matched the disappearance of the runtime fallback behavior.

## Root Cause

- `packages/core` used `react-i18next` components but did not declare `i18next` as a peer dependency.
- That allowed PNPM to resolve `@nop-chaos/core` through a separate `i18next` peer path, so shell components and the host app could observe different i18n singletons.
- When shell UI rerendered through `@nop-chaos/core` components, some text reads effectively came from an instance that did not share the host's loaded resources, so `t()` fell back to keys.

## Fix

- Updated `packages/core/package.json` to declare `i18next` as a peer dependency alongside `react-i18next`.
- Reinstalled workspace dependencies so `@nop-chaos/core`, `apps/main`, `@nop-chaos/flux`, and `@nop-chaos/plugin-bridge` all resolve to the same `i18next` singleton.
- Kept the earlier `apps/main/src/main.tsx` bootstrap guard that awaits `initializeI18n()` before mount, since that still protects the initial render path.
- Audited the remaining workspace packages that import `react-i18next`; no second missing-peer case was found after this correction.

## Tests

- `tests/e2e/i18n-persistence.spec.ts` - verifies English translations remain intact after sidebar collapse/expand and still render correctly on the login page after logout.
- `apps/main/src/config/i18n/index.test.ts` - verifies the host initialization path still initializes i18n only once.

## Affected Files

- `packages/core/package.json`
- `apps/main/src/main.tsx`
- `tests/e2e/i18n-persistence.spec.ts`

## Notes For Future Refactors

- Any workspace package that imports `react-i18next` should also declare `i18next` explicitly at the same singleton boundary.
- If shell UI translations fail only after navigation or layout interactions, check package-level peer resolution before assuming locale resources were lost.
