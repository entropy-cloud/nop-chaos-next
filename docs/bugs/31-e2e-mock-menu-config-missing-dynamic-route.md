# 31 E2E Mock Menu Config Missing Dynamic Route Entry

## Problem

- All 15 detail page e2e tests failed with `toBeVisible()` timeout on `main h1`
- The page rendered a 404 ("Page not found") instead of the order detail view
- The breadcrumb already showed the correct tab label ("SO-202603-1001 · Acme Intelligence"), making it appear as if navigation had succeeded

## Diagnostic Method

- Initially suspected `navigateToDetail()` was navigating too early or the in-memory mock store was being cleared by `page.goto`
- Tried switching from sidebar click to `page.goto('/#/data-management/master-detail')` — still failed
- Examined the Playwright error context page snapshot: sidebar was fully rendered with correct menus, breadcrumb showed the detail tab, but `main` area contained "404" and "Page not found"
- This was the decisive clue: the route had never been registered, so react-router fell through to the catch-all `NotFoundPage`
- Traced `AppRoutes` → `flattenMenus(menuQuery.data?.items)` → `defaultMenuResponse` in `tests/e2e/support/auth.ts` and found the `data-management` children only had `master-detail` (list) but not `master-detail/:id` (detail)
- The detail entry existed in `defaultSiteMapResponse` but was missing from `defaultMenuResponse` — two separate mock configs serving different API endpoints

## Root Cause

- `auth.ts` maintains two parallel mock configurations: `defaultSiteMapResponse` (for `/r/SiteMapApi__getSiteMap`) and `defaultMenuResponse` (for `/data/menu-config.json`)
- `AppRoutes` uses the menu config response to dynamically generate `<Route>` elements via `flattenMenus`
- The `master-detail/:id` route was present in `defaultSiteMapResponse` but absent from `defaultMenuResponse`
- Without the route entry, react-router-dom had no matching `<Route path="data-management/master-detail/:id">` and rendered the 404 fallback
- The tab breadcrumb (from `useTabStore`) rendered correctly because tabs are independent of route registration

## Fix

- Added `master-detail/:id` entry to `defaultMenuResponse.data-management.children` in `tests/e2e/support/auth.ts`
- Set `componentId: 'master-detail-detail'` to match the existing registration in `pageRegistry.tsx`
- Set `hideInMenu: true` so it does not appear in the sidebar

## Tests

- `tests/e2e/master-detail-buttons.spec.ts` — 27 tests covering list and detail page layout, CRUD operations, dialog/drawer interactions, navigation, and toast feedback. All 27 now pass.

## Affected Files

- `tests/e2e/support/auth.ts` — added detail route to `defaultMenuResponse`
- `tests/e2e/master-detail-buttons.spec.ts` — fixed dialog assertion (`maxWidth` instead of `padding`)

## Notes For Future Refactors

- When adding a new dynamic route (e.g. `/some-path/:id`) to the e2e mock config, both `defaultSiteMapResponse` and `defaultMenuResponse` must include the entry — consider deriving one from the other to avoid sync drift
- The tab breadcrumb renders independently of route matching; a visible breadcrumb does not guarantee the route is registered
- `pageRegistry.tsx` component IDs and `defaultMenuResponse` component IDs must stay in sync — the detail page uses `'master-detail-detail'` in both places
