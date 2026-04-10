/**
 * Regression tests for React 19 compatibility of amis-ui Transition components.
 *
 * Background:
 *   react-transition-group v4 calls ReactDOM.findDOMNode(this) when no nodeRef
 *   prop is provided.  findDOMNode was removed entirely in React 19, causing a
 *   TypeError whenever a Spinner, Toast, or ContextMenu opened.
 *
 *   Fix: added nodeRef to <Transition> in Spinner.tsx, Toast.tsx, and
 *   ContextMenu.tsx inside packages/amis-ui/src/components/.
 *
 * What these tests verify:
 *   1. Clicking an ajax button on the Amis Preview page does NOT throw
 *      "findDOMNode is not a function" – this exercises the Spinner transition
 *      (amis shows a loading overlay while the ajax call is in-flight).
 *   2. Clicking "Trigger host toast" shows a Toast notification and does NOT
 *      throw – this exercises the ToastMessage Transition.
 *   3. No uncaught TypeError containing "findDOMNode" appears on the page
 *      during either interaction.
 */

import { expect, test } from '@playwright/test'
import { login } from './support/auth'

test.describe('amis-ui Transition components – React 19 findDOMNode regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)

    // The app routes for amis pages are registered only AFTER the menu config
    // query succeeds.  If we navigate to /#/amis/preview before that, React
    // Router's wildcard catch-all renders an empty shell fallback instead of
    // the amis page.
    //
    // Wait for the sidebar "Amis Preview" button to appear – this is rendered
    // by AppShell once menuQuery.isSuccess is true, so its presence guarantees
    // that the /amis/preview route is registered.
    await expect(
      page.getByRole('button', { name: 'Amis Preview' })
    ).toBeVisible({ timeout: 15_000 })

    // Now navigate to the amis preview page.
    await page.goto('/#/amis/preview')

    // amis renders asynchronously: AmisPageRoute fetches the schema, then
    // AmisSchemaPage transforms it and calls renderAmis().  The button labels
    // come from the fully-rendered schema so waiting for any one of them is a
    // reliable signal that the entire amis pipeline has completed.
    await expect(
      page.getByRole('button', { name: 'Trigger host toast' })
    ).toBeVisible({ timeout: 30_000 })
  })

  test('clicking ajax button does not throw findDOMNode TypeError (Spinner transition)', async ({
    page
  }) => {
    // Collect all uncaught page errors during the test.
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    // "Run imported @action" is an actionType:ajax button.  amis wraps every
    // ajax action in a loading Spinner whose enter/exit is driven by a
    // react-transition-group <Transition>.  Before the fix this triggered
    // "findDOMNode is not a function".
    const ajaxButton = page.getByRole('button', { name: 'Run imported @action' })
    await expect(ajaxButton).toBeVisible({ timeout: 10_000 })
    await ajaxButton.click()

    // Give the spinner time to appear and disappear (the mock resolves quickly).
    await page.waitForTimeout(500)

    // Verify no findDOMNode error was thrown.
    const findDOMNodeErrors = pageErrors.filter(msg =>
      msg.toLowerCase().includes('finddomnode')
    )
    expect(findDOMNodeErrors, `Unexpected findDOMNode errors: ${findDOMNodeErrors.join('; ')}`).toHaveLength(0)

    // Also assert no generic TypeError was thrown (belt-and-suspenders).
    const typeErrors = pageErrors.filter(msg => msg.toLowerCase().includes('typeerror'))
    expect(typeErrors, `Unexpected TypeErrors: ${typeErrors.join('; ')}`).toHaveLength(0)
  })

  test('clicking "Trigger host toast" shows toast without findDOMNode TypeError (Toast transition)', async ({
    page
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    // "Trigger host toast" calls the host toast action directly, which renders
    // a ToastMessage component wrapped in a react-transition-group <Transition>.
    const toastButton = page.getByRole('button', { name: 'Trigger host toast' })
    await expect(toastButton).toBeVisible({ timeout: 10_000 })
    await toastButton.click()

    // The Toast should become visible.
    // amis-ui renders toast into a portal; look for the visible toast text.
    await expect(page.getByText('Amis action binding is working')).toBeVisible({
      timeout: 5_000
    })

    // No findDOMNode errors.
    const findDOMNodeErrors = pageErrors.filter(msg =>
      msg.toLowerCase().includes('finddomnode')
    )
    expect(findDOMNodeErrors, `Unexpected findDOMNode errors: ${findDOMNodeErrors.join('; ')}`).toHaveLength(0)

    const typeErrors = pageErrors.filter(msg => msg.toLowerCase().includes('typeerror'))
    expect(typeErrors, `Unexpected TypeErrors: ${typeErrors.join('; ')}`).toHaveLength(0)
  })
})
