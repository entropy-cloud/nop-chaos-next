import { test, expect } from '@playwright/test';
import { login } from './support/auth';

const PROPS = [
  'fontFamily',
  'fontSize',
  'lineHeight',
  'fontWeight',
  'letterSpacing',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'marginTop',
  'marginBottom',
  'gap',
  'color',
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'boxSizing',
  'height',
  'width',
  'display',
  'overflow',
] as const;

type Snapshot = Record<string, Record<string, string>>;

async function captureSidebarStyles(page: import('@playwright/test').Page): Promise<Snapshot> {
  return page.evaluate((propNames) => {
    const sidebar = document.querySelector('[class*="h-screen"][class*="overflow-hidden"][class*="border-r"]');
    if (!sidebar) return {};

    const result: Record<string, Record<string, string>> = {};
    const allElements = [sidebar, ...Array.from(sidebar.querySelectorAll('*'))];

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      const tag = el.tagName;
      const cls = el.getAttribute('class') || '';
      const key = `${tag}#${i} .${cls.slice(0, 80)}`;

      const style = window.getComputedStyle(el);
      const props: Record<string, string> = {};
      for (const p of propNames) {
        props[p] = (style as unknown as Record<string, string>)[p];
      }
      result[key] = props;
    }

    return result;
  }, [...PROPS]);
}

function diffSnapshots(before: Snapshot, after: Snapshot) {
  const changes: Array<{
    element: string;
    props: Record<string, { before: string; after: string }>;
  }> = [];

  for (const key of Object.keys(before)) {
    if (!after[key]) {
      changes.push({
        element: key,
        props: { _existence: { before: 'present', after: 'missing' } },
      });
      continue;
    }

    const bProps = before[key];
    const aProps = after[key];
    const diffs: Record<string, { before: string; after: string }> = {};

    for (const prop of Object.keys(bProps)) {
      if (bProps[prop] !== aProps[prop]) {
        diffs[prop] = { before: bProps[prop], after: aProps[prop] };
      }
    }

    if (Object.keys(diffs).length > 0) {
      changes.push({ element: key, props: diffs });
    }
  }

  return changes;
}

test.describe('AMIS CSS isolation', () => {
  test('sidebar styles should be stable after AMIS CSS loads', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Amis Preview', { exact: false }).first()).toBeVisible({ timeout: 15000 });

    const before = await captureSidebarStyles(page);
    console.log(`\nSidebar elements captured BEFORE: ${Object.keys(before).length}`);

    await page.getByText('Amis Preview', { exact: false }).first().click();
    await expect(page.getByText('Trigger host toast')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);

    const after = await captureSidebarStyles(page);
    console.log(`Sidebar elements captured AFTER: ${Object.keys(after).length}`);

    const changes = diffSnapshots(before, after);

    const ROUTE_ACTIVE_PROPS = new Set([
      'color',
      'backgroundColor',
      'borderColor',
      'borderRadius',
    ]);

    const nonRouteChanges = changes.filter((change) => {
      const changedProps = Object.keys(change.props).filter((p) => p !== '_existence');
      const nonActiveProps = changedProps.filter((p) => !ROUTE_ACTIVE_PROPS.has(p));
      return nonActiveProps.length > 0;
    });

    if (nonRouteChanges.length > 0) {
      console.log(`\n=== NON-ROUTE SIDEBAR STYLE DIFFS: ${nonRouteChanges.length} elements changed ===\n`);
      for (const change of nonRouteChanges) {
        console.log(`  ${change.element}`);
        for (const [prop, { before: b, after: a }] of Object.entries(change.props)) {
          console.log(`    ${prop}: ${b} → ${a}`);
        }
      }
    }

    if (changes.length > 0 && nonRouteChanges.length < changes.length) {
      console.log(
        `\n  (${changes.length - nonRouteChanges.length} elements only had route-active color/bg/border changes — ignored)`,
      );
    }

    if (nonRouteChanges.length === 0) {
      console.log(`\n=== NO NON-ROUTE SIDEBAR STYLE DIFFS ===`);
    }

    expect(nonRouteChanges).toHaveLength(0);
  });

  test('global document styles should be stable after AMIS CSS loads', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Amis Preview', { exact: false }).first()).toBeVisible({ timeout: 15000 });

    const captureGlobal = () =>
      page.evaluate((propNames) => {
        const html = document.documentElement;
        const body = document.body;
        const cs = (el: Element) => {
          const s = window.getComputedStyle(el);
          const r: Record<string, string> = {};
          for (const p of propNames) {
            r[p] = (s as unknown as Record<string, string>)[p];
          }
          return r;
        };
        return { html: cs(html), body: cs(body) };
      }, [...PROPS]);

    const before = await captureGlobal();

    await page.getByText('Amis Preview', { exact: false }).first().click();
    await expect(page.getByText('Trigger host toast')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);

    const after = await captureGlobal();

    const htmlChanges: Record<string, { before: string; after: string }> = {};
    const bodyChanges: Record<string, { before: string; after: string }> = {};

    for (const prop of Object.keys(before.html)) {
      if (before.html[prop] !== after.html[prop]) {
        htmlChanges[prop] = { before: before.html[prop], after: after.html[prop] };
      }
    }
    for (const prop of Object.keys(before.body)) {
      if (before.body[prop] !== after.body[prop]) {
        bodyChanges[prop] = { before: before.body[prop], after: after.body[prop] };
      }
    }

    if (Object.keys(htmlChanges).length > 0) {
      console.log(`\n=== HTML DIFFS ===`);
      console.log(JSON.stringify(htmlChanges, null, 2));
    }
    if (Object.keys(bodyChanges).length > 0) {
      console.log(`\n=== BODY DIFFS ===`);
      console.log(JSON.stringify(bodyChanges, null, 2));
    }

    expect(Object.keys(htmlChanges)).toHaveLength(0);
    expect(Object.keys(bodyChanges)).toHaveLength(0);
  });
});
