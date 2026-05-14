# 29 Flux React I18next Default Instance Pollution

## Problem

- In `apps/main`, English shell translations could still fall back to raw keys after opening `Flux Demo` and then navigating back to normal host pages.
- The failure was visible in menu labels and on the logout return path, where the login page could render keys such as `auth.login` and `auth.username` instead of translated text.

## Diagnostic Method

- First narrowed the reproduction path from generic sidebar interaction down to a stable sequence: login in English, open `Flux Demo`, wait for render, navigate to another menu item, then logout.
- Checked the Flux runtime source in `nop-chaos-flux/packages/flux-i18n/src/i18n.ts` and found it creates its own `i18next` instance, then calls `instance.use(initReactI18next)`.
- Confirmed from the installed `react-i18next` package that `initReactI18next` calls the library-level `setI18n(instance)`, which overwrites the default instance used by `useTranslation()` when no explicit provider instance is present.
- Added a dedicated Playwright regression for the Flux path. The issue reproduced there while ordinary non-Flux i18n persistence still passed, which isolated the remaining fault to Flux runtime interaction rather than general shell state.
- Re-ran the regression against a fresh preview built from the current workspace. That confirmed the final fix rather than an older long-running preview instance.

## Root Cause

- `@nop-chaos/flux` initializes its own `i18next` instance with `initReactI18next`, which updates `react-i18next`'s global default instance pointer.
- Host components that rely on `useTranslation()` through the default context-free path can then resolve against the Flux instance instead of the host instance.
- The Flux instance does not have the host application's `translation` namespace resources, so host UI text falls back to raw keys.

## Fix

- Wrapped the host app root in `I18nextProvider` in `apps/main/src/main.tsx`, explicitly binding the host tree to `apps/main`'s own initialized `i18n` instance.
- This keeps `apps/main` and `packages/core` host UI reads on the host instance even if Flux updates the library-global default instance later during route render.
- Tightened the Playwright login helper to preserve `nop-language:v1` across its storage reset so English-language regressions are exercised reliably.
- Extended `tests/e2e/i18n-persistence.spec.ts` with a dedicated `Flux Demo -> Dashboard -> logout` regression path.

## Tests

- `tests/e2e/i18n-persistence.spec.ts` - verifies English translations survive both normal shell interactions and the Flux Demo navigation path, including the logout return to login.
- `apps/main/src/config/i18n/index.test.ts` - verifies host i18n initialization remains singleton and stable.

## Affected Files

- `apps/main/src/main.tsx`
- `tests/e2e/i18n-persistence.spec.ts`
- `tests/e2e/support/auth.ts`

## Notes For Future Refactors

- Any embedded runtime that uses `initReactI18next` should be assumed capable of mutating the process-wide default `react-i18next` instance.
- Host shell code should prefer explicit provider boundaries for i18n-sensitive trees instead of relying on the global default instance.
